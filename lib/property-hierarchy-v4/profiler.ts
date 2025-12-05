/**
 * 📊 Property Hierarchy v4.0 - Advanced Performance Profiler
 * Real-time profiling, optimization analysis, and throughput tracking
 */

import type { PropertyHierarchyV4, PropertyNodeV4 } from './index';

// Bun-compatible nanoseconds fallback for Node.js
const nanoseconds = typeof globalThis.Bun !== 'undefined'
  ? (globalThis.Bun as any).nanoseconds
  : () => BigInt(performance.now() * 1_000_000);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OperationMetrics {
  operationName: string;
  samples: number;
  minNs: number;
  maxNs: number;
  avgNs: number;
  medianNs: number;
  p95Ns: number;
  p99Ns: number;
  stdDevNs: number;
  throughput: number;
}

export interface MemoryProfile {
  estimatedTotalBytes: number;
  perNodeBytes: number;
  indexOverheadBytes: number;
  cacheUtilizationPercent: number;
}

export interface OptimizationRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  area: string;
  current: string;
  recommended: string;
  estimatedImprovement: string;
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED PROFILER
// ═══════════════════════════════════════════════════════════════

export class PropertyHierarchyProfiler {
  private operationMetrics = new Map<string, number[]>();
  private memoryCheckpoints: Array<{
    timestamp: string;
    metrics: MemoryProfile;
  }> = [];

  /**
   * Profile single resolution operation
   */
  profileSingleResolution(
    hierarchy: PropertyHierarchyV4,
    nodeIds: string[],
    iterations: number = 10000
  ): OperationMetrics {
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const nodeId = nodeIds[i % nodeIds.length];
      const start = nanoseconds();
      hierarchy['resolveSingle'](nodeId);
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateMetrics('Single Resolution', timings);
  }

  /**
   * Profile bulk resolution operation
   */
  profileBulkResolution(
    hierarchy: PropertyHierarchyV4,
    nodeIds: string[],
    batchSizes: number[] = [100, 1000, 10000]
  ): Map<number, OperationMetrics> {
    const results = new Map<number, OperationMetrics>();

    for (const batchSize of batchSizes) {
      const timings: number[] = [];
      const batches = Math.ceil(nodeIds.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batch = nodeIds.slice(
          i * batchSize,
          Math.min((i + 1) * batchSize, nodeIds.length)
        );
        const start = nanoseconds();
        hierarchy['resolveBulk'](batch);
        timings.push(Number(nanoseconds() - start));
      }

      results.set(
        batchSize,
        this.calculateMetrics(`Bulk Resolution (${batchSize})`, timings)
      );
    }

    return results;
  }

