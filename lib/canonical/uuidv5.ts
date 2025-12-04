/**
 * UUIDv5 Market Canonicalizer
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-UUID-001;version=0.1.16;root=ROOT-MARKET-TAXONOMY}]
 * [PROPERTIES:{namespace={value:"ORCA-SHA1";@immutable:true};salt={value:"{bookId}-{home}-{away}-{period}";@validate:"string-format"}}]
 * [CLASS:MarketCanonicalizer][#REF:v-0.1.16.CANONICAL.UUID.1.0.A.1.1][@ROOT:ROOT-MARKET-TAXONOMY][@BLUEPRINT:BP-CANONICAL-UUID@^0.1.16]]
 *
 * Generates deterministic UUIDv5 (SHA-1 based) identifiers for markets
 * Uses Bun.randomUUIDv5() native API with ORCA namespace when available,
 * falls back to crypto-based implementation for Next.js runtime.
 */

// Simple API key retrieval with caching
const apiKeyCache = new Map<string, string | null>();

async function getExchangeApiKey(exchange: string): Promise<string | null> {
  const cacheKey = exchange.toLowerCase();
  if (apiKeyCache.has(cacheKey)) {
    return apiKeyCache.get(cacheKey)!;
  }

  try {
    const { secrets } = await import('bun');
    const apiKey = await secrets.get({
      service: 'trader-analyzer',
      name: `${exchange.toLowerCase()}-api-key`,
    });
    apiKeyCache.set(cacheKey, apiKey);
    return apiKey;
  } catch {
    // Fallback to env vars
    const envKey =
      process.env[`${exchange.toUpperCase()}_API_KEY`] ||
      process.env[`ORCA_${exchange.toUpperCase()}_APIKEY`];
    apiKeyCache.set(cacheKey, envKey || null);
    return envKey || null;
  }
}

import { createHash } from 'crypto';
import { logger } from '../logger';

// Check if running in Bun
const isBun = typeof globalThis.Bun !== 'undefined';

/**
 * Generate UUIDv5 using Bun native or crypto fallback
 * @param name - The name to hash
 * @param namespace - The namespace UUID
 * @returns UUIDv5 string
 */
function generateUUIDv5(name: string, namespace: string): string {
  if (isBun) {
    // Use Bun's native implementation
    return (globalThis as any).Bun.randomUUIDv5(name, namespace);
  }

  // Fallback: Generate UUIDv5 using Bun sync crypto (SHA-1 based)
  // Parse namespace UUID to bytes
  const namespaceBytes = parseUUID(namespace);

  // Create SHA-1 hash of namespace + name using Bun native crypto
  const data = new Uint8Array([...namespaceBytes, ...new TextEncoder().encode(name)]);
  const hash = new Bun.CryptoHasher('sha1').update(data).digest();

  // Set version (5) and variant (RFC 4122)
  hash[6] = (hash[6] & 0x0f) | 0x50; // Version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // Variant RFC 4122

  // Format as UUID string
  return formatUUID(hash);
}

/**
 * Parse UUID string to byte array
 */
