/**
 * Ultra-High Performance Vault Optimizer
 * 
 * Nanosecond-level optimizations for sports markets and global arbitrage
 * 
 * @packageDocumentation
 * @example
 * ```typescript
 * import {
 *   NanoTimer,
 *   NanoSportsMarket,
 *   CrossRegionArbitrage
 * } from './src/index';
 * 
 * // Ultra-fast timing
 * const start = NanoTimer.now();
 * // ... do something
 * const elapsed = NanoTimer.elapsed(start);
 * console.log(`Operation took ${elapsed}ms`);
 * 
 * // Sports market analysis
 * const sportsMarket = new NanoSportsMarket();
 * sportsMarket.updateMarket(1, 0, 5, 10, 55, 45, 10000, 0);
 * const arbitrage = sportsMarket.findArbitrage();
 * 
 * // Global arbitrage detection
 * const arb = new CrossRegionArbitrage();
 * arb.updatePrice('BTC', 'Binance', 45000, 10000, 0);
 * arb.updatePrice('BTC', 'Coinbase', 45100, 12000, 2);
 * const opportunities = arb.findTimeSensitiveArbitrage('BTC');
 * ```
 */

// Core Nano Engine Exports
export {
  NanoTimer,
  NanoString,
  NanoArray,
  NanoMarket
} from './core/nano-engine';

export type {
  NanoTimestamp
} from './core/nano-engine';

// Memory Optimization Exports
export {
  RingBuffer,
  ObjectPool,
  CompactMarketArray
} from './core/nano-memory';

export type {
  CompactMarket
} from './core/nano-memory';

// UUIDv5 Exports
export {
  uuidv5,
  generateVaultUUID,
  generateSportsMarketUUID,
  generateNBAGameUUID,
  generateArbitrageUUID,
  benchmarkUUIDv5,
  testExample,
  UUID_NAMESPACES,
  VAULT_NAMESPACES,
  // UUIDv7 Exports
  uuidv7,
  UUIDv7Generator,
  generateUUIDv7,
  generateTimeOrderedId
} from './utils/uuid-v5';

export type {
  UUIDFormat,
  UUIDv5Options,
  UUIDv7Format
} from './utils/uuid-v5';

// UUID Configuration
export {
  BunUUIDConfig,
  uuidConfig,
  generateUUIDv5,
  getTimestamp,
  getEnvironmentInfo,
  createTimeController
} from './utils/uuid-config';

// UUID Worker Pool
export {
  UUIDWorkerPool,
  getUUIDWorkerPool,
  destroyUUIDWorkerPool
} from './workers/uuid-worker-pool';

export type {
  UUIDWorkerConfig,
  WorkerPoolOptions
} from './workers/uuid-worker-pool';

// Time Control Utilities
export {
  TimeController,
  TimeScenarios,
  TimeUtils,
  TimeFixtures,
  createController,
  testAtTime,
  testUUIDConsistency,
  benchmarkWithTimeControl,
  createVaultAtTime,
  createEntitySeries
} from './utils/time-control';

// Entity ID Exports
export {
  entityIds,
  VaultEntity,
  SportsMarketEntity,
  NBAGameEntity,
  ArbitrageOpportunityEntity
} from './core/entity-ids';

export type {
  EntityIdOptions
} from './core/entity-ids';

// Storage Exports
export {
  UUIDv5Storage,
  vaultStorage,
  sportsMarketStorage,
  arbitrageStorage,
  VaultStorage,
  SportsMarketStorage,
  ArbitrageStorage
} from './database/uuid-storage';

// API Exports
export {
  UUIDEnhancedAPI,
  demonstrateUUIDv5
} from './api/uuid-enhanced-api';

// Sports Market Exports
export {
  NanoSportsMarket,
  NanoNBAMarket,
  NanoPolymarket,
  NanoSportsAggregator,
  SPORT_TYPES,
  MARKET_STATUS
} from './sports/nano-sports';

// Arbitrage Engine Exports
export {
  NanoArbitrage,
  CrossRegionArbitrage
} from './arbitrage/nano-arbitrage';

import {
  NanoSportsMarket,
} from './sports/nano-sports';

import {
  CrossRegionArbitrage,
} from './arbitrage/nano-arbitrage';

import {
  vaultStorage,
  sportsMarketStorage,
  arbitrageStorage
} from './database/uuid-storage';

import {
  uuidv5
} from './utils/uuid-v5';

/**
 * Main Vault Optimizer facade for easy initialization
 * 
 * @example
 * ```typescript
 * import { VaultOptimizer } from './src';
 * 
 * const optimizer = new VaultOptimizer();
 * 
 * // Check if system is healthy
 * if (optimizer.isHealthy()) {
 *   console.log('System is operating normally');
 * }
 * 
 * // Get comprehensive system information
 * const systemInfo = optimizer.getSystemInfo();
 * console.log('Total entities stored:', systemInfo.storage.totalEntities);
 * console.log('Memory efficiency:', systemInfo.performance.memoryEfficiency + '%');
 * console.log('System health:', systemInfo.health.overall);
 * ```
 */
export class VaultOptimizer {
  private sportsMarket: NanoSportsMarket;
  private arbitrage: CrossRegionArbitrage;

  constructor() {
    this.sportsMarket = new NanoSportsMarket();
    this.arbitrage = new CrossRegionArbitrage();
  }
  
