#!/usr/bin/env bun
/**
 * YAML Configuration Example
 * Demonstrates Bun v1.3 built-in YAML support for configuration management
 * 
 * This example shows:
 * 1. Using Bun.YAML.parse() and Bun.YAML.stringify()
 * 2. Type-safe configuration access
 * 3. Integration with ThreadManager system
 * 4. Fallback to defaults when YAML is missing
 */

import { YAML } from "bun";

// Import the YAML configuration loader for programmatic access
import { getYamlConfigLoader, getThreadManagerConfig } from '../src/config/yaml-config-loader';
import { ThreadManager } from '../src/modules/thread-manager';

console.log('🎯 YAML Configuration Example - Bun v1.3 API');
console.log('=============================================');

// 1. Bun.YAML.parse() Demo
console.log('\n1️⃣ Bun.YAML.parse() Demo:');
const sampleYaml = `
threadManager:
  persistenceFile: ".thread-manager.json"
  autoSave: true
  maxTopicsPerChat: 100
  topics:
    defaultPurpose: "general"
    pinRetentionHours: 24
  telegram:
    superGroups: [8013171035, 8429650235]
    defaultPurposes: ["alerts", "trades", "general"]
server:
  port: 3030
  hostname: "0.0.0.0"
  development: true
`;

const parsedConfig = YAML.parse(sampleYaml) as any;
console.log('✅ YAML parsed using Bun.YAML.parse()');
console.log('📁 Available sections:', Object.keys(parsedConfig));
console.log('📋 Thread Manager:', parsedConfig.threadManager?.persistenceFile);
console.log('🌐 Server Port:', parsedConfig.server?.port);

// 2. Bun.YAML.stringify() Demo
console.log('\n2️⃣ Bun.YAML.stringify() Demo:');
const testObject = {
  threadManager: {
    persistenceFile: ".thread-manager.json",
    autoSave: true,
    maxTopicsPerChat: 50,
    topics: {
      defaultPurpose: "general",
      pinRetentionHours: 24
    }
  },
  server: {
    port: 8080,
    hostname: "localhost",
    development: false
  }
};

const yamlOutput = YAML.stringify(testObject, null, 2);
console.log('✅ Object converted to YAML using Bun.YAML.stringify():');
console.log(yamlOutput);

// 3. Programmatic Configuration Access Demo
console.log('\n3️⃣ Programmatic Configuration Access:');
const loader = getYamlConfigLoader();
const threadManagerConfig = getThreadManagerConfig();

console.log('✅ ThreadManager configuration loaded programmatically');
console.log('🔧 Config source:', loader.isLoaded() ? 'YAML file' : 'Defaults');
console.log('📄 Persistence file:', threadManagerConfig.persistenceFile);
console.log('🔄 Auto save enabled:', threadManagerConfig.autoSave);

// 4. ThreadManager Integration Demo
console.log('\n4️⃣ ThreadManager Integration:');
const exampleChatId = threadManagerConfig.telegram?.superGroups?.[0] || 8013171035;
const defaultPurpose = threadManagerConfig.topics?.defaultPurpose || 'general';

console.log(`💬 Using chat ID: ${exampleChatId}`);
console.log(`🎯 Default purpose: ${defaultPurpose}`);

try {
  // Test the getTopicForChat method (async)
  const initialTopic = await ThreadManager.getTopicForChat(exampleChatId, defaultPurpose);
  console.log('🔍 Initial topic check:', initialTopic ? initialTopic.name : 'No topic found');
  
  if (!initialTopic) {
    // Create a new topic
    const newTopic = await ThreadManager.setTopicForChat(exampleChatId, defaultPurpose, {
      name: 'YAML API Demo Topic',
      purpose: defaultPurpose
    });
    console.log('✅ Created new topic:', newTopic.name);
  }
} catch (error) {
  console.warn('⚠️ ThreadManager demo failed:', error);
}

// 5. Configuration Save Demo
console.log('\n5️⃣ Configuration Save Demo:');
try {
  // Demonstrate saving configuration (creates a backup)
  const backupConfig = { ...threadManagerConfig };
  backupConfig.persistenceFile = '.thread-manager-backup.json';
  backupConfig.maxTopicsPerChat = 200;
  
  const backupYaml = YAML.stringify({ threadManager: backupConfig }, null, 2);
  console.log('📝 Generated backup YAML configuration:');
  console.log(backupYaml);
  
  console.log('✅ YAML.stringify() demonstration complete');
} catch (error) {
  console.warn('⚠️ Save demo failed:', error);
}

// 6. Advanced Features Demo
console.log('\n6️⃣ Advanced Features:');
console.log('🔧 Debug logging enabled:', threadManagerConfig.debug?.enableDebugLogging);
console.log('📊 Performance logging:', threadManagerConfig.debug?.logPerformanceMetrics);
console.log('📌 Auto pinning enabled:', threadManagerConfig.pinning?.autoPinNewMessages);
console.log('🧹 Auto cleanup interval:', threadManagerConfig.cleanupIntervalMs, 'ms');

console.log('\n✅ YAML Configuration Example Complete!');
console.log('This demonstrates Bun v1.3 YAML.parse() and YAML.stringify() APIs');
console.log('combined with type-safe configuration management.');

// Export for use in other examples
export { parsedConfig, threadManagerConfig, yamlOutput };
