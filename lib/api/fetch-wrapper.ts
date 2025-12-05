/**
 * Fetch Wrapper with Rate Limiting, Circuit Breaker, and Verbose Logging
 * 
 * Integrates HeaderManager for:
 * - Pre-flight rate limit checks
 * - Circuit breaker pattern (fail-fast on open)
 * - Exponential backoff retry
 * - Verbose logging (curl/true modes)
 * 
 * Uses Bun's native fetch for optimal performance.
 */

import { headerManager, type TrackingOptions, type CircuitState } from './header-manager';
import type { MarketExchange } from '../canonical';
import type { BunVerboseFetchMode } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FetchWithLimitsOptions {
  /** Exchange for rate limiting */
  exchange: MarketExchange;
  /** Verbose logging mode */
  verbose?: BunVerboseFetchMode;
  /** Custom circuit threshold */
  circuitThreshold?: number;
  /** Current retry attempt (for backoff calculation) */
  retryAttempt?: number;
  /** Abort signal for timeouts */
  signal?: AbortSignal;
  /** Additional headers to merge */
  headers?: Record<string, string>;
  /** Request method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request body */
  body?: BodyInit;
}

export interface FetchWithRetryOptions extends FetchWithLimitsOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Timeout per request in ms (default: 30000) */
  timeout?: number;
}

/** Custom error for rate limiting */
export class RateLimitError extends Error {
  readonly status = 429;
  readonly exchange: string;
  readonly remaining: number;
  readonly circuitState: CircuitState;
  readonly retryAfter: number;

  constructor(exchange: string, remaining: number, circuitState: CircuitState, retryAfter: number) {
    super(`Rate limited: ${exchange} (${remaining} remaining, circuit: ${circuitState})`);
    this.name = 'RateLimitError';
    this.exchange = exchange;
    this.remaining = remaining;
    this.circuitState = circuitState;
    this.retryAfter = retryAfter;
  }
}

/** Custom error for circuit open */
export class CircuitOpenError extends Error {
  readonly status = 503;
  readonly exchange: string;
  readonly circuitState: CircuitState;

  constructor(exchange: string) {
    super(`Circuit open: ${exchange} - requests blocked`);
    this.name = 'CircuitOpenError';
    this.exchange = exchange;
    this.circuitState = 'open';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH WITH LIMITS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch with rate limiting, circuit breaker, and verbose logging
 * 
 * @throws {RateLimitError} When rate limit exceeded
 * @throws {CircuitOpenError} When circuit is open
 * 
 * @example
 * ```typescript
 * const response = await fetchWithLimits('https://api.polymarket.com/markets', {
 *   exchange: 'polymarket',
 *   verbose: 'curl',
 *   circuitThreshold: 50
 * });
 * ```
 */
export async function fetchWithLimits(
  input: string | URL | Request,
  options: FetchWithLimitsOptions
): Promise<Response> {
  const {
    exchange,
    verbose,
    circuitThreshold,
    retryAttempt = 0,
    signal,
    headers: customHeaders = {},
    method = 'GET',
    body,
  } = options;

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // Pre-flight: Track rate limit and get headers
  const trackingResult = headerManager.trackRateLimit(exchange, {
    verbose,
    circuitThreshold,
    retryAttempt,
    url,
    method,
    requestHeaders: customHeaders,
  });

  const { remaining, resetAt, circuitState, headers: limitHeaders } = trackingResult;

  // Fail-fast: Circuit open
  if (circuitState === 'open') {
    throw new CircuitOpenError(exchange);
  }

  // Fail-fast: Rate limited
  if (headerManager.isRateLimited(exchange)) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    throw new RateLimitError(exchange, remaining, circuitState, retryAfter);
  }

  // Merge headers
  const mergedHeaders = new Headers({
    ...customHeaders,
    'X-Exchange': exchange,
  });

  // Execute fetch (Bun native - optimized)
  const startTime = Bun.nanoseconds();
  
  let response: Response;
  try {
    response = await fetch(input, {
      method,
      headers: mergedHeaders,
      body,
      signal,
    });

    // Record success for circuit breaker
    headerManager.recordSuccess(exchange);

  } catch (error) {
    // Record failure for circuit breaker
    headerManager.recordFailure(exchange);
    throw error;
  }

  const endTime = Bun.nanoseconds();
  const durationMs = (endTime - startTime) / 1_000_000;

  // Augment response with limit headers
  const augmentedHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(limitHeaders)) {
    augmentedHeaders.set(key, value);
  }
  augmentedHeaders.set('X-Response-Time', `${durationMs.toFixed(2)}ms`);

