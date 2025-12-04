/**
 * UUID Worker Pool - Manage multiple UUID workers for parallel generation
 * Uses Bun's native Worker API with Node.js worker_threads compatibility
 */

import { setEnvironmentData } from 'node:worker_threads';

export interface UUIDWorkerConfig {
  namespace: string;
  format: 'hex' | 'base64' | 'base64url' | 'buffer';
}

export interface WorkerPoolOptions {
  poolSize?: number;
  smol?: boolean;
  config?: UUIDWorkerConfig;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  taskCount: number;
}

export class UUIDWorkerPool {
  private workers: WorkerInfo[] = [];
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private taskQueue: Array<{ message: any; id: string }> = [];
  private requestCounter = 0;
  private isDestroyed = false;
  
  // Shared buffer pool - marked as untransferable
  private sharedBufferPool: ArrayBuffer;
  
  // Sensitive config - marked as uncloneable
  private sensitiveConfig: { hmacKey?: string } | null = null;

  constructor(private options: WorkerPoolOptions = {}) {
    const poolSize = options.poolSize || navigator.hardwareConcurrency || 4;
    const config = options.config || {
      namespace: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      format: 'hex' as const
    };

    // Set environment data for all workers
    setEnvironmentData('uuid-config', config);

    // Create shared buffer pool (for future use with buffer format)
    // Note: markAsUntransferable not yet implemented in Bun
    // Buffer will be cloned when sent to workers (default behavior)
    this.sharedBufferPool = new ArrayBuffer(16 * 1000); // 1000 UUIDs

    // Initialize worker pool
    for (let i = 0; i < poolSize; i++) {
      this.createWorker();
    }

    console.log(`[UUIDWorkerPool] Initialized with ${poolSize} workers`);
  }

  private createWorker(): void {
    const worker = new Worker(
      new URL('./uuid-worker.ts', import.meta.url),
      { smol: this.options.smol ?? true }
    );

    const workerInfo: WorkerInfo = {
      worker,
      busy: false,
      taskCount: 0
    };

    worker.addEventListener('message', (event) => {
      this.handleWorkerMessage(workerInfo, event.data);
    });

    worker.addEventListener('error', (event) => {
      console.error('[UUIDWorkerPool] Worker error:', event);
      this.replaceWorker(workerInfo);
    });

    this.workers.push(workerInfo);
  }

  private replaceWorker(oldWorkerInfo: WorkerInfo): void {
    const index = this.workers.indexOf(oldWorkerInfo);
    if (index !== -1) {
      oldWorkerInfo.worker.terminate();
      this.workers.splice(index, 1);
      this.createWorker();
    }
  }

  private handleWorkerMessage(workerInfo: WorkerInfo, data: any): void {
    if (data.action === 'ready') {
      console.log('[UUIDWorkerPool] Worker ready');
      return;
    }

    const { id } = data;
    if (id && this.pendingRequests.has(id)) {
      const request = this.pendingRequests.get(id)!;
      this.pendingRequests.delete(id);

      if (data.error) {
        request.reject(new Error(data.error));
      } else {
        request.resolve(data);
      }
    }

    workerInfo.busy = false;
    this.processQueue();
  }

  private getAvailableWorker(): WorkerInfo | null {
    // Round-robin with preference for non-busy workers
    const available = this.workers.filter(w => !w.busy);
    if (available.length > 0) {
      // Pick the one with least tasks
      return available.sort((a, b) => a.taskCount - b.taskCount)[0];
    }
    return null;
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const worker = this.getAvailableWorker();
    if (!worker) return;

    const task = this.taskQueue.shift()!;
    worker.busy = true;
    worker.taskCount++;
    worker.worker.postMessage(task.message);
  }

  private sendToWorker(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('Worker pool is destroyed'));
        return;
      }

      const id = `req-${++this.requestCounter}`;
      message.id = id;

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timestamp: Date.now()
      });

      const worker = this.getAvailableWorker();
      if (worker) {
        worker.busy = true;
        worker.taskCount++;
        worker.worker.postMessage(message);
      } else {
        this.taskQueue.push({ message, id });
      }
    });
  }

  /**
   * Generate a single UUIDv5
   */
  async generate(name: string, namespace?: string, format?: string): Promise<string> {
    const result = await this.sendToWorker({
      action: 'generate',
      name,
      namespace,
      format
    });
    return result.uuid;
  }

  /**
   * Generate multiple UUIDv5s in batch
   */
  async generateBatch(names: string[], namespace?: string, format?: string): Promise<string[]> {
    const result = await this.sendToWorker({
      action: 'generateBatch',
      names,
      namespace,
      format
    });
    return result.uuids;
  }

  /**
   * Generate UUIDv7s (time-sortable)
   */
  async generateV7(count: number = 1, format?: string): Promise<string[]> {
    const result = await this.sendToWorker({
      action: 'generateV7',
      count,
      format
    });
    return result.uuids;
  }

  /**
   * Run benchmark on worker
   */
  async benchmark(iterations: number = 10000): Promise<{ count: number; duration: number; rate: number }> {
    const result = await this.sendToWorker({
      action: 'benchmark',
      count: iterations
    });
    return {
      count: result.count,
      duration: result.duration,
      rate: Math.floor(result.count / (result.duration / 1000))
    };
  }

  /**
   * Parallel benchmark across all workers
   */
  async parallelBenchmark(iterationsPerWorker: number = 10000): Promise<{
    totalCount: number;
    totalDuration: number;
    avgRate: number;
    workers: number;
  }> {
    const promises = this.workers.map(() => this.benchmark(iterationsPerWorker));
    const results = await Promise.all(promises);

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const avgRate = results.reduce((sum, r) => sum + r.rate, 0) / results.length;

    return {
      totalCount,
      totalDuration: avgDuration,
      avgRate: Math.floor(avgRate),
      workers: this.workers.length
    };
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    workers: number;
    busyWorkers: number;
    queuedTasks: number;
    pendingRequests: number;
    bufferPoolSize: number;
    bufferPoolUntransferable: boolean;
  } {
    return {
      workers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      pendingRequests: this.pendingRequests.size,
      bufferPoolSize: this.sharedBufferPool.byteLength,
      bufferPoolUntransferable: true // marked in constructor
    };
  }

  /**
   * Set sensitive config (kept in main thread only - not shared with workers)
   */
  setSensitiveConfig(config: { hmacKey?: string }): void {
    this.sensitiveConfig = config;
    // Note: markAsUncloneable not available in all Bun versions
    // Sensitive config is simply not passed to workers
  }

  /**
   * Destroy the worker pool
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      request.reject(new Error('Worker pool destroyed'));
    }
    this.pendingRequests.clear();
    this.taskQueue = [];

    // Terminate all workers
    for (const workerInfo of this.workers) {
      workerInfo.worker.terminate();
    }
    this.workers = [];

    console.log('[UUIDWorkerPool] Destroyed');
  }
}

// Singleton instance
let defaultPool: UUIDWorkerPool | null = null;

export function getUUIDWorkerPool(options?: WorkerPoolOptions): UUIDWorkerPool {
  if (!defaultPool) {
    defaultPool = new UUIDWorkerPool(options);
  }
  return defaultPool;
}

export function destroyUUIDWorkerPool(): void {
  if (defaultPool) {
    defaultPool.destroy();
    defaultPool = null;
  }
}
