/**
 * YAML Configuration Loader
 * Uses Bun's built-in YAML support to load and manage configuration files
 */

import { YAML } from "bun";
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════
// THREAD MANAGER CONFIGURATION INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface ThreadManagerConfig {
  persistenceFile: string;
  autoSave?: boolean;
  maxTopicsPerChat?: number;
  topics?: {
    defaultPurpose?: string;
    pinRetentionHours?: number;
    maxTopicNameLength?: number;
    autoCreateTopics?: boolean;
  };
  telegram?: {
    superGroups?: number[];
    defaultPurposes?: string[];
    rateLimitPerSecond?: number;
    maxMessageLength?: number;
  };
  // Additional fields from current implementation (not in original spec)
  cleanupIntervalMs?: number;
  pinning?: {
    autoPinNewMessages?: boolean;
    maxPinsPerPurpose?: number;
    autoUnpinOlder?: boolean;
    autoPinDelayMs?: number;
  };
  debug?: {
    enableDebugLogging?: boolean;
    logTopicChanges?: boolean;
    logPerformanceMetrics?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN CONFIGURATION INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface ServerConfig {
  port: number;
  hostname: string;
  development: boolean;
}

export interface UUIDConfigMetadata {
  uuid: string;
  version: string;
  created: string;
  modified: string;
  hash: string;
}

export interface YamlConfig {
  threadManager?: ThreadManagerConfig;
  server?: ServerConfig;
  bunfig?: {
    version: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// YAML CONFIGURATION LOADER CLASS
// ═══════════════════════════════════════════════════════════════

export class YamlConfigLoader {
  private config: Partial<YamlConfig> = {};
  private configPath: string;

  constructor(configPath: string = join(process.cwd(), 'config', 'config.yaml')) {
    this.configPath = configPath;
    // Initialize with defaults first, then load async
    this.config = this.getDefaultConfig();
    this.loadConfig().catch(error => {
      console.warn('⚠️ Async config loading failed, using defaults:', error);
    });
  }

  /**
   * Load YAML configuration using Bun's built-in YAML support
   */
  private async loadConfig(): Promise<void> {
    try {
      // Use Bun's built-in YAML support - check if file exists
      const configFile = Bun.file(this.configPath);
      if (!configFile.size) {
        console.warn('⚠️ config.yaml not found or empty, using defaults');
        this.config = this.getDefaultConfig();
        return;
      }

      // Read YAML content and parse using Bun.YAML.parse()
      const yamlContent = await configFile.text();
      const parsedConfig = YAML.parse(yamlContent) as Partial<YamlConfig>;
      
      // Merge with defaults
      this.config = this.mergeWithDefaults(parsedConfig);
      
      console.log('✅ YAML configuration loaded successfully using Bun.YAML.parse()');
    } catch (error) {
      console.warn('⚠️ Failed to load YAML configuration:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Merge loaded config with defaults
   */
  private mergeWithDefaults(loaded: Partial<YamlConfig>): Partial<YamlConfig> {
    const defaults = this.getDefaultConfig();
    
    return {
      ...defaults,
      ...loaded,
      threadManager: {
        ...defaults.threadManager,
        ...loaded.threadManager,
        persistenceFile: loaded.threadManager?.persistenceFile || defaults.threadManager!.persistenceFile,
        topics: { ...defaults.threadManager?.topics, ...loaded.threadManager?.topics },
        telegram: { ...defaults.threadManager?.telegram, ...loaded.threadManager?.telegram },
        pinning: { ...defaults.threadManager?.pinning, ...loaded.threadManager?.pinning },
        debug: { ...defaults.threadManager?.debug, ...loaded.threadManager?.debug }
      },
      server: {
        ...defaults.server,
        ...loaded.server,
        port: loaded.server?.port || defaults.server!.port,
        hostname: loaded.server?.hostname || defaults.server!.hostname,
        development: loaded.server?.development ?? defaults.server!.development
      }
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): Partial<YamlConfig> {
    return {
      threadManager: {
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
      },
      server: {
        port: 3030,
        hostname: '0.0.0.0',
        development: true
      }
    };
  }

  /**
   * Get configuration value by key
   */
  get<K extends keyof YamlConfig>(key: K): YamlConfig[K] {
    return this.config[key];
  }

  /**
   * Get all configuration
   */
  getAll(): Partial<YamlConfig> {
    return { ...this.config };
  }

  /**
   * Save configuration to disk using Bun.YAML.stringify()
   */
  async saveConfig(): Promise<void> {
    try {
      const yamlContent = YAML.stringify(this.config, null, 2);
      await Bun.write(this.configPath, yamlContent);
      console.log('💾 Configuration saved to YAML file using Bun.YAML.stringify()');
    } catch (error) {
      console.warn('⚠️ Failed to save YAML configuration:', error);
    }
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<void> {
    this.config = {};
    await this.loadConfig();
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return Object.keys(this.config).length > 0;
  }

  /**
   * Get default thread manager configuration
   */
  public getDefaultThreadManagerConfig(): ThreadManagerConfig {
    return this.getDefaultConfig().threadManager!;
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let yamlConfigLoader: YamlConfigLoader | null = null;

export function getYamlConfigLoader(): YamlConfigLoader {
  if (!yamlConfigLoader) {
    yamlConfigLoader = new YamlConfigLoader();
  }
  return yamlConfigLoader;
}

export function getConfigLoader(): YamlConfigLoader {
  return getYamlConfigLoader();
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get thread manager configuration with defaults
 */
export function getThreadManagerConfig(): ThreadManagerConfig {
  const config = getYamlConfigLoader();
  return config.get('threadManager') || config.getDefaultThreadManagerConfig();
}

/**
 * Validate thread manager configuration
 */
export function validateThreadManagerConfig(config: ThreadManagerConfig): boolean {
  try {
    // Check required fields
    if (!config.persistenceFile) return false;
    if (!config.telegram?.superGroups?.length) return false;
    if (!config.telegram?.defaultPurposes?.length) return false;
    
    // Check value ranges
    if (config.maxTopicsPerChat !== undefined && config.maxTopicsPerChat < 0) return false;
    if (config.cleanupIntervalMs !== undefined && config.cleanupIntervalMs < 0) return false;
    if (config.telegram?.rateLimitPerSecond !== undefined && config.telegram.rateLimitPerSecond <= 0) return false;
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize configuration system
 */
export async function initializeConfig(): Promise<YamlConfigLoader> {
  const loader = getYamlConfigLoader();
  
  if (!loader.isLoaded()) {
    console.warn('⚠️ No YAML configuration files found, using defaults');
  }
  
  return loader;
}

/**
 * Get configuration value by key
 */
export function get<K extends keyof YamlConfig>(key: K): YamlConfig[K] {
  const loader = getYamlConfigLoader();
  return loader.get(key);
}

/**
 * Get configuration value synchronously
 */
export function getSync<K extends keyof YamlConfig>(
  key: K, 
  defaultValue?: YamlConfig[K]
): YamlConfig[K] {
  const loader = getYamlConfigLoader();
  const value = loader.get(key);
  return value !== undefined ? value : (defaultValue as YamlConfig[K]);
}

/**
 * Set configuration value
 */
export function set<K extends keyof YamlConfig>(key: K, value: YamlConfig[K]): void {
  const loader = getYamlConfigLoader();
  (loader as any).config[key] = value;
}

/**
 * Save configuration to disk
 */
export async function save(): Promise<void> {
  console.log('💾 Configuration save requested (not implemented for YAML files)');
  // Note: For YAML files, this would require writing back to the YAML files
  // This is a complex operation that would need to be implemented based on requirements
}

/**
 * Validate configuration against schema
 */
export async function validate(schema: any): Promise<{ valid: boolean; errors: string[] }> {
  const loader = getYamlConfigLoader();
  const errors: string[] = [];
  
  // Basic validation implementation
  for (const [section, sectionSchema] of Object.entries(schema)) {
    const config = loader.get(section as keyof YamlConfig);
    
    if (!config && (sectionSchema as any).required) {
      errors.push(`Missing required configuration section: ${section}`);
      continue;
    }
    
    if (config && (sectionSchema as any).properties) {
      for (const [property, propertySchema] of Object.entries((sectionSchema as any).properties)) {
        const value = (config as any)[property];
        
        if (value === undefined && (propertySchema as any).required) {
          errors.push(`Missing required property: ${section}.${property}`);
        }
        
        // Type validation could be added here
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Watch configuration files for changes
 */
export async function watchConfig(
  callback: (newConfig: Partial<YamlConfig>) => void
): Promise<() => void> {
  console.log('👁️ Config watching requested (not implemented for YAML files)');
  
  // Note: For YAML files, this would require file system watching
  // This is a placeholder implementation
  const unwatch = () => {
    console.log('🛑 Config watching stopped');
  };
  
  return unwatch;
}

/**
 * Get all configuration
 */
export function getAllConfig(): Partial<YamlConfig> {
  const loader = getYamlConfigLoader();
  return loader.getAll();
}

/**
 * Get configuration metadata
 */
export function getConfigMetadata(): UUIDConfigMetadata {
  return {
    uuid: 'config-uuid-placeholder',
    version: '1.0.0',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    hash: 'hash-placeholder'
  };
}

/**
 * Regenerate configuration instance UUID
 */
export function regenerateConfigInstanceUUID(): string {
  const newUUID = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔄 Generated new config UUID: ${newUUID}`);
  return newUUID;
}

/**
 * Compute current configuration hash
 */
export function computeCurrentConfigHash(): string {
  const loader = getYamlConfigLoader();
  const config = loader.getAll();
  const configString = JSON.stringify(config, Object.keys(config).sort());
  
  // Simple hash implementation
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}
