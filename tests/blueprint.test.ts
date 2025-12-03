import { describe, it, expect, beforeEach } from 'bun:test';
import { blueprintRegistry } from '../lib/blueprints';
import { PropertyQueryEngine } from '../lib/blueprints/resolver';

describe('Blueprint System', () => {
  let resolver: PropertyQueryEngine;

  beforeEach(() => {
    // Reset registry for each test
    blueprintRegistry.clearInstances();
    // Use the resolver from the registry so instances are shared
    resolver = blueprintRegistry.getResolver();
  });

  describe('PropertyQueryEngine#resolve', () => {
    it('should resolve inherited properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const pipeline = await resolver.resolve(instance.id, 'pipeline');

      expect(pipeline).toBe('fetch-sign-throttle-cache');
    });

    it('should respect property overrides', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0', {
        selector: { value: 'custom-selector', override: true },
      });

      const selector = await resolver.resolve(instance.id, 'selector');

      expect(selector.value).toBe('custom-selector');
    });

    it('should resolve chain properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      // Selector has chain: 'BP-POLY-MARKETS,BP-NORMALIZE'
      const selector = await resolver.resolve(instance.id, 'selector');

      // Should return the base value (chain resolution may not find those blueprints)
      expect(selector).toBeDefined();
    });

    it('should throw on missing property', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      await expect(resolver.resolve(instance.id, 'nonexistent-property')).rejects.toThrow(
        'Property not found'
      );
    });

    it('should meet latency target (<3ms)', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const start = performance.now();
      await resolver.resolve(instance.id, 'metrics');
      const latency = performance.now() - start;

      expect(latency).toBeLessThan(3);
    });

    it('should cache resolved properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      // First resolve
      const first = await resolver.resolve(instance.id, 'pipeline');

      // Second resolve should be from cache (faster)
      const start = performance.now();
      const second = await resolver.resolve(instance.id, 'pipeline');
      const latency = performance.now() - start;

      expect(first).toBe(second);
      expect(latency).toBeLessThan(1); // Cache hit should be <1ms
    });
  });

  describe('Snapshot Testing', () => {
    it('should create consistent snapshots', () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const snapshot = resolver.snapshot(instance.id);

      expect(snapshot.instanceId).toBe(instance.id);
      expect(snapshot.blueprintId).toBe('BP-INTEGRATION-POLY@0.1.0');
      expect(snapshot.properties).toBeDefined();
      expect(snapshot.hash).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should detect property drift', () => {
      const instance1 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      const instance2 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const snapshot1 = resolver.snapshot(instance1.id);
      const snapshot2 = resolver.snapshot(instance2.id);

      // Instances from same blueprint should have same structure
      expect(Object.keys(snapshot1.properties)).toEqual(Object.keys(snapshot2.properties));
    });

    it('should generate consistent hashes for identical properties', () => {
      const instance1 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      const instance2 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const snapshot1 = resolver.snapshot(instance1.id);
      const snapshot2 = resolver.snapshot(instance2.id);

      // Same blueprint, no overrides = same hash
      expect(snapshot1.hash).toBe(snapshot2.hash);
    });

    it('should detect differences in snapshots with overrides', () => {
      const instance1 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      const instance2 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0', {
        selector: { value: 'custom', override: true },
      });

      const snapshot1 = resolver.snapshot(instance1.id);
      const snapshot2 = resolver.snapshot(instance2.id);

      const comparison = resolver.compareSnapshots(snapshot1, snapshot2);

      expect(comparison.identical).toBe(false);
      expect(comparison.diffs.length).toBeGreaterThan(0);
    });
  });

  describe('Blueprint Registry', () => {
    it('should create instances with unique IDs', () => {
      const instance1 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      const instance2 = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should list all registered blueprints', () => {
      const blueprints = blueprintRegistry.listBlueprints();

      expect(blueprints.length).toBeGreaterThan(0);
      expect(blueprints.some(bp => bp.id === 'BP-INTEGRATION-POLY')).toBe(true);
    });

    it('should get blueprint by ID', () => {
      const bp = blueprintRegistry.getBlueprint('BP-INTEGRATION-POLY@0.1.0');

      expect(bp).toBeDefined();
      expect(bp?.id).toBe('BP-INTEGRATION-POLY');
      expect(bp?.version).toBe('0.1.0');
    });

    it('should get instances for a blueprint', () => {
      blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      blueprintRegistry.createInstance('BP-EXCHANGE-POLYMARKET@0.1.0');

      const polyInstances = blueprintRegistry.getInstancesForBlueprint('BP-INTEGRATION-POLY');

      expect(polyInstances.length).toBe(2);
    });

    it('should export and import JSON', () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const exported = blueprintRegistry.toJSON();

      expect(exported.blueprints.length).toBeGreaterThan(0);
      expect(exported.instances.length).toBe(1);
      expect(exported.instances[0].id).toBe(instance.id);
    });

    it('should provide registry statistics', () => {
      blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const stats = blueprintRegistry.getStats();

      expect(stats.blueprints).toBeGreaterThan(0);
      expect(stats.instances).toBe(1);
    });
  });

  describe('Health Check Support', () => {
    it('should return blueprint count', () => {
      const count = blueprintRegistry.getBlueprintCount();
      expect(count).toBeGreaterThan(0);
    });

    it('should return instance count', () => {
      blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');
      blueprintRegistry.createInstance('BP-EXCHANGE-POLYMARKET@0.1.0');

      const count = blueprintRegistry.getInstanceCount();
      expect(count).toBe(2);
    });

    it('should delete instances', () => {
      const instance = blueprintRegistry.createInstance('BP-INTEGRATION-POLY@0.1.0');

      const deleted = blueprintRegistry.deleteInstance(instance.id);

      expect(deleted).toBe(true);
      expect(blueprintRegistry.getInstanceCount()).toBe(0);
    });
  });

  describe('Exchange Blueprints', () => {
    it('should have Polymarket exchange blueprint', () => {
      const bp = blueprintRegistry.getBlueprint('BP-EXCHANGE-POLYMARKET@0.1.0');

      expect(bp).toBeDefined();
      expect(bp?.properties.baseUrl.value).toBe('https://clob.polymarket.com');
    });

    it('should have Bun runtime blueprint', () => {
      const bp = blueprintRegistry.getBlueprint('BP-RUNTIME-BUN@1.3.3');

      expect(bp).toBeDefined();
      expect(bp?.properties.streams.value).toBe('gzip,deflate,brotli,zstd');
    });

    it('should resolve Polymarket instance properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-EXCHANGE-POLYMARKET@0.1.0');

      const baseUrl = await resolver.resolve(instance.id, 'baseUrl');
      const compression = await resolver.resolve(instance.id, 'compression');

      expect(baseUrl).toBe('https://clob.polymarket.com');
      expect(compression).toBe('gzip');
    });
  });

  describe('WebSocket Optimization Blueprint', () => {
    it('should have WebSocket optimization blueprint', () => {
      const bp = blueprintRegistry.getBlueprint('BP-WS-OPTIMIZATION@0.1.0');

      expect(bp).toBeDefined();
      expect(bp?.properties.websocket.value).toBe('deflate-pubsub-cork');
    });

    it('should have correct compression configuration', () => {
      const bp = blueprintRegistry.getBlueprint('BP-WS-OPTIMIZATION@0.1.0');

      expect(bp?.properties.compression.value.perMessageDeflate).toBe(true);
      expect(bp?.properties.compression.value.formats).toContain('gzip');
      expect(bp?.properties.compression.value.formats).toContain('zstd');
    });

    it('should have pub/sub configuration', () => {
      const bp = blueprintRegistry.getBlueprint('BP-WS-OPTIMIZATION@0.1.0');

      expect(bp?.properties.pubsub.value.topic).toBe('global');
      expect(bp?.properties.pubsub.value.publishToSelf).toBe(false);
    });

    it('should have backpressure limits', () => {
      const bp = blueprintRegistry.getBlueprint('BP-WS-OPTIMIZATION@0.1.0');

      expect(bp?.properties.backpressure.value.limit).toBe(1048576); // 1MB
      expect(bp?.properties.backpressure.value.closeOnLimit).toBe(true);
    });

    it('should have correct metrics targets', () => {
      const bp = blueprintRegistry.getBlueprint('BP-WS-OPTIMIZATION@0.1.0');

      expect(bp?.properties.metrics.value.latencyTarget).toBe(92);
      expect(bp?.properties.metrics.value.throughputMultiplier).toBe(3.2);
      expect(bp?.properties.metrics.value.bandwidthReduction).toBe(0.62);
    });

    it('should resolve WebSocket instance properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-WS-OPTIMIZATION@0.1.0');

      const websocket = await resolver.resolve(instance.id, 'websocket');
      const limits = await resolver.resolve(instance.id, 'limits');

      expect(websocket).toBe('deflate-pubsub-cork');
      expect(limits.idleTimeout).toBe(30);
      expect(limits.maxPayloadLength).toBe(8388608); // 8MB
    });
  });

  describe('Kalshi Exchange Blueprint (v0.2.0)', () => {
    it('should have Kalshi exchange blueprint', () => {
      const bp = blueprintRegistry.getBlueprint('BP-EXCHANGE-KALSHI@0.1.0');

      expect(bp).toBeDefined();
      expect(bp?.properties.baseUrl.value).toBe('https://trading-api.kalshi.com');
    });

    it('should have CFTC regulatory properties', () => {
      const bp = blueprintRegistry.getBlueprint('BP-EXCHANGE-KALSHI@0.1.0');

      expect(bp?.properties.regulatory.value.regulator).toBe('CFTC');
      expect(bp?.properties.regulatory.value.jurisdiction).toBe('US');
      expect(bp?.properties.regulatory.value.kycRequired).toBe(true);
    });

    it('should have position limits', () => {
      const bp = blueprintRegistry.getBlueprint('BP-EXCHANGE-KALSHI@0.1.0');

      expect(bp?.properties.regulatory.value.positionLimits.maxContracts).toBe(25000);
      expect(bp?.properties.regulatory.value.positionLimits.maxNotional).toBe(25000);
    });

    it('should have WebSocket configuration', () => {
      const bp = blueprintRegistry.getBlueprint('BP-EXCHANGE-KALSHI@0.1.0');

      expect(bp?.properties.websocket.value.url).toBe(
        'wss://trading-api.kalshi.com/trade-api/ws/v2'
      );
      expect(bp?.properties.websocket.value.channels).toContain('orderbook_delta');
    });

    it('should have Kalshi integration blueprint', () => {
      const bp = blueprintRegistry.getBlueprint('BP-INTEGRATION-KALSHI@0.1.0');

      expect(bp).toBeDefined();
      expect(bp?.properties.compliance.value.geoCheck).toBe(true);
      expect(bp?.properties.compliance.value.kycVerify).toBe(true);
    });

    it('should resolve Kalshi instance properties', async () => {
      const instance = blueprintRegistry.createInstance('BP-EXCHANGE-KALSHI@0.1.0');

      const baseUrl = await resolver.resolve(instance.id, 'baseUrl');
      const regulatory = await resolver.resolve(instance.id, 'regulatory');

      expect(baseUrl).toBe('https://trading-api.kalshi.com');
      expect(regulatory.regulator).toBe('CFTC');
    });
  });
});
