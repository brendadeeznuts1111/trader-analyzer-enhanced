/**
 * Entity ID system using UUIDv5 for deterministic ID generation
 */

import { randomUUIDv5 } from "bun";
import { uuidv5, UUIDv5Generator, UUID_NAMESPACES, VAULT_NAMESPACES } from '../utils/uuid-v5';

export interface EntityIdOptions {
  format?: 'string' | 'buffer' | 'hex' | 'base64';
  version?: 5;
  timestamp?: boolean;
}

export class EntityIdGenerator {
  private idCache = new Map<string, string | Buffer>();

  /**
   * Generate ID for a vault
   */
  generateVaultId(vaultName: string, options: EntityIdOptions = {}): string {
    const id = uuidv5.generateForVault(vaultName, options.format || 'string');

    if (options.timestamp) {
      return this.addTimestamp(id as string);
    }

    return id as string;
  }

  /**
   * Generate ID for a sports market
   */
  generateSportsMarketId(
    sport: string,
    event: string,
    marketType: string,
    options: EntityIdOptions = {}
  ): string {
    const compositeKey = `${sport}:${event}:${marketType}`;
    const id = uuidv5.generateForSportsMarket(compositeKey, options.format || 'string');

    if (options.timestamp) {
      return this.addTimestamp(id as string);
    }

    return id as string;
  }

  /**
   * Generate ID for NBA game
   */
  generateNBAGameId(
    homeTeam: string,
    awayTeam: string,
    date: string,
    options: EntityIdOptions = {}
  ): string {
    const compositeKey = `nba:${homeTeam}:${awayTeam}:${date}`;
    const id = uuidv5.generateForNBAGame(compositeKey, options.format || 'string');

    if (options.timestamp) {
      return this.addTimestamp(id as string);
    }

    return id as string;
  }

  /**
   * Generate ID for arbitrage opportunity
   */
  generateArbitrageId(
    asset: string,
    buyExchange: string,
    sellExchange: string,
    timestamp: number,
    options: EntityIdOptions = {}
  ): string {
    const compositeKey = `${asset}:${buyExchange}:${sellExchange}:${timestamp}`;
    const id = uuidv5.generateForArbitrage(compositeKey, options.format || 'string');

    if (options.timestamp) {
      return this.addTimestamp(id as string);
    }

    return id as string;
  }

  /**
   * Generate ID for Polymarket market
   */
  generatePolymarketId(
    question: string,
    outcomes: string[],
    options: EntityIdOptions = {}
  ): string {
    const sortedOutcomes = [...outcomes].sort();
    const compositeKey = `polymarket:${question}:${sortedOutcomes.join(':')}`;

    // Use URL namespace for web-based markets
    let id: string | Buffer;

    if (options.format === 'string' || !options.format) {
      id = randomUUIDv5(compositeKey, UUID_NAMESPACES.URL);
    } else if (options.format === 'buffer') {
      id = randomUUIDv5(compositeKey, UUID_NAMESPACES.URL, 'buffer');
    } else {
      id = randomUUIDv5(compositeKey, UUID_NAMESPACES.URL, options.format);
    }

    const result = typeof id === 'string' ? id : id.toString('hex');

    if (options.timestamp) {
      return this.addTimestamp(result);
    }

    return result;
  }

  /**
   * Generate ID for live altcoin data
   */
  generateAltcoinId(
    symbol: string,
    exchange: string,
    timestamp: number,
    options: EntityIdOptions = {}
  ): string {
    const compositeKey = `altcoin:${symbol}:${exchange}:${timestamp}`;

    // Use custom altcoin namespace
    let id: string | Buffer;

    if (options.format === 'string' || !options.format) {
      id = randomUUIDv5(compositeKey, VAULT_NAMESPACES.ALTCOINS);
    } else if (options.format === 'buffer') {
      id = randomUUIDv5(compositeKey, VAULT_NAMESPACES.ALTCOINS, 'buffer');
    } else {
      id = randomUUIDv5(compositeKey, VAULT_NAMESPACES.ALTCOINS, options.format);
    }

    const result = typeof id === 'string' ? id : id.toString('hex');

    if (options.timestamp) {
      return this.addTimestamp(result);
    }

    return result;
  }

