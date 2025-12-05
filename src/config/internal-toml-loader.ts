/**
 * Internal TOML Configuration Loader
 * Loads and manages all TOML-based configuration files
 */

import { readFileSync, existsSync } from 'fs';
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

export interface TomlConfig {
  threadManager?: ThreadManagerConfig;
  server?: ServerConfig;
  bunfig?: {
    version: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION LOADER CLASS
// ═══════════════════════════════════════════════════════════════

export class TomlConfigLoader {
  private config: Partial<TomlConfig> = {};
  private configDir: string;

  constructor(configDir: string = join(process.cwd(), 'config')) {
    this.configDir = configDir;
    this.loadAllConfigs();
  }

  /**
   * Load all TOML configuration files
   */
  private loadAllConfigs(): void {
    try {
      // Load thread manager config
      this.loadThreadManagerConfig();
      
      // Load server config
      this.loadServerConfig();
    } catch (error) {
      console.warn('Failed to load TOML configurations:', error);
    }
  }

  /**
   * Load thread manager configuration
   */
  private loadThreadManagerConfig(): void {
    const threadManagerPath = join(this.configDir, 'thread-manager.toml');
    
    if (existsSync(threadManagerPath)) {
      try {
        const content = readFileSync(threadManagerPath, 'utf-8');
        this.config.threadManager = this.parseThreadManagerTOML(content);
      } catch (error) {
        console.warn(`Failed to load thread-manager.toml:`, error);
        this.config.threadManager = this.getDefaultThreadManagerConfig();
      }
    } else {
      console.warn('thread-manager.toml not found, using defaults');
      this.config.threadManager = this.getDefaultThreadManagerConfig();
    }
  }

  /**
   * Load server configuration
   */
  private loadServerConfig(): void {
    const serverPath = join(this.configDir, 'server.toml');
    
    if (existsSync(serverPath)) {
      try {
        const content = readFileSync(serverPath, 'utf-8');
        this.config.server = this.parseServerTOML(content);
      } catch (error) {
        console.warn(`Failed to load server.toml:`, error);
        this.config.server = this.getDefaultServerConfig();
      }
    } else {
      console.warn('server.toml not found, using defaults');
      this.config.server = this.getDefaultServerConfig();
    }
  }

  /**
   * Parse server TOML configuration
   */
  private parseServerTOML(content: string): ServerConfig {
    // Simple TOML parser for server config
    const config: Partial<ServerConfig> = {};
    
    const lines = content.split('\n').map(line => line.trim());
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      
      const [key, value] = line.split('=').map(s => s.trim());
      
      if (key === 'port') {
        config.port = parseInt(value);
      } else if (key === 'hostname') {
        config.hostname = value.replace(/"/g, '');
      } else if (key === 'development') {
        config.development = value === 'true';
      }
    }
    
    return {
      port: config.port || 3030,
      hostname: config.hostname || '0.0.0.0',
      development: config.development ?? true
    };
  }

  /**
   * Get default server configuration
   */
  private getDefaultServerConfig(): ServerConfig {
    return {
      port: 3030,
      hostname: '0.0.0.0',
      development: true
    };
  }

  /**
   * Parse thread manager TOML content
   */
  private parseThreadManagerTOML(content: string): ThreadManagerConfig {
    const defaults = this.getDefaultThreadManagerConfig();
    
    // Simple TOML parser (basic implementation)
    const lines = content.split('\n');
    const config: any = {};
    let currentSection: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Section headers
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const section = trimmed.slice(1, -1);
        currentSection = section.split('.');
        continue;
      }
      
      // Key-value pairs
      if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        
        // Set nested property
        let target = config;
        for (const section of currentSection) {
          if (!target[section]) target[section] = {};
          target = target[section];
        }
        
        // Parse value
        target[key.trim()] = this.parseValue(value);
      }
    }
    
