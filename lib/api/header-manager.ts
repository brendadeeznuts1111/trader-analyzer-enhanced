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
import { type BunVerboseFetchMode, enableVerboseFetch, disableVerboseFetch } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Circuit breaker states */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  readonly failureThreshold: number;
  /** Time in ms before attempting half-open */
  readonly resetTimeout: number;
  /** Number of successes in half-open to close */
  readonly successThreshold: number;
}

/** Circuit breaker state tracking */
interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  nextAttempt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Retry configuration */
export interface RetryConfig {
  /** Maximum retry attempts */
  readonly maxAttempts: number;
  /** Base delay in ms */
  readonly baseDelay: number;
  /** Maximum delay in ms */
  readonly maxDelay: number;
  /** Jitter factor (0-1) */
  readonly jitter: number;
}

/** Retry state tracking */
interface RetryState {
  attempt: number;
  nextBackoff: number;
  lastAttempt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Options for enhanced tracking */
export interface TrackingOptions {
  /** Verbose fetch mode for debugging */
  verbose?: BunVerboseFetchMode;
  /** Request URL for verbose logging */
  url?: string;
  /** Request method for verbose logging */
  method?: string;
  /** Request headers for verbose logging */
  requestHeaders?: Record<string, string>;
  /** Circuit breaker failure threshold override */
  circuitThreshold?: number;
  /** Current retry attempt (for backoff calculation) */
  retryAttempt?: number;
}

/** Result from trackRateLimit with headers */
export interface TrackingResult {
  remaining: number;
  resetAt: number;
  circuitState: CircuitState;
  headers: Record<string, string>;
}

/** TrackingResult class with custom inspect */
export class TrackingResultImpl implements TrackingResult {
  constructor(
    public readonly remaining: number,
    public readonly resetAt: number,
    public readonly circuitState: CircuitState,
    public readonly headers: Record<string, string>
  ) {}

  /**
   * Custom inspect for pretty console.log output
   */
  [Bun.inspect.custom](depth: number, options: { colors?: boolean }): string {
    const emoji = this.circuitState === 'closed' ? '✓' : 
                  this.circuitState === 'open' ? '✗' : '◐';
    
    const resetIn = Math.max(0, Math.ceil((this.resetAt - Date.now()) / 1000));
    
    const base = `TrackingResult ${emoji} [remaining=${this.remaining}, circuit=${this.circuitState}, reset=${resetIn}s]`;
    
    if (options?.colors) {
      const color = this.circuitState === 'closed' ? '\x1b[32m' : 
                    this.circuitState === 'open' ? '\x1b[31m' : '\x1b[33m';
      return `${color}${base}\x1b[0m`;
    }
    
    return base;
  }
}

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
  /** Request ID for tracking (auto-generated if not provided) */
  requestId?: string;
  /** Timestamp when canonical data was injected */
  injectionTimestamp?: string;
  /** Whether canonical data is pending injection */
  canonicalPending?: boolean;
  /** Source of the request (e.g., 'api', 'worker', 'cache') */
  source?: 'api' | 'worker' | 'cache' | 'websocket' | 'internal';
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Parent request ID for nested requests */
  parentRequestId?: string;
  /** UUID format used for generation */
  uuidFormat?: 'v5' | 'v7';
  /** Namespace used for UUIDv5 generation */
  uuidNamespace?: string;
  /** Circuit breaker state */
  circuitState?: CircuitState;
  /** Retry attempt number (0 = first attempt) */
  retryAttempt?: number;
  /** Next backoff delay in ms */
  retryBackoff?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

/** Default circuit breaker config per exchange */
const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30_000, // 30 seconds
  successThreshold: 3,
} as const;

/** Default retry config */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  jitter: 0.1,
} as const;

