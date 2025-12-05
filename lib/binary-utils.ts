/**
 * BINARY DATA UTILITIES - Advanced Binary Data Processing
 * Provides high-performance binary data handling for exchanges with TypedArray optimization
 */

import { BlueprintConfig } from './blueprints/loader';
import type { BunInspectOptions, BunStringWidthOptions } from '../types/bun-inspect';

/**
 * Binary Data Types for Exchange Communication
 */
export enum BinaryDataType {
  UINT8_ARRAY = 'uint8array',
  UINT16_ARRAY = 'uint16array',
  UINT32_ARRAY = 'uint32array',
  FLOAT32_ARRAY = 'float32array',
  FLOAT64_ARRAY = 'float64array',
  BUFFER = 'buffer',
  DATAVIEW = 'dataview'
}

/**
 * Exchange Data Message Structure
 */
export interface ExchangeMessage {
  exchange: string;
  symbol: string;
  type: 'ticker' | 'trade' | 'depth' | 'kline' | 'orderbook';
  timestamp: number;
  data: any;
  rawBinary?: ArrayBuffer;
  metadata?: Record<string, any>;
}

/**
 * Stream Consumer Configuration
 */
export interface StreamConsumer {
  id: string;
  type: 'cache' | 'processor' | 'ui' | 'analytics' | 'alerts';
  bufferSize: number;
  filter?: (message: ExchangeMessage) => boolean;
  transform?: (message: ExchangeMessage) => ExchangeMessage;
  errorThreshold: number;
  reconnectOnFailure: boolean;
}

/**
 * Stream Processing Options
 */
export interface StreamOptions {
  chunkSize: number;
  compression?: 'gzip' | 'deflate' | 'none';
  endianness: 'big-endian' | 'little-endian';
  validateChecksum: boolean;
  maxRetries: number;
  bufferSize: number;
}

/**
 * Binary Stream Manager with Tee Support
 */
export class BinaryStreamManager {
  private streams = new Map<string, ReadableStream<ExchangeMessage>>();
  private consumers = new Map<string, StreamConsumer>();
  private streamBuffers = new Map<string, Array<ExchangeMessage>>();
  private stats = new Map<string, StreamStats>();
  private startTime = Bun.nanoseconds();
  private lastActivity = Bun.nanoseconds();
  private messageCount = 0;

  constructor(private blueprint: BlueprintConfig) {}

  /**
   * Enhanced custom inspection with depth control and hex formatting
   */
  [Bun.inspect.custom](depth: number = 1, options: BunInspectOptions = {}) {
    const now = Bun.nanoseconds();
    const uptime = now - this.startTime;
    const idleTime = now - this.lastActivity;

    // Check for hex option in inspect options
    const useHex = options?.hex === true;

    // Base information (always shown)
    const summary: any = {
      streams: this.streams.size,
      consumers: this.consumers.size,
      buffered: Array.from(this.streamBuffers.values()).reduce(
        (sum, buffer) => sum + buffer.length, 0
      ),
      uptime: `${(uptime / 1e9).toFixed(2)}s`,
      idle: `${(idleTime / 1e9).toFixed(2)}s`,
      messages: this.messageCount,
    };

    // Add blueprint name if depth > 1
    if (depth > 1) {
      summary.blueprint = this.blueprint.metadata?.name || 'Unknown Exchange';
      summary.capabilities = {
        binaryStreams: this.blueprint.capabilities?.binaryStreams || false,
        streamTeeing: this.blueprint.capabilities?.streamTeeing || false,
      };
    }

    // Add consumer details at depth 2+
    if (depth > 2) {
      summary.consumers = Array.from(this.consumers.entries()).map(([key, consumer]) => ({
        id: consumer.id,
        type: consumer.type,
        bufferSize: consumer.bufferSize,
        buffered: this.streamBuffers.get(key)?.length || 0,
      }));

      // Add sample buffered messages with hex formatting
      if (useHex && this.streamBuffers.size > 0) {
        summary.samples = {};
        for (const [key, buffer] of this.streamBuffers.entries()) {
          if (buffer.length > 0) {
            const sample = buffer[0];
            if (sample) {
              // Create binary representation for hex display
              const binaryData = this.createBinaryPreview(sample, useHex);
              summary.samples[key] = {
                exchange: sample.exchange,
                symbol: sample.symbol,
                type: sample.type,
                data: binaryData,
              };
            }
          }
        }
      }
    }

    // Detailed statistics if depth > 2
    if (depth > 2) {
      const statsSummary = this.generateStatsSummary();
      summary.stats = statsSummary;
      summary.lastActivity = `${(idleTime / 1e9).toFixed(2)}s ago`;
      summary.websocket = {
        active: Array.from(this.streams.keys()).filter(k => k.includes('ws')).length
      };
    }

    // Full debug mode (depth > 3 or showHidden)
    if (depth > 3 || options.showHidden) {
      summary.internal = {
        streamKeys: Array.from(this.streams.keys()),
        consumerTypes: Array.from(this.consumers.keys()).map(k => k.split(':')[1]),
        memoryBuffers: this.streamBuffers.size,
        activeSince: new Date(Date.now() - Number(uptime) / 1e6).toISOString()
      };
    }

    return summary;
  }

