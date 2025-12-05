/**
 * BLUEPRINT LOADER - TOML-based Exchange Configuration System
 * Loads and validates exchange blueprints with binary stream support
 */

export interface BlueprintConfig {
  blueprint: string;
  version: string;
  instanceId: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  root: string;
  metadata: {
    name: string;
    description: string;
    author: string;
    created: string;
    documentation?: string;
    tags?: string[];
  };
  capabilities: {
    marketData: boolean;
    trading: boolean;
    account: boolean;
    websocket: boolean;
    binaryStreams: boolean;
    ohlcv: boolean;
    margin: boolean;
    futures: boolean;
    options: boolean;
    spot: boolean;
    streamTeeing: boolean;
  };
  api: {
    baseUrl: string;
    testnetUrl?: string;
    websocketUrl?: string;
    testnetWebsocketUrl?: string;
    docs?: string;
    authentication: string;
    compression?: string;
  };
  rateLimit: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    ordersPerSecond: number;
    ordersPerDay: number;
    websocketStreams?: number;
  };
  auth: {
    type: string;
    required: string[];
    headers?: string[];
    parameters?: string[];
    signatureMethod?: string;
    timestampRequired?: boolean;
  };
  security: {
    vaultPath: string;
    encryption: string;
    keyRotation: number;
    tokenization?: boolean;
    auditLogging?: boolean;
  };
  streamConfig?: {
    type: string;
    compression?: string;
    reconnect: boolean;
    reconnectDelay: number;
    maxRetries: number;
    heartbeat: number;
    bufferSize: number;
  };
  consumers?: {
    cache: boolean;
    processor: boolean;
    ui: boolean;
    analytics: boolean;
    alerts: boolean;
  };
  binaryHandling?: {
    typedArrays: string[];
    endianness: string;
    compression: string;
    chunkSize: number;
    streamTee: boolean;
  };
  implementation: {
    baseClass: string;
    binaryOptimization: boolean;
    streamProcessing: boolean;
    productionReady: boolean;
    testCoverage: number;
    performanceBenchmarked: boolean;
  };
  health: {
    circuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    responseTimeMonitoring: boolean;
    errorRateMonitoring: boolean;
    loadBalancing: boolean;
  };
  canonicalConfig: {
    uuidv5Namespace: string;
    canonicalUrlPattern: string;
    marketIdFormat: string;
    tickerFormat: string;
  };
  dependencies: Record<string, string>;
  symbols?: {
    spot: string[];
    futures?: string[];
  };
  intervals?: {
    klines: string[];
  };
}

export interface MasterRegistry {
  registry: {
    totalBlueprints: number;
    activeVersions: string[];
    namespace: string;
    root: string;
  };
  blueprintCategories: Record<string, string[]>;
  marketTypes: Record<string, string[]>;
  versioning: Record<string, any>;
  compatibility: Record<string, boolean>;
  features: Record<string, boolean>;
}

/**
 * Blueprint Validation Schema
 */
const BLUEPRINT_SCHEMA = {
  required: [
    'blueprint', 'version', 'instanceId', 'category', 'metadata',
    'capabilities', 'api', 'rateLimit', 'auth', 'security',
    'implementation', 'health', 'canonicalConfig'
  ],
  properties: {
    blueprint: {
      type: 'string',
      pattern: /^BP-[A-Z]+-[A-Z]+(-[A-Z]+)*$/
    },
    version: {
      type: 'string',
      pattern: /^\d+\.\d+\.\d+$/
    },
    category: {
      enum: ['crypto', 'prediction', 'sports', 'p2p', 'trading_desk']
    },
    priority: {
      enum: ['low', 'medium', 'high']
    }
  }
};

/**
 * Blueprint Loader with Type Safety
 */
export class BlueprintLoader {
  private static instance: BlueprintLoader;
  private blueprints = new Map<string, BlueprintConfig>();
  private masterRegistry: MasterRegistry | null = null;

  static getInstance(): BlueprintLoader {
    if (!BlueprintLoader.instance) {
      BlueprintLoader.instance = new BlueprintLoader();
    }
    return BlueprintLoader.instance;
  }

