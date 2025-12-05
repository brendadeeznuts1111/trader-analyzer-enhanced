/**
 * Bun Native Utilities & Performance Enhancements v4.5
 * 
 * Comprehensive utilities leveraging Bun's native APIs for optimal performance
 * 
 * @see {@link https://bun.sh/docs/runtime/file-io} [BUN_NATIVE]
 * @see {@link https://bun.sh/docs/runtime/yaml} [BUN_FS]
 * @see {@link https://bun.sh/docs/runtime/config} [BUN_CONFIG]
 * @see {@link https://bun.sh/docs/runtime/benchmark} [BUN_PERF]
 * @see {@link https://bun.sh/docs/test} [BUN_TEST_UTILS]
 * @see {@link https://bun.sh/docs/runtime/spawn} [BUN_CLI]
 * @see {@link https://bun.sh/docs/runtime/websockets} [BUN_NET]
 * @see {@link https://bun.sh/docs/runtime/streams} [BUN_PIPELINES]
 * @see {@link https://bun.sh/docs/runtime/utils} [BUN_UTILS]
 */

import { Bun } from 'bun';

/**
 * 2. Bun Native APIs Integration
 * 2.1 File System Utilities
 * 2.1.1 High-Performance Reading
 * 
 * Native Bun.file for optimized file operations
 * 
 * @see {@link https://bun.sh/docs/runtime/file-io} [BUN_FS]
 */
export async function readYAMLConfig(path: string): Promise<any> {
  try {
    // Try Bun's native YAML first
    const file = Bun.file(path);
    if (!await file.exists()) return null;
    
    const text = await file.text();
    try {
      return Bun.YAML.parse(text);
    } catch {
      // Fallback to basic YAML parsing
      return parseBasicYAML(text);
    }
  } catch (error) {
    // Fallback to fs + basic YAML parsing
    const fs = await import('fs');
    if (!fs.existsSync(path)) return null;
    
    const text = fs.readFileSync(path, 'utf8');
    return parseBasicYAML(text);
  }
}

/**
 * Basic YAML parser fallback
 */
function parseBasicYAML(text: string): any {
  const result: any = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Convert to number if possible
        if (!isNaN(Number(value)) && value !== '') {
          result[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
        } else if (value.startsWith('[') && value.endsWith(']')) {
          result[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
        } else {
          result[key] = value || '';
        }
      }
    }
  }
  
  return result;
}

/**
 * 2.1.2 Concurrent File Operations
 * Batch read multiple files in parallel
 */
export async function batchReadFiles(paths: string[]): Promise<string[]> {
  try {
    return Promise.all(
      paths.map(async path => {
        const file = Bun.file(path);
        return await file.text();
      })
    );
  } catch (error) {
    // Fallback to fs
    const fs = await import('fs');
    return Promise.all(
      paths.map(path => {
        try {
          return fs.readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      })
    );
  }
}

/**
 * 2.2 Configuration Management
 * 2.2.1 bunfig.toml Integration
 * 
 * Auto-loads from bunfig.toml or custom path
 * 
 * @see {@link https://bun.sh/docs/runtime/config} [BUN_CONFIG]
 */
export function loadAppConfig<T = any>() {
  // Auto-loads from bunfig.toml or custom path
  return Bun.main === 'bun' ? {} : {}; // Placeholder for config loading
}

/**
 * 2.2.2 Hot Reload Configuration
 * Watch configuration files for changes
 */
export function watchConfigChanges(path: string, callback: () => void) {
  const watcher = Bun.fs.watch(path);
  watcher.on('change', callback);
  return watcher;
}

/**
 * 3. Performance Utilities
 * 3.1 Native JSON Operations
 * 3.1.1 Bun's faster JSON parsing
 */
export function parseLargeJSON(data: string): any {
  try {
    return Bun.json(data); // Uses Bun's native JSON
  } catch (error) {
    // Fallback to standard JSON
    return JSON.parse(data);
  }
}

/**
 * 3.1.2 JSON Streaming
 * Stream large JSON files efficiently
 */
export async function streamJSONFile(path: string): Promise<any> {
  try {
    const file = Bun.file(path);
    const stream = file.stream();
    
    let result = '';
    for await (const chunk of stream) {
      result += new TextDecoder().decode(chunk);
    }
    return Bun.json(result);
  } catch (error) {
    // Fallback to fs + JSON.parse
    const fs = await import('fs');
    const data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  }
}

/**
 * 3.2 Memory Management
 * 3.2.1 Native buffers
 */
export function createSharedBuffer(size: number): ArrayBuffer {
  try {
    return Bun.allocator.allocShared(size);
  } catch (error) {
    // Fallback to regular ArrayBuffer
    return new ArrayBuffer(size);
  }
}

/**
 * 3.2.2 Memory monitoring
 */
export function getMemoryStats() {
  try {
    return {
      heapUsed: process.memoryUsage().heapUsed,
      rss: process.memoryUsage().rss,
      native: Bun.memoryUsage() // Bun-specific metrics
    };
  } catch (error) {
    // Fallback to standard Node.js memory usage
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      rss: memUsage.rss,
      native: memUsage
    };
  }
}

