#!/usr/bin/env bun
/**
 * Simple Bun Native Utilities Demo v4.5
 * 
 * Demonstrates working Bun utilities with fallbacks
 * 
 * Run: bun run examples/bun-utils-demo.ts
 */

import { BunUtils, SeededRandom, benchmark, memoryBenchmark } from '../lib/bun-utils';

async function main() {
  console.log('=== Bun Native Utilities Demo ===\n');
  
  // 1. File operations with basic config
  console.log('1. Basic Configuration Reading:');
  const basicConfig = {
    port: 3000,
    host: 'localhost',
    debug: true
  };
  
  console.log('   Config:', basicConfig);
  console.log('   Port:', basicConfig.port);
  console.log('   Host:', basicConfig.host);
  
  // 2. Performance utilities
  console.log('\n2. Performance Benchmarking:');
  const benchResult = await BunUtils.benchmark('simple-operation', async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
  }, 5);
  
  console.log('   Benchmark:', {
    name: benchResult.name,
    avg: `${benchResult.avg.toFixed(2)}ms`,
    opsPerSecond: Math.round(benchResult.opsPerSecond)
  });
  
  // 3. Memory utilities
  console.log('\n3. Memory Usage:');
  const memResult = BunUtils.memoryBenchmark(() => {
    const arr = new Array(1000).fill(0);
    return arr.map((_, i) => i * i);
  });
  
  console.log('   Memory delta:', `${(memResult.heapDiff / 1024).toFixed(2)}KB`);
  
  // 4. Testing utilities
  console.log('\n4. Seeded Random Generation:');
  const testData = BunUtils.createSeededTest(123, 5);
  console.log('   Test data:', testData.map(item => ({ id: item.id, value: item.value })));
  
  // 5. Error handling
  console.log('\n5. Error Handling:');
  try {
    const error = new BunUtils.BunError('Demo error', 'DEMO_CODE', { context: 'testing' });
    console.log('   Error:', error.toJSON());
  } catch (e) {
    console.log('   Error handling works');
  }
  
  // 6. Retry mechanism
  console.log('\n6. Retry Mechanism:');
  let attempts = 0;
  const result = await BunUtils.withRetry(async () => {
    attempts++;
    if (attempts < 2) throw new Error(`Attempt ${attempts}`);
    return 'success';
  }, { retries: 3, delay: 10 });
  
  console.log('   Retry result:', result, `after ${attempts} attempts`);
  
  // 7. Deep cloning
  console.log('\n7. Deep Cloning:');
  const original = { name: 'test', nested: { array: [1, 2, 3] } };
  const cloned = BunUtils.deepClone(original);
  console.log('   Original !== cloned:', original !== cloned);
  console.log('   Nested !== cloned.nested:', original.nested !== cloned.nested);
  
  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
