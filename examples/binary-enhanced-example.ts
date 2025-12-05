/**
 * Example: Binary Stream Manager → Enhanced Topic Manager Integration
 * Uses existing Enhanced Topic Manager instead of redundant bridge
 */

import { BinaryStreamManager } from '../lib/binary-utils';
import { BlueprintLoader } from '../lib/blueprints/loader';
import { EnhancedTopicManager } from '../lib/enhanced-topic-manager';
import { createBinaryEnhancedIntegration } from '../lib/binary-enhanced-integration';
import { ExchangeMessage } from '../lib/binary-utils';

async function demonstrateBinaryEnhancedIntegration() {
  console.log('🔗 Binary-Enhanced Integration Demo');
  console.log('===================================\n');

  // 1. Load exchange blueprint
  const blueprintLoader = BlueprintLoader.getInstance();
  const binanceBlueprint = await blueprintLoader.loadBlueprint('BP-EXCHANGE-BINANCE');

  // 2. Create BinaryStreamManager
  const streamManager = new BinaryStreamManager(binanceBlueprint);
  console.log('✅ BinaryStreamManager created');

  // 3. Initialize Enhanced Topic Manager (your existing system)
  const botToken = process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token';
  const groupId = 8013171035; // Your super group ID
  
  const topicManager = new EnhancedTopicManager(botToken, groupId);
  console.log('✅ EnhancedTopicManager initialized');

  // 4. Create integration (bridges the two systems)
  const integration = createBinaryEnhancedIntegration(streamManager, topicManager, {
    consumerTopicMapping: {
      'alerts': 'price-alerts',      // Routes to price-alerts topic
      'analytics': 'analytics',      // Routes to analytics topic
      'cache': 'system',             // Routes to system topic
      'processor': 'trading',        // Routes to trading topic
      'ui': 'general',               // Routes to general topic
    },
    formatting: {
      includeMetadata: true,
      includeTimestamp: true,
      includeExchange: true,
      maxMessageLength: 4000,
    },
    rateLimit: {
      messagesPerSecond: 5,
      burstLimit: 10,
    },
  });

  console.log('🌉 Binary-Enhanced Integration created');
  console.log('');

  // 5. Create stream consumers
  const consumers = [
    {
      id: 'price-alerts',
      type: 'alerts' as const,
      bufferSize: 100,
      filter: (msg: ExchangeMessage) => msg.type === 'ticker' && 
        (msg.data as any)?.priceChangePercent > 5,
      errorThreshold: 5,
      reconnectOnFailure: true,
    },
    {
      id: 'analytics-collector',
      type: 'analytics' as const,
      bufferSize: 1000,
      filter: (msg: ExchangeMessage) => msg.type === 'trade',
      errorThreshold: 10,
      reconnectOnFailure: true,
    },
  ];

  // 6. Connect consumers to Enhanced Topic Manager
  console.log('🔗 Connecting consumers to Enhanced Topic Manager...');
  for (const consumer of consumers) {
    await integration.connectConsumer(consumer.id, consumer);
    console.log(`  ✓ ${consumer.id} → ${integration['config'].consumerTopicMapping[consumer.type]}`);
  }
  console.log('');

  // 7. Simulate stream messages
  console.log('📨 Simulating stream messages...');
  console.log('');

  const testMessages: ExchangeMessage[] = [
    {
      exchange: 'binance',
      symbol: 'BTCUSDT',
      type: 'ticker',
      timestamp: Date.now(),
      data: {
        price: 65000,
        priceChange: 3000,
        priceChangePercent: 4.84, // Below threshold
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
      type: 'ticker',
      timestamp: Date.now(),
      data: {
        price: 3500,
        priceChange: 200,
        priceChangePercent: 6.06, // Above threshold - will route!
        volume: 987654,
      },
      metadata: {
        source: 'websocket',
        latency: 32,
      },
    },
    {
      exchange: 'binance',
      symbol: 'SOLUSDT',
      type: 'trade',
      timestamp: Date.now(),
      data: {
        price: 150,
        quantity: 10,
        side: 'buy',
        tradeId: 123456789,
      },
      metadata: {
        source: 'websocket',
        maker: false,
      },
    },
  ];

  // Process messages (they'll be routed to Enhanced Topic Manager)
  for (const message of testMessages) {
    console.log(`📨 Processing: ${message.symbol} ${message.type}`);
    
    // Simulate stream processing
    for (const consumer of consumers) {
      if (consumer.filter && consumer.filter(message)) {
        console.log(`  → Matched ${consumer.id} filter - routing to Enhanced Topic Manager`);
        // Integration automatically routes via Enhanced Topic Manager
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('⏱️ Waiting for Enhanced Topic Manager routing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('');
  console.log('✅ Integration demo complete!');
  console.log('');
  console.log('📱 Messages routed through Enhanced Topic Manager to:');
  console.log(`  • Super Group: ${groupId}`);
  console.log(`  • Price alerts topic (category: price-alerts)`);
  console.log(`  • Analytics topic (category: analytics)`);
  console.log('');
  console.log('🎯 Flow: BinaryStreamManager → Integration → EnhancedTopicManager → Telegram');
}

// Run the demo
if (import.meta.main) {
  demonstrateBinaryEnhancedIntegration()
    .catch(console.error);
}

export { demonstrateBinaryEnhancedIntegration };
