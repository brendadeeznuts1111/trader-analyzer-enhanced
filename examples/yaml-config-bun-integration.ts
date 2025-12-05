#!/usr/bin/env bun
/**
 * YAML Configuration + Bun Utilities Integration Demo
 * 
 * Demonstrates type checking and deep cloning with YAML configs
 * 
 * Run: bun run examples/yaml-config-bun-integration.ts
 */

import { getYamlConfigLoader, YamlConfig } from '../src/config/yaml-config-loader';
import { BunUtils, isBunNative, deepClone } from '../lib/bun-utils';

async function demonstrateConfigIntegration() {
  console.log('=== YAML Config + Bun Utilities Integration ===\n');
  
  // 1. Load configuration
  console.log('1. Loading YAML Configuration:');
  const configLoader = getYamlConfigLoader();
  const config = configLoader.getAll();
  
  console.log('   Config loaded:', Object.keys(config));
  console.log('   Is loaded:', configLoader.isLoaded());
  
  // 2. Type checking with isBunNative
  console.log('\n2. Runtime Type Checking:');
  const serverConfig = configLoader.get('server');
  console.log('   Server config is Bun native:', isBunNative(serverConfig));
  console.log('   Config loader is Bun native:', isBunNative(configLoader));
  console.log('   Plain object is Bun native:', isBunNative({ test: true }));
  
  // 3. Deep cloning configuration
  console.log('\n3. Deep Cloning Configuration:');
  const clonedConfig = deepClone(config);
  console.log('   Original !== cloned:', config !== clonedConfig);
  console.log('   Deep clone preserves structure:', 
    Object.keys(clonedConfig).length === Object.keys(config).length);
  
  // 4. Performance comparison
  console.log('\n4. Performance Benchmarking:');
  
  // Benchmark deep cloning
  const cloneBenchmark = await BunUtils.benchmark('config-deep-clone', async () => {
    deepClone(config);
  }, 100);
  
  console.log('   Deep clone performance:', {
    avg: `${cloneBenchmark.avg.toFixed(3)}ms`,
    opsPerSecond: Math.round(cloneBenchmark.opsPerSecond)
  });
  
  // Benchmark memory usage
  const memBenchmark = BunUtils.memoryBenchmark(() => {
    const clones = Array.from({ length: 100 }, () => deepClone(config));
    return clones;
  });
  
  console.log('   Memory usage for 100 clones:', 
    `${(memBenchmark.heapDiff / 1024).toFixed(2)}KB`);
  
  // 5. Configuration validation with Bun utilities
  console.log('\n5. Configuration Validation:');
  
  // Create test configuration
  const testConfig: Partial<YamlConfig> = {
    server: {
      port: 3000,
      hostname: 'localhost',
      development: true
    },
    threadManager: {
      persistenceFile: 'test.json',
      autoSave: true,
      maxTopicsPerChat: 50,
      telegram: {
        superGroups: [12345, 67890],
        defaultPurposes: ['test', 'demo'],
        rateLimitPerSecond: 5,
        maxMessageLength: 2000
      }
    }
  };
  
  // Validate using Bun utilities
  const isValidConfig = validateConfigWithBunUtils(testConfig);
  console.log('   Test config validation:', isValidConfig);
  
  // 6. Error handling with Bun utilities
  console.log('\n6. Error Handling Integration:');
  
  try {
    const result = await BunUtils.withRetry(async () => {
      // Simulate config loading that might fail
      if (Math.random() > 0.7) {
        throw new Error('Config load failed');
      }
      return 'Config loaded successfully';
    }, { retries: 3, delay: 100 });
    
    console.log('   Retry result:', result);
  } catch (error) {
    console.log('   Config loading failed after retries');
  }
  
  // 7. Seeded configuration testing
  console.log('\n7. Seeded Configuration Testing:');
  
  const seededConfigs = Array.from({ length: 3 }, (_, i) => {
    const seed = 123 + i;
    const testData = BunUtils.createSeededTest(seed, 5);
    return {
      seed,
      config: testData,
      firstValue: testData[0]?.value
    };
  });
  
  console.log('   Seeded configs:', seededConfigs.map(c => ({
    seed: c.seed,
    firstValue: c.firstValue
  })));
  
  console.log('\n=== Integration Demo Complete ===');
}

/**
 * Validate configuration using Bun utilities
 */
function validateConfigWithBunUtils(config: Partial<YamlConfig>): boolean {
  try {
    // Check required sections
    if (!config.server) return false;
    if (!config.threadManager) return false;
    
    // Validate server config
    if (typeof config.server.port !== 'number') return false;
    if (typeof config.server.hostname !== 'string') return false;
    
    // Validate thread manager config
    if (!config.threadManager.persistenceFile) return false;
    if (!config.threadManager.telegram?.superGroups?.length) return false;
    
    // Use deep cloning to test immutability
    const cloned = deepClone(config);
    return cloned !== config && Object.keys(cloned).length > 0;
    
  } catch (error) {
    console.error('   Validation error:', error);
    return false;
  }
}

// Run the demonstration
demonstrateConfigIntegration().catch(console.error);
