/**
 * Cloudflare Worker - Markets API with WebSocket DO
 */

interface Env {
  ORCA_MOCK_CACHE: any;
  ORCA_FEED_HUB: any;
}

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

const CANONICAL_MARKETS = [
  {
    id: 'btc-usd-perp',
    displayName: 'BTC/USD Perpetual',
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
    ],
  },
];

export class FeedHub {
  state: any;
  clients: Map<any, { key: string; lastSeen: number; subscribed: boolean }>;

  constructor(state: any) {
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
      const webSocketPair = new (globalThis as any).WebSocketPair();
      const client = webSocketPair[0];
      const server = webSocketPair[1];

      (server as any).accept();

      this.clients.set(server, {
        key,
        lastSeen: Date.now(),
        subscribed: true,
      });

      (server as any).send(
        JSON.stringify({
          type: 'subscribed',
          key,
          timestamp: Date.now(),
          message: 'Connected to ORCA Feed Hub',
        })
      );

      (server as any).addEventListener('message', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            (server as any).send(
              JSON.stringify({
                type: 'pong',
                timestamp: Date.now(),
              })
            );
          }
        } catch (error) {
          console.error('WS message error:', error);
        }
      });

      (server as any).addEventListener('close', () => {
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as any);
    }

    return new Response('Not found', { status: 404 });
  }

  async broadcastDelta(delta: any) {
    const message = JSON.stringify({
      type: 'delta',
      changes: delta.changes || [],
      checksum: crc32(JSON.stringify(delta)),
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const [ws, client] of this.clients) {
      if (client.subscribed) {
        try {
          (ws as any).send(message);
          sent++;
        } catch (error) {
          this.clients.delete(ws);
        }
      }
    }
    return sent;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // WebSocket upgrade (simplified for now)
      if (url.pathname === '/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const key = url.searchParams.get('key') || 'anonymous';

        try {
          const webSocketPair = new (globalThis as any).WebSocketPair();
          const client = webSocketPair[0];
          const server = webSocketPair[1];

          (server as any).accept();

          (server as any).send(
            JSON.stringify({
              type: 'subscribed',
              key,
              timestamp: Date.now(),
              message: 'Connected to ORCA Feed Hub',
            })
          );

          (server as any).addEventListener('message', (event: any) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'ping') {
                (server as any).send(
                  JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now(),
                  })
                );
              }
            } catch (error) {
              console.error('WS message error:', error);
            }
          });

          (server as any).addEventListener('close', () => {
            console.log('WebSocket closed');
          });

          return new Response(null, {
            status: 101,
            webSocket: client,
          } as any);
        } catch (error) {
          console.error('WebSocket upgrade error:', error);
          return new Response(
            JSON.stringify({
              error: 'WebSocket upgrade failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Simulate delta broadcast (for testing)
      if (url.pathname === '/broadcast' && request.method === 'POST') {
        try {
          const delta = await request.json();
          // In a real implementation, this would call the DO's broadcastDelta method
          console.log('Broadcasting delta:', delta);
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Delta broadcasted',
              timestamp: Date.now(),
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Invalid delta format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ETag polling fallback
      if (url.pathname === '/v1/feed' && request.method === 'GET') {
        const feedData = {
          type: 'feed',
          key: url.searchParams.get('key') || 'anonymous',
          timestamp: Date.now(),
          data: { markets: CANONICAL_MARKETS.slice(0, 5) },
          checksum: crc32(JSON.stringify(CANONICAL_MARKETS.slice(0, 5))),
        };

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

      // Markets endpoints
      if (url.pathname === '/api/markets' && request.method === 'GET') {
        const marketsData = { markets: CANONICAL_MARKETS, total: CANONICAL_MARKETS.length };
        const checksum = crc32(JSON.stringify(marketsData));
        const etag = `"v${checksum}"`;

        const ifNoneMatch = request.headers.get('If-None-Match');
        if (ifNoneMatch === etag) {
          return new Response(null, {
            status: 304,
            headers: { ...corsHeaders, ETag: etag, 'Cache-Control': 'public, max-age=300' },
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

      // Individual market
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      // OHLCV endpoint
      if (url.pathname.match(/^\/api\/markets\/[^\/]+\/ohlcv$/) && request.method === 'GET') {
        const marketId = url.pathname.split('/')[3];
        const market = CANONICAL_MARKETS.find(m => m.id === marketId);

        if (!market) {
          return new Response(JSON.stringify({ error: 'Market not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const result = {
          candles: [
            { time: Date.now(), open: 65000, high: 65500, low: 64500, close: 65200, volume: 1000 },
          ],
          marketId,
          timeframe: '1d',
          count: 1,
          totalAvailable: 1,
          limited: false,
          range: { start: new Date().toISOString(), end: new Date().toISOString() },
        };

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // Trades endpoint
      if (url.pathname === '/api/trades' && request.method === 'GET') {
        const type = url.searchParams.get('type') || 'sessions';

        let result: any;
        if (type === 'stats') {
          result = {
            stats: {
              totalTrades: 1250,
              winRate: 0.55,
              sharpeRatio: 1.18,
              totalRealizedPnl: 125000,
            },
            account: { walletBalance: 118000, marginBalance: 115250 },
          };
        } else if (type === 'equity') {
          result = { equityCurve: [{ date: '2024-01-01', balance: 100000, pnl: 0 }] };
        } else if (type === 'sessions') {
          result = {
            sessions: [
              { id: 'session-1', symbol: 'btc-usd-perp', side: 'long', realizedPnl: 2500 },
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

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
