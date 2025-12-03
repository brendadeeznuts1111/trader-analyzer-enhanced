import { test, expect, describe } from 'bun:test';
import {
  marketCanonicalizer,
  ORCA_NAMESPACE,
  EXCHANGE_NAMESPACES,
  type MarketExchange,
  type MarketType,
} from '../lib/canonical';
import { apiCacheManager } from '../lib/api';
import { marketFetcher } from '../lib/markets';

/**
 * Critical Path Tests for Canonical UUID System
 *
 * These tests verify the core functionality that must work correctly:
 * 1. UUID determinism - same input always produces same UUID
 * 2. UUID uniqueness - different inputs produce different UUIDs
 * 3. Cache operations - set/get/invalidate work correctly
 * 4. Market fetcher - integrates canonicalizer and cache
 */

describe('UUIDv5 Canonicalizer', () => {
  describe('Determinism', () => {
    test('same input produces identical UUID', () => {
      const input = {
        exchange: 'polymarket' as MarketExchange,
        nativeId: 'btc-100k-2025',
        type: 'binary' as MarketType,
      };

      const result1 = marketCanonicalizer.canonicalize(input);
      const result2 = marketCanonicalizer.canonicalize(input);

      expect(result1.uuid).toBe(result2.uuid);
      expect(result1.salt).toBe(result2.salt);
    });

    test('UUID is deterministic across multiple calls', () => {
      const uuids = new Set<string>();
      const input = {
        exchange: 'kalshi' as MarketExchange,
        nativeId: 'fed-rate-cut',
        type: 'binary' as MarketType,
      };

      // Generate 100 UUIDs with same input
      for (let i = 0; i < 100; i++) {
        const result = marketCanonicalizer.canonicalize(input);
        uuids.add(result.uuid);
      }

      // All should be identical
      expect(uuids.size).toBe(1);
    });

    test('rawUUIDv5 is deterministic', () => {
      const name = 'test-market-123';
      const uuid1 = marketCanonicalizer.rawUUIDv5(name, ORCA_NAMESPACE);
      const uuid2 = marketCanonicalizer.rawUUIDv5(name, ORCA_NAMESPACE);

      expect(uuid1).toBe(uuid2);
    });
  });

  describe('Uniqueness', () => {
    test('different nativeIds produce different UUIDs', () => {
      const base = { exchange: 'polymarket' as MarketExchange, type: 'binary' as MarketType };

      const uuid1 = marketCanonicalizer.canonicalize({ ...base, nativeId: 'market-a' }).uuid;
      const uuid2 = marketCanonicalizer.canonicalize({ ...base, nativeId: 'market-b' }).uuid;

      expect(uuid1).not.toBe(uuid2);
    });

    test('different exchanges produce different UUIDs', () => {
      const base = { nativeId: 'same-market', type: 'binary' as MarketType };

      const uuid1 = marketCanonicalizer.canonicalize({
        ...base,
        exchange: 'polymarket' as MarketExchange,
      }).uuid;
      const uuid2 = marketCanonicalizer.canonicalize({
        ...base,
        exchange: 'kalshi' as MarketExchange,
      }).uuid;

      expect(uuid1).not.toBe(uuid2);
    });

    test('different types produce different UUIDs', () => {
      const base = { exchange: 'bitmex' as MarketExchange, nativeId: 'XBTUSD' };

      const uuid1 = marketCanonicalizer.canonicalize({
        ...base,
        type: 'perpetual' as MarketType,
      }).uuid;
      const uuid2 = marketCanonicalizer.canonicalize({
        ...base,
        type: 'scalar' as MarketType,
      }).uuid;

      expect(uuid1).not.toBe(uuid2);
    });

    test('sports salt components affect UUID', () => {
      const base = {
        exchange: 'sports' as MarketExchange,
        nativeId: 'nfl-game-1',
        type: 'binary' as MarketType,
        bookId: 'dk',
      };

      const uuid1 = marketCanonicalizer.canonicalize({ ...base, home: 'KC', away: 'SF' }).uuid;
      const uuid2 = marketCanonicalizer.canonicalize({ ...base, home: 'SF', away: 'KC' }).uuid;

      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('UUID Format', () => {
    test('UUID matches RFC 4122 format', () => {
      const result = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: 'test',
        type: 'binary',
      });

      // UUIDv5 format: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.uuid).toMatch(uuidRegex);
    });

    test('UUID version is 5', () => {
      const result = marketCanonicalizer.canonicalize({
        exchange: 'kalshi',
        nativeId: 'test',
        type: 'binary',
      });

      // Version is in position 14 (0-indexed), should be '5'
      expect(result.uuid[14]).toBe('5');
    });
  });

  describe('Canonical Market Structure', () => {
    test('returns complete CanonicalMarket object', () => {
      const result = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: 'btc-price-100k',
        type: 'binary',
      });

      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('exchange', 'polymarket');
      expect(result).toHaveProperty('nativeId', 'btc-price-100k');
      expect(result).toHaveProperty('type', 'binary');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('canonicalizedAt');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('apiMetadata');
    });

    test('apiMetadata contains required fields', () => {
      const result = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: 'test',
        type: 'binary',
      });

      expect(result.apiMetadata).toHaveProperty('headers');
      expect(result.apiMetadata).toHaveProperty('endpoint');
      expect(result.apiMetadata).toHaveProperty('cacheKey');
    });

    test('tags include exchange and type', () => {
      const result = marketCanonicalizer.canonicalize({
        exchange: 'kalshi',
        nativeId: 'test',
        type: 'scalar',
      });

      expect(result.tags).toContain('kalshi');
      expect(result.tags).toContain('scalar');
    });
  });

  describe('Exchange Namespaces', () => {
    test('all exchanges have unique namespaces', () => {
      const namespaces = Object.values(EXCHANGE_NAMESPACES);
      const uniqueNamespaces = new Set(namespaces);

      expect(uniqueNamespaces.size).toBe(namespaces.length);
    });

    test('namespace affects UUID generation', () => {
      const name = 'test-market';

      const uuid1 = marketCanonicalizer.rawUUIDv5(name, EXCHANGE_NAMESPACES.polymarket);
      const uuid2 = marketCanonicalizer.rawUUIDv5(name, EXCHANGE_NAMESPACES.kalshi);

      expect(uuid1).not.toBe(uuid2);
    });
  });
});

