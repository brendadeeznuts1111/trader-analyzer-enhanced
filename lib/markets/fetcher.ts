/**
 * Market Fetcher - Canonical Market Data with Caching
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-FETCHER-001;version=0.1.16;root=ROOT-MARKET-TAXONOMY}]
 * [PROPERTIES:{fetch={value:"exchange-wrap-canonical";@chain:["BP-EXCHANGE-FETCH","BP-UUID-GEN"]}}]
 * [CLASS:MarketFetcher][#REF:v-0.1.16.MARKET.FETCHER.1.0.A.1.1][@ROOT:ROOT-MARKET-TAXONOMY][@BLUEPRINT:BP-CANONICAL-UUID@^0.1.16]]
 *
 * Wraps existing exchange implementations with:
 * - UUIDv5 canonicalization
 * - SQLite caching
 * - Retry logic with exponential backoff
 */

import {
  marketCanonicalizer,
  type CanonicalMarket,
  type MarketExchange,
  type MarketType,
} from '../canonical';
import { apiCacheManager, type APICacheManager } from '../api';
import { exchangeManager } from '../exchanges/exchange_manager';
import type { MarketData } from '../exchanges/base_exchange';

export interface FetchOptions {
  useCache: boolean;
  timeout: number;
  retries: number;
  forceRefresh: boolean;
  tags?: string[];
}

export interface FetchResult {
  data: MarketData;
  canonical: CanonicalMarket;
  cached: boolean;
  latency: number;
}

export interface MarketQuery {
  exchange: MarketExchange;
  nativeId: string;
  type?: MarketType;
  bookId?: string;
  home?: string;
  away?: string;
  period?: string;
}

const DEFAULT_OPTIONS: FetchOptions = {
  useCache: true,
  timeout: 10000,
  retries: 2,
  forceRefresh: false,
};

/**
 * Market Fetcher - Wraps exchanges with canonicalization and caching
 */
export class MarketFetcher {
  private cacheManager: APICacheManager;

  constructor(cacheManager: APICacheManager = apiCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Fetch market data with canonicalization and caching
   */
  async fetch(query: MarketQuery, options: Partial<FetchOptions> = {}): Promise<FetchResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = performance.now();

    // Build canonical market identifier
    const canonical = marketCanonicalizer.canonicalize({
      exchange: query.exchange,
      nativeId: query.nativeId,
      type: query.type || 'binary',
      bookId: query.bookId,
      home: query.home,
      away: query.away,
      period: query.period,
      timestamp: opts.forceRefresh ? new Date().toISOString() : undefined,
    });

    const endpoint = `${canonical.apiMetadata.endpoint}/markets/${query.nativeId}`;

    // Check cache first (unless force refresh)
    if (opts.useCache && !opts.forceRefresh) {
      const cached = await this.cacheManager.get(canonical.uuid, endpoint, 'GET');

      if (cached) {
        const latency = performance.now() - startTime;
        console.log(
          `Cache hit for ${canonical.uuid} (${query.exchange}) - ${latency.toFixed(2)}ms`
        );

        return {
          data: cached.data as MarketData,
          canonical,
          cached: true,
          latency,
        };
      }
    }

    // Fetch from exchange
    console.log(`Fetching fresh data for ${query.nativeId} (${query.exchange})`);

    let lastError: Error | null = null;
    let data: MarketData | null = null;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        data = await this.fetchFromExchange(query.exchange, query.nativeId, opts.timeout);
        break;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < opts.retries) {
          // Exponential backoff: 1s, 2s, 4s...
          await Bun.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    if (!data) {
      throw new Error(
        `Failed to fetch market ${query.nativeId} from ${query.exchange} after ${opts.retries + 1} attempts: ${lastError?.message}`
      );
    }

    // Cache the response
    await this.cacheManager.set(canonical, endpoint, 'GET', data, 200);

    const latency = performance.now() - startTime;
    console.log(`Fetched ${query.nativeId} in ${latency.toFixed(2)}ms`);

    return {
      data,
      canonical,
      cached: false,
      latency,
    };
  }

  /**
   * Track initialized exchanges to avoid re-initializing
   */
  private initializedExchanges = new Set<string>();

