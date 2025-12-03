/**
 * Cloudflare Worker - Markets API
 * [[TECH][MODULE][SERVICE][META:{blueprint=BP-WORKERS-MIGRATION@0.1.13;instance-id=ORCA-MARKETS-001;version=0.1.14}]
 * [CLASS:MarketsHandler][#REF:v-0.1.14.BP.DEPLOY.1.0.A.1.1.WORKERS.1.1]
 */

interface Env {
  ORCA_MOCK_CACHE: KVNamespace;
}

// CRC32 implementation for ETag checksums
function crc32(str: string): string {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc = table[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

// Canonical market definitions (copied from server.ts)
const CANONICAL_MARKETS = [
  {
    id: 'presidential-election-winner-2024',
    displayName: '2024 US Presidential Election Winner',
    category: 'politics',
    status: 'active',
    resolutionDate: '2024-11-05T00:00:00Z',
    description: 'Who will win the 2024 US Presidential Election?',
    tags: ['politics', 'election', 'us', 'president'],
    sources: [
      {
        exchange: 'polymarket',
        symbol: 'PRES24-WINNER',
        marketId: '0x1234567890abcdef',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
      {
        exchange: 'kalishi',
        symbol: 'US-PRES-2024',
        marketId: 'kalishi-pres-2024',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'btc-usd-perp',
    displayName: 'BTC/USD Perpetual Futures',
    category: 'crypto',
    status: 'active',
    description: 'Bitcoin perpetual futures contract',
    tags: ['crypto', 'bitcoin', 'futures', 'perp'],
    sources: [
      {
        exchange: 'binance',
        symbol: 'BTCUSDT',
        marketId: 'BTCUSDT',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
      {
        exchange: 'bitmex',
        symbol: 'XBTUSD',
        marketId: 'XBTUSD',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'eth-usd-perp',
    displayName: 'ETH/USD Perpetual Futures',
    category: 'crypto',
    status: 'active',
    description: 'Ethereum perpetual futures contract',
    tags: ['crypto', 'ethereum', 'futures', 'perp'],
    sources: [
      {
        exchange: 'binance',
        symbol: 'ETHUSDT',
        marketId: 'ETHUSDT',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'superbowl-2025',
    displayName: 'Super Bowl LVIII Winner',
    category: 'sports',
    status: 'active',
    resolutionDate: '2025-02-09T00:00:00Z',
    description: 'Which team will win Super Bowl LVIII?',
    tags: ['sports', 'football', 'nfl', 'superbowl'],
    sources: [
      {
        exchange: 'polymarket',
        symbol: 'SB58-WINNER',
        marketId: '0xabcdef1234567890',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'fed-rate-cut-2024',
    displayName: 'Fed Rate Cut in 2024?',
    category: 'prediction',
    status: 'active',
    resolutionDate: '2024-12-31T00:00:00Z',
    description: 'Will the Federal Reserve cut interest rates in 2024?',
    tags: ['economics', 'fed', 'rates', 'policy'],
    sources: [
      {
        exchange: 'polymarket',
        symbol: 'FED-CUT-2024',
        marketId: '0xfedcba0987654321',
        status: 'active',
        lastUpdate: new Date().toISOString(),
      },
    ],
  },
];

// OHLCV interfaces and constants
interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Timeframe mappings (minutes)
const TIMEFRAME_MINUTES: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
};

// Source timeframe for aggregation
const TIMEFRAME_SOURCE: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '5m', // Aggregate from 5m
  '30m': '5m', // Aggregate from 5m
  '1h': '1h',
  '4h': '1h', // Aggregate from 1h
  '1d': '1d',
  '1w': '1d', // Aggregate from 1d
};

// Maximum candles to return (prevents browser crashes)
const MAX_CANDLES: Record<string, number> = {
  '1m': 10000, // ~7 days
  '5m': 10000, // ~35 days
  '15m': 10000, // ~104 days
  '30m': 10000, // ~208 days
  '1h': 50000, // ~5.7 years
  '4h': 50000, // ~22 years
  '1d': 50000, // all data
  '1w': 50000, // all data
};

// Generate base mock OHLCV data for a specific timeframe
function generateBaseOHLCV(
  marketId: string,
  timeframe: string,
  count: number = 1000
): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  const basePrice = marketId.includes('btc') ? 65000 : marketId.includes('eth') ? 3500 : 0.5;
  const intervalSeconds = TIMEFRAME_MINUTES[timeframe] * 60; // Convert minutes to seconds

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = Math.floor(Date.now() / 1000) - i * intervalSeconds;
    const open = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
    const close = open + (Math.random() - 0.5) * basePrice * 0.01;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.005;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.005;
    const volume = Math.random() * 1000 + 100;

    candles.push({
      time: timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume * 100) / 100,
    });
  }

  return candles;
}

// Aggregate candles to larger timeframes
function aggregateCandles(
  candles: OHLCVCandle[],
  targetMinutes: number,
  sourceMinutes: number
): OHLCVCandle[] {
  if (candles.length === 0) return [];

  const ratio = Math.round(targetMinutes / sourceMinutes);
  if (ratio <= 1) return candles;

  const bucketSeconds = targetMinutes * 60;
  const buckets = new Map<number, OHLCVCandle[]>();

  // Group candles by bucket
  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(candle);
  }

  // Aggregate each bucket
  const result: OHLCVCandle[] = [];

  for (const [bucketTime, candlesInBucket] of buckets) {
    if (candlesInBucket.length === 0) continue;

    // Sort by time
    candlesInBucket.sort((a, b) => a.time - b.time);

    result.push({
      time: bucketTime,
      open: candlesInBucket[0].open,
      high: Math.max(...candlesInBucket.map(c => c.high)),
      low: Math.min(...candlesInBucket.map(c => c.low)),
      close: candlesInBucket[candlesInBucket.length - 1].close,
      volume: candlesInBucket.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  // Sort by time
  result.sort((a, b) => a.time - b.time);

  return result;
}

// Generate mock orderbook data (simplified for Worker)
function generateMockOrderbook(marketId: string) {
  const basePrice = marketId.includes('btc') ? 65000 : marketId.includes('eth') ? 3500 : 0.5;
  const spread = basePrice * 0.001; // 0.1% spread

  const bids: [number, number][] = [];
  const asks: [number, number][] = [];

  // Generate 10 levels of bids and asks
  for (let i = 0; i < 10; i++) {
    const bidPrice = basePrice - ((i + 1) * spread) / 10;
    const askPrice = basePrice + ((i + 1) * spread) / 10;
    const bidSize = Math.random() * 10 + 1;
    const askSize = Math.random() * 10 + 1;

    bids.push([bidPrice, bidSize]);
    asks.push([askPrice, askSize]);
  }

  return {
    marketId,
    timestamp: new Date().toISOString(),
    bids,
    asks,
    spread,
    midPrice: basePrice,
    volume24h: Math.random() * 1000000 + 100000,
    sources:
      CANONICAL_MARKETS.find(m => m.id === marketId)?.sources.map(source => ({
        exchange: source.exchange,
        bids: bids.slice(0, 5), // Each exchange has partial depth
        asks: asks.slice(0, 5),
        lastUpdate: new Date().toISOString(),
      })) || [],
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/markets - Return all markets with ETag caching
      if (url.pathname === '/api/markets' && request.method === 'GET') {
        const marketsData = {
          markets: CANONICAL_MARKETS,
          total: CANONICAL_MARKETS.length,
        };

        // Compute ETag: CRC32 checksum of data only (for proper caching)
        const dataStr = JSON.stringify(marketsData);
        const checksum = crc32(dataStr);
        const etag = `"v${checksum}"`;

        // Check If-None-Match header
        const ifNoneMatch = request.headers.get('If-None-Match');
        if (ifNoneMatch === etag) {
          return new Response(null, {
            status: 304,
            headers: {
              ...corsHeaders,
              ETag: etag,
              'Cache-Control': 'public, max-age=300',
            },
          });
        }

        return new Response(JSON.stringify(marketsData), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ETag: etag,
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // GET /api/markets/{id} - Return single market
      if (
        url.pathname.startsWith('/api/markets/') &&
        !url.pathname.includes('/ohlcv') &&
        request.method === 'GET'
      ) {
        const marketId = url.pathname.split('/')[3];
        const market = CANONICAL_MARKETS.find(m => m.id === marketId);

        if (!market) {
          return new Response(JSON.stringify({ error: 'Market not found' }), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        // Add mock orderbook data for the market
        const marketWithData = {
          ...market,
          orderbook: generateMockOrderbook(marketId),
          lastUpdate: new Date().toISOString(),
        };

        return new Response(JSON.stringify(marketWithData), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // GET /api/markets/{id}/ohlcv - Return OHLCV data with aggregation
      if (url.pathname.match(/^\/api\/markets\/[^\/]+\/ohlcv$/) && request.method === 'GET') {
        const marketId = url.pathname.split('/')[3];
        const market = CANONICAL_MARKETS.find(m => m.id === marketId);

        if (!market) {
          return new Response(JSON.stringify({ error: 'Market not found' }), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        const searchParams = url.searchParams;
        const timeframe = searchParams.get('timeframe') || '1d';
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Cap at 1000
        const since = searchParams.get('since') ? parseInt(searchParams.get('since')!) : null;

        // Temporary simplified response for testing
        const result = {
          candles: [
            {
              time: Math.floor(Date.now() / 1000),
              open: 65000,
              high: 65500,
              low: 64500,
              close: 65200,
              volume: 1000,
            },
          ],
          marketId,
          timeframe: timeframe || '1d',
          count: 1,
          totalAvailable: 1,
          limited: false,
          range: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        };

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Markets Worker error:', error);

      // Log error to KV for debugging
      await env.ORCA_MOCK_CACHE.put(
        `error-${Date.now()}`,
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          url: url.pathname,
          method: request.method,
        }),
        { expirationTtl: 3600 }
      ); // Keep errors for 1 hour

      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