describe('Cache Manager', () => {
  const testCanonical = marketCanonicalizer.canonicalize({
    exchange: 'polymarket',
    nativeId: 'cache-test-market',
    type: 'binary',
  });

  describe('Basic Operations', () => {
    test('set and get work correctly', async () => {
      const testData = { price: 0.65, volume: 10000 };

      await apiCacheManager.set(testCanonical, '/test', 'GET', testData, 200);
      const cached = await apiCacheManager.get(testCanonical.uuid, '/test', 'GET');

      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(testData);
    });

    test('has returns true for cached entries', async () => {
      const canonical = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: 'has-test',
        type: 'binary',
      });

      await apiCacheManager.set(canonical, '/test', 'GET', { test: true }, 200);

      expect(apiCacheManager.has(canonical.uuid)).toBe(true);
    });

    test('has returns false for non-existent entries', () => {
      expect(apiCacheManager.has('non-existent-uuid')).toBe(false);
    });

    test('get returns null for non-existent entries', async () => {
      const result = await apiCacheManager.get('non-existent-uuid');
      expect(result).toBeNull();
    });
  });

  describe('Invalidation', () => {
    test('invalidate by UUID removes entry', async () => {
      const canonical = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: 'invalidate-test',
        type: 'binary',
      });

      await apiCacheManager.set(canonical, '/test', 'GET', { data: 1 }, 200);
      expect(apiCacheManager.has(canonical.uuid)).toBe(true);

      apiCacheManager.invalidate({ uuid: canonical.uuid });
      expect(apiCacheManager.has(canonical.uuid)).toBe(false);
    });

    test('invalidate by exchange removes all exchange entries', async () => {
      // Add multiple entries for same exchange
      for (let i = 0; i < 3; i++) {
        const canonical = marketCanonicalizer.canonicalize({
          exchange: 'manifold',
          nativeId: `manifold-test-${i}`,
          type: 'binary',
        });
        await apiCacheManager.set(canonical, '/test', 'GET', { i }, 200);
      }

      const deleted = apiCacheManager.invalidate({ exchange: 'manifold' });
      expect(deleted).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Statistics', () => {
    test('getStats returns valid structure', () => {
      const stats = apiCacheManager.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('sizeBytes');
      expect(stats).toHaveProperty('byExchange');
    });

    test('cache get returns data and hitCount', async () => {
      const canonical = marketCanonicalizer.canonicalize({
        exchange: 'polymarket',
        nativeId: `hit-count-test-${Date.now()}`,
        type: 'binary',
      });

      await apiCacheManager.set(canonical, '/test', 'GET', { x: 1 }, 200);

      // Get returns data with hitCount
      const result = await apiCacheManager.get(canonical.uuid, '/test', 'GET');
      expect(result).not.toBeNull();
      expect(result?.data).toEqual({ x: 1 });
      expect(result?.hitCount).toBeGreaterThanOrEqual(1);
      expect(result?.cachedAt).toBeDefined();
    });
  });
});

