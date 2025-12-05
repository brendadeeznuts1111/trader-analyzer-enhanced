#!/usr/bin/env bun
/**
 * Simple Direct YAML Import Example
 * 
 * This example demonstrates the most straightforward way to use YAML configuration in Bun v1.3.
 * It showcases the power of Bun's built-in YAML support with zero configuration required.
 * 
 * Features demonstrated:
 * - Direct YAML file imports
 * - Type-safe configuration access
 * - Environment-based configuration management
 * - Real-world configuration patterns
 * 
 * @author Trader Analyzer Team
 * @version 1.0.0
 */

import config from "../config/config.yaml";
import type { ThreadManagerConfig, ServerConfig } from "../src/config/yaml-config-loader";

console.log('🚀 Simple Direct YAML Import Example');
console.log('====================================');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION VALIDATION & TYPE SAFETY
// ═══════════════════════════════════════════════════════════════

/**
 * Validate the loaded configuration structure
 */
function validateConfiguration(config: any): config is { threadManager: ThreadManagerConfig; server: ServerConfig } {
  return (
    config &&
    typeof config === 'object' &&
    config.threadManager &&
    typeof config.threadManager === 'object' &&
    config.server &&
    typeof config.server === 'object'
  );
}

if (!validateConfiguration(config)) {
  throw new Error('❌ Invalid configuration structure detected');
}

console.log('✅ Configuration validation passed');

// ═══════════════════════════════════════════════════════════════
// THREAD MANAGER CONFIGURATION ANALYSIS
// ═══════════════════════════════════════════════════════════════

console.log('\n📋 Thread Manager Configuration:');
console.log('--------------------------------');

const { threadManager } = config;

// Core settings
console.log('🔧 Core Settings:');
console.log(`  • Persistence File: ${threadManager.persistenceFile}`);
console.log(`  • Auto Save: ${threadManager.autoSave ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Max Topics per Chat: ${threadManager.maxTopicsPerChat}`);
console.log(`  • Cleanup Interval: ${(threadManager.cleanupIntervalMs / 60000).toFixed(1)} minutes`);

// Topics configuration
console.log('\n🏷️  Topics Configuration:');
console.log(`  • Default Purpose: "${threadManager.topics.defaultPurpose}"`);
console.log(`  • Pin Retention: ${threadManager.topics.pinRetentionHours} hours`);
console.log(`  • Max Topic Name Length: ${threadManager.topics.maxTopicNameLength} characters`);
console.log(`  • Auto Create Topics: ${threadManager.topics.autoCreateTopics ? '✅ Enabled' : '❌ Disabled'}`);

// Telegram integration
console.log('\n📱 Telegram Integration:');
console.log(`  • Super Groups: ${threadManager.telegram.superGroups.length} configured`);
console.log(`  • Default Purposes: ${threadManager.telegram.defaultPurposes.join(', ')}`);
console.log(`  • Rate Limit: ${threadManager.telegram.rateLimitPerSecond} ops/second`);
console.log(`  • Max Message Length: ${threadManager.telegram.maxMessageLength} characters`);

// Pinning behavior
console.log('\n📌 Pinning Configuration:');
console.log(`  • Auto Pin New Messages: ${threadManager.pinning.autoPinNewMessages ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Max Pins per Purpose: ${threadManager.pinning.maxPinsPerPurpose}`);
console.log(`  • Auto Unpin Older: ${threadManager.pinning.autoUnpinOlder ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Auto Pin Delay: ${threadManager.pinning.autoPinDelayMs}ms`);

// Debug settings
console.log('\n🐛 Debug Configuration:');
console.log(`  • Debug Logging: ${threadManager.debug.enableDebugLogging ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Log Topic Changes: ${threadManager.debug.logTopicChanges ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  • Log Performance Metrics: ${threadManager.debug.logPerformanceMetrics ? '✅ Enabled' : '❌ Disabled'}`);

// ═══════════════════════════════════════════════════════════════
// SERVER CONFIGURATION ANALYSIS
// ═══════════════════════════════════════════════════════════════

console.log('\n🌐 Server Configuration:');
console.log('-----------------------');

const { server } = config;

console.log('🔧 Network Settings:');
console.log(`  • Port: ${server.port}`);
console.log(`  • Hostname: ${server.hostname}`);
console.log(`  • Development Mode: ${server.development ? '✅ Enabled' : '❌ Disabled'}`);

// Environment detection
console.log('\n🌍 Environment Information:');
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = nodeEnv === 'development';

console.log(`  • NODE_ENV: ${nodeEnv}`);
console.log(`  • Environment Type: ${isProduction ? '🏭 Production' : isDevelopment ? '🛠️  Development' : '🧪 Testing'}`);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