    // Merge with defaults
    return this.mergeConfig(defaults, config);
  }

  /**
   * Parse individual TOML values
   */
  private parseValue(value: string): any {
    value = value.trim();
    
    // Remove quotes for strings
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    
    // Boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1).trim();
      if (!arrayContent) return [];
      return arrayContent.split(',').map(item => this.parseValue(item.trim()));
    }
    
    // Numbers
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    return value;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(defaults: ThreadManagerConfig, override: any): ThreadManagerConfig {
    return {
      ...defaults,
      ...override,
      topics: { ...defaults.topics, ...override.topics },
      telegram: { ...defaults.telegram, ...override.telegram },
      pinning: { ...defaults.pinning, ...override.pinning },
      debug: { ...defaults.debug, ...override.debug }
    };
  }

  /**
   * Get default thread manager configuration
   */
  public getDefaultThreadManagerConfig(): ThreadManagerConfig {
    return {
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
  }

  /**
   * Get configuration value by key
   */
  get<K extends keyof TomlConfig>(key: K): TomlConfig[K] {
    return this.config[key];
  }

  /**
   * Get all configuration
   */
  getAll(): Partial<TomlConfig> {
    return { ...this.config };
  }

  /**
   * Reload all configurations
   */
  reload(): void {
    this.config = {};
    this.loadAllConfigs();
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return Object.keys(this.config).length > 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let configLoader: TomlConfigLoader | null = null;

export function getConfigLoader(): TomlConfigLoader {
  if (!configLoader) {
    configLoader = new TomlConfigLoader();
  }
  return configLoader;
}

export function getConfig(): TomlConfigLoader {
  return getConfigLoader();
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get thread manager configuration with defaults
 */
export function getThreadManagerConfig(): ThreadManagerConfig {
  const config = getConfigLoader();
  return config.get('threadManager') || configLoader!.getDefaultThreadManagerConfig();
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

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL CONFIGURATION FUNCTIONS (for main.ts compatibility)
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize configuration system
 */
export async function initializeConfig(): Promise<TomlConfigLoader> {
  const loader = getConfigLoader();
  
  if (!loader.isLoaded()) {
    console.warn('⚠️ No TOML configuration files found, using defaults');
  }
  
  return loader;
}

/**
 * Get configuration value by key
 */
export function get<K extends keyof TomlConfig>(key: K): TomlConfig[K] {
  const loader = getConfigLoader();
  return loader.get(key);
}

/**
 * Get configuration value synchronously
 */
export function getSync<K extends keyof TomlConfig>(
  key: K, 
  defaultValue?: TomlConfig[K]
): TomlConfig[K] {
  const loader = getConfigLoader();
  const value = loader.get(key);
  return value !== undefined ? value : (defaultValue as TomlConfig[K]);
}

/**
 * Set configuration value
 */
export function set<K extends keyof TomlConfig>(key: K, value: TomlConfig[K]): void {
  const loader = getConfigLoader();
  (loader as any).config[key] = value;
}

/**
 * Save configuration to disk
 */
export async function save(): Promise<void> {
  console.log('💾 Configuration save requested (not implemented for TOML files)');
  // Note: For TOML files, this would require writing back to the TOML files
  // This is a complex operation that would need to be implemented based on requirements
}

/**
 * Validate configuration against schema
 */
export async function validate(schema: any): Promise<{ valid: boolean; errors: string[] }> {
  const loader = getConfigLoader();
  const errors: string[] = [];
  
  // Basic validation implementation
  for (const [section, sectionSchema] of Object.entries(schema)) {
    const config = loader.get(section as keyof TomlConfig);
    
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
  callback: (newConfig: Partial<TomlConfig>) => void
): Promise<() => void> {
  console.log('👁️ Config watching requested (not implemented for TOML files)');
  
  // Note: For TOML files, this would require file system watching
  // This is a placeholder implementation
  const unwatch = () => {
    console.log('🛑 Config watching stopped');
  };
  
  return unwatch;
}

/**
 * Get all configuration
 */
export function getAllConfig(): Partial<TomlConfig> {
  const loader = getConfigLoader();
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
  const loader = getConfigLoader();
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
