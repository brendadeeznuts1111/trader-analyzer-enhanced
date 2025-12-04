/**
 * Exchange-Aware Header Manager
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-HEADERS-001;version=0.1.16;root=ROOT-API-HEADERS}]
 * [PROPERTIES:{headers={value:"exchange-aware";@chain:["BP-API-HEADERS","BP-UUID-GEN"]}}]
 * [CLASS:HeaderManager][#REF:v-0.1.16.HEADERS.MANAGER.1.0.A.1.1][@ROOT:ROOT-API-HEADERS][@BLUEPRINT:BP-CANONICAL-UUID@^0.1.16]]
 *
 * Extends base API headers with:
 * - Canonical UUID tracking
 * - Exchange-specific cache rules
 * - Rate limit headers
 * - Debug mode headers
 */

import { buildApiHeaders, headersToObject, type HeaderOptions } from '../api-headers';
import type { CanonicalMarket, MarketExchange } from '../canonical';

/**
 * Exchange-specific header configuration
 */
export interface ExchangeHeaderConfig {
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Rate limit (requests per minute) */
  rateLimit: number;
  /** Rate limit window (seconds) */
  rateLimitWindow: number;
  /** Preconnect URLs for this exchange */
  preconnectUrls: string[];
  /** Whether to include debug headers */
  debugHeaders: boolean;
}

/**
 * Default exchange configurations
 */
const EXCHANGE_HEADER_CONFIGS: Record<MarketExchange, ExchangeHeaderConfig> = {
  polymarket: {
    cacheTTL: 300, // 5 minutes
    rateLimit: 100,
    rateLimitWindow: 60,
    preconnectUrls: ['https://clob.polymarket.com', 'https://gamma-api.polymarket.com'],
    debugHeaders: true,
  },
  kalshi: {
    cacheTTL: 60, // 1 minute (more volatile)
    rateLimit: 50,
    rateLimitWindow: 60,
    preconnectUrls: ['https://api.kalshi.com'],
    debugHeaders: true,
  },
  manifold: {
    cacheTTL: 120, // 2 minutes
    rateLimit: 100,
    rateLimitWindow: 60,
    preconnectUrls: ['https://api.manifold.markets'],
    debugHeaders: true,
  },
  bitmex: {
    cacheTTL: 30, // 30 seconds (high frequency)
    rateLimit: 60,
    rateLimitWindow: 60,
    preconnectUrls: ['https://www.bitmex.com'],
    debugHeaders: true,
  },
  sports: {
    cacheTTL: 60, // 1 minute
    rateLimit: 100,
    rateLimitWindow: 60,
    preconnectUrls: [],
    debugHeaders: true,
  },
};

/**
 * Canonical header options extending base options
 */
export interface CanonicalHeaderOptions extends HeaderOptions {
  /** Canonical market data */
  canonical?: CanonicalMarket;
  /** Exchange name (if no canonical provided) */
  exchange?: MarketExchange;
  /** Cache hit status */
  cacheHit?: boolean;
  /** Cache TTL remaining (seconds) */
  cacheTTLRemaining?: number;
  /** Rate limit remaining */
  rateLimitRemaining?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Build exchange-aware headers
 */
export function buildCanonicalHeaders(options: CanonicalHeaderOptions = {}): Headers {
  const {
    canonical,
    exchange,
    cacheHit,
    cacheTTLRemaining,
    rateLimitRemaining,
    debug = false,
    ...baseOptions
  } = options;

  // Determine exchange from canonical or options
  const exchangeName = canonical?.exchange || exchange || 'polymarket';
  const config = EXCHANGE_HEADER_CONFIGS[exchangeName];

  // Build base headers with exchange-specific cache
  const headers = buildApiHeaders({
    ...baseOptions,
    cache: baseOptions.cache || getCachePreset(config.cacheTTL),
    maxAge: baseOptions.maxAge ?? config.cacheTTL,
    preconnect: [...(baseOptions.preconnect || []), ...config.preconnectUrls],
  });

  // ═══════════════════════════════════════════════════════════════
  // CANONICAL HEADERS
  // ═══════════════════════════════════════════════════════════════
  if (canonical) {
    headers.set('X-Canonical-UUID', canonical.uuid);
    headers.set('X-Canonical-Exchange', canonical.exchange);
    headers.set('X-Canonical-Type', canonical.type);
    headers.set('X-Canonical-Version', canonical.version.toString());

    if (canonical.salt) {
      headers.set('X-Canonical-Salt', canonical.salt);
    }

    // API metadata
    headers.set('X-API-Endpoint', canonical.apiMetadata.endpoint);
    headers.set('X-API-Cache-Key', canonical.apiMetadata.cacheKey);
  }

  // ═══════════════════════════════════════════════════════════════
  // CACHE STATUS HEADERS
  // ═══════════════════════════════════════════════════════════════
  if (cacheHit !== undefined) {
    headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS');
  }

  if (cacheTTLRemaining !== undefined) {
    headers.set('X-Cache-TTL-Remaining', `${cacheTTLRemaining}s`);
  }

  // ═══════════════════════════════════════════════════════════════
  // RATE LIMIT HEADERS
  // ═══════════════════════════════════════════════════════════════
  headers.set('X-RateLimit-Limit', config.rateLimit.toString());
  headers.set('X-RateLimit-Window', `${config.rateLimitWindow}s`);

  if (rateLimitRemaining !== undefined) {
    headers.set('X-RateLimit-Remaining', rateLimitRemaining.toString());
  }

  // ═══════════════════════════════════════════════════════════════
  // DEBUG HEADERS (only in dev or when explicitly requested)
  // ═══════════════════════════════════════════════════════════════
  if ((debug || config.debugHeaders) && process.env.NODE_ENV !== 'production') {
    headers.set('X-Debug-Exchange', exchangeName);
    headers.set('X-Debug-Config-TTL', `${config.cacheTTL}s`);
    headers.set('X-Debug-Preconnect-Count', config.preconnectUrls.length.toString());

    if (canonical) {
      headers.set('X-Debug-Native-ID', canonical.nativeId);
      headers.set('X-Debug-Salt', canonical.salt);
      headers.set('X-Debug-Tags', canonical.tags.join(','));
    }
  }

  return headers;
}

/**
 * Convert TTL seconds to cache preset
 */
function getCachePreset(ttlSeconds: number): 'no-cache' | 'short' | 'medium' | 'long' {
  if (ttlSeconds <= 0) return 'no-cache';
  if (ttlSeconds <= 60) return 'short';
  if (ttlSeconds <= 300) return 'medium';
  return 'long';
}

/**
 * Create JSON response with canonical headers
 */
export function createCanonicalResponse<T>(
  data: T,
  options: CanonicalHeaderOptions & { status?: number } = {}
): Response {
  const { status = 200, ...headerOptions } = options;
  const headers = buildCanonicalHeaders(headerOptions);

  return new Response(JSON.stringify(data), {
    status,
    headers: headersToObject(headers),
  });
}

/**
 * Create error response with canonical headers
 */
export function createCanonicalErrorResponse(
  error: string,
  status: number = 500,
  options: CanonicalHeaderOptions = {}
): Response {
  const headers = buildCanonicalHeaders({
    ...options,
    cache: 'no-cache',
    custom: {
      ...options.custom,
      'X-Error-Type': status >= 500 ? 'server-error' : 'client-error',
    },
  });

  const requestId = headers.get('X-Request-Id') || 'unknown';

  return new Response(
    JSON.stringify({
      error,
      timestamp: new Date().toISOString(),
      requestId,
      canonical: options.canonical?.uuid,
    }),
    {
      status,
      headers: headersToObject(headers),
    }
  );
}

/**
 * Header manager class for stateful operations
 */
export class HeaderManager {
  private rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

