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
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = table[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

// KV caching helpers
async function getCache(env: Env, key: string): Promise<any> {
  try {
    return await env.ORCA_MOCK_CACHE.get(key, { type: 'json' });
  } catch (error) {
    console.error('KV get error:', error);
    return null;
  }
}

async function setCache(env: Env, key: string, data: any, ttl: number): Promise<void> {
  try {
    await env.ORCA_MOCK_CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch (error) {
    console.error('KV put error:', error);
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

// Generate trading statistics (20+ metrics)
function generateTradingStats() {
  const totalTrades = 1250;
  const winningTrades = 687;
  const losingTrades = 563;
  const winRate = winningTrades / totalTrades;

  return {
    totalTrades,
    totalOrders: 1300,
    filledOrders: 1250,
    canceledOrders: 50,
    rejectedOrders: 0,
    fillRate: 0.962,
    cancelRate: 0.038,
    limitOrders: 1100,
    marketOrders: 150,
    stopOrders: 50,
    limitOrderPercent: 0.846,
    totalRealizedPnl: 125000,
    totalFunding: -2500,
    totalFees: -1250,
    netPnl: 122250,
    winningTrades,
    losingTrades,
    winRate: 0.55,
    avgWin: 245.56,
    avgLoss: -189.34,
    profitFactor: 1.42,
    fundingPaid: -2500,
    fundingReceived: 0,
    tradingDays: 180,
    avgTradesPerDay: 6.94,
    sharpeRatio: 1.18,
    maxDrawdown: -8500,
    avgHoldTime: 4.2 * 60 * 60 * 1000, // 4.2 hours in ms
    monthlyPnl: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pnl: Math.random() * 20000 - 5000,
      funding: Math.random() * -1000,
      trades: Math.floor(Math.random() * 150 + 50)
    }))
  };
}

// Generate account information
function generateAccountInfo() {
  return {
    exportDate: new Date().toISOString(),
    user: {
      id: 12345,
      username: 'trader_analyst',
      email: 'trader@example.com'
    },
    wallet: {
      walletBalance: 118000, // Updated from 125k to 118k
      marginBalance: 115250,
      availableMargin: 103000,
      unrealisedPnl: 0,
      realisedPnl: 115250
    },
    positions: []
  };
}

// Generate equity curve data
function generateEquityCurve(days: number = 365) {
  const equityCurve = [];
  let balance = 100000;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Simulate realistic daily P&L with some volatility (+1.47 units YTD)
    const dailyReturn = (Math.random() - 0.48) * 0.05; // Slightly positive bias
    balance *= (1 + dailyReturn);

    equityCurve.push({
      date: date.toISOString().split('T')[0],
      balance: Math.round(balance),
      pnl: Math.round(balance - 100000)
    });
  }

  return equityCurve;
}

// Generate position sessions with P&L calculations
function generatePositionSessions(page: number = 1, limit: number = 20) {
  const sessions = [];
  const instruments = ['btc-usd-perp', 'eth-usd-perp', 'presidential-election-winner-2024'];

  // Generate 47 total sessions across instruments
  for (let i = 0; i < 47; i++) {
    const instrument = instruments[i % instruments.length];
    const isLong = Math.random() > 0.5;
    const entryPrice = instrument.includes('btc') ? 65000 + (Math.random() - 0.5) * 10000 :
                     instrument.includes('eth') ? 3500 + (Math.random() - 0.5) * 500 :
                     0.5 + (Math.random() - 0.5) * 0.1;

    const exitPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.1); // ±10% move
    const size = Math.random() * 10000 + 1000;

    const realizedPnl = isLong ?
      (exitPrice - entryPrice) * size :
      (entryPrice - exitPrice) * size;

    const fees = Math.abs(realizedPnl) * 0.0015; // 0.15% fee
    const slippage = Math.abs(realizedPnl) * 0.0002; // 0.02% slippage
    const netPnl = realizedPnl - fees - slippage;

    const openTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    const closeTime = new Date(new Date(openTime).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();

    sessions.push({
      id: `session-${i + 1}`,
      symbol: instrument,
      displaySymbol: instrument,
      side: isLong ? 'long' : 'short',
      openTime,
      closeTime,
      durationMs: new Date(closeTime).getTime() - new Date(openTime).getTime(),
      maxSize: size,
      totalBought: isLong ? size : 0,
      totalSold: isLong ? 0 : size,
      avgEntryPrice: entryPrice,
      avgExitPrice: exitPrice,
      realizedPnl,
      totalFees: fees,
      netPnl,
      tradeCount: Math.floor(Math.random() * 8) + 2,
      trades: [], // Empty for list view
      status: 'closed'
    });
  }

  // Sort by close time (most recent first)
  sessions.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());

  // Pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedSessions = sessions.slice(start, end);

  return {
    sessions: paginatedSessions,
    total: sessions.length,
    page,
    limit
  };
}

