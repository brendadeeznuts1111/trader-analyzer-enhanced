/**
 * Enhanced API Headers Utility
 * Provides comprehensive tracking, caching, and debugging headers
 * for all API responses
 */

import { md5 } from './crypto-utils';

// Server identification
const SERVER_NAME = process.env.SERVER_NAME || 'trader-analyzer';
const SERVER_VERSION = process.env.npm_package_version || '0.2.0';
const SERVER_PORT = process.env.PORT || '3002';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Request counter for tracing
let requestCounter = 0;

export interface HeaderOptions {
  /** Cache control strategy */
  cache?: 'no-cache' | 'short' | 'medium' | 'long' | 'immutable';
  /** Content for ETag generation */
  etagContent?: string | object;
  /** Custom cache max-age in seconds */
  maxAge?: number;
  /** Include preconnect hints */
  preconnect?: string[];
  /** Request object for extracting client info */
  request?: Request;
  /** Response timing in ms */
  responseTime?: number;
  /** Custom headers to merge */
  custom?: Record<string, string>;
}

// Cache duration presets (seconds)
const CACHE_PRESETS = {
  'no-cache': 0,
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  immutable: 31536000, // 1 year
} as const;

/**
 * Generate ETag from content
 */
function generateETag(content: string | object): string {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  const hash = md5(data).slice(0, 16);
  return `"${hash}"`;
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % 1000000;
  const timestamp = Date.now().toString(36);
  const counter = requestCounter.toString(36).padStart(4, '0');
  return `${timestamp}-${counter}`;
}

/**
 * Extract client info from request
 */
function extractClientInfo(request?: Request): {
  userAgent: string;
  clientIp: string;
  referer: string;
  acceptEncoding: string;
} {
  if (!request) {
    return {
      userAgent: 'unknown',
      clientIp: 'unknown',
      referer: 'none',
      acceptEncoding: 'none',
    };
  }

  const headers = request.headers;
  return {
    userAgent: headers.get('user-agent') || 'unknown',
    clientIp:
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      'unknown',
    referer: headers.get('referer') || 'none',
    acceptEncoding: headers.get('accept-encoding') || 'none',
  };
}

/**
 * Parse User-Agent for OS and browser info
 */
function parseUserAgent(ua: string): { os: string; browser: string; type: string } {
  let os = 'unknown';
  let browser = 'unknown';
  let type = 'unknown';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect browser
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('curl/')) browser = 'curl';
  else if (ua.includes('PostmanRuntime')) browser = 'Postman';
  else if (ua.includes('insomnia')) browser = 'Insomnia';

  // Detect client type
  if (ua.includes('Mobile')) type = 'mobile';
  else if (ua.includes('Tablet')) type = 'tablet';
  else if (browser === 'curl' || browser === 'Postman' || browser === 'Insomnia')
    type = 'api-client';
  else if (ua.includes('bot') || ua.includes('Bot') || ua.includes('crawler')) type = 'bot';
  else type = 'desktop';

  return { os, browser, type };
}

/**
 * Build enhanced headers for API responses
 */
