/**
 * 🚀 PROPERTY HIERARCHY v4.0 - BENCHMARK SUITE
 * Performance testing for HFT-grade operations
 */

import { PropertyHierarchyV4 } from './index';
import type { MarketData, BaseExchange } from '../exchanges/base_exchange';

// Bun-compatible nanoseconds fallback for Node.js
const nanoseconds = typeof globalThis.Bun !== 'undefined'
  ? (globalThis.Bun as any).nanoseconds
  : () => BigInt(performance.now() * 1_000_000);

// ═══════════════════════════════════════════════════════════════
// MOCK EXCHANGE FOR TESTING
// ═══════════════════════════════════════════════════════════════

class MockExchange implements BaseExchange {
  name = 'mock-exchange';
  type: 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk' = 'sports';
  supportedMarkets = ['NBA', 'NFL', 'MLB', 'NHL'];

  async initialize(): Promise<void> {}
  async fetchMarketData(): Promise<MarketData> {
    return {
      symbol: 'TEST',
      lastPrice: 1.95,
      bid: 1.90,
      ask: 2.00,
      volume: 100000,
      timestamp: new Date().toISOString(),
    };
  }
  async fetchBalance(): Promise<any> {
    return { total: 10000, available: 10000, used: 0, currencies: {}, timestamp: new Date().toISOString() };
  }
  async placeOrder(): Promise<any> {
    return {};
  }
  async fetchOrderHistory(): Promise<any> {
    return [];
  }
  async fetchTradeHistory(): Promise<any> {
    return [];
  }
  getConfig(): any {
    return { name: 'mock', type: 'sports', version: '1.0.0', environment: 'test' };
  }
  async checkHealth(): Promise<any> {
    return { status: 'online', circuitBreaker: 'closed' };
  }
  async getStatistics(): Promise<any> {
    return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageResponseTimeMs: 0, peakResponseTimeMs: 0, requestsByType: { marketData: 0, trading: 0, account: 0, other: 0 }, performanceTrends: { responseTimeTrend: 'stable', successRateTrend: 'stable' }, lastReset: new Date().toISOString(), sessionDuration: '0h' };
  }
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARK RESULTS
// ═══════════════════════════════════════════════════════════════

interface BenchmarkResult {
  name: string;
  samples: number;
  minNs: number;
  maxNs: number;
  avgNs: number;
  p50Ns: number;
  p95Ns: number;
  p99Ns: number;
  opsPerSec: number;
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARK SUITE
// ═══════════════════════════════════════════════════════════════

export class PropertyHierarchyBenchmark {
  private results: BenchmarkResult[] = [];
  private exchange: BaseExchange;

  constructor() {
    this.exchange = new MockExchange();
  }

  /**
   * Benchmark: Single node creation
   */
  async benchmarkNodeCreation(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);
    const timings: number[] = [];

    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      const start = nanoseconds();
      hierarchy.createNode({
        name: `node_${i}`,
        type: 'primitive',
        value: i,
      });
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateStats('Node Creation (single)', iterations, timings);
  }

  /**
   * Benchmark: Market hierarchy creation
   */
  async benchmarkMarketHierarchy(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);
    const timings: number[] = [];

    const sampleMarkets: MarketData[] = Array.from({ length: 100 }, (_, i) => ({
      symbol: `LAL_GSW_${i}`,
      lastPrice: 1.95 + Math.random() * 0.1,
      bid: 1.90,
      ask: 2.00,
      volume: 100000 + i * 1000,
      timestamp: new Date().toISOString(),
      exchangeSpecific: {
        sport: 'NBA',
        spread: 0.05,
        vig: 0.047,
      },
    }));

    for (const market of sampleMarkets) {
      const start = nanoseconds();
      hierarchy.createMarketHierarchy(market);
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateStats('Market Hierarchy Creation', sampleMarkets.length, timings);
  }

  /**
   * Benchmark: Single value resolution
   */
  async benchmarkSingleResolution(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);