/**
 * Build exchange-aware headers for API responses
 * 
 * Combines exchange-specific configurations, request tracking, caching,
 * rate limiting, and debug information into a unified Headers object.
 * 
 * @param options - Configuration options for header generation
 * @returns Headers object with all configured headers
 * 
 * @remarks
 * **Environment-aware debug headers**: Debug headers (e.g. `X-Debug-Exchange`, 
 * `X-Debug-Timestamp`) are only injected when `NODE_ENV !== 'production'`, 
 * preventing leakage of internal metadata in live environments.
 * 
 * **Exchange fallback defaults to polymarket**: If no exchange is specified 
 * in options or canonical, the function defaults to `polymarket`—making it 
 * resilient but opinionated.
 * 
 * **Header names follow X- convention**: All custom headers use the `X-` prefix, 
 * adhering to legacy but widely supported conventions for non-standard HTTP headers.
 * 
 * **Correlation IDs use UUIDv7**: Auto-generated correlation IDs use Bun's native
 * `randomUUIDv7()` for time-sortable, globally unique distributed tracing.
 * 
 * @example
 * ```typescript
 * // Basic usage with exchange
 * const headers = buildCanonicalHeaders({ exchange: 'polymarket' });
 * 
 * // With canonical market data
 * const headers = buildCanonicalHeaders({ 
 *   canonical: marketData,
 *   cacheHit: true,
 *   debug: true 
 * });
 * 
 * // With request tracking
 * const headers = buildCanonicalHeaders({
 *   requestId: 'req-123',
 *   correlationId: '019aeb2f-52c5-7000-...',
 *   source: 'api'
 * });
 * 
 * // With circuit breaker and retry status
 * const headers = buildCanonicalHeaders({
 *   exchange: 'kalshi',
 *   circuitState: 'half-open',
 *   retryAttempt: 2,
 *   retryBackoff: 4000
 * });
 * // Sets: X-Circuit-Status: half-open
 * //       X-Retry-Attempt: 2
 * //       X-Backoff-Next: 4000ms
 * ```
 */
