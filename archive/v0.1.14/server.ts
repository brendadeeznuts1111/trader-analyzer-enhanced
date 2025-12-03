// server.ts - EdgeTerminal Unified Trading Intelligence Backend
import { serve } from "bun";

// In-memory data stores (in production, use Redis/PostgreSQL)
const markets = new Map<string, any>();
const orderbooks = new Map<string, any>();
const recentTrades = new Map<string, any[]>();
const clients = new Set<WebSocket>();

// Canonical market definitions
const CANONICAL_MARKETS = [
  {
    id: "presidential-election-winner-2024",
    displayName: "2024 US Presidential Election Winner",
    category: "politics",
    status: "active",
    resolutionDate: "2024-11-05T00:00:00Z",
    description: "Who will win the 2024 US Presidential Election?",
    tags: ["politics", "election", "us", "president"],
    sources: [
      {
        exchange: "polymarket",
        symbol: "PRES24-WINNER",
        marketId: "0x1234567890abcdef",
        status: "active",
        lastUpdate: new Date().toISOString()
      },
      {
        exchange: "kalishi",
        symbol: "US-PRES-2024",
        marketId: "kalishi-pres-2024",
        status: "active",
        lastUpdate: new Date().toISOString()
      }
    ]
  },
  {
    id: "btc-usd-perp",
    displayName: "BTC/USD Perpetual Futures",
    category: "crypto",
    status: "active",
    description: "Bitcoin perpetual futures contract",
    tags: ["crypto", "bitcoin", "futures", "perp"],
    sources: [
      {
        exchange: "binance",
        symbol: "BTCUSDT",
        marketId: "BTCUSDT",
        status: "active",
        lastUpdate: new Date().toISOString()
      },
      {
        exchange: "bitmex",
        symbol: "XBTUSD",
        marketId: "XBTUSD",
        status: "active",
        lastUpdate: new Date().toISOString()
      }
    ]
  },
  {
    id: "eth-usd-perp",
    displayName: "ETH/USD Perpetual Futures",
    category: "crypto",
    status: "active",
    description: "Ethereum perpetual futures contract",
    tags: ["crypto", "ethereum", "futures", "perp"],
    sources: [
      {
        exchange: "binance",
        symbol: "ETHUSDT",
        marketId: "ETHUSDT",
        status: "active",
        lastUpdate: new Date().toISOString()
      }
    ]
  },
  {
    id: "superbowl-2025",
    displayName: "Super Bowl LVIII Winner",
    category: "sports",
    status: "active",
    resolutionDate: "2025-02-09T00:00:00Z",
    description: "Which team will win Super Bowl LVIII?",
    tags: ["sports", "football", "nfl", "superbowl"],
    sources: [
      {
        exchange: "polymarket",
        symbol: "SB58-WINNER",
        marketId: "0xabcdef1234567890",
        status: "active",
        lastUpdate: new Date().toISOString()
      }
    ]
  },
  {
    id: "fed-rate-cut-2024",
    displayName: "Fed Rate Cut in 2024?",
    category: "prediction",
    status: "active",
    resolutionDate: "2024-12-31T00:00:00Z",
    description: "Will the Federal Reserve cut interest rates in 2024?",
    tags: ["economics", "fed", "rates", "policy"],
    sources: [
      {
        exchange: "polymarket",
        symbol: "FED-CUT-2024",
        marketId: "0xfedcba0987654321",
        status: "active",
        lastUpdate: new Date().toISOString()
      }
    ]
  }
];

// Generate mock orderbook data
function generateMockOrderbook(marketId: string) {
  const basePrice = marketId.includes('btc') ? 65000 : marketId.includes('eth') ? 3500 : 0.5;
  const spread = basePrice * 0.001; // 0.1% spread

  const bids: [number, number][] = [];
  const asks: [number, number][] = [];

  // Generate 10 levels of bids and asks
  for (let i = 0; i < 10; i++) {
    const bidPrice = basePrice - (i + 1) * spread / 10;
    const askPrice = basePrice + (i + 1) * spread / 10;
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
    sources: CANONICAL_MARKETS.find(m => m.id === marketId)?.sources.map(source => ({
      exchange: source.exchange,
      bids: bids.slice(0, 5), // Each exchange has partial depth
      asks: asks.slice(0, 5),
      lastUpdate: new Date().toISOString()
    })) || []
  };
}

// Generate mock trades
function generateMockTrades(marketId: string): any[] {
  const trades = [];
  const basePrice = marketId.includes('btc') ? 65000 : marketId.includes('eth') ? 3500 : 0.5;

  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(Date.now() - i * 60000).toISOString(); // Last 50 minutes
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = basePrice + (Math.random() - 0.5) * basePrice * 0.01; // ±1% variation
    const size = Math.random() * 5 + 0.1;

    trades.push({
      id: `${marketId}-${i}`,
      marketId,
      timestamp,
      side,
      price,
      size,
      exchange: CANONICAL_MARKETS.find(m => m.id === marketId)?.sources[Math.floor(Math.random() * CANONICAL_MARKETS.find(m => m.id === marketId)!.sources.length)]?.exchange || 'unknown',
      taker: Math.random() > 0.3 // 70% taker trades
    });
  }

  return trades;
}

