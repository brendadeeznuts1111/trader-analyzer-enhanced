/**
 * API Integration Tests
 * [#REF:TEST-API-HEX:0x54455354]
 *
 * These tests require running servers:
 * - Workers: localhost:8788 (bunx wrangler dev)
 * - Next.js: localhost:3002 (bun run dev)
 *
 * Tests are automatically skipped if servers are unavailable.
 */

import { test, expect, describe, beforeAll } from 'bun:test';
import { WORKERS_URLS, PORTS } from '../lib/constants';
import { Logger } from '../lib/logger';

// =============================================================================
// SERVER AVAILABILITY CHECK
// =============================================================================

interface ServerStatus {
  workers: boolean;
  nextjs: boolean;
}

const serverStatus: ServerStatus = {
  workers: false,
  nextjs: false,
};

/**
 * Check if a server is available
 */
async function checkServer(url: string, timeout = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    return response !== null;
  } catch {
    return false;
  }
}

// =============================================================================
// SETUP
// =============================================================================

beforeAll(async () => {
  // Check server availability
  Logger.header('API Integration Tests');
  Logger.info('Checking server availability...');

  const [workersUp, nextjsUp] = await Promise.all([
    checkServer(`${WORKERS_URLS.local}/api/markets`),
    checkServer(`http://localhost:${PORTS.nextjs}/api/health`),
  ]);

  serverStatus.workers = workersUp;
  serverStatus.nextjs = nextjsUp;

  Logger.table('Server Status', [
    { server: 'Workers', url: WORKERS_URLS.local, status: workersUp ? 'ONLINE' : 'OFFLINE' },
    {
      server: 'Next.js',
      url: `http://localhost:${PORTS.nextjs}`,
      status: nextjsUp ? 'ONLINE' : 'OFFLINE',
    },
  ]);

  if (!workersUp && !nextjsUp) {
    Logger.warn('No servers available - integration tests will be skipped');
    Logger.info('Start servers with: bun run dev && bunx wrangler dev');
  }
});

// =============================================================================
// WORKERS API TESTS (localhost:8788)
// =============================================================================

describe('API Endpoints', () => {
  const baseUrl = WORKERS_URLS.local;

  describe('Markets API', () => {
    test('GET /api/markets returns market list', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/markets', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/markets`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('markets');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.markets)).toBe(true);
      expect(data.total).toBeGreaterThan(0);

      Logger.info(`GET /api/markets: ${data.total} markets`);
    });

    test('GET /api/markets includes proper headers', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/markets headers', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/markets`);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    });

    test('GET /api/markets/{id} returns individual market', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/markets/{id}', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/markets/btc-usd-perp`);
      expect(response.status).toBe(200);

      const market = await response.json();
      expect(market.id).toBe('btc-usd-perp');
      expect(market.displayName).toBeTruthy();
    });

    test('GET /api/markets/{id}/ohlcv returns OHLCV data', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/markets/{id}/ohlcv', 'Workers server offline');
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/markets/btc-usd-perp/ohlcv?timeframe=1d&limit=5`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('candles');
      expect(data).toHaveProperty('marketId', 'btc-usd-perp');
      expect(Array.isArray(data.candles)).toBe(true);
    });
  });

  describe('Trades API', () => {
    test('GET /api/trades?type=stats returns trading statistics', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/trades?type=stats', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/trades?type=stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('account');
      expect(data.stats).toHaveProperty('totalTrades');
      expect(data.stats).toHaveProperty('winRate');
    });

    test('GET /api/trades?type=equity returns equity curve', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/trades?type=equity', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/trades?type=equity&days=30`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('equityCurve');
      expect(Array.isArray(data.equityCurve)).toBe(true);
    });

    test('GET /api/trades?type=sessions returns position sessions', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/trades?type=sessions', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/trades?type=sessions&page=1&limit=10`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('sessions');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.sessions)).toBe(true);
    });
  });

  describe('Polling Fallback', () => {
    test('GET /v1/feed returns feed data', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /v1/feed', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/v1/feed?key=test`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('type', 'feed');
      expect(data).toHaveProperty('key', 'test');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('checksum');
    });

    test('GET /v1/feed includes proper headers', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /v1/feed headers', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/v1/feed?key=test`);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/markets/{invalid-id} returns 404', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /api/markets/{invalid-id}', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/markets/invalid-market-id`);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty('error');
    });

    test('GET /invalid-endpoint returns 404', async () => {
      if (!serverStatus.workers) {
        Logger.testSkip('GET /invalid-endpoint', 'Workers server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/invalid-endpoint`);
      expect(response.status).toBe(404);
    });
  });
});

