import { test, expect, describe } from 'bun:test';

// Basic API endpoint tests for Cloudflare Workers
describe('API Endpoints', () => {
  const baseUrl = 'http://localhost:8788';

  describe('Markets API', () => {
    test('GET /api/markets returns market list', async () => {
      const response = await fetch(`${baseUrl}/api/markets`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('markets');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.markets)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });

    test('GET /api/markets includes proper headers', async () => {
      const response = await fetch(`${baseUrl}/api/markets`);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    });

    test('GET /api/markets/{id} returns individual market', async () => {
      const response = await fetch(`${baseUrl}/api/markets/btc-usd-perp`);
      expect(response.status).toBe(200);

      const market = await response.json();
      expect(market.id).toBe('btc-usd-perp');
      expect(market.displayName).toBeTruthy();
    });

    test('GET /api/markets/{id}/ohlcv returns OHLCV data', async () => {
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
      const response = await fetch(`${baseUrl}/api/trades?type=stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('account');
      expect(data.stats).toHaveProperty('totalTrades');
      expect(data.stats).toHaveProperty('winRate');
    });

    test('GET /api/trades?type=equity returns equity curve', async () => {
      const response = await fetch(`${baseUrl}/api/trades?type=equity&days=30`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('equityCurve');
      expect(Array.isArray(data.equityCurve)).toBe(true);
    });

    test('GET /api/trades?type=sessions returns position sessions', async () => {
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
      const response = await fetch(`${baseUrl}/v1/feed?key=test`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('type', 'feed');
      expect(data).toHaveProperty('key', 'test');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('checksum');
    });

    test('GET /v1/feed includes proper headers', async () => {
      const response = await fetch(`${baseUrl}/v1/feed?key=test`);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/markets/{invalid-id} returns 404', async () => {
      const response = await fetch(`${baseUrl}/api/markets/invalid-market-id`);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty('error');
    });

    test('GET /invalid-endpoint returns 404', async () => {
      const response = await fetch(`${baseUrl}/invalid-endpoint`);
      expect(response.status).toBe(404);
    });
  });
});

// Type safety tests
describe('Type Safety', () => {
  test('API responses have expected structure', async () => {
    const baseUrl = 'http://localhost:8788';
    const response = await fetch(`${baseUrl}/api/markets`);
    const data = await response.json();

    // Type check for markets response
    expect(typeof data.total).toBe('number');
    expect(Array.isArray(data.markets)).toBe(true);
  });
});
