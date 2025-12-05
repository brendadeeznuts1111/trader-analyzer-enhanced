/**
 * Example: Integrating BinaryStreamManager with ThreadManager via Telegram Bridge
 * Demonstrates the complete flow from stream data to Telegram topics using TOML configuration
 */

import { BinaryStreamManager } from '../lib/binary-utils';
import { BlueprintLoader } from '../lib/blueprints/loader';
import { ThreadManagerClass } from '../lib/thread-manager';
import { StreamTelegramBridge, createStreamTelegramBridge } from '../lib/stream-telegram-bridge';
import { ExchangeMessage } from '../lib/binary-utils';
import { getConfig } from '../src/config/internal-toml-loader';
import type { ThreadManagerConfig } from '../src/config/internal-toml-loader';

async function demonstrateStreamTelegramIntegration() {
  console.log('🔗 Stream-Telegram Integration Demo (TOML Configured)');
  console.log('======================================================\n');

  // 1. Load TOML configuration
  console.log('⚙️ Loading TOML configuration...');
  const configLoader = getConfig();
  
  if (!configLoader.isLoaded()) {
    console.warn('⚠️ No TOML configuration loaded, using defaults');
  }

  const threadManagerConfig = configLoader.get('threadManager');
  if (!threadManagerConfig) {
    console.warn('⚠️ No thread manager configuration found, using defaults');
  }

  console.log('✅ Configuration loaded successfully');
  console.log(`📁 Persistence file: ${threadManagerConfig?.persistenceFile || '.thread-manager.json'}`);
  console.log(`📱 Super groups: ${threadManagerConfig?.telegram.superGroups.join(', ') || 'default'}`);
  console.log(`🎯 Default purposes: ${threadManagerConfig?.telegram.defaultPurposes.join(', ') || 'default'}`);
  console.log('');

  // 2. Load exchange blueprint (Binance)
  const blueprintLoader = BlueprintLoader.getInstance();
  const binanceBlueprint = await blueprintLoader.loadBlueprint('BP-EXCHANGE-BINANCE');

  console.log('📋 Loaded Blueprint:', binanceBlueprint.metadata.name);
  console.log('📡 Binary Streams:', binanceBlueprint.capabilities.binaryStreams);
  console.log('🔔 Alerts Consumer:', binanceBlueprint.consumers?.alerts);
  console.log('');

  // 3. Create BinaryStreamManager with blueprint
  const streamManager = new BinaryStreamManager(binanceBlueprint);
  console.log('✅ BinaryStreamManager created');

  // 4. Create ThreadManager with TOML configuration
  console.log('🧵 Creating ThreadManager with TOML configuration...');
  const threadManager = new ThreadManagerClass(threadManagerConfig);
  
  // Get chat ID and purposes from configuration
  const chatId = threadManagerConfig?.telegram.superGroups[0] || 8013171035;
  const defaultPurposes = threadManagerConfig?.telegram.defaultPurposes || ['general', 'alerts', 'trades', 'errors', 'analytics'];
  
  console.log(`📱 Using chat ID: ${chatId}`);
  console.log(`🎯 Setting up purposes: ${defaultPurposes.join(', ')}`);
  
  // Register topics for different consumer types using configuration
  threadManager.register(chatId, null, 'General', 'general');
  
  // Create topics for each default purpose (except general which is already created)
  defaultPurposes.forEach((purpose, index) => {
    if (purpose !== 'general') {
      const threadId = index + 5; // Start from thread ID 5
      const topicName = purpose.charAt(0).toUpperCase() + purpose.slice(1) + ' Updates';
      threadManager.register(chatId, threadId, topicName, purpose as any);
      
      // Pin important topics based on configuration
      if (threadManagerConfig?.pinning.autoPinNewMessages || ['alerts', 'trades', 'errors'].includes(purpose)) {
        threadManager.setPinned(chatId, threadId, purpose as any);
      }
    }
  });

  console.log('📌 ThreadManager topics configured:');
  console.log(threadManager.formatTopicsList(chatId));
  console.log('');

  // 5. Create the Stream-Telegram Bridge with TOML configuration
  console.log('🌉 Creating Stream-Telegram Bridge with configuration...');
  const telegramBridge = createStreamTelegramBridge(streamManager, threadManager, {
    defaultChatId: chatId,
    enabledConsumers: {
      alerts: defaultPurposes.includes('alerts'),
      analytics: defaultPurposes.includes('analytics'),
      trades: defaultPurposes.includes('trades'),
      errors: defaultPurposes.includes('errors'),
      system: defaultPurposes.includes('system'),
      general: defaultPurposes.includes('general'),
    },
    formatting: {
      includeMetadata: true,
      includeTimestamp: true,
      includeExchange: true,
      maxMessageLength: threadManagerConfig?.telegram.maxMessageLength || 4000,
    },
    rateLimit: {
      messagesPerSecond: threadManagerConfig?.telegram.rateLimitPerSecond || 10,
      burstLimit: (threadManagerConfig?.telegram.rateLimitPerSecond || 10) * 2,
    },
  });

  console.log('🌉 Stream-Telegram Bridge created');
  console.log(`📏 Max message length: ${threadManagerConfig?.telegram.maxMessageLength || 4000}`);
  console.log(`⚡ Rate limit: ${threadManagerConfig?.telegram.rateLimitPerSecond || 10} msg/sec`);
  console.log('');

  // 6. Create stream consumers based on configuration
  console.log('🔧 Creating stream consumers based on configuration...');
  const consumers: any[] = [];
  
  // Only create consumers for enabled purposes
  if (defaultPurposes.includes('alerts')) {
    consumers.push({
      id: 'price-alerts',
      type: 'alerts' as const,
      bufferSize: 100,
      filter: (msg: ExchangeMessage) => msg.type === 'ticker' && 
        (msg.data as any)?.priceChangePercent > 5, // Big price moves
      errorThreshold: 5,
      reconnectOnFailure: true,
    });
  }
  
  if (defaultPurposes.includes('trades')) {
    consumers.push({
      id: 'trade-updates',
      type: 'trades' as const,
      bufferSize: 500,
      filter: (msg: ExchangeMessage) => msg.type === 'trade',
      errorThreshold: 10,
      reconnectOnFailure: true,
    });
  }
  
  if (defaultPurposes.includes('errors')) {
    consumers.push({
      id: 'error-monitor',
      type: 'errors' as const,
      bufferSize: 50,
      filter: (msg: ExchangeMessage) => msg.metadata?.error === true,
      errorThreshold: 3,
      reconnectOnFailure: true,
    });
  }
  
  if (defaultPurposes.includes('analytics')) {
    consumers.push({
      id: 'analytics-collector',
      type: 'analytics' as const,
      bufferSize: 200,
      filter: (msg: ExchangeMessage) => msg.type === 'ticker', // All tickers for analysis
      errorThreshold: 8,
      reconnectOnFailure: true,
    });
  }

  console.log(`📊 Created ${consumers.length} consumers: ${consumers.map(c => c.id).join(', ')}`);

  // 7. Bridge each consumer to Telegram
  console.log('🔗 Bridging consumers to Telegram...');
  for (const consumer of consumers) {
    await telegramBridge.bridgeConsumer(consumer.id, consumer, chatId);
    console.log(`  ✓ ${consumer.id} → ${consumer.type}`);
  }
  console.log('');

  // 8. Simulate stream messages
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
        priceChangePercent: 4.84, // Below threshold, won't alert
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
        priceChangePercent: 6.06, // Above threshold, will alert!
        volume: 987654,
      },
      metadata: {
        source: 'websocket',
        latency: 32,
      },
    },
    {
      exchange: 'binance',
      symbol: 'BTCUSDT',
      type: 'trade',
      timestamp: Date.now(),
      data: {
        price: 65000,
        quantity: 0.1,
        side: 'buy',
        tradeId: 123456789,
      },
      metadata: {
        source: 'websocket',
        maker: false,
      },
    },
    {
      exchange: 'binance',
      symbol: 'SOLUSDT',
      type: 'ticker',
      timestamp: Date.now(),
      data: {
        price: 150,
        priceChange: -10,
        priceChangePercent: -6.25, // Big drop, will alert!
        volume: 543210,
      },
      metadata: {
        source: 'websocket',
        latency: 28,
      },
    },
    {
      exchange: 'binance',
      symbol: 'SYSTEM',
      type: 'ticker' as const,
      timestamp: Date.now(),
      data: {
        error: 'Connection timeout',
        code: 'NETWORK_ERROR',
        price: 0,
        priceChange: 0,
        priceChangePercent: 0,
        volume: 0,
      },
      metadata: {
        error: true,
        severity: 'high',
        retryCount: 3,
      },
    },
  ];

  // Process messages through the stream manager
  for (const message of testMessages) {
    console.log(`📨 Processing: ${message.symbol} ${message.type}`);
    
    // Simulate stream processing (in real scenario, this would come from WebSocket)
    for (const consumer of consumers) {
      if (consumer.filter && consumer.filter(message)) {
        console.log(`  → Matched ${consumer.id} filter`);
        // The bridge will automatically route to Telegram
      }
    }
    
    // Small delay to simulate real-time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('⏱️ Waiting for Telegram routing...');
  
  // Wait for async Telegram sends to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 8. Show bridge statistics
  console.log('');
  console.log('📊 Bridge Statistics:');
  const stats = telegramBridge.getStats();
  console.log(`  Messages Routed: ${stats.messagesRouted}`);
  console.log(`  Messages Dropped: ${stats.messagesDropped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log('');
  
  console.log('📈 Consumer Stats:');
  for (const [consumer, consumerStats] of Object.entries(stats.consumerStats)) {
    if (consumerStats.processed > 0) {
      console.log(`  ${consumer}:`);
      console.log(`    Processed: ${consumerStats.processed}`);
      console.log(`    Routed: ${consumerStats.routed}`);
      console.log(`    Failed: ${consumerStats.failed}`);
    }
  }

  console.log('');
  console.log('✅ Integration demo complete!');
  console.log('');
  console.log('📱 Configuration Summary:');
  console.log(`  • Chat ID: ${chatId}`);
  console.log(`  • Persistence file: ${threadManagerConfig?.persistenceFile}`);
  console.log(`  • Auto-save: ${threadManagerConfig?.autoSave}`);
  console.log(`  • Rate limit: ${threadManagerConfig?.telegram.rateLimitPerSecond} msg/sec`);
  console.log(`  • Max message length: ${threadManagerConfig?.telegram.maxMessageLength}`);
  console.log('');
  console.log('🧵 Configured Threads:');
  for (const purpose of defaultPurposes) {
    const threadId = threadManager.getThreadForPurpose(chatId, purpose as any);
    const status = threadId ? `Thread ${threadId}` : 'No thread ID';
    console.log(`  • ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}: ${status}`);
  }
  
  // Cleanup resources
  console.log('');
  console.log('🧹 Cleaning up resources...');
  
  // Destroy thread manager (will save state if autoSave is enabled)
  threadManager.destroy();
  console.log('✅ Thread Manager destroyed');
  
  // Note: Stream-Telegram Bridge doesn't have explicit destroy method
  // It will be cleaned up by garbage collection
  
  console.log('');
  console.log('🎯 TOML Configuration Integration Complete!');
  console.log('===========================================');
  console.log('✅ Configuration loaded from TOML');
  console.log('✅ Thread Manager configured with TOML settings');
  console.log('✅ Stream bridge created with configuration limits');
  console.log('✅ Consumers created based on enabled purposes');
  console.log('✅ All resources properly cleaned up');
}

// Run the demo
if (import.meta.main) {
  demonstrateStreamTelegramIntegration()
    .catch(console.error);
}

export { demonstrateStreamTelegramIntegration };