// Initialize data
CANONICAL_MARKETS.forEach(market => {
  markets.set(market.id, market);
  orderbooks.set(market.id, generateMockOrderbook(market.id));
  recentTrades.set(market.id, generateMockTrades(market.id));
});

// Simulate live data updates
setInterval(() => {
  for (const market of CANONICAL_MARKETS) {
    orderbooks.set(market.id, generateMockOrderbook(market.id));
    recentTrades.set(market.id, generateMockTrades(market.id));
  }

  // Broadcast updates to SSE clients
  const stats = {
    markets: markets.size,
    exchanges: 4,
    messagesPerSec: Math.random() * 100 + 50,
    lastUpdate: new Date(),
    uptime: Math.floor(process.uptime()),
    memoryUsage: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
    activeConnections: clients.size
  };

  // Send to all SSE clients
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(stats));
    }
  }
}, 1000); // Update every second

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main server
serve({
  port: 8000,
  hostname: '0.0.0.0',

  async fetch(req) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }, { headers: corsHeaders });
    }

    // Get all markets
    if (url.pathname === '/markets' && req.method === 'GET') {
      return Response.json({
        markets: Array.from(markets.values()),
        total: markets.size
      }, { headers: corsHeaders });
    }

    // Get specific market
    if (url.pathname.startsWith('/markets/') && req.method === 'GET') {
      const marketId = url.pathname.split('/')[2];
      const market = markets.get(marketId);

      if (!market) {
        return Response.json({ error: 'Market not found' }, {
          status: 404,
          headers: corsHeaders
        });
      }

      return Response.json(market, { headers: corsHeaders });
    }

    // Get orderbook for market
    if (url.pathname.startsWith('/markets/') && url.pathname.endsWith('/orderbook') && req.method === 'GET') {
      const marketId = url.pathname.split('/')[2];
      const orderbook = orderbooks.get(marketId) || generateMockOrderbook(marketId);

      return Response.json(orderbook, { headers: corsHeaders });
    }

    // Get recent trades for market
    if (url.pathname.startsWith('/markets/') && url.pathname.endsWith('/trades') && req.method === 'GET') {
      const marketId = url.pathname.split('/')[2];
      const trades = recentTrades.get(marketId) || generateMockTrades(marketId);
      const limit = parseInt(url.searchParams.get('limit') || '100');

      return Response.json({
        trades: trades.slice(0, limit),
        total: trades.length
      }, { headers: corsHeaders });
    }

    // Get OHLCV data for market
    if (url.pathname.startsWith('/markets/') && url.pathname.endsWith('/ohlcv') && req.method === 'GET') {
      const marketId = url.pathname.split('/')[2];
      const timeframe = url.searchParams.get('timeframe') || '1m';
      const limit = parseInt(url.searchParams.get('limit') || '100');

      // Generate mock OHLCV data
      const candles = [];
      const basePrice = marketId.includes('btc') ? 65000 : marketId.includes('eth') ? 3500 : 0.5;

      for (let i = limit - 1; i >= 0; i--) {
        const timestamp = Math.floor(Date.now() / 1000) - i * 60; // 1-minute candles
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
          volume: Math.round(volume * 100) / 100
        });
      }

      return Response.json({
        candles,
        marketId,
        timeframe
      }, { headers: corsHeaders });
    }

    // SSE endpoint for real-time pipeline stats
    if (url.pathname === '/events') {
      const response = new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      // Create SSE stream
      const stream = new ReadableStream({
        start(controller) {
          const client = {
            readyState: 1, // OPEN
            send: (data: string) => {
              controller.enqueue(`data: ${data}\n\n`);
            }
          };

          clients.add(client as any);

          // Send initial stats
          const stats = {
            markets: markets.size,
            exchanges: 4,
            messagesPerSec: Math.random() * 100 + 50,
            lastUpdate: new Date(),
            uptime: Math.floor(process.uptime()),
            memoryUsage: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
            activeConnections: clients.size
          };

          client.send(JSON.stringify(stats));

          // Clean up on disconnect
          req.signal.addEventListener('abort', () => {
            clients.delete(client as any);
            controller.close();
          });
        },
      });

      return new Response(stream);
    }

    // Pipeline stats (REST fallback)
    if (url.pathname === '/pipeline/stats' && req.method === 'GET') {
      const stats = {
        markets: markets.size,
        exchanges: 4,
        messagesPerSec: Math.random() * 100 + 50,
        lastUpdate: new Date(),
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        activeConnections: clients.size
      };

      return Response.json(stats, { headers: corsHeaders });
    }

    return Response.json({ error: 'Not found' }, {
      status: 404,
      headers: corsHeaders
    });
  },

  error(error) {
    console.error('Server error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

console.log('🚀 EdgeTerminal Unified Trading Intelligence Platform running on http://localhost:8000');
console.log(`📊 Serving ${markets.size} canonical markets across 4 exchanges`);
console.log('📡 SSE endpoint: http://localhost:8000/events');
console.log('🔗 REST API: http://localhost:8000/markets, /pipeline/stats');