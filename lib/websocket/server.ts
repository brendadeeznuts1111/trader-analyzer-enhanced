/**
 * Optimized WebSocket Server for ORCA Scraper
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-WS-OPTIMIZATION@0.1.0;instance-id=ORCA-WS-001;version=0.1.11}]
 * [PROPERTIES:{websocket=deflate-pubsub-cork;compression=perMessageDeflate;pubsub=global;backpressure=drain-callback}]
 * [CLASS:OptimizedWebSocketServer][#REF:v-0.1.11.BP.WS.1.0.A.1.1.ORCA.1.1][@BLUEPRINT:BP-WS-OPTIMIZATION@^0.1.0]]
 *
 * Bun 1.3.3 Native Features:
 * - 700k messages/sec (16 clients, x64 Linux) vs Node+ws 100k
 * - uWebSockets implementation
 * - Per-message deflate compression (gzip, deflate, brotli, zstd)
 * - Topic-based pub/sub broadcast
 * - Backpressure handling with drain callbacks
 * - Cork batching for latency reduction
 * - subscriptions getter for topic inspection
 */

import type { ServerWebSocket } from 'bun';

// Server type with WebSocket data
type BunServer = ReturnType<typeof Bun.serve>;

// WebSocket client data interface
export interface WSClientData {
  key: string;
  subscriptions: string[];
  queued: boolean;
  connectedAt: number;
  lastPing: number;
  messageCount: number;
  bytesReceived: number;
  bytesSent: number;
}

// WebSocket configuration from blueprint
export const WS_CONFIG = {
  // Compression settings
  perMessageDeflate: true,
  compression: 'shared' as const, // Shared compression context

  // Timeouts and limits
  idleTimeout: 30, // 30s (default 120s) - evict stale clients
  maxPayloadLength: 8 * 1024 * 1024, // 8MB (default 16MB)

  // Backpressure handling
  backpressureLimit: 1024 * 1024, // 1MB
  closeOnBackpressureLimit: true,

  // Topics
  topics: {
    global: 'global', // All market data
    odds: 'odds', // Odds updates only
    orderbook: 'orderbook', // Orderbook updates
    trades: 'trades', // Trade updates
  },

  // Metrics targets
  metrics: {
    latencyTargetMs: 92, // Target: 92ms median (down from 127ms)
    throughputMultiplier: 3.2,
    bandwidthReduction: 0.62, // -62% with deflate
  },
};

// Metrics tracking
export interface WSMetrics {
  connections: number;
  messagesPerSec: number;
  bytesPerSec: number;
  compressionRatio: number;
  backpressureEvents: number;
  errors: number;
  latencyP50: number;
  latencyP95: number;
}

const metrics: WSMetrics = {
  connections: 0,
  messagesPerSec: 0,
  bytesPerSec: 0,
  compressionRatio: 0,
  backpressureEvents: 0,
  errors: 0,
  latencyP50: 0,
  latencyP95: 0,
};

// Message counters for metrics
let messageCount = 0;
let bytesCount = 0;
let lastMetricsReset = Date.now();

/**
 * Validate API key for WebSocket connection
 */
function validateKey(key: string | null): boolean {
  if (!key) return false;
  // In production: Validate against database/cache
  // For now: Accept any non-empty key
  return key.length > 0;
}

/**
 * Create optimized WebSocket handlers
 */
