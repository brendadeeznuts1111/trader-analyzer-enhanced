/**
 * 📊 Property Hierarchy - Metrics Endpoint
 * GET /api/property-hierarchy/metrics
 * Enhanced with Bun runtime detection for performance optimization
 */

import type { NextRequest } from 'next/server';
import { PropertyHierarchyFactory } from '@/lib/property-hierarchy-v4';
import { NanoSportsExchange } from '@/lib/exchanges/base_exchange';
import { getBunRuntimeInfo } from '@/lib/bun-utils-enhanced';

// Runtime info cache for performance
let runtimeInfo: ReturnType<typeof getBunRuntimeInfo> | null = null;

function getRuntimeInfo() {
  if (!runtimeInfo) {
    runtimeInfo = getBunRuntimeInfo();
  }
  return runtimeInfo;
}

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const runtime = getRuntimeInfo();

  try {
    // Optimized URL parsing based on runtime
    let searchParams: URLSearchParams;
    if (runtime.isBun) {
      // Use Bun's optimized URL handling
      const url = new URL(request.url);
      searchParams = url.searchParams;
    } else {
      // Standard fallback
      searchParams = new URL(request.url).searchParams;
    }

    const exchangeId = searchParams.get('exchangeId') || 'nano-sports';

    // Initialize exchange with runtime awareness
    let exchange;
    if (exchangeId === 'nano-sports') {
      exchange = new NanoSportsExchange();
    } else {
      return Response.json(
        {
          error: `Unsupported exchange: ${exchangeId}`,
          runtime: {
            environment: runtime.environment,
            optimized: runtime.isBun,
          },
        },
        { status: 400 }
      );
    }

    // Create hierarchy and get metrics with performance tracking
    const metricsStartTime = performance.now();
    const hierarchy = PropertyHierarchyFactory.createHierarchy(exchange);
    const metrics = hierarchy.getMetrics();
    const cacheStats = hierarchy.getCacheStats();
    const metricsTime = performance.now() - metricsStartTime;

    const totalTime = performance.now() - startTime;

    // Enhanced metrics with runtime information
    return Response.json({
      success: true,
      data: {
        metrics: {
          resolutions: Number(metrics.resolutions),
          cacheHits: Number(metrics.cacheHits),
          cacheMisses: Number(metrics.cacheMisses),
          traversals: Number(metrics.traversals),
          avgResolutionNs: metrics.avgResolutionNs.toFixed(2),
          cacheHitRatio: (metrics.cacheHitRatio * 100).toFixed(2) + '%',
          lastResetAt: metrics.lastResetAt,
        },
        cache: {
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          ttlMs: cacheStats.ttlMs,
          utilization: ((cacheStats.size / cacheStats.maxSize) * 100).toFixed(1) + '%',
        },
        performance: {
          targetResolutionNs: 500,
          currentAvgNs: metrics.avgResolutionNs.toFixed(0),
          status: metrics.avgResolutionNs <= 500 ? 'OPTIMAL' : 'DEGRADED',
          apiResponseTime: Number(totalTime.toFixed(2)),
          metricsCollectionTime: Number(metricsTime.toFixed(2)),
        },
        runtime: {
          environment: runtime.environment,
          isBun: runtime.isBun,
          version: runtime.version,
          availableAPIs: runtime.hasNativeAPIs.length,
          optimized: runtime.isBun,
          performanceGain: runtime.isBun ? 'BUN_OPTIMIZED' : 'STANDARD',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const totalTime = performance.now() - startTime;

    console.error('Error getting metrics:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      runtime: runtime.environment,
      executionTime: totalTime,
      timestamp: new Date().toISOString(),
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        runtime: {
          environment: runtime.environment,
          optimized: runtime.isBun,
          executionTime: totalTime,
        },
      },
      { status: 500 }
    );
  }
}