describe('Market Fetcher', () => {
  describe('Canonical Integration', () => {
    test('getCanonicalUUID returns deterministic UUID', () => {
      const query = { exchange: 'polymarket' as MarketExchange, nativeId: 'fetcher-test' };

      const uuid1 = marketFetcher.getCanonicalUUID(query);
      const uuid2 = marketFetcher.getCanonicalUUID(query);

      expect(uuid1).toBe(uuid2);
    });

    test('getCanonical returns full CanonicalMarket', () => {
      const query = { exchange: 'polymarket' as MarketExchange, nativeId: 'fetcher-test-2' };

      const canonical = marketFetcher.getCanonical(query);

      expect(canonical).toHaveProperty('uuid');
      expect(canonical).toHaveProperty('exchange', 'polymarket');
      expect(canonical).toHaveProperty('nativeId', 'fetcher-test-2');
    });
  });

  describe('Cache Integration', () => {
    test('isCached returns false for fresh queries', () => {
      const query = {
        exchange: 'kalshi' as MarketExchange,
        nativeId: `fresh-query-${Date.now()}`,
      };

      expect(marketFetcher.isCached(query)).toBe(false);
    });

    test('invalidateMarket removes cached entry', async () => {
      const query = {
        exchange: 'polymarket' as MarketExchange,
        nativeId: 'invalidate-fetcher-test',
      };

      // First, cache something
      const canonical = marketFetcher.getCanonical(query);
      await apiCacheManager.set(canonical, '/test', 'GET', { test: true }, 200);

      // Verify it's cached
      expect(marketFetcher.isCached(query)).toBe(true);

      // Invalidate
      marketFetcher.invalidateMarket(query);

      // Should be gone
      expect(marketFetcher.isCached(query)).toBe(false);
    });

    test('getCacheStats returns exchange-specific stats', () => {
      const stats = marketFetcher.getCacheStats('polymarket');

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });
});

describe('End-to-End Critical Path', () => {
  test('full flow: canonicalize -> cache -> retrieve', async () => {
    // 1. Generate canonical UUID
    const canonical = marketCanonicalizer.canonicalize({
      exchange: 'polymarket',
      nativeId: 'e2e-test-market',
      type: 'binary',
    });

    expect(canonical.uuid).toBeDefined();

    // 2. Cache data
    const marketData = {
      price: 0.72,
      volume: 50000,
      lastUpdate: new Date().toISOString(),
    };

    await apiCacheManager.set(canonical, '/markets/e2e-test', 'GET', marketData, 200);

    // 3. Retrieve from cache
    const cached = await apiCacheManager.get(canonical.uuid, '/markets/e2e-test', 'GET');

    expect(cached).not.toBeNull();
    expect(cached?.data).toEqual(marketData);

    // 4. Verify stats updated
    const stats = apiCacheManager.getStats('polymarket');
    expect(stats.hits).toBeGreaterThan(0);
  });

  test('UUID consistency across system boundary', () => {
    const input = {
      exchange: 'sports' as MarketExchange,
      nativeId: 'nfl-superbowl-2025',
      type: 'binary' as MarketType,
      bookId: 'draftkings',
      home: 'KC',
      away: 'PHI',
    };

    // Generate via canonicalizer
    const canonical = marketCanonicalizer.canonicalize(input);

    // Generate via fetcher
    const fetcherUUID = marketFetcher.getCanonicalUUID(input);

    // Should match
    expect(canonical.uuid).toBe(fetcherUUID);
  });
});
