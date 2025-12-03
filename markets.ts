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
      if (url.pathname.startsWith('/api/markets/') && request.method === 'GET') {
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