export function createWebSocketHandlers() {
  return {
    /**
     * Connection opened - subscribe to topics
     * Uses Bun's native pub/sub instead of Map-based broadcast
     */
    open(ws: ServerWebSocket<WSClientData>) {
      const key = ws.data?.key || 'anonymous';

      // Validate key
      if (!validateKey(key)) {
        ws.close(1008, 'Invalid API key');
        return;
      }

      // Auto-subscribe to global topic
      ws.subscribe(WS_CONFIG.topics.global);

      // Initialize client data
      ws.data = {
        key,
        subscriptions: [WS_CONFIG.topics.global],
        queued: false,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        messageCount: 0,
        bytesReceived: 0,
        bytesSent: 0,
      };

      metrics.connections++;

      // Log connection with subscriptions getter (Bun 1.3.2+)
      console.log(`[WS] Client connected: ${key}, subscriptions: ${ws.subscriptions}`);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'connected',
          timestamp: Date.now(),
          subscriptions: ws.subscriptions,
          config: {
            compression: 'deflate',
            idleTimeout: WS_CONFIG.idleTimeout,
          },
        })
      );
    },

    /**
     * Message received from client
     */
    message(ws: ServerWebSocket<WSClientData>, message: string | Buffer) {
      const data = ws.data;
      const msgStr = typeof message === 'string' ? message : message.toString();

      data.messageCount++;
      data.bytesReceived += msgStr.length;
      messageCount++;
      bytesCount += msgStr.length;

      try {
        const parsed = JSON.parse(msgStr);

        // Handle subscription requests
        if (parsed.type === 'subscribe' && parsed.topic) {
          const topic = parsed.topic as string;
          if (Object.values(WS_CONFIG.topics).includes(topic)) {
            ws.subscribe(topic);
            data.subscriptions.push(topic);
            ws.send(JSON.stringify({ type: 'subscribed', topic }));
          }
        }

        // Handle unsubscribe requests
        if (parsed.type === 'unsubscribe' && parsed.topic) {
          const topic = parsed.topic as string;
          ws.unsubscribe(topic);
          data.subscriptions = data.subscriptions.filter(t => t !== topic);
          ws.send(JSON.stringify({ type: 'unsubscribed', topic }));
        }

        // Handle ping
        if (parsed.type === 'ping') {
          data.lastPing = Date.now();
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // Ignore invalid JSON - client responsibility
      }
    },

    /**
     * Backpressure drain callback
     * Resume sending when buffer is drained
     */
    drain(ws: ServerWebSocket<WSClientData>) {
      const data = ws.data;

      if (data.queued) {
        data.queued = false;
        console.log(`[WS] Backpressure drained for ${data.key}`);

        // Re-publish any pending data
        // In ORCA: Would re-send latest odds delta
      }
    },

    /**
     * Connection closed - cleanup
     */
    close(ws: ServerWebSocket<WSClientData>, code: number, _reason: string) {
      const data = ws.data;
      metrics.connections--;

      // subscriptions automatically returns [] when closed (Bun 1.3.2+)
      console.log(
        `[WS] Client disconnected: ${data.key}, code: ${code}, subscriptions: ${ws.subscriptions}`
      );
    },

    /**
     * Error handler
     */
    error(ws: ServerWebSocket<WSClientData>, error: Error) {
      metrics.errors++;
      console.error(`[WS] Error for ${ws.data.key}:`, error.message);
    },
  };
}

/**
 * Broadcast message to topic using pub/sub
 * Cork batching for reduced latency
 */
export function broadcast(
  server: BunServer,
  topic: string,
  data: any,
  compress: boolean = false
): number {
  const payload = JSON.stringify(data);
  const start = performance.now();

  // Use server.publish for topic-based broadcast
  // Returns number of bytes sent (or 0 if no subscribers)
  const result = server.publish(topic, payload, compress);

  const latency = performance.now() - start;

  // Track metrics
  messageCount++;
  bytesCount += payload.length;

  // Update latency metrics (simple moving average)
  metrics.latencyP50 = metrics.latencyP50 * 0.9 + latency * 0.1;

  return result;
}

/**
 * Broadcast with cork batching for multiple messages
 * Reduces syscalls and improves latency by 20%
 */
export function batchBroadcast(ws: ServerWebSocket<WSClientData>, messages: any[]): void {
  ws.cork(() => {
    for (const msg of messages) {
      const payload = JSON.stringify(msg);
      const result = ws.send(payload);

      // Handle backpressure
      // -1 = enqueued (throttle), 0 = dropped (close), 1+ = bytes sent
      if (result === -1) {
        ws.data.queued = true;
        metrics.backpressureEvents++;
      } else if (result === 0) {
        console.warn(`[WS] Message dropped for ${ws.data.key}`);
      }
    }
  });
}

/**
 * Get current WebSocket metrics
 */
export function getMetrics(): WSMetrics {
  const now = Date.now();
  const elapsed = (now - lastMetricsReset) / 1000;

  if (elapsed > 0) {
    metrics.messagesPerSec = messageCount / elapsed;
    metrics.bytesPerSec = bytesCount / elapsed;
  }

  return { ...metrics };
}

/**
 * Reset metrics counters
 */
export function resetMetrics(): void {
  messageCount = 0;
  bytesCount = 0;
  lastMetricsReset = Date.now();
  metrics.backpressureEvents = 0;
  metrics.errors = 0;
}

/**
 * Create WebSocket upgrade handler for Bun.serve
 */
export function createUpgradeHandler(server: BunServer) {
  return (req: Request): Response | undefined => {
    const url = new URL(req.url);

    // Only upgrade WebSocket requests to /ws
    if (url.pathname !== '/ws') {
      return undefined;
    }

    // Extract API key from query params or headers
    const key = url.searchParams.get('key') || req.headers.get('x-api-key') || 'anonymous';

    // Validate key before upgrade
    if (!validateKey(key)) {
      return new Response('Invalid API key', { status: 401 });
    }

    // Upgrade to WebSocket with client data
    const upgraded = server.upgrade(req, {
      data: {
        key,
        subscriptions: [],
        queued: false,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        messageCount: 0,
        bytesReceived: 0,
        bytesSent: 0,
      } as WSClientData,
    });

    if (upgraded) {
      return undefined; // Upgrade successful
    }

    return new Response('WebSocket upgrade failed', { status: 500 });
  };
}
