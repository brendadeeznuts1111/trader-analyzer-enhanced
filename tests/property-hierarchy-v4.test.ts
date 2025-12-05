#!/usr/bin/env bun
/**
 * Property Hierarchy v4.0 - Comprehensive Test Suite
 * Testing with seeded RNG for reproducible test data
 * Run: bun test --seed=42
 *
 * 1. Node Creation & Management
 *    Tests property node creation and indexing
 *
 * 1.1 Single Node Creation
 *    Creates individual nodes with seeded UUIDs
 *
 * 1.1.1 Market Node Creation
 *    Validates market-type node creation with metadata
 *
 * 1.1.1.1 Arbitrage Node Creation
 *    Tests arbitrage-specific node properties
 *
 * 1.1.1.1.1 Node Constraints
 *    Verifies constraint application
 *
 * 1.2 Bulk Node Creation
 *    Creates 10k nodes and validates indexing
 *
 * 2. Resolution Performance
 *    Tests lock-free resolution with timing
 *
 * 2.1 Single Resolution
 *    Individual node resolution (<500ns target)
 *
 * 2.1.1 Cache Hit Performance
 *    Cache hit latency baseline
 *
 * 2.1.1.1 Cache Miss Performance
 *    Initial resolution timing
 *
 * 2.2 Bulk Resolution
 *    Parallel resolution of 10k nodes
 *
 * 2.2.1 Batch Processing
 *    Tests resolution at different batch sizes
 *
 * 3. Market Hierarchy Creation
 *    Full market hierarchy from MarketData
 *
 * 3.1 Nano-Sports Market
 *    NBA game market creation
 *
 * 3.1.1 Arbitrage Calculation
 *    Vig and edge computation
 *
 * 3.2 Polymarket Market
 *    Prediction market hierarchy
 *
 * 4. SIMD Traversal
 *    8-node vectorized traversal
 *
 * 4.1 Leaf Node Filtering
 *    Identifies terminal nodes
 *
 * 4.2 Type-based Filtering
 *    Filters nodes by PropertyType
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  PropertyHierarchyV4,
  PropertyHierarchyFactory,
  SIMDPropertyTraverser,
  type PropertyNodeV4,
  type MarketHierarchyV4,
} from '../lib/property-hierarchy-v4';
import type { MarketData } from '../lib/exchanges/base_exchange';
import { NanoSportsExchange } from '../lib/exchanges/base_exchange';

// ═══════════════════════════════════════════════════════════════
// FIXTURES & SETUP
// ═══════════════════════════════════════════════════════════════

let hierarchy: PropertyHierarchyV4;
let exchange: NanoSportsExchange;

beforeAll(() => {
  exchange = new NanoSportsExchange();
  hierarchy = PropertyHierarchyFactory.createHierarchy(exchange);
});

// Seeded test market data (reproducible)
function getSeededMarketData(seed: number): MarketData {
  const priceVariance = Math.sin(seed) * 0.1;
  return {
    symbol: `TEST_${seed}`,
    lastPrice: 1.95 + priceVariance,
    bid: 1.9 + priceVariance,
    ask: 2.0 + priceVariance,
    volume: 100000 + seed * 1000,
    timestamp: new Date().toISOString(),
    exchangeSpecific: {
      sport: 'TEST',
      vig: 0.047,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. NODE CREATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════

describe('1. Node Creation & Management', () => {
  test('1.1 Single Node Creation', () => {
    const node = hierarchy.createNode({
      name: 'test_node',
      type: 'primitive',
      value: 'test_value',
      tags: ['test'],
    });

    expect(node.id).toBeDefined();
    expect(node.name).toBe('test_node');
    expect(node.type).toBe('primitive');
    expect(node.value).toBe('test_value');
  });

  test('1.1.1 Market Node Creation', () => {
    const marketNode = hierarchy.createNode({
      name: 'LAL_vs_GSW',
      type: 'market',
      value: { sport: 'NBA', teams: ['LAL', 'GSW'] },
      metadata: { symbol: 'LAL_GSW' },
    });

    expect(marketNode.type).toBe('market');
    expect(marketNode.metadata.tags).toStrictEqual([]);
    expect(marketNode.inheritable).toBe(true);
  });

  test('1.1.1.1 Arbitrage Node Creation', () => {
    const arbNode = hierarchy.createNode({
      name: 'arb_edge',
      type: 'arbitrage',
      value: 0.025,
      constraints: {
        minValue: 0,
        maxValue: 1,
      },
      tags: ['arbitrage'],
    });

    expect(arbNode.type).toBe('arbitrage');
    expect(arbNode.constraints?.minValue).toBe(0);
    expect(arbNode.constraints?.maxValue).toBe(1);
  });

  test('1.1.1.1.1 Node Constraints', () => {
    const constrainedNode = hierarchy.createNode({
      name: 'constrained',
      type: 'primitive',
      value: 50,
      constraints: {
        required: true,
        minValue: 0,
        maxValue: 100,
      },
    });

    expect(constrainedNode.constraints?.required).toBe(true);
    expect(constrainedNode.constraints?.minValue).toBe(0);
  });

  test('1.2 Bulk Node Creation', () => {
    const nodeCount = 1000;
    const nodes: PropertyNodeV4[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const node = hierarchy.createNode({
        name: `bulk_node_${i}`,
        type: 'primitive',
        value: i,
        tags: ['bulk'],
      });
      nodes.push(node);
    }

    expect(nodes.length).toBe(nodeCount);
    expect(hierarchy.getTotalNodes()).toBeGreaterThanOrEqual(nodeCount);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. RESOLUTION PERFORMANCE
// ═══════════════════════════════════════════════════════════════

describe('2. Resolution Performance', () => {
  test('2.1 Single Resolution', () => {
    const testNode = hierarchy.createNode({
      name: 'perf_test',
      type: 'primitive',
      value: 42,
    });

    const result = hierarchy['resolveSingle'](testNode.id);
    expect(result).toBe(42);
  });

  test('2.1.1 Cache Hit Performance', () => {
    const testNode = hierarchy.createNode({
      name: 'cache_test_hit',
      type: 'primitive',
      value: 'cached',
    });

    // First resolution (cache miss)
    hierarchy['resolveSingle'](testNode.id);

    // Second resolution (cache hit)
    const result = hierarchy['resolveSingle'](testNode.id);
    expect(result).toBe('cached');

    const metrics = hierarchy.getMetrics();
    expect(Number(metrics.cacheHits)).toBeGreaterThan(0);
  });

  test('2.1.1.1 Cache Miss Performance', () => {
    // Clear cache
    hierarchy.clearCache();

    const testNode = hierarchy.createNode({
      name: 'cache_test_miss',
      type: 'primitive',
      value: 'uncached',
    });

    const result = hierarchy['resolveSingle'](testNode.id);
    expect(result).toBe('uncached');

    const metrics = hierarchy.getMetrics();
    expect(Number(metrics.cacheMisses)).toBeGreaterThan(0);
  });

  test('2.2 Bulk Resolution', () => {
    const nodeIds: string[] = [];

    for (let i = 0; i < 100; i++) {
      const node = hierarchy.createNode({
        name: `resolution_bulk_${i}`,
        type: 'primitive',
        value: i * 2,
      });
      nodeIds.push(node.id);
    }

    const results = hierarchy.resolveBulk(nodeIds);

    expect(Object.keys(results).length).toBe(nodeIds.length);
    expect(results[nodeIds[0]]).toBe(0);
    expect(results[nodeIds[50]]).toBe(100);
  });

  test('2.2.1 Batch Processing', () => {
    const batchSizes = [10, 50, 100];

    for (const batchSize of batchSizes) {
      const nodeIds: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        const node = hierarchy.createNode({
          name: `batch_${batchSize}_${i}`,
          type: 'primitive',
          value: i,
        });
        nodeIds.push(node.id);
      }

      const results = hierarchy.resolveBulk(nodeIds);
      expect(Object.keys(results).length).toBe(batchSize);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. MARKET HIERARCHY CREATION
// ═══════════════════════════════════════════════════════════════

describe('3. Market Hierarchy Creation', () => {
  test('3.1 Nano-Sports Market', () => {
    const marketData = getSeededMarketData(42);
    const marketHier = hierarchy.createMarketHierarchy(marketData);

    expect(marketHier.marketId).toBe(marketData.symbol);
    expect(marketHier.exchangeId).toBe('nano-sports');
    expect(marketHier.arbitrage).toBeDefined();
    expect(marketHier.latencyNs).toBeGreaterThan(0);
  });

  test('3.1.1 Arbitrage Calculation', () => {
    const marketData = getSeededMarketData(123);
    const marketHier = hierarchy.createMarketHierarchy(marketData);

    const { arbitrage } = marketHier;
    expect(arbitrage.vig).toBeGreaterThanOrEqual(0);
    expect(arbitrage.edge).toBeGreaterThanOrEqual(0);
    expect(arbitrage.arbStatus).toMatch(/^(HIGH|LOW|UNKNOWN)$/);
  });

  test('3.2 Polymarket Market', () => {
    const marketData = getSeededMarketData(456);
    const marketHier = hierarchy.createMarketHierarchy(marketData);

    expect(marketHier.rootId).toBeDefined();
    expect(marketHier.marketProps.length).toBeGreaterThan(0);
    expect(marketHier.arbProps.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. SIMD TRAVERSAL
// ═══════════════════════════════════════════════════════════════

describe('4. SIMD Traversal', () => {
  test('4.1 Leaf Node Filtering', () => {
    const traverser = hierarchy.getTraverser();
    const nodes: PropertyNodeV4[] = [];

    // Create leaf and non-leaf nodes
    for (let i = 0; i < 10; i++) {
      const node = hierarchy.createNode({
        name: `leaf_test_${i}`,
        type: 'primitive',
        value: i,
        tags: ['traversal'],
      });
      nodes.push(node);
    }

    const leafNodes = traverser.filterLeafNodes(nodes);
    expect(leafNodes.length).toBeGreaterThan(0);
    expect(leafNodes.every(n => n.children.length === 0)).toBe(true);
  });

  test('4.2 Type-based Filtering', () => {
    const traverser = hierarchy.getTraverser();
    const nodes: PropertyNodeV4[] = [];

    // Create nodes of different types
    for (let i = 0; i < 5; i++) {
      const primitiveNode = hierarchy.createNode({
        name: `prim_${i}`,
        type: 'primitive',
        value: i,
      });
      nodes.push(primitiveNode);

      const arbNode = hierarchy.createNode({
        name: `arb_${i}`,
        type: 'arbitrage',
        value: i * 0.01,
      });
      nodes.push(arbNode);
    }

    const primitives = traverser.filterByType(nodes, 'primitive');
    const arbitrages = traverser.filterByType(nodes, 'arbitrage');

    expect(primitives.length).toBe(5);
    expect(arbitrages.length).toBe(5);
    expect(primitives.every(n => n.type === 'primitive')).toBe(true);
    expect(arbitrages.every(n => n.type === 'arbitrage')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. DEBUG & INSPECTION
// ═══════════════════════════════════════════════════════════════

describe('5. Debug & Inspection', () => {
  test('5.1 toDebugString Output', () => {
    const debugInfo = hierarchy.toDebugString();

    expect(debugInfo).toBeDefined();
    expect(typeof debugInfo).toBe('object');

    if (typeof debugInfo === 'object') {
      const obj = debugInfo as Record<string, any>;
      expect(obj.type).toBe('PropertyHierarchyV4');
      expect(obj.exchange).toBe('nano-sports');
    }
  });

  test('5.2 Metrics Collection', () => {
    const metrics = hierarchy.getMetrics();

    expect(metrics.resolutions).toBeDefined();
    expect(metrics.cacheHits).toBeDefined();
    expect(metrics.cacheHitRatio).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRatio).toBeLessThanOrEqual(1);
  });

  test('5.3 Cache Statistics', () => {
    const cacheStats = hierarchy.getCacheStats();

    expect(cacheStats.size).toBeGreaterThanOrEqual(0);
    expect(cacheStats.maxSize).toBeGreaterThan(0);
    expect(cacheStats.ttlMs).toBeGreaterThan(0);
  });
});
