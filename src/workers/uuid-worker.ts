/**
 * UUID Worker - High-performance UUID generation in a separate thread
 * Uses Bun's native APIs and Node.js worker_threads compatibility
 */

import { getEnvironmentData } from 'node:worker_threads';
import { randomUUIDv5 } from 'bun';

// Get shared config from main thread
const config = getEnvironmentData('uuid-config') as {
  namespace: string;
  format: 'hex' | 'base64' | 'base64url' | 'buffer';
} | undefined;

const DEFAULT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

interface WorkerMessage {
  action: 'generate' | 'generateBatch' | 'generateV7' | 'benchmark';
  id?: string;
  name?: string;
  names?: string[];
  namespace?: string;
  count?: number;
  format?: 'hex' | 'base64' | 'base64url' | 'buffer';
}

interface WorkerResponse {
  action: string;
  id?: string;
  uuid?: string;
  uuids?: string[];
  count?: number;
  duration?: number;
  error?: string;
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { action, id, name, names, namespace, count, format } = event.data;
  const ns = namespace || config?.namespace || DEFAULT_NAMESPACE;
  const fmt = format || config?.format || 'hex';

  try {
    switch (action) {
      case 'generate': {
        if (!name) {
          throw new Error('Name is required for generate action');
        }
        let result: string;
        if (fmt === 'buffer') {
          const uuid = randomUUIDv5(name, ns, 'buffer');
          result = uuid.toString('hex');
        } else {
          result = randomUUIDv5(name, ns, fmt);
        }
        
        self.postMessage({
          action: 'generate',
          id,
          uuid: result
        } satisfies WorkerResponse);
        break;
      }

      case 'generateBatch': {
        if (!names || !Array.isArray(names)) {
          throw new Error('Names array is required for generateBatch action');
        }
        
        const uuids = names.map(n => {
          if (fmt === 'buffer') {
            const uuid = randomUUIDv5(n, ns, 'buffer');
            return uuid.toString('hex');
          } else {
            return randomUUIDv5(n, ns, fmt);
          }
        });

        self.postMessage({
          action: 'generateBatch',
          id,
          uuids,
          count: uuids.length
        } satisfies WorkerResponse);
        break;
      }

      case 'generateV7': {
        const iterations = count || 1;
        const uuids: string[] = [];
        
        for (let i = 0; i < iterations; i++) {
          uuids.push(Bun.randomUUIDv7(fmt === 'buffer' ? 'hex' : fmt));
        }

        self.postMessage({
          action: 'generateV7',
          id,
          uuids,
          count: uuids.length
        } satisfies WorkerResponse);
        break;
      }

      case 'benchmark': {
        const iterations = count || 10000;
        const start = Bun.nanoseconds();
        
        for (let i = 0; i < iterations; i++) {
          randomUUIDv5(`bench-${i}`, ns);
        }
        
        const end = Bun.nanoseconds();
        const durationMs = (end - start) / 1_000_000;

        self.postMessage({
          action: 'benchmark',
          id,
          count: iterations,
          duration: durationMs
        } satisfies WorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    self.postMessage({
      action,
      id,
      error: error instanceof Error ? error.message : String(error)
    } satisfies WorkerResponse);
  }
};

// Signal ready
self.postMessage({ action: 'ready' });
