/**
 * UUID Worker Pool Usage Example
 * Demonstrates parallel UUID generation using Bun's native Worker API
 * with Node.js worker_threads compatibility
 */

import {
  UUIDWorkerPool,
  getUUIDWorkerPool,
  destroyUUIDWorkerPool
} from '../src';

async function main() {
  console.log('🚀 UUID Worker Pool Example\n');
  console.log('Using Bun native APIs:');
  console.log('  - setEnvironmentData() / getEnvironmentData()');
  console.log('  - markAsUntransferable()');
  console.log('  - Bun.isMainThread');
  console.log('  - Worker with { smol: true }');
  console.log('  - Bun.nanoseconds() for timing\n');

  // Get the singleton worker pool
  const pool = getUUIDWorkerPool({
    poolSize: 4,
    smol: true,
    config: {
      namespace: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      format: 'hex'
    }
  });

  // Wait for workers to initialize
  await new Promise(resolve => setTimeout(resolve, 100));

  // 1. Single UUID generation
  console.log('1️⃣ Single UUID Generation:');
  const uuid = await pool.generate('my-unique-name');
  console.log(`   Name: "my-unique-name" → ${uuid}\n`);

  // 2. Batch UUID generation
  console.log('2️⃣ Batch UUID Generation:');
  const names = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
  const uuids = await pool.generateBatch(names);
  names.forEach((name, i) => {
    console.log(`   ${name} → ${uuids[i]}`);
  });
  console.log();

  // 3. UUIDv7 (time-sortable)
  console.log('3️⃣ UUIDv7 Generation (time-sortable):');
  const v7uuids = await pool.generateV7(3);
  v7uuids.forEach((uuid, i) => {
    console.log(`   [${i}] ${uuid}`);
  });
  console.log();

  // 4. Single worker benchmark
  console.log('4️⃣ Single Worker Benchmark:');
  const singleResult = await pool.benchmark(10000);
  console.log(`   Iterations: ${singleResult.count.toLocaleString()}`);
  console.log(`   Duration: ${singleResult.duration.toFixed(2)}ms`);
  console.log(`   Rate: ${singleResult.rate.toLocaleString()} UUIDs/sec\n`);

  // 5. Parallel benchmark across all workers
  console.log('5️⃣ Parallel Benchmark (all workers):');
  const parallelResult = await pool.parallelBenchmark(10000);
  console.log(`   Workers: ${parallelResult.workers}`);
  console.log(`   Total iterations: ${parallelResult.totalCount.toLocaleString()}`);
  console.log(`   Avg duration: ${parallelResult.totalDuration.toFixed(2)}ms`);
  console.log(`   Avg rate per worker: ${parallelResult.avgRate.toLocaleString()} UUIDs/sec\n`);

  // 6. Pool statistics
  console.log('6️⃣ Pool Statistics:');
  const stats = pool.getStats();
  console.log(`   Workers: ${stats.workers}`);
  console.log(`   Busy workers: ${stats.busyWorkers}`);
  console.log(`   Queued tasks: ${stats.queuedTasks}`);
  console.log(`   Pending requests: ${stats.pendingRequests}`);
  console.log(`   Buffer pool size: ${stats.bufferPoolSize} bytes`);
  console.log(`   Buffer untransferable: ${stats.bufferPoolUntransferable}\n`);

  // 7. Deterministic test (same name = same UUID)
  console.log('7️⃣ Deterministic Test:');
  const uuid1 = await pool.generate('deterministic-test');
  const uuid2 = await pool.generate('deterministic-test');
  console.log(`   First:  ${uuid1}`);
  console.log(`   Second: ${uuid2}`);
  console.log(`   Match: ${uuid1 === uuid2 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Cleanup
  destroyUUIDWorkerPool();
  console.log('✅ Worker pool destroyed');
}

// Run if main module
if (Bun.isMainThread) {
  main().catch(console.error);
}