  /**
   * Load blueprint by ID (e.g., 'BP-EXCHANGE-BINANCE')
   */
  async loadBlueprint(blueprintId: string): Promise<BlueprintConfig> {
    if (this.blueprints.has(blueprintId)) {
      return this.blueprints.get(blueprintId)!;
    }

    const configName = blueprintId.toLowerCase().replace('bp-exchange-', '');
    const fileName = `exchange-${configName}.toml`;

    try {
      // Dynamic TOML import (Bun feature)
      const { default: config } = await import(`../../blueprints/${fileName}`, {
        with: { type: "toml" }
      });

      const typedConfig = config as BlueprintConfig;

      // Validate blueprint
      if (!this.validateBlueprint(typedConfig)) {
        throw new Error(`Invalid blueprint configuration: ${blueprintId}`);
      }

      this.blueprints.set(blueprintId, typedConfig);
      return typedConfig;

    } catch (error) {
      console.error(`Failed to load blueprint ${blueprintId}:`, error);
      throw new Error(`Blueprint loading failed: ${blueprintId}`);
    }
  }

  /**
   * Load master registry
   */
  async loadMasterRegistry(): Promise<MasterRegistry> {
    if (this.masterRegistry) {
      return this.masterRegistry;
    }

    try {
      const { default: registry } = await import('../../blueprints/master.toml', {
        with: { type: "toml" }
      });

      this.masterRegistry = registry as MasterRegistry;
      return this.masterRegistry;

    } catch (error) {
      console.error('Failed to load master registry:', error);
      throw new Error('Master registry loading failed');
    }
  }

  /**
   * Get all available blueprints from registry
   */
  async getAvailableBlueprints(): Promise<string[]> {
    const registry = await this.loadMasterRegistry();
    const blueprints: string[] = [];

    for (const category of Object.values(registry.blueprintCategories)) {
      blueprints.push(...category);
    }

    return blueprints;
  }

  /**
   * Get blueprints by category
   */
  async getBlueprintsByCategory(category: string): Promise<string[]> {
    const registry = await this.loadMasterRegistry();
    return registry.blueprintCategories[category] || [];
  }

  /**
   * Validate blueprint configuration
   */
  private validateBlueprint(config: any): boolean {
    // Basic validation
    const required = BLUEPRINT_SCHEMA.required;
    for (const field of required) {
      if (!(field in config)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Pattern validation
    if (!BLUEPRINT_SCHEMA.properties.blueprint.pattern.test(config.blueprint)) {
      console.error(`Invalid blueprint format: ${config.blueprint}`);
      return false;
    }

    if (!BLUEPRINT_SCHEMA.properties.version.pattern.test(config.version)) {
      console.error(`Invalid version format: ${config.version}`);
      return false;
    }

    if (!BLUEPRINT_SCHEMA.properties.category.enum.includes(config.category)) {
      console.error(`Invalid category: ${config.category}`);
      return false;
    }

    return true;
  }

  /**
   * Get loaded blueprints
   */
  getLoadedBlueprints(): Map<string, BlueprintConfig> {
    return new Map(this.blueprints);
  }

  /**
   * Clear blueprint cache
   */
  clearCache(): void {
    this.blueprints.clear();
    this.masterRegistry = null;
  }
}

/**
 * Utility functions for blueprint operations
 */
export class BlueprintUtils {
  /**
   * Extract exchange name from blueprint ID
   */
  static getExchangeName(blueprintId: string): string {
    return blueprintId.replace('BP-EXCHANGE-', '').toLowerCase();
  }

  /**
   * Get blueprint priority level
   */
  static getPriorityLevel(priority: string): number {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[priority as keyof typeof levels] || 2;
  }

  /**
   * Check if blueprint supports binary streams
   */
  static supportsBinaryStreams(blueprint: BlueprintConfig): boolean {
    return blueprint.capabilities.binaryStreams &&
           blueprint.capabilities.websocket &&
           blueprint.binaryHandling?.streamTee;
  }

  /**
   * Format canonical URL from blueprint pattern
   */
  static formatCanonicalUrl(
    blueprint: BlueprintConfig,
    params: Record<string, string>
  ): string {
    let pattern = blueprint.canonicalConfig.canonicalUrlPattern;
    for (const [key, value] of Object.entries(params)) {
      pattern = pattern.replace(`{${key}}`, value);
    }
    return pattern.toLowerCase();
  }
}
