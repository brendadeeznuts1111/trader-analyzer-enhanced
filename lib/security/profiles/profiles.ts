/**
 * Security Profile Definitions
 * Development, Staging, and Production configurations
 */

import type { SecurityProfile, CORSPolicy, CSPPolicy } from './types';

// Base security headers applied to all profiles
const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT PROFILE - Permissive for local development
// ═══════════════════════════════════════════════════════════════

const DEV_CORS: CORSPolicy = {
  allowedOrigins: '*',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Telegram-Init-Data'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Server-Name', 'X-Cache-Status', 'ETag'],
  credentials: false, // Cannot use credentials with wildcard
  maxAge: 86400,
};

const DEV_CSP: CSPPolicy = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for HMR
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*', 'https:'],
    'frame-ancestors': ["'self'", 'https://web.telegram.org', 'https://*.telegram.org'],
  },
  reportOnly: true,
};

// ═══════════════════════════════════════════════════════════════
// STAGING PROFILE - Restrictive with report-only CSP
// ═══════════════════════════════════════════════════════════════

const STAGING_CORS: CORSPolicy = {
  allowedOrigins: [
    'https://trader-analyzer-markets-staging.utahj4754.workers.dev',
    'https://web.telegram.org',
    'https://*.telegram.org',
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Telegram-Init-Data'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Cache-Status', 'ETag'],
  credentials: true,
  maxAge: 3600,
};

const STAGING_CSP: CSPPolicy = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'https://trader-analyzer-markets-staging.utahj4754.workers.dev',
      'https://api.bitmex.com',
      'https://clob.polymarket.com',
      'https://gamma-api.polymarket.com',
    ],
    'frame-ancestors': ["'self'", 'https://web.telegram.org', 'https://*.telegram.org'],
  },
  reportOnly: true,
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION PROFILE - Fully enforced security
// ═══════════════════════════════════════════════════════════════

const PROD_CORS: CORSPolicy = {
  allowedOrigins: [
    'https://trader-analyzer-markets.utahj4754.workers.dev',
    'https://web.telegram.org',
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Telegram-Init-Data'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'ETag'],
  credentials: true,
  maxAge: 86400,
};

const PROD_CSP: CSPPolicy = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': [
      "'self'",
      'https://trader-analyzer-markets.utahj4754.workers.dev',
      'https://api.bitmex.com',
      'https://clob.polymarket.com',
      'https://gamma-api.polymarket.com',
    ],
    'frame-ancestors': ["'self'", 'https://web.telegram.org'],
  },
  reportOnly: false, // ENFORCED in production
};

// ═══════════════════════════════════════════════════════════════
// PROFILE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const SECURITY_PROFILES: Record<string, SecurityProfile> = {
  development: {
    name: 'development',
    description: 'Permissive settings for local development',
    cors: DEV_CORS,
    csp: DEV_CSP,
    additionalHeaders: {
      ...BASE_HEADERS,
      'X-Security-Profile': 'development',
    },
  },
  staging: {
    name: 'staging',
    description: 'Restricted settings with report-only CSP',
    cors: STAGING_CORS,
    csp: STAGING_CSP,
    additionalHeaders: {
      ...BASE_HEADERS,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Security-Profile': 'staging',
    },
  },
  production: {
    name: 'production',
    description: 'Fully enforced security policies',
    cors: PROD_CORS,
    csp: PROD_CSP,
    additionalHeaders: {
      ...BASE_HEADERS,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Security-Profile': 'production',
    },
  },
};
