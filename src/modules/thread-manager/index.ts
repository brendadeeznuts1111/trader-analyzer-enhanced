/**
 * Thread Manager Module
 * Primary access point for the ThreadManager instance.
 * Centralizes instantiation logic and ensures proper configuration.
 */

import { getConfigLoader } from '../../config/yaml-config-loader';
import { ThreadManagerClass } from '../../../lib/thread-manager';
import type { ThreadManagerConfig } from '../../config/yaml-config-loader';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION RETRIEVAL
// ═══════════════════════════════════════════════════════════════

// Get the specific threadManager config section
const threadManagerConfig: ThreadManagerConfig = getConfigLoader().get('threadManager') || {
  persistenceFile: '.thread-manager.json',
  autoSave: true,
  maxTopicsPerChat: 100,
  cleanupIntervalMs: 300000,
  topics: {
    defaultPurpose: 'general',
    pinRetentionHours: 24,
    maxTopicNameLength: 100,
    autoCreateTopics: true
  },
  telegram: {
    superGroups: [8013171035, 8429650235],
    defaultPurposes: ['alerts', 'trades', 'analytics', 'general', 'system'],
    rateLimitPerSecond: 10,
    maxMessageLength: 4000
  },
  pinning: {
    autoPinNewMessages: false,
    maxPinsPerPurpose: 1,
    autoUnpinOlder: true,
    autoPinDelayMs: 1000
  },
  debug: {
    enableDebugLogging: true,
    logTopicChanges: true,
    logPerformanceMetrics: false
  }
};

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE CREATION AND EXPORT
// ═══════════════════════════════════════════════════════════════

// Create and export the singleton instance
export const ThreadManager = new ThreadManagerClass(threadManagerConfig);

// ═══════════════════════════════════════════════════════════════
// DYNAMIC INITIALIZATION FUNCTION FOR RELOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Helper function for dynamic ThreadManager creation/reconfiguration.
 * Used for scenarios where ThreadManager might need to adapt to runtime 
 * configuration changes (e.g., after a config hot-reload event).
 */
export function createThreadManagerInstance(configOverride?: ThreadManagerConfig): ThreadManagerClass {
  const effectiveConfig: ThreadManagerConfig = configOverride || getConfigLoader().get('threadManager') || {
    persistenceFile: '.thread-manager.json',
    autoSave: true,
    maxTopicsPerChat: 100,
    cleanupIntervalMs: 300000,
    topics: {
      defaultPurpose: 'general',
      pinRetentionHours: 24,
      maxTopicNameLength: 100,
      autoCreateTopics: true
    },
    telegram: {
      superGroups: [8013171035, 8429650235],
      defaultPurposes: ['alerts', 'trades', 'analytics', 'general', 'system'],
      rateLimitPerSecond: 10,
      maxMessageLength: 4000
    },
    pinning: {
      autoPinNewMessages: false,
      maxPinsPerPurpose: 1,
      autoUnpinOlder: true,
      autoPinDelayMs: 1000
    },
    debug: {
      enableDebugLogging: true,
      logTopicChanges: true,
      logPerformanceMetrics: false
    }
  };
  console.log('Creating new ThreadManager instance with config:', effectiveConfig);
  return new ThreadManagerClass(effectiveConfig);
}

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

// Export types for external use
export type { ThreadManagerConfig } from '../../config/yaml-config-loader';

// Export the class for custom instances
export { ThreadManagerClass };

// Export default instance (matches singleton export)
export default ThreadManager;