    // Pre-populate with nodes
    const nodeIds: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const node = hierarchy.createNode({
        name: `node_${i}`,
        type: 'primitive',
        value: Math.random() * 100,
      });
      nodeIds.push(node.id);
    }

    const timings: number[] = [];
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const nodeId = nodeIds[i % nodeIds.length];
      const start = nanoseconds();
      hierarchy['resolveSingle'](nodeId);
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateStats('Single Resolution', iterations, timings);
  }

  /**
   * Benchmark: Bulk resolution (10k nodes)
   */
  async benchmarkBulkResolution(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);

    // Pre-populate with nodes
    const nodeIds: string[] = [];
    for (let i = 0; i < 10000; i++) {
      const node = hierarchy.createNode({
        name: `node_${i}`,
        type: 'primitive',
        value: Math.random() * 100,
      });
      nodeIds.push(node.id);
    }

    const timings: number[] = [];
    const start = nanoseconds();
    hierarchy['resolveBulk'](nodeIds);
    timings.push(Number(nanoseconds() - start));

    return this.calculateStats('Bulk Resolution (10k nodes)', 1, timings);
  }

  /**
   * Benchmark: Cache hit ratio
   */
  async benchmarkCachePerformance(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);

    // Create a node
    const node = hierarchy.createNode({
      name: 'cache_test',
      type: 'primitive',
      value: 'test_value',
    });

    const timings: number[] = [];
    const iterations = 10000;

    // First resolution (cache miss)
    const start1 = nanoseconds();
    hierarchy['resolveSingle'](node.id);
    timings.push(Number(nanoseconds() - start1));

    // Subsequent resolutions (cache hits)
    for (let i = 1; i < iterations; i++) {
      const start = nanoseconds();
      hierarchy['resolveSingle'](node.id);
      timings.push(Number(nanoseconds() - start));
    }

    const result = this.calculateStats('Cache Performance', iterations, timings);
    const cacheHitTimings = timings.slice(1); // Exclude first miss
    result.avgNs = cacheHitTimings.reduce((a, b) => a + b, 0) / cacheHitTimings.length;

    return result;
  }

  /**
   * Benchmark: SIMD traversal
   */
  async benchmarkSIMDTraversal(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);

    // Create nodes
    const nodes = [];
    for (let i = 0; i < 10000; i++) {
      const node = hierarchy.createNode({
        name: `node_${i}`,
        type: 'primitive',
        value: i,
      });
      nodes.push(node);
    }

    const timings: number[] = [];
    const traverser = hierarchy.getTraverser();

    const start = nanoseconds();
    traverser.traverseBulk(nodes, (n) => n.value > 5000);
    timings.push(Number(nanoseconds() - start));

    return this.calculateStats('SIMD Traversal (10k)', 1, timings);
  }

  /**
   * Benchmark: Arbitrage computation
   */
  async benchmarkArbitrageComputation(): Promise<BenchmarkResult> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);
    const timings: number[] = [];

    const markets: MarketData[] = Array.from({ length: 1000 }, (_, i) => ({
      symbol: `ARB_${i}`,
      lastPrice: 1.95 + Math.random() * 0.1,
      bid: 1.90,
      ask: 2.00,
      volume: 100000,
      timestamp: new Date().toISOString(),
    }));

    for (const market of markets) {
      const start = nanoseconds();
      hierarchy.createMarketHierarchy(market);
      timings.push(Number(nanoseconds() - start));
    }

    return this.calculateStats('Arbitrage Computation (1k markets)', markets.length, timings);
  }

  /**
   * Benchmark: Memory efficiency
   */
  async benchmarkMemoryEfficiency(): Promise<any> {
    const hierarchy = new PropertyHierarchyV4(this.exchange);

    // Create 10k nodes
    for (let i = 0; i < 10000; i++) {
      hierarchy.createNode({
        name: `node_${i}`,
        type: 'primitive',
        value: Math.random() * 1000,
      });
    }

    const totalNodes = hierarchy.getTotalNodes();
    const cacheStats = hierarchy.getCacheStats();
    const metrics = hierarchy.getMetrics();

    return {
      totalNodes,
      cacheStats,
      metrics,
      cacheHitRatio: Number(metrics.cacheHitRatio.toFixed(4)),
    };
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('\n🚀 PROPERTY HIERARCHY v4.0 - BENCHMARK SUITE');
    console.log('═'.repeat(70));

    // Single node creation
    console.log('\n⏱️ Benchmarking node creation...');
    const nodeCreation = await this.benchmarkNodeCreation();
    this.results.push(nodeCreation);
    this.printResult(nodeCreation);

    // Market hierarchy
    console.log('\n⏱️ Benchmarking market hierarchy creation...');
    const marketHier = await this.benchmarkMarketHierarchy();
    this.results.push(marketHier);
    this.printResult(marketHier);

    // Single resolution
    console.log('\n⏱️ Benchmarking single resolution...');
    const singleRes = await this.benchmarkSingleResolution();
    this.results.push(singleRes);
    this.printResult(singleRes);

    // Bulk resolution
    console.log('\n⏱️ Benchmarking bulk resolution (10k nodes)...');
    const bulkRes = await this.benchmarkBulkResolution();
    this.results.push(bulkRes);
    this.printResult(bulkRes);

    // Cache performance
    console.log('\n⏱️ Benchmarking cache performance...');
    const cachePerf = await this.benchmarkCachePerformance();
    this.results.push(cachePerf);
    this.printResult(cachePerf);

    // SIMD traversal
    console.log('\n⏱️ Benchmarking SIMD traversal...');
    const simdTrav = await this.benchmarkSIMDTraversal();
    this.results.push(simdTrav);
    this.printResult(simdTrav);

    // Arbitrage
    console.log('\n⏱️ Benchmarking arbitrage computation...');
    const arbComp = await this.benchmarkArbitrageComputation();
    this.results.push(arbComp);
    this.printResult(arbComp);

    // Memory
    console.log('\n⏱️ Benchmarking memory efficiency...');
    const memory = await this.benchmarkMemoryEfficiency();
    console.log(`  Total Nodes: ${memory.totalNodes}`);
    console.log(`  Cache Size: ${memory.cacheStats.size}/${memory.cacheStats.maxSize}`);
    console.log(`  Cache Hit Ratio: ${memory.cacheHitRatio}`);

    // Summary
    this.printSummary();
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private calculateStats(name: string, samples: number, timings: number[]): BenchmarkResult {
    timings.sort((a, b) => a - b);

    return {
      name,
      samples,
      minNs: timings[0],
      maxNs: timings[timings.length - 1],
      avgNs: timings.reduce((a, b) => a + b, 0) / timings.length,
      p50Ns: timings[Math.floor(timings.length * 0.5)],
      p95Ns: timings[Math.floor(timings.length * 0.95)],
      p99Ns: timings[Math.floor(timings.length * 0.99)],
      opsPerSec: (1e9 / (timings.reduce((a, b) => a + b, 0) / timings.length)) * samples,
    };
  }

  private printResult(result: BenchmarkResult): void {
    console.log(`  ${result.name}`);
    console.log(`    Samples: ${result.samples}`);
    console.log(`    Min:     ${(result.minNs / 1000).toFixed(2)}µs`);
    console.log(`    Avg:     ${(result.avgNs / 1000).toFixed(2)}µs`);
    console.log(`    P95:     ${(result.p95Ns / 1000).toFixed(2)}µs`);
    console.log(`    P99:     ${(result.p99Ns / 1000).toFixed(2)}µs`);
    console.log(`    Max:     ${(result.maxNs / 1000).toFixed(2)}µs`);
    console.log(`    Ops/sec: ${result.opsPerSec.toFixed(0)}`);
  }

  private printSummary(): void {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('═'.repeat(70));

    for (const result of this.results) {
      const target = this.getTarget(result.name);
      const status = result.avgNs <= target ? '✅' : '⚠️';
      console.log(
        `${status} ${result.name}: ${(result.avgNs / 1000).toFixed(2)}µs (target: ${(target / 1000).toFixed(2)}µs)`
      );
    }

    console.log('\n🎯 PERFORMANCE TARGETS ACHIEVED:');
    const achieved = this.results.filter((r) => r.avgNs <= this.getTarget(r.name)).length;
    console.log(`   ${achieved}/${this.results.length} targets met (${((achieved / this.results.length) * 100).toFixed(1)}%)`);
  }

  private getTarget(name: string): number {
    if (name.includes('Bulk Resolution')) return 2_000_000; // 2ms for 10k
    if (name.includes('Single Resolution')) return 500; // 500ns
    if (name.includes('Cache Performance')) return 100; // 100ns cache hit
    if (name.includes('Node Creation')) return 1000; // 1µs
    if (name.includes('Market Hierarchy')) return 5000; // 5µs
    if (name.includes('SIMD')) return 100_000; // 100µs for 10k
    if (name.includes('Arbitrage')) return 3000; // 3µs per market
    return 10_000; // 10µs default
  }
}

// ═══════════════════════════════════════════════════════════════
// RUN BENCHMARKS
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
  const benchmark = new PropertyHierarchyBenchmark();
  await benchmark.runAll();
}
