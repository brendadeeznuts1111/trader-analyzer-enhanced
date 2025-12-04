/**
 * UUID Configuration System Usage Examples
 * Demonstrates the enhanced BunUUIDConfig with native Bun APIs
 */

import { BunUUIDConfig, uuidConfig, generateUUIDv5, getTimestamp, getEnvironmentInfo, createTimeController, TimeScenarios } from '../src';

// Example 1: Basic configuration usage
async function basicConfigExample() {
  console.log('🔧 Basic Configuration Example');

  // Get current configuration
  const config = uuidConfig.getConfig();
  console.log('Current namespaces:', Object.keys(config.namespaces));
  console.log('Storage format:', config.storage.keyFormat);

  // Update configuration
  uuidConfig.updateConfig({
    storage: {
      ...config.storage,
      compression: true,
      maxStorageSize: 200 * 1024 * 1024 // 200MB
    }
  });

  console.log('Updated max storage size:', uuidConfig.getConfig().storage.maxStorageSize);
}

// Example 2: Environment information using Bun APIs
async function environmentInfoExample() {
  console.log('\n🌍 Environment Information Example');

  const envInfo = getEnvironmentInfo();

  console.log('Bun Version:', envInfo.bun.version);
  console.log('Platform:', envInfo.bun.platform);
  console.log('Architecture:', envInfo.bun.arch);
  console.log('Revision:', envInfo.bun.revision);
  console.log('Heap Usage:', `${(envInfo.bun.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log('Current Time (ISO):', envInfo.system.currentTime);
  console.log('Timezone:', envInfo.system.timezone);
  console.log('Environment Variables:', envInfo.system.envKeys);
}

// Example 3: UUID generation with Bun's crypto API
async function uuidGenerationExample() {
  console.log('\n🆔 UUID Generation Example');

  // Generate UUIDs with different namespaces
  const dnsUUID = generateUUIDv5('example.com', uuidConfig.getConfig().namespaces.dns);
  const urlUUID = generateUUIDv5('https://example.com', uuidConfig.getConfig().namespaces.url);
  const vaultUUID = generateUUIDv5('My Investment Vault', uuidConfig.getConfig().namespaces.vault);

  console.log('DNS UUID:', dnsUUID);
  console.log('URL UUID:', urlUUID);
  console.log('Vault UUID:', vaultUUID);

  // Verify UUID format (should start with UUID v5 version identifier)
  console.log('DNS UUID is v5:', dnsUUID.split('-')[2].startsWith('5'));
  console.log('URL UUID is v5:', urlUUID.split('-')[2].startsWith('5'));
  console.log('Vault UUID is v5:', vaultUUID.split('-')[2].startsWith('5'));
}

// Example 4: Timestamp formatting
async function timestampExample() {
  console.log('\n⏰ Timestamp Formatting Example');

  console.log('ISO Format:', getTimestamp('iso'));
  console.log('Unix Timestamp:', getTimestamp('unix'));
  console.log('Human Readable:', getTimestamp('human'));

  // Demonstrate with controlled time
  const timeController = createTimeController({ autoRestore: true });
  await timeController.withTimeControl(TimeScenarios.MARKET_OPEN, () => {
    console.log('Market Open (ISO):', getTimestamp('iso'));
    console.log('Market Open (Unix):', getTimestamp('unix'));
    console.log('Market Open (Human):', getTimestamp('human'));
  });
}

// Example 5: Configuration file management
async function configFileExample() {
  console.log('\n💾 Configuration File Management Example');

  try {
    // Save current configuration to file
    await uuidConfig.saveToFile();
    console.log('✅ Configuration saved to file');

    // Modify configuration
    const originalSize = uuidConfig.getConfig().storage.maxStorageSize;
    uuidConfig.updateConfig({
      storage: {
        ...uuidConfig.getConfig().storage,
        maxStorageSize: 500 * 1024 * 1024 // 500MB
      }
    });

    // Load configuration from file (should revert changes)
    await uuidConfig.loadFromFile();
    const newSize = uuidConfig.getConfig().storage.maxStorageSize;

    console.log('Original size:', originalSize);
    console.log('After revert:', newSize);
    console.log('Configuration restored:', originalSize === newSize);

  } catch (error) {
    console.log('Note: File operations require proper permissions');
    console.log('Error:', error.message);
  }
}

// Example 6: Performance benchmarking with configuration
async function performanceBenchmarkExample() {
  console.log('\n⚡ Performance Benchmarking Example');

  const config = uuidConfig.getConfig();
  const iterations = config.performance.benchmarkIterations;

  console.log(`Running ${iterations} UUID generation benchmarks...`);

  const startTime = performance.now();

  // Generate many UUIDs using our configured system
  for (let i = 0; i < iterations; i++) {
    generateUUIDv5(`benchmark-test-${i}`, config.namespaces.vault);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const uuidsPerSecond = iterations / (duration / 1000);

  console.log(`Generated ${iterations} UUIDs in ${(duration / 1000).toFixed(3)}s`);
  console.log(`Performance: ${Math.round(uuidsPerSecond)} UUIDs/second`);
  console.log(`Average time per UUID: ${(duration / iterations * 1000).toFixed(3)}μs`);
}

// Example 7: Integrated time control and configuration
async function integratedExample() {
  console.log('\n🔗 Integrated Time Control & Configuration Example');

  const timeController = createTimeController({ autoRestore: true });

  // Create entities at different controlled times
  const entities: any[] = [];

  for (const scenario of [TimeScenarios.MARKET_OPEN, TimeScenarios.MID_2024, TimeScenarios.YEAR_END_2024]) {
    await timeController.withTimeControl(scenario, () => {
      const uuid = generateUUIDv5(`entity-${scenario.toISOString()}`, uuidConfig.getConfig().namespaces.vault);
      const timestamp = getTimestamp('iso');

      entities.push({
        uuid,
        createdAt: timestamp,
        scenario: scenario.toISOString()
      });

      console.log(`Entity created at ${timestamp}:`, uuid.substring(0, 8) + '...');
    });
  }

  console.log(`\nCreated ${entities.length} entities with controlled timestamps`);
  console.log('All entities have unique UUIDs:', new Set(entities.map(e => e.uuid)).size === entities.length);
}

// Example 8: Health monitoring and diagnostics
async function healthMonitoringExample() {
  console.log('\n🏥 Health Monitoring Example');

  const envInfo = getEnvironmentInfo();
  const config = uuidConfig.getConfig();

  console.log('=== System Health Report ===');
  console.log(`Bun Version: ${envInfo.bun.version}`);
  console.log(`Platform: ${envInfo.bun.platform} ${envInfo.bun.arch}`);
  console.log(`Memory Usage: ${(envInfo.bun.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(envInfo.bun.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Memory Efficiency: ${((envInfo.bun.heapUsed / envInfo.bun.heapTotal) * 100).toFixed(1)}%`);

  console.log('\n=== Configuration Status ===');
  console.log(`Namespaces Configured: ${Object.keys(config.namespaces).length}`);
  console.log(`Storage Format: ${config.storage.keyFormat}`);
  console.log(`Compression: ${config.storage.compression ? 'Enabled' : 'Disabled'}`);
  console.log(`Max Storage: ${(config.storage.maxStorageSize / 1024 / 1024).toFixed(0)} MB`);
  console.log(`Health Checks: ${config.monitoring.enableHealthChecks ? 'Enabled' : 'Disabled'}`);

  console.log('\n=== Performance Settings ===');
  console.log(`Benchmarking: ${config.performance.enableBenchmarking ? 'Enabled' : 'Disabled'}`);
  console.log(`Benchmark Iterations: ${config.performance.benchmarkIterations.toLocaleString()}`);
  console.log(`Cache Size: ${config.performance.cacheSize}`);

  // Memory health check
  const memoryEfficiency = envInfo.bun.heapUsed / envInfo.bun.heapTotal;
  const memoryHealthy = memoryEfficiency < 0.9;

  console.log(`\nMemory Health: ${memoryHealthy ? '✅ Healthy' : '⚠️ High Usage'}`);
}

// Run all examples
async function runAllExamples() {
  try {
    await basicConfigExample();
    await environmentInfoExample();
    await uuidGenerationExample();
    await timestampExample();
    await configFileExample();
    await performanceBenchmarkExample();
    await integratedExample();
    await healthMonitoringExample();

    console.log('\n✅ All UUID configuration examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export for use in tests or manual execution
export {
  basicConfigExample,
  environmentInfoExample,
  uuidGenerationExample,
  timestampExample,
  configFileExample,
  performanceBenchmarkExample,
  integratedExample,
  healthMonitoringExample,
  runAllExamples
};

// Run examples if executed directly
if (import.meta.main) {
  runAllExamples();
}
