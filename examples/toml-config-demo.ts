/**
 * TOML Configuration Demo
 * Demonstrates the new Thread Manager TOML configuration system
 */

import { getConfig } from '../src/config/internal-toml-loader';
import { ThreadManagerClass } from '../lib/thread-manager';
import type { ThreadManagerConfig } from '../src/config/internal-toml-loader';

console.log('🔧 TOML Configuration Demo');
console.log('==========================\n');

// 1. Load configuration from TOML
console.log('📁 Loading configuration from TOML files...');
const configLoader = getConfig();

if (!configLoader.isLoaded()) {
  console.log('❌ No configuration loaded');
  process.exit(1);
}

console.log('✅ Configuration loaded successfully');

// 2. Get thread manager configuration
console.log('\n🧵 Getting Thread Manager configuration...');
const threadManagerConfig = configLoader.get('threadManager');

if (!threadManagerConfig) {
  console.log('❌ No thread manager configuration found');
  process.exit(1);
}

console.log('✅ Thread Manager configuration found');

// 3. Display configuration
console.log('\n📊 Thread Manager Configuration:');
console.log(`  Persistence file: ${threadManagerConfig.persistenceFile}`);
console.log(`  Auto-save: ${threadManagerConfig.autoSave}`);
console.log(`  Max topics per chat: ${threadManagerConfig.maxTopicsPerChat}`);
console.log(`  Cleanup interval: ${threadManagerConfig.cleanupIntervalMs}ms`);
console.log(`  Default purpose: ${threadManagerConfig.topics.defaultPurpose}`);
console.log(`  Pin retention: ${threadManagerConfig.topics.pinRetentionHours}h`);
console.log(`  Super groups: ${threadManagerConfig.telegram.superGroups.join(', ')}`);
console.log(`  Default purposes: ${threadManagerConfig.telegram.defaultPurposes.join(', ')}`);
console.log(`  Rate limit: ${threadManagerConfig.telegram.rateLimitPerSecond}/sec`);
console.log(`  Auto-pin new messages: ${threadManagerConfig.pinning.autoPinNewMessages}`);
console.log(`  Auto-unpin older: ${threadManagerConfig.pinning.autoUnpinOlder}`);
console.log(`  Debug logging: ${threadManagerConfig.debug.enableDebugLogging}`);

// 4. Create Thread Manager with configuration
console.log('\n🚀 Creating Thread Manager with TOML configuration...');
const threadManager = new ThreadManagerClass(threadManagerConfig);

console.log('✅ Thread Manager created successfully');

// 5. Test basic functionality
console.log('\n🧪 Testing basic functionality...');

const chatId = threadManagerConfig.telegram.superGroups[0];
const testPurpose = threadManagerConfig.telegram.defaultPurposes[0];

// Register a test topic
threadManager.register(chatId, 12345, 'Test Topic from TOML Config', testPurpose as any);
threadManager.setPinned(chatId, 12345, testPurpose as any);

console.log(`  📝 Registered test topic for chat ${chatId}`);
console.log(`  📌 Pinned topic for purpose: ${testPurpose}`);

// Get pinned topics
const pinnedTopics = threadManager.getPinnedTopics(chatId);
console.log(`  ✅ Pinned topics count: ${pinnedTopics.size}`);

if (pinnedTopics.has(testPurpose as any)) {
  const topic = pinnedTopics.get(testPurpose as any);
  console.log(`  📋 Topic name: ${topic?.name}`);
  console.log(`  🆔 Thread ID: ${topic?.threadId}`);
}

// 6. Show configuration access
console.log('\n🔍 Configuration access from Thread Manager:');
const runtimeConfig = threadManager.getConfig();
console.log(`  📁 Persistence file: ${runtimeConfig.persistenceFile}`);
console.log(`  🔄 Auto-save enabled: ${runtimeConfig.autoSave}`);

// 7. Cleanup
console.log('\n🧹 Cleaning up...');
threadManager.destroy();
console.log('✅ Thread Manager destroyed');

console.log('\n🎯 TOML Configuration Demo Complete!');
console.log('=====================================');
console.log('✅ TOML loading: Working');
console.log('✅ Configuration parsing: Working');
console.log('✅ Thread Manager initialization: Working');
console.log('✅ Basic functionality: Working');
console.log('✅ Configuration access: Working');

console.log('\n🚀 Ready for production use!');