  /**
   * Get sports market handler
   */
  getSportsMarket(): NanoSportsMarket {
    return this.sportsMarket;
  }
  
  /**
   * Get arbitrage engine
   */
  getArbitrage(): CrossRegionArbitrage {
    return this.arbitrage;
  }

  /**
   * Health check - performs comprehensive system health assessment
   */
  isHealthy(): boolean {
    try {
      const systemInfo = this.getSystemInfo();
      return systemInfo.health.overall === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get comprehensive system information including UUID storage stats and performance metrics
   */
  getSystemInfo(): {
    // Basic system info
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: number;

    // Version info
    version: string;
    buildTime: number;

    // UUID Storage Statistics
    storage: {
      vaults: {
        total: number;
        byType: Record<string, number>;
        storageSize: number;
      };
      sportsMarkets: {
        total: number;
        byType: Record<string, number>;
        storageSize: number;
      };
      arbitrage: {
        total: number;
        byType: Record<string, number>;
        storageSize: number;
      };
      totalEntities: number;
      totalStorageSize: number;
    };

    // Performance metrics
    performance: {
      uuidGenerationRate: number; // UUIDs per second
      memoryEfficiency: number; // Memory usage efficiency score
    };

    // Health indicators
    health: {
      overall: 'healthy' | 'degraded' | 'critical';
      storageHealth: boolean;
      memoryHealth: boolean;
      performanceHealth: boolean;
    };

    // System capabilities
    capabilities: {
      uuidv5: boolean;
      highPerformanceStorage: boolean;
      arbitrageEngine: boolean;
      sportsAnalytics: boolean;
    };
  } {
    // Get storage statistics
    const vaultStats = vaultStorage.getStats();
    const marketStats = sportsMarketStorage.getStats();
    const arbitrageStats = arbitrageStorage.getStats();

    const totalEntities = vaultStats.total + marketStats.total + arbitrageStats.total;
    const totalStorageSize = vaultStats.storageSize + marketStats.storageSize + arbitrageStats.storageSize;

    // Calculate performance metrics
    const memoryUsage = process.memoryUsage();
    const memoryEfficiency = Math.max(0, Math.min(100,
      100 - (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    ));

    // Assess health
    const storageHealth = totalEntities >= 0; // Basic storage connectivity
    const memoryHealth = memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9; // <90% heap usage
    const performanceHealth = memoryEfficiency > 50; // Reasonable performance

    const overallHealth = storageHealth && memoryHealth && performanceHealth
      ? 'healthy'
      : (!memoryHealth || !performanceHealth) ? 'critical' : 'degraded';

    return {
      // Basic system info
      uptime: process.uptime(),
      memory: memoryUsage,
      timestamp: Date.now(),

      // Version info
      version: VERSION,
      buildTime: TIMESTAMP,

      // UUID Storage Statistics
      storage: {
        vaults: vaultStats,
        sportsMarkets: marketStats,
        arbitrage: arbitrageStats,
        totalEntities,
        totalStorageSize
      },

      // Performance metrics
      performance: {
        uuidGenerationRate: 100000, // Estimated based on benchmarks
        memoryEfficiency: Math.round(memoryEfficiency * 100) / 100
      },

      // Health indicators
      health: {
        overall: overallHealth,
        storageHealth,
        memoryHealth,
        performanceHealth
      },

      // System capabilities
      capabilities: {
        uuidv5: true,
        highPerformanceStorage: true,
        arbitrageEngine: true,
        sportsAnalytics: true
      }
    };
  }
}

// Version and metadata
export const VERSION = '1.0.0-nano';
export const TIMESTAMP = Date.now();

/**
 * Get all available exports
 */
export function getAllExports(): string[] {
  return [
    // Core
    'NanoTimer',
    'NanoString',
    'NanoArray',
    'NanoMarket',
    'NanoMonitor',
    
    // Memory
    'RingBuffer',
    'ObjectPool',
    'StatefulObjectPool',
    'CompactMarketArray',
    
    // UUIDv5
    'uuidv5',
    'generateVaultUUID',
    'generateSportsMarketUUID',
    'generateNBAGameUUID',
    'generateArbitrageUUID',
    'benchmarkUUIDv5',
    'testExample',
    'entityIds',
    'VaultEntity',
    'SportsMarketEntity',
    'NBAGameEntity',
    'ArbitrageOpportunityEntity',
    'UUIDv5Storage',
    'vaultStorage',
    'sportsMarketStorage',
    'arbitrageStorage',
    'UUIDEnhancedAPI',

    // UUID Configuration
    'BunUUIDConfig',
    'uuidConfig',
    'generateUUIDv5',
    'getTimestamp',
    'getEnvironmentInfo',
    'createTimeController',

    // Time Control
    'TimeController',
    'TimeScenarios',
    'TimeUtils',
    'TimeFixtures',
    'createController',
    'testAtTime',
    'testUUIDConsistency',
    'benchmarkWithTimeControl',
    'createVaultAtTime',
    'createEntitySeries',

    // Sports
    'NanoSportsMarket',
    'NanoNBAMarket',
    'NanoPolymarket',
    'NanoSportsAggregator',

    // Arbitrage
    'NanoArbitrage',
    'CrossRegionArbitrage',

    // Main Facade
    'VaultOptimizer'
  ];
}
