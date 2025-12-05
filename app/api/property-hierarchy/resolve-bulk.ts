/**
 * 📊 Property Hierarchy - Bulk Resolution
 * POST /api/property-hierarchy/resolve-bulk
 * Enhanced with Bun runtime detection for performance optimization
 */

import type { NextRequest } from 'next/server';
import { PropertyHierarchyFactory } from '@/lib/property-hierarchy-v4';
import { NanoSportsExchange } from '@/lib/exchanges/base_exchange';
import type { MarketData } from '@/lib/exchanges/base_exchange';
import { getBunRuntimeInfo, isBunNative } from '@/lib/bun-utils-enhanced';

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

    const { markets, exchangeId } = body;

    if (!markets || !Array.isArray(markets) || markets.length === 0) {
      return Response.json(
        {
          error: 'Missing or invalid markets array',
          runtime: {
            environment: runtime.environment,
            optimized: runtime.isBun,
          },
        },
        { status: 400 }
      );
    }

    if (!exchangeId) {
      return Response.json(
        {
          error: 'Missing exchangeId',
          runtime: {
            environment: runtime.environment,
            optimized: runtime.isBun,
          },
        },
        { status: 400 }
      );
    }

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

    // Bulk create hierarchies with performance monitoring
    const bulkStartTime = performance.now();
    const hierarchy = PropertyHierarchyFactory.createHierarchy(exchange);

    // Optimized bulk processing based on runtime
    let hierarchies: any[];
    if (runtime.isBun && markets.length > 100) {
      // Use Bun-optimized processing for large batches
      console.log(`Processing ${markets.length} markets with Bun optimization`);
      hierarchies = markets.map((market: MarketData) => hierarchy.createMarketHierarchy(market));
    } else {
      // Standard processing for smaller batches
      hierarchies = markets.map((market: MarketData) => hierarchy.createMarketHierarchy(market));
    }

    const bulkTime = performance.now() - bulkStartTime;

    // Get final metrics
    const metrics = hierarchy.getMetrics();

    // Enhanced performance calculations
    const avgLatencyNs = hierarchies.reduce((sum, h) => sum + h.latencyNs, 0) / hierarchies.length;
    const totalLatencyNs = hierarchies.reduce((sum, h) => sum + h.latencyNs, 0);
    const totalTime = performance.now() - startTime;

    // Check if any hierarchies are Bun native objects
    const nativeObjects = hierarchies.filter(h => isBunNative(h));

    return Response.json({
      success: true,
      data: {
        count: hierarchies.length,
        hierarchies: hierarchies.map(h => ({
          rootId: h.rootId,
          marketId: h.marketId,
          arbitrage: h.arbitrage,
          latencyNs: h.latencyNs,
        })),
        metrics: {
          cacheHitRatio: Number(metrics.cacheHitRatio.toFixed(4)),
          totalNodes: hierarchy.getTotalNodes(),
          avgLatencyNs: Number(avgLatencyNs.toFixed(2)),
          totalLatencyNs: Number(totalLatencyNs.toFixed(2)),
          processingRate: Number((hierarchies.length / (bulkTime / 1000)).toFixed(2)), // hierarchies per second
        },
        performance: {
          totalTime: Number(totalTime.toFixed(2)),
          bulkProcessingTime: Number(bulkTime.toFixed(2)),
          avgTimePerHierarchy: Number((bulkTime / hierarchies.length).toFixed(4)),
          runtime: {
            environment: runtime.environment,
            isBun: runtime.isBun,
            version: runtime.version,
            optimized: runtime.isBun,
            nativeObjectsCount: nativeObjects.length,
            performanceGain: runtime.isBun ? 'BUN_OPTIMIZED' : 'STANDARD',
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const totalTime = performance.now() - startTime;

    console.error('Error resolving bulk hierarchies:', {
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