  const augmentedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: augmentedHeaders,
  });

  // Verbose post-fetch logging
  if (verbose && verbose !== 'false') {
    const statusEmoji = response.ok ? '✓' : '✗';
    console.log(
      `[VERBOSE ${verbose.toUpperCase()}] ${statusEmoji} ${exchange} ${response.status} ${method} ${url.slice(-60)} (${durationMs.toFixed(1)}ms)`
    );
  }

  return augmentedResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH WITH RETRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch with automatic retry and exponential backoff
 * 
 * @example
 * ```typescript
 * const response = await fetchWithRetry('https://api.kalshi.com/markets', {
 *   exchange: 'kalshi',
 *   maxRetries: 5,
 *   timeout: 10000,
 *   verbose: 'true'
 * });
 * ```
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  options: FetchWithRetryOptions
): Promise<Response> {
  const { maxRetries = 3, timeout = 30_000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetchWithLimits(input, {
        ...fetchOptions,
        retryAttempt: attempt,
        signal: fetchOptions.signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      // Success - clear retry state
      const requestId = response.headers.get('X-Request-Id');
      if (requestId) {
        headerManager.clearRetryState(requestId);
      }

      return response;

    } catch (error) {
      lastError = error as Error;

      // Don't retry on circuit open (fail-fast)
      if (error instanceof CircuitOpenError) {
        throw error;
      }

      // Check if we should retry
      const canRetry = attempt < maxRetries;
      
      if (!canRetry) {
        break;
      }

      // Calculate backoff
      const retryInfo = headerManager.recordRetry(`retry:${Date.now()}`);
      const backoffMs = retryInfo.backoff;

      if (options.verbose && options.verbose !== 'false') {
        console.log(
          `[VERBOSE RETRY] ${options.exchange} attempt ${attempt + 1}/${maxRetries + 1} failed, ` +
          `backing off ${backoffMs}ms: ${lastError.message}`
        );
      }

      // Wait before retry
      await Bun.sleep(backoffMs);
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET request with limits
 */
export function getWithLimits(
  url: string,
  exchange: MarketExchange,
  options: Partial<FetchWithLimitsOptions> = {}
): Promise<Response> {
  return fetchWithLimits(url, { ...options, exchange, method: 'GET' });
}

/**
 * POST request with limits
 */
export function postWithLimits(
  url: string,
  exchange: MarketExchange,
  body: BodyInit,
  options: Partial<FetchWithLimitsOptions> = {}
): Promise<Response> {
  return fetchWithLimits(url, { ...options, exchange, method: 'POST', body });
}

/**
 * Check if an exchange is currently available (not rate limited, circuit closed)
 */
export function isExchangeAvailable(exchange: MarketExchange): boolean {
  return !headerManager.isRateLimited(exchange) && !headerManager.isCircuitOpen(exchange);
}

/**
 * Get current status for an exchange
 */
export function getExchangeStatus(exchange: MarketExchange): {
  available: boolean;
  rateLimited: boolean;
  circuitState: CircuitState;
} {
  return {
    available: isExchangeAvailable(exchange),
    rateLimited: headerManager.isRateLimited(exchange),
    circuitState: headerManager.getCircuitState(exchange),
  };
}