// =============================================================================
// NEXT.JS API TESTS (localhost:3002)
// =============================================================================

describe('Enhanced Headers', () => {
  const baseUrl = `http://localhost:${PORTS.nextjs}`;

  describe('Tracking Headers', () => {
    test('GET /api/health includes server identification headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Server identification headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      // Server identification
      expect(response.headers.get('X-Server-Name')).toBeTruthy();
      expect(response.headers.get('X-Server-Version')).toBeTruthy();
      expect(response.headers.get('X-Server-Port')).toBeTruthy();
      expect(response.headers.get('X-Powered-By')).toBe('Bun');
    });

    test('GET /api/health includes request tracing headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Request tracing headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      // Request tracing
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      expect(response.headers.get('X-Response-Timestamp')).toBeTruthy();
      expect(response.headers.get('X-Response-Time')).toMatch(/\d+ms/);
    });

    test('GET /api/health includes client info headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Client info headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
        },
      });

      // Client info
      expect(response.headers.get('X-Client-OS')).toBeTruthy();
      expect(response.headers.get('X-Client-Browser')).toBeTruthy();
      expect(response.headers.get('X-Client-Type')).toBeTruthy();
    });
  });

  describe('Caching Headers', () => {
    test('GET /api/health has no-cache headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Health no-cache headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
    });

    test('GET /api/ohlcv has caching headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('OHLCV caching headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/ohlcv?symbol=BTCUSD&timeframe=1d`);

      if (response.ok) {
        const cacheControl = response.headers.get('Cache-Control');
        expect(cacheControl).toContain('max-age');
      }
    });

    test('ETag header is present for cacheable responses', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('ETag header', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      // Health endpoint generates ETags
      expect(response.headers.get('ETag')).toBeTruthy();
    });
  });

  describe('DNS & Preconnect Hints', () => {
    test('API includes Link header with preconnect hints', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Preconnect hints', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      const link = response.headers.get('Link');
      expect(link).toBeTruthy();
      expect(link).toContain('rel=preconnect');
    });

    test('DNS prefetch control is enabled', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('DNS prefetch control', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('on');
    });
  });

  describe('Security Headers', () => {
    test('Security headers are present', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Security headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    test('CORS headers are present', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('CORS headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Request-Id');
    });
  });

  describe('Custom Endpoint Headers', () => {
    test('OHLCV endpoint includes data-specific headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('OHLCV headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/ohlcv?symbol=BTCUSD&timeframe=1d`);

      if (response.ok) {
        expect(response.headers.get('X-Data-Type')).toBe('ohlcv');
        expect(response.headers.get('X-Symbol')).toBe('BTCUSD');
        expect(response.headers.get('X-Timeframe')).toBe('1d');
        expect(response.headers.get('X-Candle-Count')).toBeTruthy();
      }
    });

    test('Profile endpoint includes profile-specific headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Profile headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/profile`);

      if (response.ok) {
        expect(response.headers.get('X-Data-Type')).toBe('trader-profile');
      }
    });

    test('Exchanges endpoint includes exchange-specific headers', async () => {
      if (!serverStatus.nextjs) {
        Logger.testSkip('Exchanges headers', 'Next.js server offline');
        return;
      }

      const response = await fetch(`${baseUrl}/api/exchanges`);

      if (response.ok) {
        expect(response.headers.get('X-Data-Type')).toBe('exchanges');
        expect(response.headers.get('X-Exchange-Count')).toBeTruthy();
      }
    });
  });
});

// =============================================================================
// TYPE SAFETY TESTS
// =============================================================================

describe('Type Safety', () => {
  test('API responses have expected structure', async () => {
    if (!serverStatus.workers) {
      Logger.testSkip('Type safety', 'Workers server offline');
      return;
    }

    const baseUrl = WORKERS_URLS.local;
    const response = await fetch(`${baseUrl}/api/markets`);
    const data = await response.json();

    // Type check for markets response
    expect(typeof data.total).toBe('number');
    expect(Array.isArray(data.markets)).toBe(true);
  });
});