  /**
   * Create binary preview of message data with hex formatting
   */
  private createBinaryPreview(message: ExchangeMessage, useHex: boolean): any {
    if (!useHex) {
      return message.data;
    }

    // Convert message data to binary and show hex representation
    const encoded = new BinaryDataProcessor(this.blueprint).encodeMessage(message);
    const uint8Array = new Uint8Array(encoded);
    
    // Show hex representation of first 16 bytes
    const previewBytes = uint8Array.slice(0, 16);
    const hexString = Array.from(previewBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Use Bun.stringWidth for accurate width calculation if available
    const stringWidth = (globalThis as any).Bun?.stringWidth || ((str: string, options?: BunStringWidthOptions) => str.length);
    const displayWidth = stringWidth(hexString, { countAnsiEscapeCodes: false });
    
    return {
      binary: `<${hexString}> (${previewBytes.length} bytes)`,
      preview: message.data,
      totalBytes: uint8Array.length,
      displayWidth, // Actual visual width for table formatting
    };
  }

  private calculateMessageRate(): number {
    const now = Bun.nanoseconds();
    const timeWindow = Number(now - this.lastActivity) / 1e9; // seconds
    return timeWindow > 0 ? this.messageCount / timeWindow : 0;
  }

  private generateStatsSummary(): Record<string, number | string> {
    const totalStats = Array.from(this.stats.values());
    if (totalStats.length === 0) return { totalMessages: 0 };

    const totalMessages = totalStats.reduce((sum, stat) => sum + stat.messagesProcessed, 0);
    const errorRate = totalStats.reduce((sum, stat) => sum + stat.errorCount, 0) / totalMessages;
    const avgProcessingTime = totalStats.reduce((sum, stat) =>
      sum + stat.avgProcessingTime, 0) / totalStats.length;

    return {
      totalMessages,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      avgProcessingTime: `${avgProcessingTime.toFixed(3)}ms`,
      reconnects: totalStats.reduce((sum, stat) => sum + stat.reconnectCount, 0)
    };
  }

  /**
   * Create a teed stream for multi-consumer data flow
   */
  async createTeedStream(
    exchangeName: string,
    sourceStream: ReadableStream<ExchangeMessage>,
    consumerTypes: string[]
  ): Promise<Map<string, ReadableStream<ExchangeMessage>>> {
    const streamKey = `${exchangeName}:teed`;
    const consumerStreams = new Map<string, ReadableStream<ExchangeMessage>>();

    // Get number of consumers
    const numConsumers = consumerTypes.length;
    if (numConsumers <= 1) {
      // Single consumer - no teeing needed
      consumerStreams.set(consumerTypes[0], sourceStream);
      return consumerStreams;
    }

    try {
      // Use stream.tee() to create multiple independent streams
      const streams = this.teeStream(sourceStream, numConsumers);

      // Assign each teed stream to a consumer type
      consumerTypes.forEach((type, index) => {
        const consumerKey = `${exchangeName}:${type}`;
        const stream = streams[index];

        consumerStreams.set(consumerKey, stream);
        this.setupConsumerStream(consumerKey, stream, type);
      });

      // Store the primary stream
      this.streams.set(streamKey, consumerStreams.get(consumerStreams.keys().next().value!)!);

      return consumerStreams;

    } catch (error) {
      console.error(`Failed to create teed stream for ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Advanced stream teeing with proper TypeScript typing
   */
  private teeStream(
    stream: ReadableStream<ExchangeMessage>,
    count: number
  ): ReadableStream<ExchangeMessage>[] {
    if (count <= 1) return [stream];

    // Use TypeScript-friendly stream teeing
    const [a, b] = stream.tee();
    const remaining = this.teeStream(b, count - 1);

    return [a, ...remaining];
  }

  /**
   * Setup consumer stream with processing pipeline
   */
  private setupConsumerStream(
    consumerKey: string,
    stream: ReadableStream<ExchangeMessage>,
    type: string
  ): void {
    const consumer = this.getOrCreateConsumer(consumerKey, type);

    // Create consumer-specific readable stream
    const consumerStream = new ReadableStream<ExchangeMessage>({
      start: (controller) => {
        const reader = stream.getReader();

        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }

              // Process message for this consumer
              const processedMessage = this.processForConsumer(value, consumer);

              if (processedMessage) {
                controller.enqueue(processedMessage);

                // Update stats
                this.updateStreamStats(consumerKey);

                // Buffer message if needed
                if (consumer.bufferSize > 0) {
                  this.addToBuffer(consumerKey, processedMessage, consumer.bufferSize);
                }
              }
            }
          } catch (error) {
            console.error(`Consumer stream error for ${consumerKey}:`, error);
            controller.error(error);
          }
        })();
      }
    });

    this.streams.set(consumerKey, consumerStream);
  }

  /**
   * Process message for specific consumer
   */
  private processForConsumer(
    message: ExchangeMessage,
    consumer: StreamConsumer
  ): ExchangeMessage | null {
    try {
      // Apply filter
      if (consumer.filter && !consumer.filter(message)) {
        return null;
      }

      // Apply transformation
      if (consumer.transform) {
        message = consumer.transform(message);
      }

      return message;

    } catch (error) {
      console.error(`Message processing failed for consumer ${consumer.id}:`, error);
      // Check error threshold
      if (consumer.errorThreshold > 0) {
        // TODO: Implement error counting and circuit breaking
      }
      return null;
    }
  }

  /**
   * Get or create consumer configuration
   */
  private getOrCreateConsumer(consumerKey: string, type: string): StreamConsumer {
    if (this.consumers.has(consumerKey)) {
      return this.consumers.get(consumerKey)!;
    }

    const consumer: StreamConsumer = {
      id: consumerKey,
      type: type as any,
      bufferSize: this.getDefaultBufferSize(type),
      errorThreshold: type === 'ui' ? 10 : 100,
      reconnectOnFailure: type !== 'ui', // UI consumers can fail silently
    };

    this.consumers.set(consumerKey, consumer);
    return consumer;
  }

  /**
   * Get default buffer size based on consumer type
   */
  private getDefaultBufferSize(type: string): number {
    const sizes = {
      cache: 10000,      // Large buffer for caching
      processor: 1000,   // Moderate buffer for processing
      ui: 100,          // Small buffer for UI updates
      analytics: 5000,  // Large buffer for batch analysis
      alerts: 100,      // Small buffer for alert triggers
    };
    return sizes[type as keyof typeof sizes] || 1000;
  }

  /**
   * Add message to consumer buffer
   */
  private addToBuffer(
    consumerKey: string,
    message: ExchangeMessage,
    maxSize: number
  ): void {
    const buffer = this.streamBuffers.get(consumerKey) || [];
    buffer.push(message);

    // Maintain buffer size
    if (buffer.length > maxSize) {
      buffer.shift(); // Remove oldest message
    }

    this.streamBuffers.set(consumerKey, buffer);
  }

  /**
   * Update stream statistics
   */
  private updateStreamStats(consumerKey: string): void {
    const now = Date.now();
    const stats = this.stats.get(consumerKey) || {
      messagesProcessed: 0,
      bytesProcessed: 0,
      avgProcessingTime: 0,
      lastMessageTime: now,
      startTime: now,
      errorCount: 0,
      reconnectCount: 0
    };

    stats.messagesProcessed++;
    stats.lastMessageTime = now;

    this.stats.set(consumerKey, stats);
  }

  /**
   * Get consumer statistics
   */
  getConsumerStats(consumerKey: string): StreamStats | undefined {
    return this.stats.get(consumerKey);
  }

  /**
   * Get consumer buffer
   */
  getConsumerBuffer(consumerKey: string): ExchangeMessage[] {
    return this.streamBuffers.get(consumerKey) || [];
  }

  /**
   * Close all streams for an exchange
   */
  async closeExchangeStreams(exchangeName: string): Promise<void> {
    const pattern = new RegExp(`^${exchangeName}:`);
    const toClose: string[] = [];

    for (const key of this.streams.keys()) {
      if (pattern.test(key)) {
        toClose.push(key);
      }
    }

    for (const key of toClose) {
      const stream = this.streams.get(key);
      if (stream) {
        // Close the readable stream (if supported)
        try {
          await stream.cancel?.('Exchange streams closing');
        } catch (error) {
          console.warn(`Failed to close stream ${key}:`, error);
        }
      }
      this.streams.delete(key);
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): Map<string, ReadableStream<ExchangeMessage>> {
    return new Map(this.streams);
  }
}

/**
 * Binary Data Encoder/Decoder with TypedArray Optimization
 */
export class BinaryDataProcessor {
  private options: StreamOptions;

  constructor(blueprint: BlueprintConfig, options?: Partial<StreamOptions>) {
    this.options = {
      chunkSize: blueprint.binaryHandling?.chunkSize || 8192,
      compression: blueprint.binaryHandling?.compression as any || 'none',
      endianness: blueprint.binaryHandling?.endianness as any || 'big-endian',
      validateChecksum: true,
      maxRetries: blueprint.streamConfig?.maxRetries || 5,
      bufferSize: blueprint.streamConfig?.bufferSize || 65536,
      ...options
    };
  }

  /**
   * Encode ExchangeMessage to binary format
   */
  encodeMessage(message: ExchangeMessage): ArrayBuffer {
    // Calculate total size needed
    const jsonStr = JSON.stringify(message);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const totalSize = 4 + jsonBytes.length; // 4 bytes for length prefix

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write length prefix (big-endian)
    view.setUint32(0, jsonBytes.length, this.options.endianness === 'little-endian');

    // Write JSON data
    const uint8View = new Uint8Array(buffer, 4);
    uint8View.set(jsonBytes);

    return buffer;
  }

  /**
   * Decode binary data to ExchangeMessage
   */
  decodeMessage(buffer: ArrayBuffer): ExchangeMessage | null {
    try {
      const view = new DataView(buffer);

      // Read length prefix
      const length = view.getUint32(0, this.options.endianness === 'little-endian');

      // Extract JSON bytes
      const jsonBytes = new Uint8Array(buffer, 4, length);
      const jsonStr = new TextDecoder().decode(jsonBytes);

      return JSON.parse(jsonStr) as ExchangeMessage;

    } catch (error) {
      console.error('Binary message decode failed:', error);
      return null;
    }
  }

  /**
   * Convert binary stream chunk to messages
   */
  async processBinaryChunk(
    chunk: Uint8Array,
    onMessage: (message: ExchangeMessage) => void
  ): Promise<void> {
    let offset = 0;
    const totalLength = chunk.length;

    while (offset < totalLength) {
      if (offset + 4 > totalLength) {
        // Incomplete message length prefix
        break;
      }

      const view = new DataView(chunk.buffer, chunk.byteOffset + offset, 4);
      const messageLength = view.getUint32(0, this.options.endianness === 'little-endian');

      if (offset + 4 + messageLength > totalLength) {
        // Incomplete message data
        break;
      }

      // Extract message buffer
      const messageStart = offset + 4;
      const messageEnd = offset + 4 + messageLength;

      // Create a proper ArrayBuffer slice
      const messageBuffer = new ArrayBuffer(messageLength);
      const messageView = new Uint8Array(messageBuffer);
      messageView.set(chunk.subarray(messageStart, messageEnd));

      const message = this.decodeMessage(messageBuffer);

      if (message) {
        onMessage(message);
      }

      offset += 4 + messageLength;
    }
  }

  /**
   * Compress data using Pako (if available) or native compression
   */
  async compressData(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (this.options.compression === 'none') {
      return buffer;
    }

    // TODO: Implement compression with Pako or native APIs
    return buffer;
  }

  /**
   * Decompress data
   */
  async decompressData(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (this.options.compression === 'none') {
      return buffer;
    }

    // TODO: Implement decompression
    return buffer;
  }

  /**
   * Calculate simple checksum for data validation
   */
  calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) & 0xFFFF;
    }
    return sum;
  }

  /**
   * Validate checksum
   */
  validateChecksum(data: Uint8Array, expectedChecksum: number): boolean {
    return this.calculateChecksum(data) === expectedChecksum;
  }
}

/**
 * WebSocket Binary Message Handler
 */
export class BinaryMessageHandler {
  private processor: BinaryDataProcessor;
  private messageQueue: ExchangeMessage[] = [];
  private buffer = new Uint8Array(65536); // 64KB buffer
  private bufferOffset = 0;

  constructor(blueprint: BlueprintConfig) {
    this.processor = new BinaryDataProcessor(blueprint);
  }

  /**
   * Handle WebSocket binary message
   */
  async handleBinaryMessage(
    data: ArrayBuffer | Blob,
    onMessage?: (message: ExchangeMessage) => void
  ): Promise<ExchangeMessage[]> {
    const messages: ExchangeMessage[] = [];

    // Convert to Uint8Array
    let chunk: Uint8Array;
    if (data instanceof ArrayBuffer) {
      chunk = new Uint8Array(data);
    } else {
      // Blob to ArrayBuffer conversion
      chunk = new Uint8Array(await data.arrayBuffer());
    }

    // Check if we need to expand buffer
    if (this.bufferOffset + chunk.length > this.buffer.length) {
      const newBuffer = new Uint8Array(this.buffer.length * 2);
      newBuffer.set(this.buffer.subarray(0, this.bufferOffset));
      this.buffer = newBuffer;
    }

    // Append to buffer
    this.buffer.set(chunk, this.bufferOffset);
    this.bufferOffset += chunk.length;

    // Process complete messages
    await this.processor.processBinaryChunk(
      this.buffer.subarray(0, this.bufferOffset),
      (message) => {
        messages.push(message);
        onMessage?.(message);
        this.messageQueue.push(message);
      }
    );

    // Clean up processed data
    this.compactBuffer();

    return messages;
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): ExchangeMessage[] {
    const messages = [...this.messageQueue];
    this.messageQueue.length = 0; // Clear queue
    return messages;
  }

  /**
   * Compact buffer by removing processed data
   */
  private compactBuffer(): void {
    // Find first incomplete message
    let offset = 0;

    while (offset + 4 <= this.bufferOffset) {
      const view = new DataView(this.buffer.buffer, this.buffer.byteOffset + offset, 4);
      const messageLength = view.getUint32(0, false); // Assume big-endian for now

      if (offset + 4 + messageLength <= this.bufferOffset) {
        // Complete message found, skip it
        offset += 4 + messageLength;
      } else {
        // Incomplete message, stop here
        break;
      }
    }

    // Move remaining data to start of buffer
    if (offset > 0) {
      this.buffer.copyWithin(0, offset, this.bufferOffset);
      this.bufferOffset -= offset;
    }
  }

  /**
   * Reset buffer state
   */
  reset(): void {
    this.bufferOffset = 0;
    this.messageQueue.length = 0;
  }
}

/**
 * Stream Statistics
 */
export interface StreamStats {
  messagesProcessed: number;
  bytesProcessed: number;
  avgProcessingTime: number;
  lastMessageTime: number;
  startTime: number;
  errorCount: number;
  reconnectCount: number;
}
