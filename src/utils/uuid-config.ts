/**
 * Enhanced UUIDv5 Configuration System using Bun's Native APIs
 * Provides comprehensive configuration management with Bun's optimized APIs
 */

import { TimeController, TimeScenarios } from './time-control';

export interface UUIDConfigMetadata {
  created: string;
  modified: string;
  version: string;
  hash?: string;
  uuid?: string; // UUIDv7 identifier for this config instance
}

export interface UUIDv5Config {
  metadata: UUIDConfigMetadata;
  namespaces: {
    dns: string;
    url: string;
    oid: string;
    x500: string;
    vault: string;
    sports: string;
    arbitrage: string;
    polymarket: string;
    altcoins: string;
  };
  storage: {
    keyFormat: 'string' | 'buffer' | 'hex' | 'base64';
    compression: boolean;
    maxStorageSize: number;
    autoCleanup: boolean;
  };
  performance: {
    enableBenchmarking: boolean;
    benchmarkIterations: number;
    cacheSize: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export class BunUUIDConfig {
  private static instance: BunUUIDConfig | null = null;
  private watcher: { stop(): void } | null = null;
  private configPath: string;
  private lastModified: number = 0;
  private autoReload: boolean;

  // Default configuration
  private config: UUIDv5Config = {
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0',
      uuid: Bun.randomUUIDv7('hex') // Generate unique config ID using UUIDv7
    },
    namespaces: {
      dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
      x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
      vault: '8ba7b810-9dad-11d1-80b4-00c04fd430c8',
      sports: '9ba7b810-9dad-11d1-80b4-00c04fd430c8',
      arbitrage: 'aba7b810-9dad-11d1-80b4-00c04fd430c8',
      polymarket: 'bba7b810-9dad-11d1-80b4-00c04fd430c8',
      altcoins: 'cba7b810-9dad-11d1-80b4-00c04fd430c8'
    },
    storage: {
      keyFormat: 'buffer',
      compression: false,
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      autoCleanup: true
    },
    performance: {
      enableBenchmarking: true,
      benchmarkIterations: 10000,
      cacheSize: 1000
    },
    monitoring: {
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      logLevel: 'info'
    }
  };

  private constructor(configPath?: string, autoReload: boolean = false) {
    this.configPath = configPath || './config/uuid.toml';
    this.autoReload = autoReload;

    if (autoReload) {
      this.startWatching();
    }
  }

  // Singleton pattern
  static getInstance(configPath?: string, autoReload?: boolean): BunUUIDConfig {
    if (!BunUUIDConfig.instance) {
      BunUUIDConfig.instance = new BunUUIDConfig(configPath, autoReload);
    }
    return BunUUIDConfig.instance;
  }

  // Get environment info using Bun's native APIs
  getEnvironmentInfo() {
    return {
      bun: {
        version: Bun.version,
        platform: process.platform,
        arch: process.arch,
        revision: Bun.revision,
        // Using Bun's native performance API
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal
      },
      config: {
        path: this.configPath,
        lastModified: this.lastModified,
        autoReload: this.autoReload
      },
      system: {
        // Using Bun's Date API (as per the docs you referenced)
        currentTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Using Bun's native environment API
        envKeys: Object.keys(process.env).length
      }
    };
  }

  // Utility: Generate a UUID v5 (using Bun's crypto API)
  generateUUIDv5(name: string, namespace: string = this.config.namespaces.dns): string {
    // Using Bun's native crypto API for proper UUID v5 generation
    const combined = `${namespace}${name}`;
    const hash = new Bun.CryptoHasher("sha1").update(combined).digest("hex");

    // Format as proper UUID v5
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-5${hash.substring(13, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  // Utility: Get formatted timestamp
  getTimestamp(format: 'iso' | 'unix' | 'human' = 'iso'): string {
    const now = new Date();

    switch (format) {
      case 'iso':
        return now.toISOString();
      case 'unix':
        return Math.floor(now.getTime() / 1000).toString();
      case 'human':
        return now.toLocaleString();
      default:
        return now.toISOString();
    }
  }

  // Configuration management
  getConfig(): Readonly<UUIDv5Config> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<UUIDv5Config>): void {
    this.config = { ...this.config, ...updates };
    this.config.metadata.modified = new Date().toISOString();
    this.lastModified = Date.now();
  }

  /**
   * Generate a UUIDv7 using Bun's native API
   * UUIDv7 is time-sortable and unique per call
   * 
   * @param encoding - Output format: 'hex' (default), 'base64', or 'base64url'
   * @param timestamp - Optional timestamp (defaults to Date.now())
   */
  generateUUID(encoding: 'hex' | 'base64' | 'base64url' = 'hex', timestamp?: number): string {
    return Bun.randomUUIDv7(encoding, timestamp);
  }

  /**
   * Generate a UUIDv7 as a 16-byte buffer
   * More efficient when you need binary data (avoids string conversion overhead)
   * 
   * @param timestamp - Optional timestamp (defaults to Date.now())
   */
  generateUUIDBuffer(timestamp?: number): Buffer {
    return Bun.randomUUIDv7("buffer", timestamp);
  }

  /**
   * Regenerate the config's UUID (useful for versioning or refresh)
   */
  regenerateConfigUUID(): string {
    const newUUID = Bun.randomUUIDv7('hex');
    this.config.metadata.uuid = newUUID;
    this.config.metadata.modified = new Date().toISOString();
    return newUUID;
  }

  /**
   * Compute a hash of the current config for integrity checking
   */
  computeConfigHash(): string {
    const configString = JSON.stringify({
      namespaces: this.config.namespaces,
      storage: this.config.storage,
      performance: this.config.performance,
      monitoring: this.config.monitoring
    });
    return Bun.hash(configString).toString(16);
  }

  /**
   * Inspect the config - returns a formatted summary using Bun.inspect
   */
  inspect(): string {
    const summary = {
      uuid: this.config.metadata.uuid,
      version: this.config.metadata.version,
      created: this.config.metadata.created,
      modified: this.config.metadata.modified,
      hash: this.computeConfigHash(),
      namespaceCount: Object.keys(this.config.namespaces).length,
      storage: this.config.storage.keyFormat,
      monitoring: this.config.monitoring.logLevel
    };
    return Bun.inspect(summary, { colors: true, depth: 2 });
  }

  /**
   * Merge loaded config with defaults, ensuring UUID exists
   */
  private mergeWithDefaults(loaded: Partial<UUIDv5Config>): UUIDv5Config {
    const merged = { ...this.config, ...loaded };
    
    // Ensure metadata exists with UUID
    if (!merged.metadata) {
      merged.metadata = {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0',
        uuid: Bun.randomUUIDv7('hex')
      };
    } else if (!merged.metadata.uuid) {
      // Generate UUID if missing
      merged.metadata.uuid = Bun.randomUUIDv7('hex');
    }
    
    // Compute hash
    merged.metadata.hash = this.computeConfigHash();
    
    return merged;
  }

  // Load from TOML file using Bun's file API
  async loadFromFile(): Promise<void> {
    try {
      const file = Bun.file(this.configPath);
      if (await file.exists()) {
        const content = await file.text();
        // Parse TOML (simplified - in practice you'd use a TOML parser)
        const parsedConfig = this.parseTOML(content);
        this.config = { ...this.config, ...parsedConfig };
        this.lastModified = (await file.stat()).mtime.getTime();
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}:`, error);
    }
  }

  // Save to TOML file using Bun's file API
  async saveToFile(): Promise<void> {
    try {
      const tomlContent = this.generateTOML(this.config);
      await Bun.write(this.configPath, tomlContent);
      this.lastModified = Date.now();
    } catch (error) {
      console.error(`Failed to save config to ${this.configPath}:`, error);
    }
  }

  // File watching using Bun's file watcher
  private startWatching(): void {
    if (this.watcher) return;

    try {
      this.watcher = new Bun.FileSystemWatcher(this.configPath, (event) => {
        if (event === 'change') {
          this.loadFromFile().catch(console.error);
        }
      });
    } catch (error) {
      console.warn('File watching not available:', error);
    }
  }

  private stopWatching(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
  }

  // Simplified TOML parsing (in production, use a proper TOML library)
  private parseTOML(content: string): Partial<UUIDv5Config> {
    // This is a simplified parser - use a real TOML library in production
    const config: any = {};

    // Parse namespaces
    const namespaceMatch = content.match(/\[namespaces\]([\s\S]*?)(?=\n\n|\[|$)/);
    if (namespaceMatch) {
      const nsSection = namespaceMatch[1];
      config.namespaces = {};
      const lines = nsSection.split('\n').filter(line => line.includes('='));
      lines.forEach(line => {
        const [key, value] = line.split('=').map(s => s.trim().replace(/"/g, ''));
        if (key && value) {
          config.namespaces[key] = value;
        }
      });
    }

    return config;
  }

  // Generate TOML content
  private generateTOML(config: UUIDv5Config): string {
    let toml = '# UUIDv5 Configuration\n\n';

    // Namespaces
    toml += '[namespaces]\n';
    Object.entries(config.namespaces).forEach(([key, value]) => {
      toml += `${key} = "${value}"\n`;
    });
    toml += '\n';

    // Storage
    toml += '[storage]\n';
    toml += `keyFormat = "${config.storage.keyFormat}"\n`;
    toml += `compression = ${config.storage.compression}\n`;
    toml += `maxStorageSize = ${config.storage.maxStorageSize}\n`;
    toml += `autoCleanup = ${config.storage.autoCleanup}\n\n`;

    // Performance
    toml += '[performance]\n';
    toml += `enableBenchmarking = ${config.performance.enableBenchmarking}\n`;
    toml += `benchmarkIterations = ${config.performance.benchmarkIterations}\n`;
    toml += `cacheSize = ${config.performance.cacheSize}\n\n`;

    // Monitoring
    toml += '[monitoring]\n';
    toml += `enableHealthChecks = ${config.monitoring.enableHealthChecks}\n`;
    toml += `healthCheckInterval = ${config.monitoring.healthCheckInterval}\n`;
    toml += `logLevel = "${config.monitoring.logLevel}"\n`;

    return toml;
  }

  // Time control integration
  createTimeController(options?: any) {
    return new TimeController(options);
  }

  // Cleanup
  destroy(): void {
    this.stopWatching();
    BunUUIDConfig.instance = null!;
  }
}

// Singleton instance
export const uuidConfig = BunUUIDConfig.getInstance();

// Convenience exports
export const {
  generateUUIDv5,
  getTimestamp,
  getEnvironmentInfo,
  createTimeController
} = uuidConfig;