  /**
   * Generate composite ID for multi-asset operations
   */
  generateCompositeId(
    components: Array<{ type: string; value: any }>,
    namespace: string = VAULT_NAMESPACES.VAULT_OPTIMIZER,
    options: EntityIdOptions = {}
  ): string {
    const compositeKey = components
      .map(c => `${c.type}=${JSON.stringify(c.value)}`)
      .sort()
      .join('&');

    let id: string | Buffer;

    if (options.format === 'string' || !options.format) {
      id = randomUUIDv5(compositeKey, namespace);
    } else if (options.format === 'buffer') {
      id = randomUUIDv5(compositeKey, namespace, 'buffer');
    } else {
      id = randomUUIDv5(compositeKey, namespace, options.format);
    }

    const result = typeof id === 'string' ? id : id.toString('hex');

    if (options.timestamp) {
      return this.addTimestamp(result);
    }

    return result;
  }

  /**
   * Generate short ID (first 8 chars) for display
   */
  generateShortId(fullId: string): string {
    return fullId.replace(/-/g, '').slice(0, 8);
  }

  /**
   * Validate entity ID
   */
  validateEntityId(id: string, expectedType?: string): boolean {
    if (!uuidv5.isValidUUIDv5(id)) {
      return false;
    }

    if (expectedType) {
      // Check if ID matches expected namespace pattern
      // This is simplified - in reality, you'd need to track namespace usage
      return true;
    }

    return true;
  }

  /**
   * Extract metadata from ID
   */
  extractMetadata(id: string): {
    timestamp?: number;
    type?: string;
    namespace?: string;
  } {
    try {
      const parsed = uuidv5.parseUUID(id);

      // Extract timestamp if encoded in UUID
      // UUIDv5 doesn't contain timestamp, but we can check our format
      if (id.includes('_t')) {
        const parts = id.split('_t');
        if (parts.length > 1) {
          const timestamp = parseInt(parts[1].slice(0, 13), 10);
          if (!isNaN(timestamp)) {
            return { timestamp };
          }
        }
      }

      return {};
    } catch {
      return {};
    }
  }

  private addTimestamp(id: string): string {
    const timestamp = Date.now();
    return `${id}_t${timestamp}`;
  }
}

// Singleton instance
export const entityIds = new EntityIdGenerator();

// Enhanced entity classes with UUIDv5 IDs
export class VaultEntity {
  id: string;
  name: string;
  createdAt: number;

  constructor(name: string, data?: any) {
    this.name = name;
    this.id = entityIds.generateVaultId(name, { timestamp: true });
    this.createdAt = Date.now();
  }
}

export class SportsMarketEntity {
  id: string;
  sport: string;
  event: string;
  marketType: string;
  metadata: Record<string, any>;

  constructor(sport: string, event: string, marketType: string, metadata: Record<string, any> = {}) {
    this.sport = sport;
    this.event = event;
    this.marketType = marketType;
    this.metadata = metadata;
    this.id = entityIds.generateSportsMarketId(sport, event, marketType, { timestamp: true });
  }
}

export class NBAGameEntity {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  gameData: any;

  constructor(homeTeam: string, awayTeam: string, date: string, gameData: any = {}) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.date = date;
    this.gameData = gameData;
    this.id = entityIds.generateNBAGameId(homeTeam, awayTeam, date, { timestamp: true });
  }
}

export class ArbitrageOpportunityEntity {
  id: string;
  asset: string;
  buyExchange: string;
  sellExchange: string;
  spread: number;
  timestamp: number;

  constructor(
    asset: string,
    buyExchange: string,
    sellExchange: string,
    spread: number
  ) {
    this.asset = asset;
    this.buyExchange = buyExchange;
    this.sellExchange = sellExchange;
    this.spread = spread;
    this.timestamp = Date.now();
    this.id = entityIds.generateArbitrageId(
      asset,
      buyExchange,
      sellExchange,
      this.timestamp,
      { timestamp: true }
    );
  }
}
