import { NextResponse } from 'next/server';
import { marketFetcher } from '../../../../lib/markets';
import { marketCanonicalizer, type MarketExchange } from '../../../../lib/canonical';
import { createCanonicalErrorResponse, headerManager } from '../../../../lib/api';
import { headersToObject } from '../../../../lib/api-headers';
import { exchangeManager } from '../../../../lib/exchanges/exchange_manager';
import { PolymarketExchange } from '../../../../lib/exchanges/polymarket_exchange';

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data',
    },
  });
}

/**
 * GET /api/markets/canonical
 *
 * Fetch canonical markets with UUIDv5 identifiers
 *
 * Query params:
 * - exchange: polymarket | kalshi | manifold | bitmex | sports (default: polymarket)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - type: binary | scalar | categorical | perpetual
 * - category: crypto | prediction | sports | politics
 * - search: string (search in displayName/description)
 *
 * Returns markets with canonical UUIDs and cache status headers
 */
export async function GET(request: Request) {
  const startTime = performance.now();
  const url = new URL(request.url);

  // Parse query params
  const exchange = (url.searchParams.get('exchange') || 'polymarket') as MarketExchange;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const typeFilter = url.searchParams.get('type');
  const categoryFilter = url.searchParams.get('category');
  const searchQuery = url.searchParams.get('search')?.toLowerCase();

  try {
    // Check rate limit
    if (headerManager.isRateLimited(exchange)) {
      const response = createCanonicalErrorResponse('Rate limit exceeded', 429, {
        exchange,
        request,
      });
      return new NextResponse(response.body, {
        status: 429,
        headers: response.headers,
      });
    }

    // Initialize exchange manager
    if (!exchangeManager.isInitialized()) {
      exchangeManager.initialize();
    }

    // Get markets from exchange
    let rawMarkets: any[] = [];

    if (exchange === 'polymarket') {
      const polyExchange = exchangeManager.getExchange('polymarket') as PolymarketExchange;
      // Initialize if needed
      try {
        await polyExchange.initialize({});
      } catch {
        // Already initialized
      }
      const polyMarkets = await polyExchange.fetchMarketsFromCLOB();
      rawMarkets = polyMarkets.map(m => ({
        nativeId: m.id,
        question: m.question,
        outcomes: m.outcomes,
        outcomePrices: m.outcomePrices,
        volume: m.volume,
        endDate: m.endDate,
      }));
    } else {
      // For other exchanges, return demo data
      rawMarkets = [
        { nativeId: 'XBTUSD', question: 'BTC/USD Perpetual' },
        { nativeId: 'ETHUSD', question: 'ETH/USD Perpetual' },
      ];
    }

    // Canonicalize markets
    const canonicalMarkets = rawMarkets.map(m => {
      const canonical = marketCanonicalizer.canonicalize({
        exchange,
        nativeId: m.nativeId || m.id,
        type: (typeFilter as any) || 'binary',
      });

      // Determine category from question/name
      const question = (m.question || m.nativeId || '').toLowerCase();
      let category = 'prediction';
      if (question.includes('btc') || question.includes('eth') || question.includes('crypto')) {
        category = 'crypto';
      } else if (
        question.includes('election') ||
        question.includes('president') ||
        question.includes('trump') ||
        question.includes('biden')
      ) {
        category = 'politics';
      } else if (
        question.includes('super bowl') ||
        question.includes('nfl') ||
        question.includes('championship')
      ) {
        category = 'sports';
      }

      // Parse odds from outcomePrices
      let odds = undefined;
      if (m.outcomePrices && m.outcomePrices.length >= 2) {
        const yes = parseFloat(m.outcomePrices[0]) * 100;
        const no = parseFloat(m.outcomePrices[1]) * 100;
        odds = { yes, no };
      }

      return {
        uuid: canonical.uuid,
        nativeId: canonical.nativeId,
        exchange: canonical.exchange,
        displayName: m.question || m.nativeId,
        description: m.slug ? `polymarket.com/${m.slug}` : '',
        category,
        type: canonical.type,
        tags: canonical.tags,
        salt: canonical.salt,
        cacheKey: canonical.apiMetadata.cacheKey,
        odds,
        volume: m.volume,
        endDate: m.endDate,
        outcomes: m.outcomes,
      };
    });

    // Apply filters
    let filtered = canonicalMarkets;

    if (categoryFilter) {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        m =>
          m.displayName.toLowerCase().includes(searchQuery) ||
          m.description.toLowerCase().includes(searchQuery) ||
          m.tags.some((t: string) => t.includes(searchQuery))
      );
    }

    // Apply pagination
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Get cache stats
    const cacheStats = marketFetcher.getCacheStats(exchange);

    const responseTime = performance.now() - startTime;

    // Build response with canonical headers
    const headers = headerManager.buildHeaders({
      exchange,
      cacheHit: false, // This endpoint doesn't cache the list itself
      responseTime,
      request,
      debug: process.env.NODE_ENV !== 'production',
    });

    headers.set('X-Total-Count', total.toString());
    headers.set('X-Offset', offset.toString());
    headers.set('X-Limit', limit.toString());

    return NextResponse.json(
      {
        markets: paginated,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        },
        cacheStats: {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: cacheStats.hitRate,
        },
        meta: {
          exchange,
          responseTimeMs: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: headersToObject(headers),
      }
    );
  } catch (error) {
    console.error('Canonical markets API error:', error);

    const response = createCanonicalErrorResponse('Failed to fetch canonical markets', 500, {
      exchange,
      request,
      debug: true,
    });

    return new NextResponse(response.body, {
      status: 500,
      headers: response.headers,
    });
  }
}

/**
 * POST /api/markets/canonical
 *
 * Canonicalize a single market or batch of markets
 *
 * Body:
 * - Single: { exchange, nativeId, type?, bookId?, home?, away?, period? }
 * - Batch: { markets: [{ exchange, nativeId, type?, ... }] }
 */
export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    // Handle batch or single
    const markets = body.markets || [body];

    const results = markets.map((m: any) => {
      const canonical = marketCanonicalizer.canonicalize({
        exchange: m.exchange || 'polymarket',
        nativeId: m.nativeId,
        type: m.type || 'binary',
        bookId: m.bookId,
        home: m.home,
        away: m.away,
        period: m.period,
      });

      return {
        uuid: canonical.uuid,
        nativeId: canonical.nativeId,
        exchange: canonical.exchange,
        type: canonical.type,
        tags: canonical.tags,
        salt: canonical.salt,
        version: canonical.version,
        apiMetadata: canonical.apiMetadata,
      };
    });

    const responseTime = performance.now() - startTime;

    const headers = headerManager.buildHeaders({
      exchange: body.exchange || 'polymarket',
      responseTime,
      request,
    });

    return NextResponse.json(
      {
        results: body.markets ? results : results[0],
        meta: {
          count: results.length,
          responseTimeMs: responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: headersToObject(headers),
      }
    );
  } catch (error) {
    console.error('Canonical POST error:', error);

    const response = createCanonicalErrorResponse('Failed to canonicalize market', 400, {
      request,
    });

    return new NextResponse(response.body, {
      status: 400,
      headers: response.headers,
    });
  }
}
