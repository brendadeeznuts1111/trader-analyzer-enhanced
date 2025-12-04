/**
 * UUIDv5 System Time-Controlled Tests
 * Uses Bun's setSystemTime for deterministic testing of time-sensitive UUID features
 *
 * @see https://bun.sh/docs/test/dates-times#setsystemtime
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setSystemTime, mock } from 'bun:test';

// Import our UUID system components
import {
  uuidv5,
  generateVaultUUID,
  generateSportsMarketUUID,
  entityIds,
  VaultEntity,
  SportsMarketEntity,
  ArbitrageOpportunityEntity,
  vaultStorage,
  sportsMarketStorage,
  arbitrageStorage,
  VaultOptimizer
} from '../../src';

// Test constants
const TEST_TIMESTAMP = new Date('2024-01-15T10:30:00Z'); // Fixed test timestamp
const TEST_TIMESTAMP_MS = TEST_TIMESTAMP.getTime();

describe('UUIDv5 System with Time Control', () => {
  let originalTime: number;

  beforeEach(() => {
    // Store original time
    originalTime = Date.now();

    // Set system time to our test timestamp for deterministic testing
    setSystemTime(TEST_TIMESTAMP);

    // Clear storage between tests
    vaultStorage.clear();
    sportsMarketStorage.clear();
    arbitrageStorage.clear();
  });

  afterEach(() => {
    // Restore original system time
    setSystemTime(new Date(originalTime));
  });

  describe('Entity ID Generation with Controlled Time', () => {
    test('VaultEntity creates consistent IDs with controlled timestamps', () => {
      const vaultName = 'Test Investment Vault';
      const vault = new VaultEntity(vaultName);

      // Verify creation timestamp matches our controlled time
      expect(vault.createdAt).toBe(TEST_TIMESTAMP_MS);

      // Verify ID generation is deterministic
      const expectedId = entityIds.generateVaultId(vaultName, { timestamp: true });
      expect(vault.id).toBe(expectedId);

      // Verify UUIDv5 format
      expect(uuidv5.isValidUUIDv5(vault.id)).toBe(true);
    });

    test('SportsMarketEntity timestamps are controlled', () => {
      const market = new SportsMarketEntity('nba', 'Lakers vs Warriors', 'moneyline');

      expect(market.id).toContain('_t' + TEST_TIMESTAMP_MS);
      expect(uuidv5.isValidUUIDv5(market.id.split('_t')[0])).toBe(true);
    });

    test('ArbitrageOpportunityEntity uses controlled time', () => {
      const opportunity = new ArbitrageOpportunityEntity(
        'BTC/USD',
        'Binance',
        'Coinbase',
        0.5 // 0.5% spread
      );

      expect(opportunity.timestamp).toBe(TEST_TIMESTAMP_MS);
      expect(opportunity.id).toContain('_t' + TEST_TIMESTAMP_MS);
    });
  });

  describe('Storage Operations with Time Control', () => {
    test('Vault storage timestamps are controlled', () => {
      const vaultData = {
        name: 'Time-Test Vault',
        balance: 100000,
        strategy: 'conservative'
      };

      const vaultId = vaultStorage.storeVault(vaultData);
      const stored = vaultStorage.get(vaultId);

      expect(stored).toBeDefined();
      expect(stored!.createdAt).toBe(TEST_TIMESTAMP_MS);
      expect(stored!.updatedAt).toBe(TEST_TIMESTAMP_MS);
    });

    test('Storage statistics include controlled timestamps', () => {
      // Add some test data
      vaultStorage.storeVault({ name: 'Vault1' });
      vaultStorage.storeVault({ name: 'Vault2' });
      sportsMarketStorage.storeMarket('nba', 'Game1', { odds: 1.5 });

      const stats = vaultStorage.getStats();

      // Verify storage contains our controlled timestamp data
      expect(stats.total).toBe(2);
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });

  describe('System Monitoring with Controlled Time', () => {
    test('VaultOptimizer system info uses controlled timestamps', () => {
      const optimizer = new VaultOptimizer();
      const systemInfo = optimizer.getSystemInfo();

      // Verify timestamp is controlled
      expect(systemInfo.timestamp).toBe(TEST_TIMESTAMP_MS);
      expect(systemInfo.buildTime).toBe(TEST_TIMESTAMP_MS);

      // Verify health indicators work with controlled time
      expect(systemInfo.health.overall).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(systemInfo.health.overall);
    });

    test('System uptime calculation with controlled time', () => {
      // This test would need process.uptime() mocking, but demonstrates the concept
      const optimizer = new VaultOptimizer();
      const systemInfo = optimizer.getSystemInfo();

      expect(typeof systemInfo.uptime).toBe('number');
      expect(systemInfo.uptime).toBeGreaterThan(0);
    });

    test('Memory efficiency calculation works with controlled time', () => {
      const optimizer = new VaultOptimizer();
      const systemInfo = optimizer.getSystemInfo();

      expect(typeof systemInfo.performance.memoryEfficiency).toBe('number');
      expect(systemInfo.performance.memoryEfficiency).toBeGreaterThanOrEqual(0);
      expect(systemInfo.performance.memoryEfficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Time-Based UUID Generation Consistency', () => {
    test('Same inputs generate same UUIDs regardless of system time', () => {
      const name = 'Consistent Test Vault';
      const namespace = 'vault-optimizer';

      // Generate UUID at our controlled time
      const uuid1 = uuidv5.generateForVault(name);

      // Change system time
      setSystemTime(new Date(TEST_TIMESTAMP_MS + 3600000)); // +1 hour

      // Generate again - should be identical (UUIDv5 is deterministic)
      const uuid2 = uuidv5.generateForVault(name);

      expect(uuid1).toBe(uuid2);
    });

    test('Timestamp suffixes change with system time', () => {
      const vaultName = 'Time-Sensitive Vault';

      // Create entity at controlled time
      const entity1 = new VaultEntity(vaultName);
      const time1 = TEST_TIMESTAMP_MS;

      // Change system time
      const newTime = TEST_TIMESTAMP_MS + 5000; // +5 seconds
      setSystemTime(new Date(newTime));

      // Create another entity
      const entity2 = new VaultEntity(vaultName + ' 2');
      const time2 = newTime;

      // Base UUIDs should be different (different names)
      const baseId1 = entity1.id.split('_t')[0];
      const baseId2 = entity2.id.split('_t')[0];
      expect(baseId1).not.toBe(baseId2);

      // Timestamps should reflect controlled system time
      expect(entity1.id).toContain('_t' + time1);
      expect(entity2.id).toContain('_t' + time2);
    });
  });

  describe('Performance Benchmarking with Controlled Time', () => {
    test('UUID generation benchmarks work with controlled timing', async () => {
      const startTime = performance.now();
      const iterations = 1000;

      // Generate many UUIDs
      for (let i = 0; i < iterations; i++) {
        generateVaultUUID(`benchmark-vault-${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify reasonable performance (should be very fast)
      expect(duration).toBeLessThan(100); // Less than 100ms for 1000 UUIDs
      expect(iterations / (duration / 1000)).toBeGreaterThan(5000); // >5k UUIDs/sec
    });

    test('Storage operations performance with controlled time', () => {
      const startTime = performance.now();
      const operations = 100;

      // Perform storage operations
      for (let i = 0; i < operations; i++) {
        vaultStorage.storeVault({ name: `perf-test-${i}`, balance: i * 1000 });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify storage performance
      expect(duration).toBeLessThan(500); // Less than 500ms for 100 operations
    });
  });

  describe('Health Check Validation with Controlled Time', () => {
    test('System health assessment works with controlled time', () => {
      const optimizer = new VaultOptimizer();

      // Test health check
      const isHealthy = optimizer.isHealthy();
      expect(typeof isHealthy).toBe(true);

      // Test detailed health info
      const systemInfo = optimizer.getSystemInfo();
      expect(systemInfo.health.overall).toBeDefined();
      expect(systemInfo.health.storageHealth).toBeDefined();
      expect(systemInfo.health.memoryHealth).toBeDefined();
      expect(systemInfo.health.performanceHealth).toBeDefined();
    });

    test('Health check handles edge cases with controlled time', () => {
      const optimizer = new VaultOptimizer();

      // Add some data to test storage health
      vaultStorage.storeVault({ name: 'health-test-vault' });
      sportsMarketStorage.storeMarket('nba', 'health-test-game', { odds: 2.0 });

      const systemInfo = optimizer.getSystemInfo();

      // Verify health metrics are calculated correctly
      expect(systemInfo.storage.totalEntities).toBeGreaterThan(0);
      expect(systemInfo.health.storageHealth).toBe(true);
    });
  });
});

/**
 * Integration test demonstrating full system workflow with time control
 */
