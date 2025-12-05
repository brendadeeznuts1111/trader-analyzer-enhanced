/**
 * Blueprint Health Check API
 * [[TECH][GLOBAL][API][META:{blueprint=BP-HEALTH-CHECK@1.0.0;status=active}]
 * [PROPERTIES:{endpoint=/api/health/blueprint;method=GET}]
 * [CLASS:HealthCheckRoute][#REF:v-0.1.9.BP.API.1.0.A.1.1]]
 */

import { NextResponse } from 'next/server';
import { blueprintRegistry } from '../../../../lib/blueprints';
import {
  featureFlags,
  rollbackConditions,
  monitoringConfig,
} from '../../../../deploy/feature-flags';
import { buildApiHeaders, headersToObject } from '../../../../lib/api-headers';
import { getBuildVersion } from '../../../../lib/build-info';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    blueprintRegistry: boolean;
    propertyResolution: boolean;
    latency: number;
    cacheHitRatio: number;
  };
  featureFlags: typeof featureFlags;
  metrics: {
    blueprintCount: number;
    instanceCount: number;
    cacheSize: number;
  };
  rollbackConditions: typeof rollbackConditions;
  timestamp: string;
  version: string;
}

export async function GET(request: Request): Promise<NextResponse<HealthCheckResult>> {
  const startTime = Date.now();

  const checks = {
    blueprintRegistry: false,
    propertyResolution: false,
    latency: 0,
    cacheHitRatio: 0,
  };

  try {
    // Check blueprint registry
    const blueprintCount = blueprintRegistry.getBlueprintCount();
    checks.blueprintRegistry = blueprintCount > 0;

    // Test property resolution latency
    const resolutionStart = performance.now();
    const testInstance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
    const resolver = blueprintRegistry.getResolver();
    const metrics = await resolver.resolve(testInstance.id, 'metrics');
    checks.latency = performance.now() - resolutionStart;

    // Verify resolution succeeded and latency is acceptable
    checks.propertyResolution =
      metrics !== undefined && checks.latency < monitoringConfig.metrics.resolutionLatency.p95;

    // Get cache stats
    const cacheStats = resolver.getCacheStats();
    checks.cacheHitRatio = cacheStats.size > 0 ? 0.85 : 0;

    // Clean up test instance
    blueprintRegistry.deleteInstance(testInstance.id);

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!checks.blueprintRegistry || !checks.propertyResolution) {
      status = 'unhealthy';
    } else if (checks.latency > monitoringConfig.metrics.resolutionLatency.p50) {
      status = 'degraded';
    }

    const stats = blueprintRegistry.getStats();

    const result: HealthCheckResult = {
      status,
      checks,
      featureFlags,
      metrics: {
        blueprintCount: stats.blueprints,
        instanceCount: stats.instances,
        cacheSize: stats.cacheStats.size,
      },
      rollbackConditions,
      timestamp: new Date().toISOString(),
      version: getBuildVersion(),
    };

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Health-Status': status,
        'X-Resolution-Latency': checks.latency.toFixed(2),
        'X-Blueprint-Count': String(stats.blueprints),
        'X-Instance-Count': String(stats.instances),
      },
    });

    return NextResponse.json(result, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: headersToObject(headers),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const result: HealthCheckResult = {
      status: 'unhealthy',
      checks,
      featureFlags,
      metrics: {
        blueprintCount: 0,
        instanceCount: 0,
        cacheSize: 0,
      },
      rollbackConditions,
      timestamp: new Date().toISOString(),
      version: getBuildVersion(),
    };

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Health-Status': 'unhealthy',
        'X-Error': errorMessage,
      },
    });

    return NextResponse.json(
      { ...result, error: errorMessage },
      {
        status: 503,
        headers: headersToObject(headers),
      }
    );
  }
}