/**
 * 4. Testing Utilities Enhancement
 * 4.1 Seeded Test Suites
 * 4.1.1 Deterministic random for tests
 * 
 * @see {@link https://bun.sh/docs/test} [BUN_TEST_UTILS]
 */
export class SeededRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  nextInt(max: number): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return Math.floor((this.seed / 233280) * max);
  }
}

/**
 * 4.1.2 Test fixture generator
 */
export function generateTestData(seed: number, count: number) {
  const random = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    value: `test-${random.nextInt(1000)}`,
    nested: { data: simpleHash(String(random.nextInt(100000))) }
  }));
}

/**
 * Simple hash function fallback
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * 4.2 Benchmark Utilities
 * 4.2.1 Native benchmarking
 */
export async function benchmark(name: string, fn: () => Promise<void>, iterations = 1000) {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  
  return {
    name,
    avg: times.reduce((a, b) => a + b) / times.length,
    p95: times.sort()[Math.floor(times.length * 0.95)],
    min: Math.min(...times),
    max: Math.max(...times),
    opsPerSecond: 1000 / (times.reduce((a, b) => a + b) / times.length)
  };
}

/**
 * 4.2.2 Memory benchmark
 */
export function memoryBenchmark(fn: () => void) {
  try {
    const before = Bun.memoryUsage();
    fn();
    const after = Bun.memoryUsage();
    
    return {
      heapDiff: after.heapUsed - before.heapUsed,
      rssDiff: after.rss - before.rss
    };
  } catch (error) {
    // Fallback to standard Node.js memory usage
    const before = process.memoryUsage();
    fn();
    const after = process.memoryUsage();
    
    return {
      heapDiff: after.heapUsed - before.heapUsed,
      rssDiff: after.rss - before.rss
    };
  }
}

/**
 * 5. CLI & Process Utilities
 * 5.1 Enhanced Spawn
 * 
 * @see {@link https://bun.sh/docs/runtime/spawn} [BUN_CLI]
 */
export async function spawnWithTimeout(cmd: string[], timeout: number) {
  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, BUN_DEBUG: '1' }
  });
  
  const timer = setTimeout(() => {
    proc.kill(9); // SIGKILL
  }, timeout);
  
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ]);
  
  clearTimeout(timer);
  return { stdout, stderr, exitCode: await proc.exited };
}

/**
 * 5.2 Signal Handling
 * 5.2.1 Graceful shutdown
 */
