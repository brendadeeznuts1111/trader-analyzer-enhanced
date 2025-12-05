/**
 * CORS Policy Builder
 * Builds CORS headers from security profile configuration
 */

import type { CORSPolicy } from './types';

export interface CORSHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Expose-Headers': string;
  'Access-Control-Max-Age': string;
  'Access-Control-Allow-Credentials'?: string;
  Vary: string;
}

/**
 * Check if an origin matches a pattern (supports wildcards like *.telegram.org)
 */
function matchesOriginPattern(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  if (!pattern.includes('*')) return false;

  // Convert wildcard pattern to regex: https://*.telegram.org -> https://.*\.telegram\.org
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = escaped.replace(/\\\*/g, '.*');
  return new RegExp(`^${regexPattern}$`).test(origin);
}

/**
 * Build CORS headers from policy
 * @param policy - CORS policy configuration
 * @param requestOrigin - Origin header from incoming request
 */
export function buildCORSHeaders(policy: CORSPolicy, requestOrigin?: string | null): CORSHeaders {
  let allowOrigin: string;

  if (policy.allowedOrigins === '*') {
    allowOrigin = '*';
  } else if (Array.isArray(policy.allowedOrigins)) {
    if (requestOrigin) {
      // Check if request origin matches any allowed origin
      const matched = policy.allowedOrigins.find(
        allowed => matchesOriginPattern(requestOrigin, allowed)
      );
      allowOrigin = matched ? requestOrigin : policy.allowedOrigins[0];
    } else {
      // No origin header - use first allowed origin
      allowOrigin = policy.allowedOrigins[0];
    }
  } else {
    allowOrigin = policy.allowedOrigins;
  }

  const headers: CORSHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': policy.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': policy.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': policy.exposedHeaders.join(', '),
    'Access-Control-Max-Age': policy.maxAge.toString(),
    Vary: 'Origin',
  };

  // Only add credentials header if not using wildcard origin
  if (policy.credentials && allowOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Check if an origin is allowed by policy
 */
export function isOriginAllowed(policy: CORSPolicy, origin: string | null): boolean {
  if (!origin) return policy.allowedOrigins === '*';
  if (policy.allowedOrigins === '*') return true;

  const origins = Array.isArray(policy.allowedOrigins)
    ? policy.allowedOrigins
    : [policy.allowedOrigins];

  return origins.some(allowed => matchesOriginPattern(origin, allowed));
}