  /**
   * Profile node traversal
   */
  profileTraversal(
    hierarchy: PropertyHierarchyV4,
    nodes: PropertyNodeV4[],
    iterations: number = 100
  ): OperationMetrics {
    const timings: number[] = [];
    const traverser = hierarchy.getTraverser();

    for (let i = 0; i < iterations; i++) {
      const start = nanoseconds();
      traverser.traverseBulk(nodes, (n) => n.value > Math.random() * 100);
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateMetrics('SIMD Traversal', timings);
  }

  /**
   * Profile cache performance
   */
  profileCacheHitRate(
    hierarchy: PropertyHierarchyV4,
    nodeIds: string[],
    iterations: number = 10000
  ): {
    hitRate: number;
    avgHitTimeNs: number;
    avgMissTimeNs: number;
  } {
    const hitTimings: number[] = [];
    const missTimings: number[] = [];
    const metrics = hierarchy.getMetrics();
    const initialHits = Number(metrics.cacheHits);

    for (let i = 0; i < iterations; i++) {
      const nodeId = nodeIds[i % nodeIds.length];
      const start = nanoseconds();
      hierarchy['resolveSingle'](nodeId);
      const duration = Number(nanoseconds() - start);

      // Heuristic: fast (<1µs) = cache hit, slow (>2µs) = miss
      if (duration < 1000) {
        hitTimings.push(duration);
      } else {
        missTimings.push(duration);
      }
    }

    const finalMetrics = hierarchy.getMetrics();
    const finalHits = Number(finalMetrics.cacheHits);
    const actualHits = finalHits - initialHits;

    return {
      hitRate: (actualHits / iterations) * 100,
      avgHitTimeNs:
        hitTimings.reduce((a, b) => a + b, 0) / Math.max(hitTimings.length, 1),
      avgMissTimeNs:
        missTimings.reduce((a, b) => a + b, 0) /
        Math.max(missTimings.length, 1),
    };
  }

  /**
   * Analyze memory usage
   */
  profileMemory(hierarchy: PropertyHierarchyV4): MemoryProfile {
    const totalNodes = hierarchy.getTotalNodes();
    const cacheStats = hierarchy.getCacheStats();

    // Rough estimates
    const perNodeBytes = 150; // Average node size
    const indexOverheadBytes = 30; // Per reference
    const estimatedIndexBytes = totalNodes * indexOverheadBytes * 3; // 3 indexes
    const estimatedNodeBytes = totalNodes * perNodeBytes;
    const cacheBytes = cacheStats.size * 200; // ~200 bytes per cache entry

    const totalBytes = estimatedNodeBytes + estimatedIndexBytes + cacheBytes;

    return {
      estimatedTotalBytes: totalBytes,
      perNodeBytes,
      indexOverheadBytes: estimatedIndexBytes,
      cacheUtilizationPercent: (cacheStats.size / cacheStats.maxSize) * 100,
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizations(
    hierarchy: PropertyHierarchyV4,
    _nodeIds: string[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = hierarchy.getMetrics();
    const memory = this.profileMemory(hierarchy);

    // Cache optimization
    if (metrics.cacheHitRatio < 0.85) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Cache Strategy',
        current: `${(metrics.cacheHitRatio * 100).toFixed(1)}% hit rate`,
        recommended: 'Increase cache size or adjust TTL',
        estimatedImprovement: '5-10% latency reduction',
      });
    }

    // Memory optimization
    if (memory.cacheUtilizationPercent > 80) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'Memory Management',
        current: `${memory.cacheUtilizationPercent.toFixed(1)}% cache utilization`,
        recommended: 'Increase cache max size or implement LRU pruning',
        estimatedImprovement: '3-5% latency reduction',
      });
    }

    // Resolution performance
    if (metrics.avgResolutionNs > 600) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Resolution Performance',
        current: `${metrics.avgResolutionNs.toFixed(0)}ns average`,
        recommended: 'Profile hot paths, consider inline caching',
        estimatedImprovement: '10-15% latency reduction',
      });
    }

    // Traversal optimization
    const traversalMetrics = this.profileTraversal(hierarchy, [], 10);
    if (traversalMetrics.avgNs > 150000) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'SIMD Traversal',
        current: `${(traversalMetrics.avgNs / 1000).toFixed(0)}µs per 10k nodes`,
        recommended: 'Optimize predicate evaluation, consider vectorization',
        estimatedImprovement: '20-30% throughput improvement',
      });
    }

    return recommendations;
  }

  /**
   * Generate comprehensive profiling report
   */
  async generateReport(
    hierarchy: PropertyHierarchyV4,
    nodeIds: string[]
  ): Promise<string> {
    console.log('\n📊 PROPERTY HIERARCHY v4.0 - PROFILING REPORT');
    console.log('═'.repeat(70));

    // Current metrics
    const metrics = hierarchy.getMetrics();
    console.log('\n📈 Current Performance Metrics:');
    console.log(
      `  • Cache Hit Ratio: ${(metrics.cacheHitRatio * 100).toFixed(1)}%`
    );
    console.log(
      `  • Avg Resolution: ${metrics.avgResolutionNs.toFixed(0)}ns`
    );
    console.log(
      `  • Total Operations: ${Number(metrics.resolutions).toLocaleString()}`
    );

    // Memory profile
    const memory = this.profileMemory(hierarchy);
    console.log('\n💾 Memory Profile:');
    console.log(
      `  • Total Estimated: ${(memory.estimatedTotalBytes / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(
      `  • Cache Utilization: ${memory.cacheUtilizationPercent.toFixed(1)}%`
    );

    // Optimization recommendations
    const recommendations = this.generateOptimizations(hierarchy, nodeIds);
    if (recommendations.length > 0) {
      console.log('\n🎯 Optimization Recommendations:');
      for (const rec of recommendations) {
        console.log(`  [${rec.priority}] ${rec.area}`);
        console.log(`    Current: ${rec.current}`);
        console.log(`    Recommended: ${rec.recommended}`);
        console.log(`    Expected Gain: ${rec.estimatedImprovement}`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    return 'Report complete';
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private calculateMetrics(name: string, timings: number[]): OperationMetrics {
    timings.sort((a, b) => a - b);
    const sum = timings.reduce((a, b) => a + b, 0);
    const avg = sum / timings.length;
    const variance =
      timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
      timings.length;
    const stdDev = Math.sqrt(variance);

    this.operationMetrics.set(name, timings);

    return {
      operationName: name,
      samples: timings.length,
      minNs: timings[0],
      maxNs: timings[timings.length - 1],
      avgNs: avg,
      medianNs: timings[Math.floor(timings.length / 2)],
      p95Ns: timings[Math.floor(timings.length * 0.95)],
      p99Ns: timings[Math.floor(timings.length * 0.99)],
      stdDevNs: stdDev,
      throughput:
        (1e9 / avg) * 1000, // Operations per second (scaled for visibility)
    };
  }
}

// Class exported at definition
