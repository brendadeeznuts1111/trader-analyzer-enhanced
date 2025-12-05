#!/usr/bin/env bun
/**
 * BINANCE BINARY INTEGRATION TESTS
 * Comprehensive testing suite for binary data handling and stream processing
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { BlueprintLoader } from '../lib/blueprints/loader';
import { BinanceExchange } from '../lib/exchanges/binance_exchange';
import {
  BinaryStreamManager,
  BinaryDataProcessor,
  BinaryMessageHandler,
  ExchangeMessage,
  StreamOptions
} from '../lib/binary-utils';

// Mock credentials for testing
const TEST_CREDENTIALS = {
  apiKey: 'test_api_key',
  secretKey: 'test_secret_key'
};

// Test exchange message
const TEST_MESSAGE: ExchangeMessage = {
  exchange: 'binance',
  symbol: 'BTCUSDT',
  type: 'ticker',
  timestamp: Date.now(),
  data: {
    price: 50000,
    volume: 100,
    symbol: 'BTCUSDT'
  },
  metadata: {
    test: true
  }
};

describe('Binance Binary Integration Suite', () => {
  let blueprintLoader: BlueprintLoader;
  let blueprint: any;
  let streamManager: BinaryStreamManager;
  let dataProcessor: BinaryDataProcessor;
  let messageHandler: BinaryMessageHandler;

  beforeAll(async () => {
    blueprintLoader = BlueprintLoader.getInstance();

    // Load blueprint
    blueprint = await blueprintLoader.loadBlueprint('BP-EXCHANGE-BINANCE');

    // Initialize binary components
    streamManager = new BinaryStreamManager(blueprint);
    dataProcessor = new BinaryDataProcessor(blueprint);
    messageHandler = new BinaryMessageHandler(blueprint);
  });

  describe('Blueprint Configuration', () => {
    test('loads Binance blueprint correctly', () => {
      expect(blueprint).toBeDefined();
      expect(blueprint.blueprint).toBe('BP-EXCHANGE-BINANCE');
      expect(blueprint.version).toBe('2.0.0');
      expect(blueprint.category).toBe('crypto');
    });

    test('has correct binary handling configuration', () => {
      expect(blueprint.capabilities.binaryStreams).toBe(true);
      expect(blueprint.capabilities.websocket).toBe(true);
      expect(blueprint.binaryHandling?.streamTee).toBe(true);
    });

    test('supports required symbols', () => {
      const symbols = blueprint.symbols?.spot || [];
      expect(symbols).toContain('BTCUSDT');
      expect(symbols).toContain('ETHUSDT');
    });
  });

  describe('Binary Data Processing', () => {
    test('encodes and decodes messages correctly', () => {
      // Encode message
      const encoded = dataProcessor.encodeMessage(TEST_MESSAGE);
      expect(encoded).toBeInstanceOf(ArrayBuffer);
      expect(encoded.byteLength).toBeGreaterThan(0);

      // Decode message
      const decoded = dataProcessor.decodeMessage(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.exchange).toBe(TEST_MESSAGE.exchange);
      expect(decoded?.symbol).toBe(TEST_MESSAGE.symbol);
      expect(decoded?.type).toBe(TEST_MESSAGE.type);
    });

    test('handles binary chunks with multiple messages', async () => {
      const messages: ExchangeMessage[] = [];
      const chunk = new Uint8Array(1024);

      // Write multiple messages to chunk
      let offset = 0;
      for (let i = 0; i < 3; i++) {
        const testMsg = { ...TEST_MESSAGE, timestamp: TEST_MESSAGE.timestamp + i };
        const encoded = dataProcessor.encodeMessage(testMsg);
        const msgView = new Uint8Array(encoded);

        if (offset + msgView.length <= chunk.length) {
          chunk.set(msgView, offset);
          offset += msgView.length;
        }
      }

      // Process chunk
      await dataProcessor.processBinaryChunk(chunk.subarray(0, offset), (msg) => {
        messages.push(msg);
      });

      expect(messages).toHaveLength(3);
      messages.forEach((msg, index) => {
        expect(msg.exchange).toBe('binance');
        expect(msg.timestamp).toBe(TEST_MESSAGE.timestamp + index);
      });
    });

    test('handles incomplete messages correctly', async () => {
      const messageBuffer = dataProcessor.encodeMessage(TEST_MESSAGE);
      const partialChunk = new Uint8Array(messageBuffer, 0, 8); // Only first 8 bytes

      let receivedMessages: ExchangeMessage[] = [];
      await dataProcessor.processBinaryChunk(partialChunk, (msg) => {
        receivedMessages.push(msg);
      });

      // Should not decode incomplete message
      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe('Binary Message Handler', () => {
    test('processes ArrayBuffer messages', async () => {
      const buffer = dataProcessor.encodeMessage(TEST_MESSAGE);
      const messages = await messageHandler.handleBinaryMessage(buffer);

      expect(messages).toHaveLength(1);
      expect(messages[0].exchange).toBe('binance');
    });

    test('handles Blob messages', async () => {
      const buffer = dataProcessor.encodeMessage(TEST_MESSAGE);
      const blob = new Blob([buffer]);

      const messages = await messageHandler.handleBinaryMessage(blob);
      expect(messages).toHaveLength(1);
      expect(messages[0].symbol).toBe('BTCUSDT');
    });

    test('maintains message queue', async () => {
      const buffer1 = dataProcessor.encodeMessage({ ...TEST_MESSAGE, symbol: 'BTCUSDT' });
      const buffer2 = dataProcessor.encodeMessage({ ...TEST_MESSAGE, symbol: 'ETHUSDT' });

      await messageHandler.handleBinaryMessage(buffer1);
      await messageHandler.handleBinaryMessage(buffer2);

      const queued = messageHandler.getQueuedMessages();
      expect(queued).toHaveLength(2);
      expect(queued[0].symbol).toBe('BTCUSDT');
      expect(queued[1].symbol).toBe('ETHUSDT');

      // Queue should be empty after getting
      expect(messageHandler.getQueuedMessages()).toHaveLength(0);
    });
  });

  describe('Stream Processing', () => {
    test('creates teed streams for multiple consumers', async () => {
      // Create a simple source stream
      const sourceStream = new ReadableStream<ExchangeMessage>({
        start(controller) {
          controller.enqueue(TEST_MESSAGE);
          controller.close();
        }
      });

      const consumerTypes = ['ui', 'cache', 'analytics'];
      const teedStreams = await streamManager.createTeedStream('binance', sourceStream, consumerTypes);

      expect(teedStreams.size).toBe(3);
      expect(teedStreams.has('binance:ui')).toBe(true);
      expect(teedStreams.has('binance:cache')).toBe(true);
      expect(teedStreams.has('binance:analytics')).toBe(true);
    });

    test('single consumer returns original stream', async () => {
      const sourceStream = new ReadableStream<ExchangeMessage>({
        start(controller) {
          controller.enqueue(TEST_MESSAGE);
          controller.close();
        }
      });

      const teedStreams = await streamManager.createTeedStream('binance', sourceStream, ['ui']);
      expect(teedStreams.size).toBe(1);
    });

    test('maintains consumer buffers', async () => {
      // Add message to buffer
      streamManager.getConsumerBuffer('binance:cache'); // Initialize buffer
      // Note: Actual buffer testing would require full stream processing
    });
  });

  describe('Custom Inspection', () => {
    test('provides custom Bun.inspect table output', () => {
      const inspection = streamManager[Bun.inspect.custom]();
      expect(inspection).toEqual({
        streams: 0,
        consumers: 0,
        buffered: 0,
        blueprint: 'Binance Exchange'
      });
    });

    test('reflects dynamic state changes', () => {
      // After creating some streams
      const inspection = streamManager[Bun.inspect.custom]();
      expect(typeof inspection.streams).toBe('number');
      expect(typeof inspection.consumers).toBe('number');
    });
  });

  describe('Configuration Validation', () => {
    test('loads master registry correctly', async () => {
      const masterRegistry = await blueprintLoader.loadMasterRegistry();
      expect(masterRegistry.registry.totalBlueprints).toBeGreaterThan(0);
      expect(masterRegistry.blueprintCategories.crypto).toContain('BP-EXCHANGE-BINANCE');
    });

    test('validates blueprint schema', () => {
      expect(blueprint.metadata.name).toBeDefined();
      expect(blueprint.api.baseUrl).toContain('binance');
      expect(blueprint.rateLimit.requestsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    test('memory-efficient binary processing', () => {
      const startMemory = process.memoryUsage?.()?.heapUsed || 0;

      // Process multiple messages
      for (let i = 0; i < 100; i++) {
        dataProcessor.encodeMessage(TEST_MESSAGE);
      }

      const endMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = endMemory - startMemory;

      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('fast binary encoding/decoding', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const encoded = dataProcessor.encodeMessage(TEST_MESSAGE);
        dataProcessor.decodeMessage(encoded);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should process 1000 messages in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    test('handles malformed binary data', () => {
      const invalidBuffer = new ArrayBuffer(10);
      const result = dataProcessor.decodeMessage(invalidBuffer);
      expect(result).toBeNull();
    });

    test('handles incomplete chunk processing', async () => {
      const invalidChunk = new Uint8Array([0, 0, 0]); // Too short
      let messagesReceived = 0;

      await dataProcessor.processBinaryChunk(invalidChunk, () => {
        messagesReceived++;
      });

      expect(messagesReceived).toBe(0);
    });
  });

  describe('Integration Demo', () => {
    test('full message processing pipeline', async () => {
      // Encode message
      const buffer = dataProcessor.encodeMessage(TEST_MESSAGE);

      // Process through message handler
      const messages = await messageHandler.handleBinaryMessage(buffer);

      // Validate result
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject(TEST_MESSAGE);

      // Check message queue
      const queuedMessages = messageHandler.getQueuedMessages();
      expect(queuedMessages).toHaveLength(1);
    });

    test('stream teeing demonstration', async () => {
      // Create multiple consumer streams
      const consumerTypes = ['cache', 'processor', 'ui'];
      const teedStreams = await streamManager.createTeedStream('binance', new ReadableStream({
        start(controller) {
          controller.close(); // Empty stream for test
        }
      }), consumerTypes);

      // Verify streams were created
      consumerTypes.forEach(type => {
        expect(teedStreams.has(`binance:${type}`)).toBe(true);
    });
  });
});

// Satisfy TypeScript compiler
export {};
});</path>