export function buildApiHeaders(options: HeaderOptions = {}): Headers {
  const {
    cache = 'short',
    etagContent,
    maxAge,
    preconnect = [],
    request,
    responseTime,
    custom = {},
  } = options;

  const headers = new Headers();
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  // ═══════════════════════════════════════════════════════════════
  // CONTENT HEADERS
  // ═══════════════════════════════════════════════════════════════
  headers.set('Content-Type', 'application/json; charset=utf-8');

  // ═══════════════════════════════════════════════════════════════
  // CACHING HEADERS
  // ═══════════════════════════════════════════════════════════════
  const cacheSeconds = maxAge ?? CACHE_PRESETS[cache];

  if (cacheSeconds === 0) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  } else if (cache === 'immutable') {
    headers.set('Cache-Control', `public, max-age=${cacheSeconds}, immutable`);
  } else {
    headers.set(
      'Cache-Control',
      `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
    );
  }

  // ETag for conditional requests
  if (etagContent) {
    headers.set('ETag', generateETag(etagContent));
  }

  // ═══════════════════════════════════════════════════════════════
  // SERVER IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  headers.set('X-Server-Name', SERVER_NAME);
  headers.set('X-Server-Version', SERVER_VERSION);
  headers.set('X-Server-Port', SERVER_PORT);
  headers.set('X-Server-Env', NODE_ENV);
  headers.set('X-Powered-By', 'Bun');

  // ═══════════════════════════════════════════════════════════════
  // REQUEST TRACING
  // ═══════════════════════════════════════════════════════════════
  headers.set('X-Request-Id', requestId);
  headers.set('X-Response-Timestamp', timestamp);

  if (responseTime !== undefined) {
    headers.set('X-Response-Time', `${responseTime}ms`);
  }

  // ═══════════════════════════════════════════════════════════════
  // CLIENT INFO (echo back for debugging)
  // ═══════════════════════════════════════════════════════════════
  const clientInfo = extractClientInfo(request);
  const uaInfo = parseUserAgent(clientInfo.userAgent);

  headers.set('X-Client-IP', clientInfo.clientIp);
  headers.set('X-Client-OS', uaInfo.os);
  headers.set('X-Client-Browser', uaInfo.browser);
  headers.set('X-Client-Type', uaInfo.type);

  // ═══════════════════════════════════════════════════════════════
  // DNS & PRECONNECT HINTS
  // ═══════════════════════════════════════════════════════════════
  const defaultPreconnect = ['https://api.bitmex.com', 'https://api.polymarket.com'];

  const allPreconnect = [...new Set([...defaultPreconnect, ...preconnect])];

  // Link header for DNS prefetch / preconnect
  const linkValues = allPreconnect.map(url => `<${url}>; rel=preconnect; crossorigin`);
  if (linkValues.length > 0) {
    headers.set('Link', linkValues.join(', '));
  }

  // DNS prefetch hints
  headers.set('X-DNS-Prefetch-Control', 'on');

  // ═══════════════════════════════════════════════════════════════
  // SECURITY HEADERS
  // ═══════════════════════════════════════════════════════════════
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');

  // CORS headers
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  headers.set(
    'Access-Control-Expose-Headers',
    [
      'X-Request-Id',
      'X-Response-Time',
      'X-Server-Name',
      'X-Server-Version',
      'X-Cache-Status',
      'ETag',
    ].join(', ')
  );

  // ═══════════════════════════════════════════════════════════════
  // VARY HEADER (for proper caching)
  // ═══════════════════════════════════════════════════════════════
  headers.set('Vary', 'Accept-Encoding, Origin');

  // ═══════════════════════════════════════════════════════════════
  // CUSTOM HEADERS
  // ═══════════════════════════════════════════════════════════════
  for (const [key, value] of Object.entries(custom)) {
    headers.set(key, value);
  }

  return headers;
}

/**
 * Convert Headers to plain object for NextResponse
 */
export function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Helper to create response with enhanced headers
 */
export function createApiResponse<T>(
  data: T,
  options: HeaderOptions & { status?: number } = {}
): { body: T; init: ResponseInit } {
  const { status = 200, ...headerOptions } = options;
  const headers = buildApiHeaders(headerOptions);

  return {
    body: data,
    init: {
      status,
      headers: headersToObject(headers),
    },
  };
}

/**
 * Check if request has valid ETag (for 304 responses)
 */
export function checkETagMatch(request: Request, currentETag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  return ifNoneMatch === currentETag;
}

/**
 * Error response helper with proper headers
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: string,
  request?: Request
): {
  body: { error: string; details?: string; timestamp: string; requestId: string };
  init: ResponseInit;
} {
  const headers = buildApiHeaders({
    cache: 'no-cache',
    request,
    custom: {
      'X-Error-Type': status >= 500 ? 'server-error' : 'client-error',
    },
  });

  const requestId = headers.get('X-Request-Id') || 'unknown';

  return {
    body: {
      error,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
    init: {
      status,
      headers: headersToObject(headers),
    },
  };
}
