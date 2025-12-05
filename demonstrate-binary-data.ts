#!/usr/bin/env bun
/**
 * BINARY DATA CLASSES DEMONSTRATION
 * Showcases Bun.inspect.table() integration with custom [Bun.inspect.custom] methods
 */

import { BinaryStreamManager, BinaryDataProcessor, BinaryMessageHandler, ExchangeMessage } from './lib/binary-utils';
import { BlueprintLoader } from './lib/blueprints/loader';

// Demonstrates the binary data handling capabilities
async function demonstrateBinaryDataHandling() {
  console.log('\n🚀 BINANCE BINARY DATA DEMONSTRATION\n');

  // Load blueprint
  const blueprintLoader = BlueprintLoader.getInstance();
  const blueprint = await blueprintLoader.loadBlueprint('BP-EXCHANGE-BINANCE');

  // Initialize components
  const streamManager = new BinaryStreamManager(blueprint);
  const dataProcessor = new BinaryDataProcessor(blueprint);
  const messageHandler = new BinaryMessageHandler(blueprint);

  // Create demonstration data for Bun.inspect.table() with live instances
  const binaryDataClassesExampleData = [
    {
      Class: 'ArrayBuffer',
      Type: 'Buffer',
      Description: 'Fundamental raw byte sequence',
      Properties: ['byteLength', 'slice()']
    },
    {
      Class: 'TypedArray',
      Type: 'View',
      Description: 'Array-like view of fixed-size elements',
      Properties: ['buffer', 'byteOffset', 'byteLength', 'length']
    },
    {
      Class: 'DataView',
      Type: 'View',
      Description: 'Low-level R/W at byte offsets in ArrayBuffer',
      Properties: ['buffer', 'getUint8()', 'setFloat64()']
    },
    {
      Class: 'Blob',
      Type: 'File/Binary Data',
      Description: 'Readonly binary data blob, often for files',
      Properties: ['type', 'size', 'text()', 'bytes()']
    },
    {
      Class: 'BinaryDataProcessor',
      Type: 'Encoding/Decoding',
      Description: 'High-performance binary message processing',
      Properties: dataProcessor // Live instance! Uses [Bun.inspect.custom]
    },
    {
      Class: 'BinaryMessageHandler',
      Type: 'WebSocket Processing',
      Description: 'Handles WebSocket binary messages with buffering',
      Properties: messageHandler // Live instance! Uses [Bun.inspect.custom]
    },
    {
      Class: 'BinaryStreamManager',
      Type: 'Stream Processing',
      Description: 'Manages multi-consumer data streams with teeing',
      Properties: streamManager // Live instance! Uses [Bun.inspect.custom] with depth control
    },
    {
      Class: 'Uint8Array',
      Type: 'Typed Array',
      Description: '8-bit unsigned integer array (binary data)',
      Properties: new Uint8Array([0x42, 0x69, 0x6E, 0x61, 0x6E, 0x63, 0x65, 0x00]) // "Binance\0"
    }
  ];

  console.log('📊 Binary Data Classes Overview:');
  console.log('=' .repeat(80));

  // The 'properties' array explicitly defines the columns and their order
  const propertiesForBinaryDataTable = ['Class', 'Type', 'Description', 'Properties'];

  // This is how you would call it in your code to produce the table below.
  console.log(Bun.inspect.table(binaryDataClassesExampleData, propertiesForBinaryDataTable, {
    colors: true
  }));

  console.log('\n🔧 Component Inspection (Custom [Bun.inspect.custom]):');
  console.log('-'.repeat(60));

  console.log(Bun.inspect.table([streamManager], ['streams', 'consumers', 'buffered', 'blueprint'], {
    colors: true
  }));

  console.log('\n⚡ Binary Processing Capabilities:');
  console.log('-'.repeat(50));

  // Demonstrate binary encoding/decoding
  const testMessage: ExchangeMessage = {
    exchange: 'binance',
    symbol: 'BTCUSDT',
    type: 'ticker',
    timestamp: Date.now(),
    data: {
      price: 50000.50,
      volume: 1250.75,
      change: -2.35
    },
    metadata: {
      source: 'real-time',
      tradeCount: 15000
    }
  };

  // Encode to binary
  const encoded = dataProcessor.encodeMessage(testMessage);
  console.log(`📦 Encoded message size: ${encoded.byteLength} bytes`);

  // Decode back
  const decoded = dataProcessor.decodeMessage(encoded);
  console.log(`🔓 Decoded message valid: ${decoded?.exchange === 'binance' ? '✅' : '❌'}`);

  // Process through message handler
  const messages = await messageHandler.handleBinaryMessage(encoded);
  console.log(`📨 Message handler processed: ${messages.length} messages`);

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-CONSUMER STREAM PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🌊 Multi-Consumer Stream Processing:');
  console.log('-'.repeat(45));

  // Consumer type configuration with role-specific settings
  const CONSUMER_CONFIG = {
    ui: { 
      bufferSize: 100, 
      priority: 'high',
      description: 'Real-time UI updates' 
    },
    cache: { 
      bufferSize: 10000, 
      priority: 'medium',
      description: 'LRU cache persistence' 
    },
    analytics: { 
      bufferSize: 5000, 
      priority: 'low',
      description: 'Batch metrics & aggregation' 
    },
  } as const;

  type ConsumerType = keyof typeof CONSUMER_CONFIG;
  const consumerTypes: ConsumerType[] = ['ui', 'cache', 'analytics'];

  // Create source stream with higher throughput
  let messageCount = 0;
  const sourceStream = new ReadableStream<ExchangeMessage>({
    start(controller) {
      const interval = setInterval(() => {
        const msg: ExchangeMessage = {
          ...testMessage,
          timestamp: Date.now(),
          sequence: messageCount++,
        };
        controller.enqueue(msg);
      }, 50); // 20 msgs/sec

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 500);
    }
  });

  // Create teed streams
  const teedStreams = await streamManager.createTeedStream('binance', sourceStream, consumerTypes);

  console.log(`📊 Created ${teedStreams.size} consumer streams:\n`);
  
  // Display consumer configuration table
  const configTable = consumerTypes.map(type => ({
    Consumer: type,
    Buffer: CONSUMER_CONFIG[type].bufferSize,
    Priority: CONSUMER_CONFIG[type].priority,
    Role: CONSUMER_CONFIG[type].description,
  }));
  console.log(Bun.inspect.table(configTable));

  // Note: Streams are already being consumed by setupConsumerStream internally
  // Wait for source stream to complete
  await Bun.sleep(600);

  // Display per-consumer metrics from stream manager
  console.log('\n📈 Per-Consumer Metrics:\n');
  const metricsTable = consumerTypes.map(type => {
    const stats = streamManager.getConsumerStats(`binance:${type}`);
    return {
      Consumer: type,
      Messages: stats?.messagesProcessed ?? 0,
      Bytes: `${((stats?.bytesProcessed ?? 0) / 1024).toFixed(1)} KB`,
      Status: stats ? '✅ Active' : '⏸️ Idle',
    };
  });
  console.log(Bun.inspect.table(metricsTable));

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE BENCHMARKS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🏆 Binary Encode/Decode Performance:');
  console.log('-'.repeat(40));

  // Performance test
  const iterations = 10000;
  const startTime = performance.now();
  let processedCount = 0;

  for (let i = 0; i < iterations; i++) {
    const msg: ExchangeMessage = { ...testMessage, timestamp: Date.now() + i };
    const buffer = dataProcessor.encodeMessage(msg);
    const result = dataProcessor.decodeMessage(buffer);
    if (result) processedCount++;
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  console.log(`⚡ Processed ${processedCount.toLocaleString()} messages in ${totalTime.toFixed(2)}ms`);
  console.log(`📈 Throughput: ${(processedCount / (totalTime / 1000)).toLocaleString()} msgs/sec`);
  console.log(`🔄 Latency: ${(totalTime / processedCount * 1000).toFixed(1)}µs per message`);

  console.log('\n✅ Binary Data Integration Complete!');
  console.log('Ready for production exchange data processing.');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateBinaryDataHandling().catch(console.error);
}

export { demonstrateBinaryDataHandling };