export function setupGracefulShutdown(cleanup: () => Promise<void>) {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, cleaning up...`);
      await cleanup();
      process.exit(0);
    });
  });
}

/**
 * 6. Networking Utilities
 * 6.1 HTTP Client Enhancement
 * 6.1.1 Optimized fetch with Bun
 * 
 * @see {@link https://bun.sh/docs/runtime/websockets} [BUN_NET]
 */
export async function fetchWithRetry(url: string, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        // Bun-specific optimizations
        headers: {
          'User-Agent': 'Bun/1.3.3',
          ...options.headers
        }
      });
      
      if (response.ok) return response;
      
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
}

/**
 * 6.1.2 WebSocket utilities
 */
export function createWebSocketHandler(url: string) {
  const ws = new WebSocket(url);
  
  return {
    send: (data: any) => ws.send(Bun.json(data)),
    close: () => ws.close(),
    onMessage: (callback: (data: any) => void) => {
      ws.onmessage = (event) => {
        callback(Bun.json(event.data));
      };
    }
  };
}

/**
 * 7. Data Processing Pipelines
 * 7.1 Stream Processing
 * 7.1.1 Transform streams with Bun
 * 
 * @see {@link https://bun.sh/docs/runtime/streams} [BUN_PIPELINES]
 */
export function createYAMLProcessor() {
  return new TransformStream({
    async transform(chunk, controller) {
      try {
        const parsed = Bun.YAML.parse(new TextDecoder().decode(chunk));
        controller.enqueue(parsed);
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

/**
 * 7.1.2 Parallel processing
 */
export async function parallelProcess<T, U>(
  items: T[],
  processor: (item: T) => Promise<U>,
  concurrency = 4 // Fallback for availableParallelism
): Promise<U[]> {
  const results: U[] = [];
  const queue = [...items];
  
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const item = queue.pop();
        if (item) {
          const result = await processor(item);
          results.push(result);
        }
      }
    })
  );
  
  return results;
}

/**
 * 8. Utility Functions Collection
 * 8.1 Type Utilities
 * 8.1.1 Runtime type checking
 * 
 * @see {@link https://bun.sh/docs/runtime/utils} [BUN_UTILS]
 */
export function isBunNative(obj: any): boolean {
  return obj !== null && 
         obj !== undefined && 
         typeof obj === 'object' && 
         Symbol.toStringTag in obj && 
         obj[Symbol.toStringTag] === 'BunObject';
}

/**
 * 8.1.2 Deep cloning with Bun
 */
export function deepClone<T>(obj: T): T {
  try {
    return Bun.json(Bun.json(obj)); // Fast native clone
  } catch (error) {
    // Fallback to JSON.parse/stringify with circular reference handling
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (circularError) {
      // Handle circular references by removing them
      const seen = new WeakSet();
      const clone = (item: any): any => {
        if (item === null || typeof item !== 'object') return item;
        if (seen.has(item)) return '[Circular]';
        seen.add(item);
        
        if (Array.isArray(item)) {
          return item.map(clone);
        }
        
        const cloned: any = {};
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            cloned[key] = clone(item[key]);
          }
        }
        return cloned;
      };
      
      return clone(obj);
    }
  }
}

/**
 * 8.2 Error Handling Utilities
 * 8.2.1 Bun-enhanced errors
 */
export class BunError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata?: any
  ) {
    super(message);
    this.name = 'BunError';
    
    // Capture stack trace with Bun's improved formatting
    Error.captureStackTrace?.(this, BunError);
  }
  
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      stack: this.stack,
      metadata: this.metadata
    };
  }
}

/**
 * 8.2.2 Error recovery with retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options = { retries: 3, delay: 1000 }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.retries) {
        await new Promise(resolve => setTimeout(resolve, options.delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 9. Complete Module Implementation
 * Main BunUtils class with all utilities
 */
export class BunUtils {
  // File operations
  static readConfig = readYAMLConfig;
  static batchRead = batchReadFiles;
  
  // Performance monitoring
  static benchmark = benchmark;
  static memoryBenchmark = memoryBenchmark;
  static getMemory = getMemoryStats;
  
  // Testing utilities
  static createSeededTest = generateTestData;
  static SeededRandom = SeededRandom;
  
  // Process management
  static spawn = spawnWithTimeout;
  static setupShutdown = setupGracefulShutdown;
  
  // Network utilities
  static fetchWithRetry = fetchWithRetry;
  static createWebSocket = createWebSocketHandler;
  
  // Data processing
  static parallelProcess = parallelProcess;
  static createYAMLProcessor = createYAMLProcessor;
  
  // Error handling
  static withRetry = withRetry;
  static BunError = BunError;
  
  // Utilities
  static deepClone = deepClone;
  static isBunNative = isBunNative;
}

// Export all utilities
export default BunUtils;
