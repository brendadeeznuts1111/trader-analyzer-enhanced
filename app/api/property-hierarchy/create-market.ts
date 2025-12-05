/**
 * 📊 Property Hierarchy - Create Market Hierarchy
 * POST /api/property-hierarchy/create-market
 * Enhanced with Bun runtime detection for performance optimization
 */

import type { NextRequest } from 'next/server';
import { PropertyHierarchyFactory } from '@/lib/property-hierarchy-v4';
import { NanoSportsExchange } from '@/lib/exchanges/base_exchange';
import type { MarketData } from '@/lib/exchanges/base_exchange';
import { getBunRuntimeInfo } from '@/lib/bun-utils-enhanced';

// Runtime info cache for performance
let runtimeInfo: ReturnType<typeof getBunRuntimeInfo> | null = null;

function getRuntimeInfo() {
  if (!runtimeInfo) {
    runtimeInfo = getBunRuntimeInfo();
  }
  return runtimeInfo;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const runtime = getRuntimeInfo();

  try {
    // Optimized JSON parsing based on runtime
    let body: any;
    if (runtime.isBun) {
      // Use Bun's optimized JSON parsing
      const bodyText = await request.text();
      body = JSON.parse(bodyText);
    } else {
      // Standard fallback
      body = await request.json();
    }

    const { marketData, exchangeId } = body;

    if (!marketData || !exchangeId) {
      return Response.json(
        {
          error: 'Missing required fields: marketData, exchangeId',
          runtime: {
            environment: runtime.environment,
            optimized: runtime.isBun,
          },
        },
        { status: 400 }
      );
    }

    // Initialize exchange with runtime optimization
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

    // Create hierarchy with performance monitoring
    const hierarchyStartTime = performance.now();
    const hierarchy = PropertyHierarchyFactory.createHierarchy(exchange);
    const marketHierarchy = hierarchy.createMarketHierarchy(marketData as MarketData);
    const hierarchyTime = performance.now() - hierarchyStartTime;

    // Get metrics
    const metrics = hierarchy.getMetrics();

    const totalTime = performance.now() - startTime;

    return Response.json({
      success: true,
      data: {
        hierarchy: marketHierarchy,
        metrics: {
          cacheHitRatio: Number(metrics.cacheHitRatio.toFixed(4)),
          resolutions: Number(metrics.resolutions),
          totalNodes: hierarchy.getTotalNodes(),
        },
      },
      performance: {
        executionTime: Number(totalTime.toFixed(2)),
        hierarchyCreationTime: Number(hierarchyTime.toFixed(2)),
        runtime: {
          environment: runtime.environment,
          isBun: runtime.isBun,
          version: runtime.version,
          optimized: runtime.isBun,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const totalTime = performance.now() - startTime;

    console.error('Error creating market hierarchy:', {
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
