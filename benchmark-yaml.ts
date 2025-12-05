#!/usr/bin/env bun
/**
 * Benchmarking Bun's Native YAML Performance
 * Measures parse speed for YAML documents of varying sizes/complexity
 * 
 * Run: bun benchmark-yaml.ts
 */

import { YAML } from 'bun';

interface BenchmarkResult {
  avgTimeMs: number;
  opsPerSec: number;
  totalTimeMs: number;
  iterations: number;
  sizeBytes: number;
}

// Helper to generate YAML strings of varying sizes
function generateYAML(size: 'small' | 'medium' | 'large'): string {
  if (size === 'small') {
    return `
name: Test
value: 42
nested:
  key: value
  list:
    - item1
    - item2
metadata:
  version: 1.0
  created: 2024-01-01
`;
  } else if (size === 'medium') {
    let yaml = `# Medium YAML document
items:
`;
    for (let i = 0; i < 1000; i++) {
      yaml += `  - id: ${i}
    name: Item ${i}
    active: ${i % 2 === 0}
    props:
      score: ${Math.floor(Math.random() * 100)}
      tags: [tag${i % 10}, category${i % 5}]
    metadata:
      created: "2024-01-${(i % 28) + 1}"
      updated: ${Date.now() - i * 1000}
`;
    }
    return yaml;
  } else {
    let yaml = `# Large YAML document - performance test
large_data:
`;
    for (let i = 0; i < 100000; i++) {
      yaml += `  - entry_id: ${i}
    details: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Entry number ${i} with some additional text to increase size."
    metrics:
      count: ${i * 2}
      ratio: ${(Math.random() * 100).toFixed(2)}
      active: ${i % 3 === 0}
    timestamp: ${Date.now() - i * 100}
    nested:
      level1:
        level2:
          value: ${i}
          type: "benchmark_${i % 10}"
`;
    }
    return yaml;
  }
}

// Enhanced benchmark function with warmup and GC
function benchmarkParse(
  yamlStr: string, 
  iterations: number = 10000,
  warmupIterations: number = 100
): BenchmarkResult {
  const sizeBytes = new Blob([yamlStr]).size;
  
  // Warmup runs to stabilize JIT
  for (let i = 0; i < warmupIterations; i++) {
    try {
      YAML.parse(yamlStr);
    } catch {
      // Ignore warmup errors
    }
  }
  
  // Force garbage collection before benchmark
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
  }
  
  let totalTime = 0;
  let successfulParses = 0;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const result = YAML.parse(yamlStr);
      successfulParses++;
    } catch (error) {
      console.error(`Parse error on iteration ${i}:`, error);
      // Continue with other iterations
    }
    totalTime += performance.now() - start;
  }
  
  const avgTimeMs = totalTime / iterations;
  return {
    avgTimeMs,
    opsPerSec: 1000 / avgTimeMs,
    totalTimeMs: totalTime,
    iterations,
    sizeBytes
  };
}

// Format bytes for display
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Run comprehensive benchmarks
console.log('🚀 Benchmarking Bun Native YAML.parse Performance\n');
console.log(`Bun version: ${Bun.version}`);
console.log(`Node: ${process.platform} ${process.arch}`);
console.log(`Date: ${new Date().toISOString()}\n`);

const sizes = ['small', 'medium', 'large'] as const;
const results: Record<string, BenchmarkResult> = {};

sizes.forEach(size => {
  console.log(`📊 ${size.toUpperCase()} YAML Benchmark:`);
  
  const yamlStr = generateYAML(size);
  const iterations = size === 'large' ? 1000 : size === 'medium' ? 5000 : 10000;
  
  const result = benchmarkParse(yamlStr, iterations);
  results[size] = result;
  
  console.log(`  Size: ${formatBytes(result.sizeBytes)}`);
  console.log(`  Iterations: ${formatNumber(result.iterations)}`);
  console.log(`  Total Time: ${result.totalTimeMs.toFixed(2)} ms`);
  console.log(`  Avg Time: ${result.avgTimeMs.toFixed(4)} ms/parse`);
  console.log(`  Ops/Sec: ${formatNumber(Math.round(result.opsPerSec))}`);
  console.log(`  Throughput: ${formatBytes(Math.round(result.sizeBytes * result.opsPerSec))}/sec\n`);
});

// Edge cases and error handling
console.log('🔍 Edge Cases:');

// Empty YAML
const emptyResult = benchmarkParse('', 1000, 10);
console.log(`  Empty: ${emptyResult.avgTimeMs.toFixed(4)} ms avg, ${formatNumber(Math.round(emptyResult.opsPerSec))} ops/sec`);

// Single value
const singleResult = benchmarkParse('value: 42', 1000, 10);
console.log(`  Single: ${singleResult.avgTimeMs.toFixed(4)} ms avg, ${formatNumber(Math.round(singleResult.opsPerSec))} ops/sec`);

// Invalid YAML
console.log('  Invalid: Testing error handling...');
try {
  YAML.parse('invalid: yaml: [unclosed');
  console.log('    ❌ Should have thrown error');
} catch (error) {
  console.log('    ✅ Properly caught invalid YAML');
}

// Performance summary
console.log('\n📈 Performance Summary:');
console.log('Size\t\tAvg (ms)\tOps/sec\t\tThroughput');
console.log('─'.repeat(60));

sizes.forEach(size => {
  const r = results[size];
  const sizeStr = size.padEnd(8);
  const avgStr = r.avgTimeMs.toFixed(4).padEnd(8);
  const opsStr = formatNumber(Math.round(r.opsPerSec)).padEnd(8);
  const throughputStr = formatBytes(Math.round(r.sizeBytes * r.opsPerSec)).padEnd(12);
  console.log(`${sizeStr}\t${avgStr}\t${opsStr}\t${throughputStr}`);
});

// Memory usage analysis
if (typeof Bun !== 'undefined' && Bun.memoryUsage) {
  const memUsage = Bun.memoryUsage();
  console.log('\n💾 Memory Usage:');
  console.log(`  RSS: ${formatBytes(memUsage.rss)}`);
  console.log(`  Heap Used: ${formatBytes(memUsage.heapUsed)}`);
  console.log(`  Heap Total: ${formatBytes(memUsage.heapTotal)}`);
}

console.log('\n✅ Benchmark completed successfully!');
console.log('💡 Tip: Compare these results with js-yaml library for context');