  /**
   * Track rate limit for an exchange
   */
  trackRateLimit(exchange: MarketExchange): {
    remaining: number;
    resetAt: number;
  } {
    const config = EXCHANGE_HEADER_CONFIGS[exchange];
    const now = Date.now();
    const key = `rate:${exchange}`;

    let counter = this.rateLimitCounters.get(key);

    // Reset if window expired
    if (!counter || counter.resetAt < now) {
      counter = {
        count: 0,
        resetAt: now + config.rateLimitWindow * 1000,
      };
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);

    return {
      remaining: Math.max(0, config.rateLimit - counter.count),
      resetAt: counter.resetAt,
    };
  }

  /**
   * Check if rate limited
   */
  isRateLimited(exchange: MarketExchange): boolean {
    const config = EXCHANGE_HEADER_CONFIGS[exchange];
    const key = `rate:${exchange}`;
    const counter = this.rateLimitCounters.get(key);

    if (!counter || counter.resetAt < Date.now()) {
      return false;
    }

    return counter.count >= config.rateLimit;
  }

  /**
   * Get exchange config
   */
  getConfig(exchange: MarketExchange): ExchangeHeaderConfig {
    return EXCHANGE_HEADER_CONFIGS[exchange];
  }

  /**
   * Build headers with rate limit tracking
   */
  buildHeaders(options: CanonicalHeaderOptions = {}): Headers {
    const exchange = options.canonical?.exchange || options.exchange || 'polymarket';
    const rateLimit = this.trackRateLimit(exchange);

    return buildCanonicalHeaders({
      ...options,
      rateLimitRemaining: rateLimit.remaining,
    });
  }

  /**
   * Create response with rate limit tracking
   */
  createResponse<T>(data: T, options: CanonicalHeaderOptions & { status?: number } = {}): Response {
    const exchange = options.canonical?.exchange || options.exchange || 'polymarket';

    if (this.isRateLimited(exchange)) {
      return createCanonicalErrorResponse('Rate limit exceeded', 429, {
        ...options,
        custom: {
          ...options.custom,
          'Retry-After': Math.ceil(
            (this.rateLimitCounters.get(`rate:${exchange}`)!.resetAt - Date.now()) / 1000
          ).toString(),
        },
      });
    }

    const rateLimit = this.trackRateLimit(exchange);

    return createCanonicalResponse(data, {
      ...options,
      rateLimitRemaining: rateLimit.remaining,
    });
  }
}

// Singleton instance
export const headerManager = new HeaderManager();

// Default export
export default headerManager;

/**
 * API Route Handler Wrapper - STANDARDIZE ALL ENDPOINTS WITH THIS
 * Usage:
 * export const GET = withApiHandler(async (req) => {
 *   return { data: '...' };
 * }, { exchange: 'polymarket' });
 */
export async function withApiHandler<T>(
  handler: (req: any) => Promise<T>,
  config: {
    exchange?: MarketExchange;
    querySchema?: any;
    bodySchema?: any;
  }
): Promise<Response> {
  // TODO: Complete implementation when Zod is added
  const result = await handler({} as any);
  return createCanonicalResponse(result, config as any);
}
