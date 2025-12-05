/**
 * Unified Pipeline Tests
 * [[TECH][TEST][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=TEST-PIPELINE-001;version=0.1.16}]
 * [CLASS:PipelineTests][#REF:v-0.1.16.TEST.PIPELINE.1.0.A.1.1]]
 *
 * Test coverage:
 * - LRU cache: O(1) operations, TTL expiration, LRU eviction
 * - Retry logic: exponential backoff, jitter, max retries
 * - SQLite adapter: CRUD, time range queries, batch insert
 * - Pipeline orchestration: event emission, stats tracking, health checks
 * - Performance: 10k cache ops <100ms, 1k SQLite inserts <500ms
 *
 * Run: bun test tests/unified-pipeline.test.ts
 *
 * [#REF:PIPELINE-TESTS]
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  LRUCache,
  withRetry,
  UnifiedPipeline,
  SQLiteAdapter,
  type MarketDataRecord,
} from '../src/pipeline/unified-pipeline';

// ═══════════════════════════════════════════════════════════════════════════
// LRU CACHE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('LRUCache', () => {
  test('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    cache.set('key1', 100);
    cache.set('key2', 200);
    
    expect(cache.get('key1')).toBe(100);
    expect(cache.get('key2')).toBe(200);
  });

  test('should return undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  test('should evict oldest entry when at capacity', () => {
    const cache = new LRUCache<string, number>(3, 60000);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Should evict 'a'
    
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  test('should update LRU order on access', () => {
    const cache = new LRUCache<string, number>(3, 60000);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Access 'a' to make it most recently used
    cache.get('a');
    
    // Add new entry - should evict 'b' (now oldest)
    cache.set('d', 4);
    
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  test('should expire entries after TTL', async () => {
    const cache = new LRUCache<string, number>(10, 50); // 50ms TTL
    
    cache.set('key', 100);
    expect(cache.get('key')).toBe(100);
    
    // Wait for expiry
    await Bun.sleep(60);
    
    expect(cache.get('key')).toBeUndefined();
  });

  test('should support custom TTL per entry', async () => {
    const cache = new LRUCache<string, number>(10, 1000);
    
    cache.set('short', 100, 50); // 50ms TTL
    cache.set('long', 200, 5000); // 5s TTL
    
    await Bun.sleep(60);
    
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe(200);
  });

  test('should clear all entries', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  test('should delete specific entries', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  test('should report correct stats', () => {
    const cache = new LRUCache<string, number>(100, 30000);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(100);
    expect(stats.ttlMs).toBe(30000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RETRY LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('withRetry', () => {
  test('should return result on first success', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return 'success';
    };

    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  test('should retry on failure and succeed', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    };

    const result = await withRetry(fn, {
      maxRetries: 5,
      baseDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
    });
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should throw after max retries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('Persistent failure');
    };

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      })
    ).rejects.toThrow('Persistent failure');
    
    expect(attempts).toBe(4); // Initial + 3 retries
  });

  test('should use exponential backoff', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();
    let attempts = 0;

    const fn = async () => {
      const now = Date.now();
      if (attempts > 0) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      attempts++;
      
      if (attempts < 4) {
        throw new Error('Fail');
      }
      return 'success';
    };

    await withRetry(fn, {
      maxRetries: 5,
      baseDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2,
    });

    // Delays should roughly follow: 50, 100, 200 (with jitter and system variance)
    // Using wider bounds to account for CI/system load variance
    expect(delays[0]).toBeGreaterThan(30);
    expect(delays[0]).toBeLessThan(150);
    expect(delays[1]).toBeGreaterThan(60);
    expect(delays[1]).toBeLessThan(250);
    expect(delays[2]).toBeGreaterThan(120);
    expect(delays[2]).toBeLessThan(400);
  });

  test('should respect maxDelayMs cap', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();
    let attempts = 0;

    const fn = async () => {
      const now = Date.now();
      if (attempts > 0) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      attempts++;
      
      if (attempts < 6) {
        throw new Error('Fail');
      }
      return 'success';
    };

    await withRetry(fn, {
      maxRetries: 10,
      baseDelayMs: 50,
      maxDelayMs: 100, // Cap at 100ms
      backoffMultiplier: 2,
    });

    // All delays after the first should be capped at ~100ms (with system variance)
    delays.slice(2).forEach(delay => {
      expect(delay).toBeLessThan(200); // 100 + jitter + system variance
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SQLITE ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    // Use in-memory database for tests
    adapter = new SQLiteAdapter(':memory:');
  });

  afterEach(() => {
    adapter.close();
  });

  test('should insert and retrieve records', async () => {
    const records: MarketDataRecord[] = [
      {
        id: 'test-1',
        symbol: 'BTC',
        timestamp: Date.now(),
        open: 95000,
        high: 96000,
        low: 94000,
        close: 95500,
        volume: 1000000,
        source: 'sqlite',
      },
      {
        id: 'test-2',
        symbol: 'BTC',
        timestamp: Date.now() - 3600000,
        open: 94000,
        high: 95000,
        low: 93000,
        close: 95000,
        volume: 800000,
        source: 'sqlite',
      },
    ];

    adapter.insertRecords(records);

    const retrieved = await adapter.fetch('BTC:10');
    
    expect(retrieved.length).toBe(2);
    expect(retrieved[0].symbol).toBe('BTC');
    expect(retrieved[0].close).toBe(95500);
  });

  test('should filter by time range', async () => {
    const now = Date.now();
    const records: MarketDataRecord[] = [
      {
        id: 'old',
        symbol: 'ETH',
        timestamp: now - 86400000 * 2, // 2 days ago
        open: 3000,
        high: 3100,
        low: 2900,
        close: 3050,
        volume: 500000,
        source: 'sqlite',
      },
      {
        id: 'recent',
        symbol: 'ETH',
        timestamp: now - 3600000, // 1 hour ago
        open: 3500,
        high: 3600,
        low: 3400,
        close: 3550,
        volume: 600000,
        source: 'sqlite',
      },
    ];

    adapter.insertRecords(records);

    // Query last 24 hours
    const from = now - 86400000;
    const to = now;
    const retrieved = await adapter.fetch(`ETH:${from}:${to}`);
    
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].id).toBe('recent');
  });

  test('should handle empty results', async () => {
    const retrieved = await adapter.fetch('NONEXISTENT:10');
    expect(retrieved).toEqual([]);
  });

  test('should update existing records (upsert)', async () => {
    const record: MarketDataRecord = {
      id: 'upsert-test',
      symbol: 'SOL',
      timestamp: Date.now(),
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 100000,
      source: 'sqlite',
    };

    adapter.insertRecords([record]);
    
    // Update with same ID
    record.close = 108;
    adapter.insertRecords([record]);

    const retrieved = await adapter.fetch('SOL:10');
    
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].close).toBe(108);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED PIPELINE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('UnifiedPipeline', () => {
  let pipeline: UnifiedPipeline;

  beforeEach(() => {
    pipeline = new UnifiedPipeline();
  });

  test('should register adapters', () => {
    const sqliteAdapter = new SQLiteAdapter(':memory:');
    pipeline.registerAdapter(sqliteAdapter);

    const adapters = pipeline.getAdapters();
    
    expect(adapters.length).toBe(1);
    expect(adapters[0].type).toBe('sqlite');
    expect(adapters[0].name).toBe('SQLite Database');
    
    sqliteAdapter.close();
  });

  test('should emit events on ingest', async () => {
    const sqliteAdapter = new SQLiteAdapter(':memory:');
    pipeline.registerAdapter(sqliteAdapter);

    const events: string[] = [];
    
    pipeline.on('ingest:start', () => events.push('start'));
    pipeline.on('ingest:complete', () => events.push('complete'));
    pipeline.on('ingest:error', () => events.push('error'));

    // Insert test data
    sqliteAdapter.insertRecords([
      {
        id: 'event-test',
        symbol: 'BTC',
        timestamp: Date.now(),
        open: 95000,
        high: 96000,
        low: 94000,
        close: 95500,
        volume: 1000000,
        source: 'sqlite',
      },
    ]);

    await pipeline.ingest('sqlite', 'BTC:10');
    
    expect(events).toContain('start');
    expect(events).toContain('complete');
    expect(events).not.toContain('error');
    
    sqliteAdapter.close();
  });

  test('should track statistics', async () => {
    const sqliteAdapter = new SQLiteAdapter(':memory:');
    pipeline.registerAdapter(sqliteAdapter);

    // Insert test data
    sqliteAdapter.insertRecords([
      {
        id: 'stats-test-1',
        symbol: 'BTC',
        timestamp: Date.now(),
        open: 95000,
        high: 96000,
        low: 94000,
        close: 95500,
        volume: 1000000,
        source: 'sqlite',
      },
      {
        id: 'stats-test-2',
        symbol: 'BTC',
        timestamp: Date.now() - 3600000,
        open: 94000,
        high: 95000,
        low: 93000,
        close: 95000,
        volume: 800000,
        source: 'sqlite',
      },
    ]);

    await pipeline.ingest('sqlite', 'BTC:10');
    
    const stats = pipeline.getStats();
    
    expect(stats.totalRecords).toBe(2);
    expect(stats.successfulIngests).toBe(1);
    expect(stats.failedIngests).toBe(0);
    
    sqliteAdapter.close();
  });

  test('should report healthy status', async () => {
    const sqliteAdapter = new SQLiteAdapter(':memory:');
    pipeline.registerAdapter(sqliteAdapter);

    sqliteAdapter.insertRecords([
      {
        id: 'health-test',
        symbol: 'ETH',
        timestamp: Date.now(),
        open: 3500,
        high: 3600,
        low: 3400,
        close: 3550,
        volume: 500000,
        source: 'sqlite',
      },
    ]);

    await pipeline.ingest('sqlite', 'ETH:10');
    
    expect(pipeline.isHealthy()).toBe(true);
    
    sqliteAdapter.close();
  });

  test('should throw for unregistered adapter', async () => {
    await expect(pipeline.ingest('polygon', 'AAPL:1d:100')).rejects.toThrow(
      'No adapter registered for source: polygon'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Performance', () => {
  test('LRU cache should handle 10k operations in < 100ms', () => {
    const cache = new LRUCache<string, number>(1000, 60000);
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      cache.set(`key-${i}`, i);
    }

    for (let i = 0; i < 10000; i++) {
      cache.get(`key-${i % 1000}`);
    }

    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(100);
  });

  test('SQLite batch insert should handle 1k records in < 500ms', async () => {
    const adapter = new SQLiteAdapter(':memory:');
    const records: MarketDataRecord[] = [];

    for (let i = 0; i < 1000; i++) {
      records.push({
        id: `perf-${i}`,
        symbol: 'BTC',
        timestamp: Date.now() - i * 60000,
        open: 95000 + Math.random() * 1000,
        high: 96000 + Math.random() * 1000,
        low: 94000 + Math.random() * 1000,
        close: 95500 + Math.random() * 1000,
        volume: Math.floor(Math.random() * 1000000),
        source: 'sqlite',
      });
    }

    const start = performance.now();
    adapter.insertRecords(records);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    
    adapter.close();
  });
});
