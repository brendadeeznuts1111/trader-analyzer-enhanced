#!/usr/bin/env bun
/**
 * Main Application Entry Point
 * Initializes bun-native-config and ThreadManager with proper validation
 */

import { initializeConfig, get, getSync, set, save, validate, watchConfig, getAllConfig, getConfigMetadata, regenerateConfigInstanceUUID, computeCurrentConfigHash } from './config/yaml-config-loader';
import type { YamlConfig, ServerConfig, UUIDConfigMetadata, ThreadManagerConfig } from './config/yaml-config-loader';
import { ThreadManager } from './modules/thread-manager';

// ═══════════════════════════════════════════════════════════════
// SCHEMA DEFINITION FOR VALIDATION
// ═══════════════════════════════════════════════════════════════

const appConfigSchema = {
  server: {
    properties: {
      port: { type: 'number', min: 1, max: 65535 },
      hostname: { type: 'string' },
      development: { type: 'boolean' }
    },
    required: ['port']
  },
  threadManager: {
    properties: {
      persistenceFile: { type: 'string', required: true },
      autoSave: { type: 'boolean' },
      maxTopicsPerChat: { type: 'number', min: 1 },
      topics: {
        properties: {
          defaultPurpose: { type: 'string' },
          pinRetentionHours: { type: 'number', min: 0 }
        }
      },
      telegram: {
        properties: {
          superGroups: { type: 'array', items: { type: 'number' } },
          defaultPurposes: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    required: ['persistenceFile']
  }
};

// ═══════════════════════════════════════════════════════════════
// MAIN APPLICATION LOGIC
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('✨ Initializing Thread Manager Configuration...');

  // 1. Initialize config (REQUIRED at app startup)
  const initialConfig = await initializeConfig();

  // 2. Validate config immediately after initialization
  const validationResult = await validate(appConfigSchema);
  if (!validationResult.valid) {
    console.error('CRITICAL: Initial configuration validation failed!');
    validationResult.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1); // Abort if essential config is invalid
  } else {
    console.log('✅ Initial configuration is valid.');
  }

  // --- Accessing and Displaying Metadata ---
  const metadata: UUIDConfigMetadata = getConfigMetadata();
  console.log('\n--- Current Config Metadata ---');
  console.log(`  UUID:      ${metadata.uuid}`);
  console.log(`  Version:   ${metadata.version}`);
  console.log(`  Created:   ${metadata.created}`);
  console.log(`  Modified:  ${metadata.modified}`);
  console.log(`  Hash:      ${metadata.hash}`);
  const currentComputedHash = computeCurrentConfigHash();
  console.log(`  Hash Match: ${metadata.hash === currentComputedHash ? '✅' : '❌'}`);
  console.log('------------------------------');

  // --- Server Startup Logic ---
  const serverPort = get('server.port');
  const serverHostname = getSync('server.hostname');
  const isDevelopment = getSync('server.development', true);

  console.log(`🚀 Starting Thread Manager Application v${getSync('bunfig.version')}`);
  console.log(`📡 Server listening on ${serverHostname}:${serverPort} (Dev Mode: ${isDevelopment})`);

  const serverConfig: ServerConfig = get('server') as ServerConfig;
  const server = Bun.serve({
    port: serverConfig.port || 3030,
    hostname: serverConfig.hostname || '0.0.0.0',
    development: serverConfig.development || true,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/health') {
        return Response.json({ status: 'OK', metadata: getConfigMetadata() });
      }
      if (url.pathname === '/config-status') {
        return Response.json({ config: getAllConfig(), metadata: getConfigMetadata() });
      }
      return new Response('Not Found', { status: 404 });
    },
  });
  console.log(`✅ HTTP Server running at http://${server.hostname}:${server.port}`);

  // --- Initialize and Use ThreadManager with TOML config ---
  console.log('\n--- Initializing and Using ThreadManager ---');
  const threadManagerConfig = get('threadManager') as ThreadManagerConfig;
  console.log(`ThreadManager config: Persistence file set to '${threadManagerConfig.persistenceFile}'`);
  console.log('ThreadManager instance (Bun.inspect output):', Bun.inspect(ThreadManager));

  // Example usage: Access a topic for a Telegram chat
  const exampleChatId = get('threadManager.telegram.superGroups[0]', 0);
  const defaultPurpose = get('threadManager.topics.defaultPurpose', 'general');

  if (exampleChatId !== 0) { // Only attempt if a superGroup is configured
    try {
      const initialTopic = ThreadManager.getTopicForChat(exampleChatId, defaultPurpose);
      console.log(`Fetched default topic for chat ${exampleChatId}: ${initialTopic ? initialTopic.name : 'Not found, creating...'}`);
      if (!initialTopic) {
        ThreadManager.setTopicForChat(exampleChatId, defaultPurpose, { name: 'General Discussion', purpose: defaultPurpose });
        console.log(`Created default topic for chat ${exampleChatId}.`);
      }
    } catch (error) {
      console.warn(`Error accessing topic for chat ${exampleChatId}:`, error);
    }
  } else {
    console.warn("No Telegram superGroups configured for example ThreadManager usage.");
  }
  // --- End ThreadManager Init & Usage ---

  // --- Demonstrate Runtime Config Updates & Persistence ---
  console.log('\n--- Demonstrating Runtime Config ---');
  console.log('Current server port:', get('server.port'));
  set('server.port', 3034); // Change port in memory
  set('threadManager.maxTopicsPerChat', 75); // Change ThreadManager config in memory
  console.log('New server port (in memory):', get('server.port'));
  console.log('New maxTopicsPerChat (in memory):', get('threadManager.maxTopicsPerChat'));
  // Note: For ThreadManager, simply updating `maxTopicsPerChat` in configLoader
  // will update the `ThreadManager.config` property. However, if ThreadManager
  // has internal state derived from config (e.g., its auto-save interval),
  // it might need an explicit `updateConfig` method or a restart.
  // await save(); // Uncomment to write this change back to base.toml (use with caution!)
  // console.log('Config saved to disk.');
  // --- End Runtime Config ---

  // --- Demonstrate Config Watching (for development) ---
  console.log('\n--- Demonstrating Config Watching ---');
  let unwatch: (() => void) | null = null;
  if (isDevelopment) {
    unwatch = await watchConfig((newConfig) => {
      console.log('⚠️ Config file change detected & reloaded!');
      console.log('New port in reloaded config:', newConfig.server?.port);
      console.log('New maxTopicsPerChat in reloaded config:', newConfig.threadManager?.maxTopicsPerChat);
      // IMPORTANT: If ThreadManager needs to react, it would do so here:
      // ThreadManager.updateConfig(newConfig.threadManager as ThreadManagerConfig); // Assuming ThreadManagerClass has an updateConfig method
      // If `ThreadManagerClass` has no `updateConfig` method, a full restart of
      // the application/service might be required for config changes to take effect.
    });
    console.log('Monitoring config files for changes...');
  }
  // --- End Config Watching ---

  // --- Graceful Shutdown Handler ---
  const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    // Cleanup ThreadManager
    ThreadManager.destroy();
    console.log('✅ ThreadManager destroyed');
    
    // Stop config watching
    if (unwatch) {
      unwatch();
      console.log('✅ Config watching stopped');
    }
    
    // Close server
    server.stop();
    console.log('✅ Server stopped');
    
    process.exit(0);
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  // Keep the server running
  console.log('\nThread Manager Application operational. Press Ctrl+C to exit.');
}

main().catch(console.error);

// Export for use in other modules
export { ThreadManager } from './modules/thread-manager';
export { getConfig } from './config/internal-toml-loader';