function parseUUID(uuid: string): number[] {
  const hex = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Format bytes as UUID string
 */
function formatUUID(bytes: Buffer): string {
  const hex = bytes.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Global ORCA namespace for all market canonicalization (RFC 4122 compliant)
export const ORCA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Exchange-specific sub-namespaces (derived from ORCA_NAMESPACE)
export const EXCHANGE_NAMESPACES: Record<string, string> = {
  polymarket: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  kalshi: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  manifold: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  bitmex: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  sports: 'e5f6a7b8-c9d0-1234-efab-345678901234',
} as const;

// Market type discriminator
export type MarketExchange = 'polymarket' | 'kalshi' | 'manifold' | 'bitmex' | 'sports';
export type MarketType = 'binary' | 'scalar' | 'categorical' | 'composite' | 'perpetual';

export interface MarketIdentifier {
  exchange: MarketExchange;
  nativeId: string;
  type: MarketType;
  // Salt components for sports/events
  bookId?: string;
  home?: string;
  away?: string;
  period?: string;
  timestamp?: string;
}

export interface CanonicalMarket {
  uuid: string;
  exchange: MarketExchange;
  nativeId: string;
  type: MarketType;
  tags: string[];
  version: number;
  canonicalizedAt: string;
  salt: string;
  apiMetadata: {
    headers: Record<string, string>;
    endpoint: string;
    cacheKey: string;
  };
}

/**
 * Hash helper using Bun native or crypto fallback
 */
function sha256Hex(data: string): string {
  if (isBun) {
    return new (globalThis as any).Bun.CryptoHasher('sha256').update(data).digest('hex');
  }
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Market Canonicalizer - Generates deterministic UUIDv5 for markets
 * Uses Bun.randomUUIDv5() native API for RFC 4122 compliant UUIDs
 */
export class MarketCanonicalizer {
  /**
   * Generate UUIDv5 (SHA-1 based) for a market
   * Uses exchange namespace + native ID + salt
   */
  canonicalize(market: MarketIdentifier): CanonicalMarket {
    const exchange = market.exchange.toLowerCase() as MarketExchange;
    const namespace = EXCHANGE_NAMESPACES[exchange] || ORCA_NAMESPACE;

    // Build salt from components: {bookId}-{home}-{away}-{period}
    const salt = this.buildSalt(market);

    // Create name string: exchange:nativeId:type:salt
    const nameString = `${exchange}:${market.nativeId}:${market.type}:${salt}`;

    // Use UUIDv5 generation (Bun native or crypto fallback)
    const uuid = generateUUIDv5(nameString, namespace);

    // Generate cache key from canonical UUID
    const cacheKey = this.generateCacheKey(uuid, exchange);

    return {
      uuid,
      exchange,
      nativeId: market.nativeId,
      type: market.type,
      tags: this.extractTags(market),
      version: this.generateVersion(market),
      canonicalizedAt: new Date().toISOString(),
      salt,
      apiMetadata: {
        headers: this.getAPIHeaders(exchange),
        endpoint: this.getAPIEndpoint(exchange),
        cacheKey,
      },
    };
  }

  /**
   * Build salt from market components: {bookId}-{home}-{away}-{period}
   */
  private buildSalt(market: MarketIdentifier): string {
    const parts: string[] = [];

    if (market.bookId) parts.push(market.bookId);
    if (market.home) parts.push(market.home);
    if (market.away) parts.push(market.away);
    if (market.period) parts.push(market.period);

    // If no salt components, use nativeId hash (first 16 chars)
    if (parts.length === 0) {
      return sha256Hex(market.nativeId).substring(0, 16);
    }

    return parts.join('-');
  }

  /**
   * Generate cache key for the canonical UUID
   * Format: exchange:sha256(nativeId + uuid)[:32]
   */
  private generateCacheKey(uuid: string, exchange: MarketExchange): string {
    const combined = `${exchange}:${uuid}`;
    const hashHex = sha256Hex(combined);
    return `${exchange}:${hashHex.substring(0, 32)}`;
  }

  /**
   * Extract tags from market identifier for caching
   */
  private extractTags(market: MarketIdentifier): string[] {
    const tags: string[] = [market.exchange, market.type, `v${this.generateVersion(market)}`];

    // Add timestamp-based tags if available
    if (market.timestamp) {
      const date = new Date(market.timestamp);
      tags.push(
        `year:${date.getFullYear()}`,
        `month:${date.getMonth() + 1}`,
        `day:${date.getDate()}`
      );
    }

    // Add salt component tags
    if (market.bookId) tags.push(`book:${market.bookId}`);
    if (market.home) tags.push(`home:${market.home}`);
    if (market.away) tags.push(`away:${market.away}`);
    if (market.period) tags.push(`period:${market.period}`);

    return tags;
  }

  /**
   * Generate deterministic version number for market
   */
  private generateVersion(market: MarketIdentifier): number {
    const input = `${market.exchange}:${market.nativeId}:${market.type}`;
    const hashHex = sha256Hex(input);

    // Use first 8 hex chars for version (0-4,294,967,295)
    return parseInt(hashHex.substring(0, 8), 16);
  }

  /**
   * Get API headers for specific exchange
   */
  private getAPIHeaders(exchange: MarketExchange): Record<string, string> {
    const baseHeaders: Record<MarketExchange, Record<string, string>> = {
      polymarket: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Version': '2.0',
        'X-Client': 'OrcaBlueprint/0.1.16',
      },
      kalshi: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Exchange': 'Kalshi',
      },
      manifold: {
        Accept: 'application/json',
        'User-Agent': 'OrcaBlueprint/0.1.16',
      },
      bitmex: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client': 'OrcaBlueprint/0.1.16',
      },
      sports: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const headers = { ...baseHeaders[exchange] };

    // Add exchange-specific API key if available (env fallback only for sync)
    const apiKey = process.env[`${exchange.toUpperCase()}_API_KEY`];
    if (apiKey) {
      if (exchange === 'kalshi') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['X-API-Key'] = apiKey;
      }
    }

    return headers;
  }

  /**
   * Get API endpoint for exchange
   */
  private getAPIEndpoint(exchange: MarketExchange): string {
    const endpoints: Record<MarketExchange, string> = {
      polymarket: 'https://gamma-api.polymarket.com',
      kalshi: 'https://trading-api.kalshi.com/trade-api/v2',
      manifold: 'https://manifold.markets/api/v0',
      bitmex: 'https://www.bitmex.com/api/v1',
      sports: 'https://api.orca.blueprint/v1',
    };

    return endpoints[exchange];
  }

  /**
   * Batch canonicalization with logging
   */
  batchCanonicalize(markets: MarketIdentifier[]): Map<string, CanonicalMarket> {
    const startTime = performance.now();
    const canonicalMap = new Map<string, CanonicalMarket>();

    for (const market of markets) {
      const canonical = this.canonicalize(market);
      canonicalMap.set(canonical.uuid, canonical);
    }

    const duration = performance.now() - startTime;
    logger.debug(`Canonicalized ${markets.length} markets`, {
      count: markets.length,
      duration: `${duration.toFixed(2)}ms`,
      exchanges: [...new Set(markets.map(m => m.exchange))],
    });

    return canonicalMap;
  }

  /**
   * Check if two market IDs refer to the same canonical market
   */
  areMarketsEquivalent(
    id1: string,
    id2: string,
    exchange: MarketExchange,
    type: MarketType = 'binary'
  ): boolean {
    const market1: MarketIdentifier = { exchange, nativeId: id1, type };
    const market2: MarketIdentifier = { exchange, nativeId: id2, type };

    return this.canonicalize(market1).uuid === this.canonicalize(market2).uuid;
  }

  /**
   * Generate canonical UUID from raw components (quick path)
   */
  quickCanonical(exchange: MarketExchange, nativeId: string, type: MarketType = 'binary'): string {
    return this.canonicalize({ exchange, nativeId, type }).uuid;
  }

  /**
   * Validate UUID format (UUIDv5 specific)
   */
  isValidUUIDv5(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }

  /**
   * Generate raw UUIDv5 (Bun native or crypto fallback)
   */
  rawUUIDv5(name: string, namespace: string = ORCA_NAMESPACE): string {
    return generateUUIDv5(name, namespace);
  }
}

// Singleton instance
export const marketCanonicalizer = new MarketCanonicalizer();

// Default export for convenience
export default marketCanonicalizer;