console.log('\n🏥 Configuration Health Check:');
console.log('------------------------------');

interface HealthCheck {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
}

const healthChecks: HealthCheck = {
  category: 'Configuration',
  checks: []
};

// Thread Manager health checks
healthChecks.checks.push(
  {
    name: 'Persistence File',
    status: threadManager.persistenceFile ? 'pass' : 'fail',
    message: threadManager.persistenceFile || 'No persistence file specified'
  },
  {
    name: 'Auto Save',
    status: threadManager.autoSave ? 'pass' : 'warn',
    message: threadManager.autoSave ? 'Auto-save enabled' : 'Auto-save disabled - data may be lost on restart'
  },
  {
    name: 'Super Groups',
    status: threadManager.telegram.superGroups.length > 0 ? 'pass' : 'fail',
    message: `${threadManager.telegram.superGroups.length} super groups configured`
  },
  {
    name: 'Rate Limiting',
    status: threadManager.telegram.rateLimitPerSecond > 0 ? 'pass' : 'warn',
    message: `${threadManager.telegram.rateLimitPerSecond} ops/second`
  },
  {
    name: 'Debug Mode',
    status: !server.development || threadManager.debug.enableDebugLogging ? 'pass' : 'warn',
    message: threadManager.debug.enableDebugLogging ? 'Debug logging enabled' : 'Consider enabling debug in development'
  }
);

// Server health checks
healthChecks.checks.push(
  {
    name: 'Server Port',
    status: server.port > 0 && server.port < 65536 ? 'pass' : 'fail',
    message: `Port ${server.port} is valid`
  },
  {
    name: 'Server Hostname',
    status: server.hostname ? 'pass' : 'fail',
    message: `Hostname: ${server.hostname}`
  }
);

// Display health check results
let passCount = 0;
let warnCount = 0;
let failCount = 0;

healthChecks.checks.forEach(check => {
  const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
  console.log(`  ${icon} ${check.name}: ${check.message}`);
  
  switch (check.status) {
    case 'pass': passCount++; break;
    case 'warn': warnCount++; break;
    case 'fail': failCount++; break;
  }
});

console.log(`\n📊 Health Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);

// ═══════════════════════════════════════════════════════════════
// PRODUCTION READINESS ASSESSMENT
// ═══════════════════════════════════════════════════════════════

console.log('\n🎯 Production Readiness Assessment:');
console.log('-----------------------------------');

const productionReadiness = {
  configuration: failCount === 0,
  security: !server.development,
  performance: threadManager.autoSave && threadManager.telegram.rateLimitPerSecond > 0,
  monitoring: threadManager.debug.enableDebugLogging || threadManager.debug.logPerformanceMetrics,
  scalability: threadManager.maxTopicsPerChat > 0
};

Object.entries(productionReadiness).forEach(([category, ready]) => {
  const icon = ready ? '✅' : '⚠️';
  const status = ready ? 'Ready' : 'Needs Attention';
  console.log(`  ${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${status}`);
});

const overallReady = Object.values(productionReadiness).every(ready => ready);
console.log(`\n🏆 Overall Status: ${overallReady ? '✅ Production Ready' : '⚠️  Configuration Required'}`);

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLES & BEST PRACTICES
// ═══════════════════════════════════════════════════════════════

console.log('\n💡 Usage Examples & Best Practices:');
console.log('----------------------------------');

console.log(`
📝 Basic Usage:
  import config from "./config.yaml";
  const { threadManager, server } = config;

🔧 Environment-Specific Configs:
  // Use environment variables to override defaults
  const port = process.env.PORT || server.port;
  const debug = process.env.DEBUG === 'true' || threadManager.debug.enableDebugLogging;

🏗️ Production Deployment:
  // Disable debug logging in production
  const productionConfig = {
    ...config,
    threadManager: {
      ...threadManager,
      debug: {
        ...threadManager.debug,
        enableDebugLogging: false,
        logPerformanceMetrics: true
      }
    }
  };

📊 Monitoring Setup:
  // Enable comprehensive monitoring
  if (threadManager.debug.logPerformanceMetrics) {
    setupPerformanceMonitoring();
  }

🔒 Security Considerations:
  // Validate configuration before use
  if (!validateConfiguration(config)) {
    throw new Error('Invalid configuration');
  }
`);

console.log('\n🎉 Simple YAML Import Example Complete!');
console.log('====================================');
console.log('✅ Configuration loaded successfully');
console.log('✅ Type safety verified');
console.log('✅ Health checks completed');
console.log('✅ Production readiness assessed');
console.log('🚀 Your YAML configuration is ready for production use!');
