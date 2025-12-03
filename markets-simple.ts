/**
 * Cloudflare Worker - Markets API (Simplified Test Version)
 * [[TECH][MODULE][SERVICE][META:{blueprint=BP-WORKERS-MIGRATION@0.1.13;instance-id=ORCA-MARKETS-001;version=0.1.14}]
 * [CLASS:MarketsHandler][#REF:v-0.1.14.BP.DEPLOY.1.0.A.1.1.WORKERS.1.1]
 */

interface Env {
  ORCA_MOCK_CACHE: KVNamespace;
  ORCA_FEED_HUB: DurableObjectNamespace;
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

// FeedHub Durable Object for WebSocket state management
export class FeedHub {
  state: DurableObjectState;
  clients: Map<WebSocket, { key: string; lastSeen: number; subscribed: boolean }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.clients = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const key = url.searchParams.get('key') || 'anonymous';

      // Accept the WebSocket
      const webSocketPair = new WebSocketPair();
      const client = webSocketPair[0];
      const server = webSocketPair[1];

      // Handle WebSocket on the server side
      server.accept();

      // Add client to our map
      this.clients.set(server, {
        key,
        lastSeen: Date.now(),
        subscribed: true,
      });

      // Send welcome message
      server.send(
        JSON.stringify({
          type: 'subscribed',
          key,
          timestamp: Date.now(),
          message: 'Connected to ORCA Feed Hub',
        })
      );

      // Handle messages
      server.addEventListener('message', event => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'ping') {
            // Update last seen
            const client = this.clients.get(server);
            if (client) {
              client.lastSeen = Date.now();
            }
            server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      server.addEventListener('close', () => {
        this.clients.delete(server);
      });

      server.addEventListener('error', error => {
        console.error('WebSocket error:', error);
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const key = url.searchParams.get('key') || 'anonymous';
      const [client, server] = Object.values(new WebSocketPair());

      // Handle WebSocket messages
      server.addEventListener('message', event => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'subscribe') {
            // Subscribe client to feed
            this.clients.set(server, {
              key,
              lastSeen: Date.now(),
              subscribed: true,
            });

            // Send welcome message with current state
            server.send(
              JSON.stringify({
                type: 'subscribed',
                key,
                timestamp: Date.now(),
                message: 'Connected to ORCA Feed Hub',
              })
            );
          } else if (data.type === 'ping') {
            // Update last seen
            const client = this.clients.get(server);
            if (client) {
              client.lastSeen = Date.now();
            }
            server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      server.addEventListener('close', () => {
        this.clients.delete(server);
      });

      server.addEventListener('error', error => {
        console.error('WebSocket error:', error);
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  // Broadcast delta to all subscribed clients
  async broadcastDelta(delta: any) {
    const message = JSON.stringify({
      type: 'delta',
      changes: delta.changes || [],
      checksum: delta.checksum || crc32(JSON.stringify(delta)),
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const [ws, client] of this.clients) {
      if (client.subscribed && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
          sent++;
        } catch (error) {
          console.error('Broadcast error:', error);
          this.clients.delete(ws);
        }
      }
    }

    return sent;
  }

  // Get connection stats
  getStats() {
    return {
      connections: this.clients.size,
      subscribed: Array.from(this.clients.values()).filter(c => c.subscribed).length,
      timestamp: Date.now(),
    };
  }
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

        return new Response(JSON.stringify(market), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // GET /api/markets/{id}/ohlcv - Return OHLCV data
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

        // Simplified OHLCV response
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
          timeframe: '1d',
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

      // GET /api/trades - Trading data with multiple types
      if (url.pathname === '/api/trades' && request.method === 'GET') {
        const searchParams = url.searchParams;
        const type = searchParams.get('type') || 'sessions';

        // Simplified responses for testing
        let result: any;
        if (type === 'stats') {
          result = {
            stats: {
              totalTrades: 1250,
              winRate: 0.55,
              sharpeRatio: 1.18,
              totalRealizedPnl: 125000,
            },
            account: {
              walletBalance: 118000,
              marginBalance: 115250,
            },
          };
        } else if (type === 'equity') {
          result = {
            equityCurve: [
              { date: '2024-01-01', balance: 100000, pnl: 0 },
              { date: '2024-12-01', balance: 118000, pnl: 18000 },
            ],
          };
        } else if (type === 'sessions') {
          result = {
            sessions: [
              {
                id: 'session-1',
                symbol: 'btc-usd-perp',
                side: 'long',
                realizedPnl: 2500,
                netPnl: 2475,
              },
            ],
            total: 47,
            page: 1,
            limit: 20,
          };
        } else {
          result = { error: 'Invalid type' };
        }

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // WebSocket upgrade to Durable Object
      if (url.pathname === '/ws') {
        // Get or create Durable Object instance
        const id = env.ORCA_FEED_HUB.idFromName('global-feed-hub');
        const stub = env.ORCA_FEED_HUB.get(id);

        // Forward the request to the Durable Object
        return stub.fetch(request);
      }

      // ETag polling fallback for /v1/feed
      if (url.pathname === '/v1/feed' && request.method === 'GET') {
        const since = url.searchParams.get('since');
        const key = url.searchParams.get('key') || 'anonymous';

        // Generate mock feed data
        const sampleMarkets = CANONICAL_MARKETS.slice(0, 5);
        const feedData = {
          type: 'feed',
          key,
          timestamp: Date.now(),
          data: {
            markets: sampleMarkets,
            lastUpdate: new Date().toISOString(),
          },
          checksum: crc32(JSON.stringify(sampleMarkets)),
        };

        // Check If-None-Match for polling fallback
        const ifNoneMatch = request.headers.get('If-None-Match');
        if (ifNoneMatch === `"v${feedData.checksum}"`) {
          return new Response(null, {
            status: 304,
            headers: {
              ...corsHeaders,
              ETag: `"v${feedData.checksum}"`,
              'Cache-Control': 'public, max-age=30',
            },
          });
        }

        return new Response(JSON.stringify(feedData), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ETag: `"v${feedData.checksum}"`,
            'Cache-Control': 'public, max-age=30',
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