// Generate detailed session information
function generateSessionDetails(sessionId: string) {
  const sessionNum = parseInt(sessionId.split('-')[1]) || 1;
  const instrument = ['btc-usd-perp', 'eth-usd-perp', 'presidential-election-winner-2024'][sessionNum % 3];
  const isLong = Math.random() > 0.5;

  // Generate 12 trades on average
  const tradeCount = Math.floor(Math.random() * 8) + 6;
  const trades = [];

  let runningSize = 0;
  let totalBought = 0;
  let totalSold = 0;
  let totalFees = 0;

  for (let i = 0; i < tradeCount; i++) {
    const basePrice = instrument.includes('btc') ? 65000 : instrument.includes('eth') ? 3500 : 0.5;
    const price = basePrice + (Math.random() - 0.5) * basePrice * 0.05;
    const size = Math.random() * 5000 + 500;

    if (i < tradeCount / 2) {
      // Entry trades
      runningSize += size;
      totalBought += size;
    } else {
      // Exit trades
      runningSize -= size;
      totalSold += size;
    }

    const fee = size * price * 0.0015; // 0.15% fee
    totalFees += fee;

    trades.push({
      id: `t${i + 1}`,
      datetime: new Date(Date.now() - (tradeCount - i) * 60 * 60 * 1000).toISOString(),
      side: i < tradeCount / 2 ? (isLong ? 'buy' : 'sell') : (isLong ? 'sell' : 'buy'),
      price,
      amount: size,
      cost: price * size,
      fee: { cost: fee, currency: 'USD' },
      symbol: instrument,
      displaySymbol: instrument,
      orderID: `ord-${i + 1}`,
      execType: 'Trade'
    });
  }

  const avgEntryPrice = trades.filter(t => t.side === (isLong ? 'buy' : 'sell')).reduce((sum, t) => sum + t.price * t.amount, 0) / totalBought;
  const avgExitPrice = trades.filter(t => t.side === (isLong ? 'sell' : 'buy')).reduce((sum, t) => sum + t.price * t.amount, 0) / totalSold;

  const realizedPnl = isLong ?
    (avgExitPrice - avgEntryPrice) * totalSold :
    (avgEntryPrice - avgExitPrice) * totalBought;

  const netPnl = realizedPnl - totalFees;

  return {
    session: {
      id: sessionId,
      symbol: instrument,
      displaySymbol: instrument,
      side: isLong ? 'long' : 'short',
      openTime: trades[0].datetime,
      closeTime: trades[trades.length - 1].datetime,
      durationMs: new Date(trades[trades.length - 1].datetime).getTime() - new Date(trades[0].datetime).getTime(),
      maxSize: Math.max(...trades.map(t => t.amount)),
      totalBought,
      totalSold,
      avgEntryPrice,
      avgExitPrice,
      realizedPnl,
      totalFees,
      netPnl,
      tradeCount,
      trades,
      status: 'closed'
    }
  };
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
              'Content-Type': 'application/json'
            }
          });
        }

        // Temporary simplified response for testing
        const result = {
          candles: [
            {
              time: Math.floor(Date.now() / 1000),
              open: 65000,
              high: 65500,
              low: 64500,
              close: 65200,
              volume: 1000
            }
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
            'Cache-Control': 'public, max-age=300'
          }
        });
      }

      // GET /api/trades - Trading data with multiple types
      if (url.pathname === '/api/trades' && request.method === 'GET') {
        const searchParams = url.searchParams;
        const type = searchParams.get('type') || 'sessions';

        // Temporary simplified response for testing
        let result: any;
        if (type === 'stats') {
          result = {
            stats: {
              totalTrades: 1250,
              winRate: 0.55,
              sharpeRatio: 1.18,
              totalRealizedPnl: 125000
            },
            account: {
              walletBalance: 118000,
              marginBalance: 115250
            }
          };
        } else if (type === 'equity') {
          result = {
            equityCurve: [
              { date: '2024-01-01', balance: 100000, pnl: 0 },
              { date: '2024-12-01', balance: 118000, pnl: 18000 }
            ]
          };
        } else if (type === 'sessions') {
          result = {
            sessions: [
              {
                id: 'session-1',
                symbol: 'btc-usd-perp',
                side: 'long',
                realizedPnl: 2500,
                netPnl: 2475
              }
            ],
            total: 47,
            page: 1,
            limit: 20
          };
        } else {
          result = { error: 'Invalid type' };
        }

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          }
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