  /**
   * Fetch from exchange using existing exchange manager
   */
  private async fetchFromExchange(
    exchange: MarketExchange,
    symbol: string,
    timeout: number
  ): Promise<MarketData> {
    // Ensure exchange manager is initialized
    if (!exchangeManager.isInitialized()) {
      exchangeManager.initialize();
    }

    // Get exchange instance
    const exchangeInstance = exchangeManager.getExchange(exchange);

    // Initialize exchange if not already done (for read-only public access)
    if (!this.initializedExchanges.has(exchange)) {
      try {
        await exchangeInstance.initialize({});
        this.initializedExchanges.add(exchange);
      } catch (error) {
        console.warn(`Exchange ${exchange} init warning:`, (error as Error).message);
        // Some exchanges may not need init for public data
        this.initializedExchanges.add(exchange);
      }
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
    });

    // Race between fetch and timeout
    return Promise.race([exchangeInstance.fetchMarketData(symbol), timeoutPromise]);
  }

  /**
   * Batch fetch multiple markets
   */
  async batchFetch(
    queries: MarketQuery[],
    options: Partial<FetchOptions> = {}
  ): Promise<Map<string, FetchResult>> {
    const results = new Map<string, FetchResult>();

    // Deduplicate by creating canonical UUIDs
    const uniqueQueries = new Map<string, MarketQuery>();
    for (const query of queries) {
      const canonical = marketCanonicalizer.canonicalize({
        exchange: query.exchange,
        nativeId: query.nativeId,
        type: query.type || 'binary',
        bookId: query.bookId,
        home: query.home,
        away: query.away,
        period: query.period,
      });
      uniqueQueries.set(canonical.uuid, query);
    }

    // Process in parallel with concurrency limit
    const concurrency = 5;
    const entries = Array.from(uniqueQueries.entries());

    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      const promises = batch.map(async ([uuid, query]) => {
        try {
          const result = await this.fetch(query, options);
          return { uuid, result };
        } catch (error) {
          console.error(`Failed to fetch ${uuid}:`, error);
          return { uuid, result: null };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const { uuid, result } of batchResults) {
        if (result) {
          results.set(uuid, result);
        }
      }
    }

    return results;
  }

  /**
   * Quick fetch with minimal options
   */
  async quickFetch(exchange: MarketExchange, nativeId: string): Promise<FetchResult> {
    return this.fetch({ exchange, nativeId });
  }

  /**
   * Fetch with force refresh (bypass cache)
   */
  async refreshFetch(query: MarketQuery): Promise<FetchResult> {
    return this.fetch(query, { forceRefresh: true });
  }

  /**
   * Check if market is cached
   */
  isCached(query: MarketQuery): boolean {
    const canonical = marketCanonicalizer.canonicalize({
      exchange: query.exchange,
      nativeId: query.nativeId,
      type: query.type || 'binary',
      bookId: query.bookId,
      home: query.home,
      away: query.away,
      period: query.period,
    });

    return this.cacheManager.has(canonical.uuid);
  }

  /**
   * Invalidate cached market
   */
  invalidateMarket(query: MarketQuery): number {
    const canonical = marketCanonicalizer.canonicalize({
      exchange: query.exchange,
      nativeId: query.nativeId,
      type: query.type || 'binary',
      bookId: query.bookId,
      home: query.home,
      away: query.away,
      period: query.period,
    });

    return this.cacheManager.invalidate({ uuid: canonical.uuid });
  }

  /**
   * Invalidate all markets for an exchange
   */
  invalidateExchange(exchange: MarketExchange): number {
    return this.cacheManager.invalidate({ exchange });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(exchange?: MarketExchange) {
    return this.cacheManager.getStats(exchange);
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): number {
    return this.cacheManager.cleanup();
  }

  /**
   * Get canonical UUID for a market query
   */
  getCanonicalUUID(query: MarketQuery): string {
    return marketCanonicalizer.canonicalize({
      exchange: query.exchange,
      nativeId: query.nativeId,
      type: query.type || 'binary',
      bookId: query.bookId,
      home: query.home,
      away: query.away,
      period: query.period,
    }).uuid;
  }

  /**
   * Get full canonical market info
   */
  getCanonical(query: MarketQuery): CanonicalMarket {
    return marketCanonicalizer.canonicalize({
      exchange: query.exchange,
      nativeId: query.nativeId,
      type: query.type || 'binary',
      bookId: query.bookId,
      home: query.home,
      away: query.away,
      period: query.period,
    });
  }
}

// Singleton instance
export const marketFetcher = new MarketFetcher();

// Default export
export default marketFetcher;