export function buildCanonicalHeaders(options: CanonicalHeaderOptions = {}): Headers {
  const {
    canonical,
    exchange,
    cacheHit,
    cacheTTLRemaining,
    rateLimitRemaining,
    debug = false,
    requestId,
    injectionTimestamp,
    canonicalPending,
    source,
    correlationId,
    parentRequestId,
    uuidFormat,
    uuidNamespace,
    circuitState,
    retryAttempt,
    retryBackoff,
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

  // Add request tracking headers
  if (requestId) headers.set('X-Request-Id', requestId);
  if (correlationId) headers.set('X-Correlation-Id', correlationId);
  if (parentRequestId) headers.set('X-Parent-Request-Id', parentRequestId);
  if (source) headers.set('X-Request-Source', source);

  // Add canonical market metadata if available
  if (canonical) {
    headers.set('X-Canonical-UUID', canonical.uuid);
    headers.set('X-Canonical-Exchange', canonical.exchange);
    headers.set('X-Canonical-Type', canonical.type);
    headers.set('X-Canonical-Version', canonical.version.toString());
    headers.set('X-Canonical-Status', 'resolved');
    if (canonical.salt) headers.set('X-Canonical-Salt', canonical.salt);
    if (canonical.nativeId) headers.set('X-Canonical-Native-ID', canonical.nativeId);
    headers.set('X-API-Endpoint', canonical.apiMetadata.endpoint);
    headers.set('X-API-Cache-Key', canonical.apiMetadata.cacheKey);
    if (injectionTimestamp) headers.set('X-Canonical-Injected-At', injectionTimestamp);
  } else if (canonicalPending) {
    headers.set('X-Canonical-Status', 'pending');
  }

  // Add UUID generation context
  if (uuidFormat) headers.set('X-UUID-Format', uuidFormat);
  if (uuidNamespace) headers.set('X-UUID-Namespace', uuidNamespace);

  // Add cache status
  if (cacheHit !== undefined) headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS');
  if (cacheTTLRemaining !== undefined) headers.set('X-Cache-TTL-Remaining', `${cacheTTLRemaining}s`);

  // Add rate limit metadata
  headers.set('X-RateLimit-Limit', config.rateLimit.toString());
  headers.set('X-RateLimit-Window', `${config.rateLimitWindow}s`);
  if (rateLimitRemaining !== undefined) headers.set('X-RateLimit-Remaining', rateLimitRemaining.toString());

  // Add circuit breaker status
  if (circuitState) headers.set('X-Circuit-Status', circuitState);

  // Add retry metadata
  if (retryAttempt !== undefined) headers.set('X-Retry-Attempt', retryAttempt.toString());
  if (retryBackoff !== undefined) headers.set('X-Backoff-Next', `${retryBackoff}ms`);

  // Add debug headers in non-production environments
  if ((debug || config.debugHeaders) && process.env.NODE_ENV !== 'production') {
    headers.set('X-Debug-Exchange', exchangeName);
    headers.set('X-Debug-Config-TTL', `${config.cacheTTL}s`);
    headers.set('X-Debug-Preconnect-Count', config.preconnectUrls.length.toString());
    headers.set('X-Debug-Timestamp', new Date().toISOString());
    headers.set('X-Debug-Timestamp-Nano', Bun.nanoseconds().toString());
    if (canonical) {
      headers.set('X-Debug-Native-ID', canonical.nativeId);
      headers.set('X-Debug-Salt', canonical.salt);
      headers.set('X-Debug-Tags', canonical.tags.join(','));
    }
    if (uuidFormat) headers.set('X-Debug-UUID-Format', uuidFormat);
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
 * 
 * Features:
 * - Rate limiting per exchange
 * - Circuit breaker pattern (open/half-open/closed)
 * - Retry tracking with exponential backoff
 * - Verbose fetch logging (curl/true/false)
 * - Deferred canonical header injection
 */
export class HeaderManager {
  private readonly rateLimitCounters = new Map<string, { count: number; resetAt: number }>();
  private readonly pendingHeaders = new Map<string, Headers>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly retryStates = new Map<string, RetryState>();
  
  /** Current verbose fetch mode */
  private verboseMode: BunVerboseFetchMode = 'false';

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM INSPECT (Bun.inspect.custom)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Custom inspect for pretty console.log output
   * Usage: console.log(headerManager) → formatted status table
   */
  [Bun.inspect.custom](depth: number, options: { colors?: boolean }): string {
    const exchanges: MarketExchange[] = ['polymarket', 'kalshi', 'bitmex', 'manifold', 'sports'];
    const now = Date.now();

    const status = exchanges.map(ex => {
      const config = EXCHANGE_HEADER_CONFIGS[ex];
      const rateKey = `rate:${ex}`;
      const circuitKey = `circuit:${ex}`;
      
      const rate = this.rateLimitCounters.get(rateKey);
      const circuit = this.circuitBreakers.get(circuitKey);
      
      const remaining = rate ? Math.max(0, config.rateLimit - rate.count) : config.rateLimit;
      const circuitState = circuit?.state ?? 'closed';
      const resetIn = rate && rate.resetAt > now ? Math.ceil((rate.resetAt - now) / 1000) : 0;

      // Status emoji
      const emoji = circuitState === 'closed' ? '✓' : 
                    circuitState === 'open' ? '✗' : '◐';

      return {
        exchange: ex,
        remaining: `${remaining}/${config.rateLimit}`,
        circuit: `${emoji} ${circuitState}`,
        resetIn: resetIn > 0 ? `${resetIn}s` : '-',
      };
    });

    const header = 'HeaderManager';
    const verbose = `verbose=${this.verboseMode}`;
    const pending = `pending=${this.pendingHeaders.size}`;
    const retries = `retries=${this.retryStates.size}`;

    if (options?.colors) {
      return `\x1b[36m${header}\x1b[0m [${verbose}, ${pending}, ${retries}]\n${Bun.inspect.table(status, { colors: true })}`;
    }

    return `${header} [${verbose}, ${pending}, ${retries}]\n${Bun.inspect.table(status)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERBOSE FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set verbose fetch mode
   */
  setVerboseMode(mode: BunVerboseFetchMode): void {
    this.verboseMode = mode;
    if (mode === 'false') {
      disableVerboseFetch();
    } else {
      enableVerboseFetch(mode);
    }
  }

  /**
   * Get current verbose mode
   */
  getVerboseMode(): BunVerboseFetchMode {
    return this.verboseMode;
  }

  /**
   * Log request in verbose mode
   */
  private logVerbose(exchange: MarketExchange, options?: TrackingOptions): void {
    if (this.verboseMode === 'false') return;

    const url = options?.url || `https://api.${exchange}.com`;
    const method = options?.method || 'GET';
    const headers = options?.requestHeaders || {};

    if (this.verboseMode === 'curl') {
      const headerFlags = Object.entries(headers)
        .map(([k, v]) => `-H '${k}: ${v}'`)
        .join(' ');
      console.log(`[VERBOSE CURL] curl -X ${method} ${headerFlags} '${url}'`);
    } else {
      console.log(`[VERBOSE] [${exchange}] ${method} ${url}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get circuit breaker state for an exchange
   */
  getCircuitState(exchange: MarketExchange): CircuitState {
    const key = `circuit:${exchange}`;
    const state = this.circuitBreakers.get(key);
    
    if (!state) return 'closed';

    const now = Date.now();

    // Check if we should transition from open to half-open
    if (state.state === 'open' && now >= state.nextAttempt) {
      state.state = 'half-open';
      state.successes = 0;
      this.circuitBreakers.set(key, state);
    }

    return state.state;
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure(exchange: MarketExchange): CircuitState {
    const key = `circuit:${exchange}`;
    const now = Date.now();
    
    let state = this.circuitBreakers.get(key) || {
      state: 'closed' as CircuitState,
      failures: 0,
      successes: 0,
      lastFailure: 0,
      nextAttempt: 0,
    };

    state.failures++;
    state.lastFailure = now;
    state.successes = 0;

    // Check if we should open the circuit
    if (state.failures >= DEFAULT_CIRCUIT_CONFIG.failureThreshold) {
      state.state = 'open';
      state.nextAttempt = now + DEFAULT_CIRCUIT_CONFIG.resetTimeout;
    }

    this.circuitBreakers.set(key, state);
    return state.state;
  }

  /**
   * Record a success for circuit breaker
   */
  recordSuccess(exchange: MarketExchange): CircuitState {
    const key = `circuit:${exchange}`;
    
    let state = this.circuitBreakers.get(key);
    if (!state) return 'closed';

    state.successes++;
    state.failures = 0;

    // Check if we should close the circuit (from half-open)
    if (state.state === 'half-open' && state.successes >= DEFAULT_CIRCUIT_CONFIG.successThreshold) {
      state.state = 'closed';
    }

    this.circuitBreakers.set(key, state);
    return state.state;
  }

  /**
   * Check if circuit is open (should not make requests)
   */
  isCircuitOpen(exchange: MarketExchange): boolean {
    return this.getCircuitState(exchange) === 'open';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETRY TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number): number {
    const { baseDelay, maxDelay, jitter } = DEFAULT_RETRY_CONFIG;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitterAmount = exponentialDelay * jitter * Math.random();
    return Math.floor(exponentialDelay + jitterAmount);
  }

  /**
   * Get retry state for a request
   */
  getRetryState(requestId: string): RetryState | undefined {
    return this.retryStates.get(requestId);
  }

  /**
   * Record a retry attempt
   */
  recordRetry(requestId: string): { attempt: number; backoff: number; canRetry: boolean } {
    const now = Date.now();
    let state = this.retryStates.get(requestId) || {
      attempt: 0,
      nextBackoff: 0,
      lastAttempt: 0,
    };

    state.attempt++;
    state.lastAttempt = now;
    state.nextBackoff = this.calculateBackoff(state.attempt);

    const canRetry = state.attempt < DEFAULT_RETRY_CONFIG.maxAttempts;
    
    this.retryStates.set(requestId, state);

    return {
      attempt: state.attempt,
      backoff: state.nextBackoff,
      canRetry,
    };
  }

  /**
   * Clear retry state for a request
   */
  clearRetryState(requestId: string): void {
    this.retryStates.delete(requestId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Track rate limit for an exchange with full header generation
   */
  trackRateLimit(exchange: MarketExchange, options?: TrackingOptions): TrackingResult {
    // Log if verbose mode enabled
    if (options?.verbose) {
      this.setVerboseMode(options.verbose);
    }
    this.logVerbose(exchange, options);

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

    const remaining = Math.max(0, config.rateLimit - counter.count);
    
    // Check if we should open circuit based on threshold or rate limit exhaustion
    const circuitThreshold = options?.circuitThreshold ?? config.rateLimit;
    if (counter.count >= circuitThreshold && this.getCircuitState(exchange) === 'closed') {
      // Record failures to open circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_CONFIG.failureThreshold; i++) {
        this.recordFailure(exchange);
      }
    }

    const circuitState = this.getCircuitState(exchange);

    // Calculate backoff if retry attempt provided
    const retryAttempt = options?.retryAttempt ?? 0;
    const backoff = retryAttempt > 0 ? this.calculateBackoff(retryAttempt) : 0;

    // Build headers object
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.rateLimit.toString(),
      'X-RateLimit-Window': `${config.rateLimitWindow}s`,
      'X-RateLimit-Remaining': remaining.toString(),
      'X-Circuit-Status': circuitState,
    };

    if (backoff > 0) {
      headers['X-Backoff-Next'] = backoff.toString();
      headers['X-Retry-Attempt'] = retryAttempt.toString();
    }

    return new TrackingResultImpl(
      remaining,
      counter.resetAt,
      circuitState,
      headers,
    );
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build headers with rate limit, circuit breaker, and retry tracking
   */
  buildHeaders(options: CanonicalHeaderOptions & TrackingOptions = {}): Headers {
    const exchange = options.canonical?.exchange || options.exchange || 'polymarket';
    const rateLimit = this.trackRateLimit(exchange, options);

    return buildCanonicalHeaders({
      ...options,
      rateLimitRemaining: rateLimit.remaining,
      circuitState: rateLimit.circuitState,
    });
  }

  /**
   * Create headers without canonical data - store for later injection
   * Returns a request ID that can be used to inject canonical data later
   */
  createPendingHeaders(options: Omit<CanonicalHeaderOptions, 'canonical'> = {}): {
    headers: Headers;
    requestId: string;
  } {
    const headers = this.buildHeaders(options);
    const requestId = headers.get('X-Request-Id') || crypto.randomUUID();
    
    // Store headers for later canonical injection
    this.pendingHeaders.set(requestId, headers);
    
    // Mark as pending canonical
    headers.set('X-Canonical-Status', 'pending');
    
    return { headers, requestId };
  }

  /**
   * Inject X-Canonical-* headers into existing headers
   * Can be called after initial response is prepared but before sending
   */
  injectCanonicalHeaders(
    headers: Headers,
    canonical: CanonicalMarket
  ): Headers {
    // Core canonical headers
    headers.set('X-Canonical-UUID', canonical.uuid);
    headers.set('X-Canonical-Exchange', canonical.exchange);
    headers.set('X-Canonical-Type', canonical.type);
    headers.set('X-Canonical-Version', canonical.version.toString());
    headers.set('X-Canonical-Status', 'resolved');

    if (canonical.salt) {
      headers.set('X-Canonical-Salt', canonical.salt);
    }

    if (canonical.nativeId) {
      headers.set('X-Canonical-Native-ID', canonical.nativeId);
    }

    // API metadata
    if (canonical.apiMetadata) {
      headers.set('X-API-Endpoint', canonical.apiMetadata.endpoint);
      headers.set('X-API-Cache-Key', canonical.apiMetadata.cacheKey);
    }

    // Timestamp of injection
    headers.set('X-Canonical-Injected-At', new Date().toISOString());

    return headers;
  }

  /**
   * Inject canonical data by request ID (for pending headers)
   */
  injectByRequestId(requestId: string, canonical: CanonicalMarket): Headers | null {
    const headers = this.pendingHeaders.get(requestId);
    
    if (!headers) {
      return null;
    }

    this.injectCanonicalHeaders(headers, canonical);
    this.pendingHeaders.delete(requestId);
    
    return headers;
  }

  /**
   * Create response with deferred canonical injection
   * Returns a function to inject canonical data before response is sent
   */
  createDeferredResponse<T>(
    data: T,
    options: Omit<CanonicalHeaderOptions, 'canonical'> & { status?: number } = {}
  ): {
    response: Response;
    injectCanonical: (canonical: CanonicalMarket) => Response;
  } {
    const { status = 200, ...headerOptions } = options;
    const { headers, requestId } = this.createPendingHeaders(headerOptions);

    const baseResponse = new Response(JSON.stringify(data), {
      status,
      headers: headersToObject(headers),
    });

    return {
      response: baseResponse,
      injectCanonical: (canonical: CanonicalMarket) => {
        const injectedHeaders = this.injectCanonicalHeaders(
          new Headers(headersToObject(headers)),
          canonical
        );
        
        return new Response(JSON.stringify({
          ...data,
          canonical: {
            uuid: canonical.uuid,
            exchange: canonical.exchange,
            type: canonical.type,
          },
        }), {
          status,
          headers: headersToObject(injectedHeaders),
        });
      },
    };
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

  /**
   * Clear pending headers (cleanup)
   */
  clearPending(): void {
    this.pendingHeaders.clear();
  }

  /**
   * Get pending header count
   */
  getPendingCount(): number {
    return this.pendingHeaders.size;
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