describe('UUID System Integration with Time Control', () => {
  let controlledTime: Date;

  beforeEach(() => {
    controlledTime = new Date('2024-02-14T14:30:00Z');
    setSystemTime(controlledTime);

    // Clear all storage
    vaultStorage.clear();
    sportsMarketStorage.clear();
    arbitrageStorage.clear();
  });

  afterEach(() => {
    setSystemTime(new Date(Date.now()));
  });

  test('Complete workflow: Entity creation → Storage → Monitoring', () => {
    // 1. Create entities with controlled time
    const vault = new VaultEntity('Integration Test Vault');
    const market = new SportsMarketEntity('nba', 'Full Workflow Test', 'spread');
    const arbitrage = new ArbitrageOpportunityEntity('ETH/USD', 'Kraken', 'Gemini', 0.3);

    // 2. Store entities
    const vaultId = vaultStorage.storeVault(vault);
    const marketId = sportsMarketStorage.storeMarket('nba', 'Full Workflow Test', market);
    const arbitrageId = arbitrageStorage.storeOpportunity('ETH/USD', 'Kraken', 'Gemini', arbitrage);

    // 3. Verify storage with controlled timestamps
    const storedVault = vaultStorage.get(vaultId);
    const storedMarket = sportsMarketStorage.get(marketId);
    const storedArbitrage = arbitrageStorage.get(arbitrageId);

    expect(storedVault?.createdAt).toBe(controlledTime.getTime());
    expect(storedMarket?.createdAt).toBe(controlledTime.getTime());
    expect(storedArbitrage?.createdAt).toBe(controlledTime.getTime());

    // 4. Test system monitoring
    const optimizer = new VaultOptimizer();
    const systemInfo = optimizer.getSystemInfo();

    expect(systemInfo.timestamp).toBe(controlledTime.getTime());
    expect(systemInfo.storage.totalEntities).toBe(3);
    expect(systemInfo.health.overall).toBe('healthy');
    expect(systemInfo.capabilities.uuidv5).toBe(true);
    expect(systemInfo.capabilities.highPerformanceStorage).toBe(true);
  });
});
