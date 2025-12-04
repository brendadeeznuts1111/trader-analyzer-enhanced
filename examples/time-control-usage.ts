/**
 * Time Control Usage Examples for UUIDv5 System
 * Demonstrates how to use Bun's setSystemTime with our UUID testing utilities
 */

import {
  TimeController,
  TimeScenarios,
  testAtTime,
  testUUIDConsistency,
  createVaultAtTime,
  VaultEntity,
  uuidv5
} from '../src';

// Example 1: Basic time control for testing
async function basicTimeControlExample() {
  console.log('🕐 Basic Time Control Example');

  const controller = new TimeController({ autoRestore: true });

  // Set time to a specific point
  controller.setTime('2024-01-15T10:30:00Z');
  console.log('System time set to:', new Date(Date.now()).toISOString());

  // Create a vault entity - it will use the controlled time
  const vault = new VaultEntity('Time-Controlled Vault');
  console.log('Vault created at:', new Date(vault.createdAt).toISOString());

  // Time is automatically restored when controller goes out of scope
}

// Example 2: Using predefined time scenarios
async function timeScenariosExample() {
  console.log('\n📅 Time Scenarios Example');

  // Test with market open time
  await testAtTime(TimeScenarios.MARKET_OPEN, () => {
    const vault = new VaultEntity('Market Open Vault');
    console.log('Market open vault created at:', new Date(vault.createdAt).toISOString());
    return vault;
  });

  // Test with weekend time
  await testAtTime(TimeScenarios.WEEKEND, () => {
    const vault = new VaultEntity('Weekend Vault');
    console.log('Weekend vault created at:', new Date(vault.createdAt).toISOString());
    return vault;
  });
}

// Example 3: Testing UUID consistency across time changes
async function uuidConsistencyExample() {
  console.log('\n🔄 UUID Consistency Test');

  const isConsistent = await testUUIDConsistency(
    'Consistency Test Vault',
    'vault-optimizer',
    5 // Test 5 times with different system times
  );

  console.log('UUID generation is consistent across time changes:', isConsistent);
  // Should always be true for UUIDv5 (deterministic)
}

// Example 4: Creating entities at specific times
async function entityCreationExample() {
  console.log('\n🏗️ Entity Creation at Specific Times');

  // Create vaults at different times
  const times = [
    '2024-01-01T00:00:00Z',
    '2024-06-15T12:00:00Z',
    '2024-12-31T23:59:59Z'
  ];

  for (const time of times) {
    const vault = await createVaultAtTime(`Vault-${time}`, time);
    console.log(`Vault created at ${time}:`, vault.id);
  }
}

// Example 5: Time-based entity series
async function entitySeriesExample() {
  console.log('\n📊 Entity Series with Time Spacing');

  const vaults = await createEntitySeries(
    5, // Create 5 vaults
    60000, // 1 minute apart
    (index) => new VaultEntity(`Series Vault ${index + 1}`)
  );

  vaults.forEach((vault, index) => {
    console.log(`Vault ${index + 1} created at:`, new Date(vault.createdAt).toISOString());
  });
}

// Example 6: Advanced time control with context manager
async function advancedTimeControlExample() {
  console.log('\n⚡ Advanced Time Control Example');

  const controller = new TimeController({ autoRestore: true });

  // Start at market open
  controller.setTime(TimeScenarios.MARKET_OPEN);
  console.log('Started at market open:', new Date().toISOString());

  // Create initial vault
  const vault1 = new VaultEntity('Market Open Vault');
  console.log('Vault 1 timestamp:', vault1.createdAt);

  // Advance time by 4 hours (during trading day)
  controller.advanceTime(4 * 60 * 60 * 1000); // 4 hours in milliseconds
  console.log('Advanced to:', new Date().toISOString());

  // Create second vault
  const vault2 = new VaultEntity('Mid-Day Vault');
  console.log('Vault 2 timestamp:', vault2.createdAt);

  // Advance to market close
  controller.setTime(TimeScenarios.MARKET_CLOSE);
  console.log('Set to market close:', new Date().toISOString());

  // Create final vault
  const vault3 = new VaultEntity('Market Close Vault');
  console.log('Vault 3 timestamp:', vault3.createdAt);

  // Verify timestamps are different
  console.log('All timestamps different:', vault1.createdAt !== vault2.createdAt && vault2.createdAt !== vault3.createdAt);
}

// Example 7: Testing system monitoring with controlled time
async function systemMonitoringExample() {
  console.log('\n📊 System Monitoring with Controlled Time');

  await testAtTime('2024-03-15T15:45:30Z', async () => {
    const { VaultOptimizer } = await import('../src');
    const optimizer = new VaultOptimizer();

    // Get system info at controlled time
    const systemInfo = optimizer.getSystemInfo();

    console.log('Controlled timestamp:', new Date(systemInfo.timestamp).toISOString());
    console.log('Build time matches:', systemInfo.buildTime === systemInfo.timestamp);
    console.log('System health:', systemInfo.health.overall);
    console.log('Memory efficiency:', systemInfo.performance.memoryEfficiency + '%');

    return systemInfo;
  });
}

// Example 8: Performance benchmarking with controlled time
async function performanceBenchmarkingExample() {
  console.log('\n⚡ Performance Benchmarking Example');

  const { benchmarkWithTimeControl } = await import('../src/utils/time-control');

  // Benchmark UUID generation
  const uuidBenchmark = await benchmarkWithTimeControl(
    () => uuidv5.generateForVault(`perf-test-${Math.random()}`),
    1000 // 1000 iterations
  );

  console.log('UUID Generation Benchmark:');
  console.log(`  Average time: ${uuidBenchmark.averageTime.toFixed(3)}ms`);
  console.log(`  Operations/sec: ${Math.round(uuidBenchmark.operationsPerSecond)}`);

  // Benchmark vault creation
  const vaultBenchmark = await benchmarkWithTimeControl(
    () => new VaultEntity(`perf-vault-${Math.random()}`),
    500 // 500 iterations
  );

  console.log('Vault Creation Benchmark:');
  console.log(`  Average time: ${vaultBenchmark.averageTime.toFixed(3)}ms`);
  console.log(`  Operations/sec: ${Math.round(vaultBenchmark.operationsPerSecond)}`);
}

// Run all examples
async function runAllExamples() {
  try {
    await basicTimeControlExample();
    await timeScenariosExample();
    await uuidConsistencyExample();
    await entityCreationExample();
    await entitySeriesExample();
    await advancedTimeControlExample();
    await systemMonitoringExample();
    await performanceBenchmarkingExample();

    console.log('\n✅ All time control examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export for use in tests or manual execution
export {
  basicTimeControlExample,
  timeScenariosExample,
  uuidConsistencyExample,
  entityCreationExample,
  entitySeriesExample,
  advancedTimeControlExample,
  systemMonitoringExample,
  performanceBenchmarkingExample,
  runAllExamples
};

// Run examples if executed directly
if (import.meta.main) {
  runAllExamples();
}
