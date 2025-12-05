/**
 * Demonstration of Hex Formatting in Bun.inspect.custom
 * Shows binary data preview with hex representation
 */

import { BinaryStreamManager } from '../lib/binary-utils';
import { BlueprintLoader } from '../lib/blueprints/loader';
import { ExchangeMessage } from '../lib/binary-utils';

async function demonstrateHexInspect() {
  console.log('🔍 Hex Formatting Demo for Bun.inspect.custom');
  console.log('==========================================\n');

  // 1. Load blueprint and create stream manager
  const blueprintLoader = BlueprintLoader.getInstance();
  const binanceBlueprint = await blueprintLoader.loadBlueprint('BP-EXCHANGE-BINANCE');
  const streamManager = new BinaryStreamManager(binanceBlueprint);

  // 2. Add some test messages to buffers
  const testMessages: ExchangeMessage[] = [
    {
      exchange: 'binance',
      symbol: 'BTCUSDT',
      type: 'ticker',
      timestamp: Date.now(),
      data: {
        price: 65000,
        priceChange: 1000,
        priceChangePercent: 1.56,
        volume: 1234567,
      },
      metadata: {
        source: 'websocket',
        latency: 45,
      },
    },
    {
      exchange: 'binance',
      symbol: 'ETHUSDT',
      type: 'trade',
      timestamp: Date.now(),
      data: {
        price: 3500,
        quantity: 2.5,
        side: 'buy',
        tradeId: 987654321,
      },
      metadata: {
        source: 'websocket',
        maker: true,
      },
    },
  ];

  // 3. Create a test consumer and add messages to buffer
  const testConsumer = {
    id: 'test-consumer',
    type: 'alerts' as const,
    bufferSize: 100,
    filter: (msg: ExchangeMessage) => true,
    errorThreshold: 5,
    reconnectOnFailure: true,
  };

  // Simulate adding messages to buffer
  const bufferKey = 'binance:alerts:test-consumer';
  for (const message of testMessages) {
    streamManager['streamBuffers'].set(bufferKey, testMessages);
    streamManager['consumers'].set(bufferKey, testConsumer);
    streamManager['messageCount']++;
  }

  console.log('📊 Standard inspection (depth 1):');
  console.log(streamManager);
  console.log('');

  console.log('📊 Detailed inspection (depth 2):');
  console.log(streamManager[Bun.inspect.custom](2));
  console.log('');

  console.log('🔍 Hex formatting inspection (depth 3, hex: true):');
  const hexInspect = streamManager[Bun.inspect.custom](3, { hex: true });
  console.log(hexInspect);
  console.log('');

  console.log('📋 Binary data preview:');
  if (hexInspect.samples) {
    for (const [key, sample] of Object.entries(hexInspect.samples)) {
      const sampleData = sample as any;
      console.log(`\n${key}:`);
      console.log(`  Exchange: ${sampleData.exchange}`);
      console.log(`  Symbol: ${sampleData.symbol}`);
      console.log(`  Type: ${sampleData.type}`);
      console.log(`  Binary: ${sampleData.data.binary}`);
      console.log(`  Preview:`, sampleData.data.preview);
      console.log(`  Total bytes: ${sampleData.data.totalBytes}`);
    }
  }

  console.log('\n🎯 Using Bun.inspect.table with hex option:');
  const tableData = [
    { exchange: 'binance', symbol: 'BTCUSDT', data: testMessages[0].data },
    { exchange: 'binance', symbol: 'ETHUSDT', data: testMessages[1].data },
    { 
      exchange: 'binance', 
      symbol: 'HEXDEMO', 
      data: new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d, 0x1a, 0x1b, 0x1c, 0x1d]) 
    },
  ];
  
  // Standard table
  console.log('\nStandard table:');
  console.log(Bun.inspect.table(tableData));
  
  // Table with hex formatting
  console.log('\nTable with hex formatting:');
  console.log(Bun.inspect.table(tableData, { hex: true } as any));
  
  // Table with hex, colors, and compact formatting
  console.log('\nTable with hex, colors, and compact:');
  console.log(Bun.inspect.table(tableData, { 
    hex: true, 
    colors: true, 
    compact: true, 
    breakLength: 100 
  } as any));

  console.log('\n✅ Hex formatting demo complete!');
  console.log('\n💡 The hex representation shows:');
  console.log('   • First 16 bytes of encoded binary data');
  console.log('   • Hex string in <hex> (bytes) format');
  console.log('   • Original data preview for comparison');
  console.log('   • Total byte count of full message');
}

// Run the demo
if (import.meta.main) {
  demonstrateHexInspect()
    .catch(console.error);
}

export { demonstrateHexInspect };
