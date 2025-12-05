/**
 * Trades API Routes
 * Comprehensive trading data endpoints for charts, statistics, sessions, and trade history
 *
 * GET /api/trades - Main trading data endpoint with multiple data types
 *
 * Query Parameters:
 * - chart=true: Returns OHLCV candle data for charting
 * - type=stats: Returns trading statistics and performance metrics
 * - type=equity: Returns equity curve data
 * - type=funding: Returns funding payment history
 * - type=sessions: Returns position sessions grouped by trades
 * - sessionId=<id>: Returns detailed trade data for a specific session
 * - symbol=<symbol>: Filter by trading symbol (default: btc-usd-perp)
 * - timeframe=<1h|4h|1d|1w>: Chart timeframe (default: 1d)
 * - page=<number>: Pagination page number (default: 1)
 * - limit=<number>: Results per page (default: 50)
 */

import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';
import { createPreflightResponse } from '@/lib/security/profiles';

// CORS preflight handler
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline

// Map canonical market IDs to symbols for backward compatibility
const MARKET_TO_SYMBOL_MAP: Record<string, string> = {
  'btc-usd-perp': 'BTCUSD',
  'eth-usd-perp': 'ETHUSD',
  'presidential-election-winner-2024': 'PRES24',
  'superbowl-2025': 'SB58',
  'fed-rate-cut-2024': 'FED24',
};

/**
 * GET /api/trades
 * Main trading data endpoint supporting multiple data types and formats
 *
 * Supports chart data, trading statistics, equity curves, funding history,
 * position sessions, and individual trade records.
 *
 * @param request - The incoming HTTP request with query parameters
 * @returns Response with requested trading data or error response
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const chart = searchParams.get('chart');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const symbol = searchParams.get('symbol') || 'btc-usd-perp';
  const timeframe = (searchParams.get('timeframe') || '1d') as '1h' | '4h' | '1d' | '1w';
  const sessionId = searchParams.get('sessionId');

  try {
    // Chart data - fetch from Bun backend
    if (chart === 'true') {
      const marketId =
        Object.keys(MARKET_TO_SYMBOL_MAP).find(key => MARKET_TO_SYMBOL_MAP[key] === symbol) ||
        'btc-usd-perp';

      let candles: any[] = [];

      try {
        const response = await fetch(
          `${API_CONFIG.backendUrl}/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=500`
        );
        if (response.ok) {
          const data = await response.json();
          candles = data.candles || [];
        }
      } catch {
        // Backend not available
      }

      // Mock candles if backend unavailable
      if (candles.length === 0) {
        const basePrice = symbol.includes('ETH') ? 3500 : 95000;
        const now = Date.now();
        const intervalMs =
          timeframe === '1h'
            ? 3600000
            : timeframe === '4h'
              ? 14400000
              : timeframe === '1w'
                ? 604800000
                : 86400000;

        candles = Array.from({ length: 100 }, (_, i) => {
          const time = Math.floor((now - (100 - i) * intervalMs) / 1000);
          const open = basePrice + (Math.random() - 0.5) * basePrice * 0.1;
          const close = open + (Math.random() - 0.5) * basePrice * 0.02;
          const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
          const low = Math.min(open, close) - Math.random() * basePrice * 0.01;
          return { time, open, high, low, close };
        });
      }

      const result = {
        candles,
        markers: [],
      };

      const headers = buildApiHeaders({
        cache: 'short',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'chart',
          'X-Market-Id': marketId,
          'X-Timeframe': timeframe,
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Stats overview - mock for now
    if (type === 'stats') {
      const mockStats = {
        totalTrades: 1250,
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
        winningTrades: 687,
        losingTrades: 563,
        winRate: 0.55,
        avgWin: 245.56,
        avgLoss: -189.34,
        profitFactor: 1.42,
        fundingPaid: -2500,
        fundingReceived: 0,
        tradingDays: 180,
        avgTradesPerDay: 6.94,
        monthlyPnl: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          pnl: Math.random() * 20000 - 5000,
          funding: Math.random() * -1000,
          trades: Math.floor(Math.random() * 150 + 50),
        })),
      };

      const mockAccount = {
        exportDate: new Date().toISOString(),
        user: {
          id: 12345,
          username: 'trader_analyst',
          email: 'trader@example.com',
        },
        wallet: {
          walletBalance: 125000,
          marginBalance: 122250,
          availableMargin: 110000,
          unrealisedPnl: 0,
          realisedPnl: 122250,
        },
        positions: [],
      };

      const result = { stats: mockStats, account: mockAccount };

      const headers = buildApiHeaders({
        cache: 'short',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'stats',
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Equity curve data
    if (type === 'equity') {
      const equityCurve = [];
      let balance = 100000;

      for (let i = 365; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dailyReturn = (Math.random() - 0.48) * 0.05;
        balance *= 1 + dailyReturn;

        equityCurve.push({
          date: date.toISOString().split('T')[0],
          balance: Math.round(balance),
          pnl: Math.round(balance - 100000),
        });
      }

      const result = { equityCurve };

      const headers = buildApiHeaders({
        cache: 'short',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'equity',
          'X-Data-Points': String(equityCurve.length),
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Funding history
    if (type === 'funding') {
      const fundingHistory = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: (Math.random() - 0.5) * 100,
        currency: 'BTC',
        type: Math.random() > 0.5 ? 'paid' : 'received',
      }));

      const result = { fundingHistory };

      const headers = buildApiHeaders({
        cache: 'short',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'funding',
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Position Sessions
    if (type === 'sessions') {
      const marketId =
        Object.keys(MARKET_TO_SYMBOL_MAP).find(key => MARKET_TO_SYMBOL_MAP[key] === symbol) ||
        'btc-usd-perp';

      let rawTrades: any[] = [];

      try {
        const response = await fetch(
          `${API_CONFIG.backendUrl}/markets/${marketId}/trades?limit=1000`
        );
        if (response.ok) {
          const data = await response.json();
          rawTrades = data.trades || [];
        }
      } catch {
        // Backend not available
      }

      // Mock trades if backend unavailable
      if (rawTrades.length === 0) {
        const basePrice = 95000;
        rawTrades = Array.from({ length: 50 }, (_, i) => ({
          id: `mock-${i}`,
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          side: i % 3 === 0 ? 'sell' : 'buy',
          price: basePrice + (Math.random() - 0.5) * 2000,
          size: Math.floor(Math.random() * 5000) + 500,
        }));
      }

      const data = { trades: rawTrades };

      // Group trades into position sessions
      const sessions: any[] = [];
      let currentSession: any = null;
      let sessionIdCounter = 1;

      for (const trade of data.trades) {
        if (
          !currentSession ||
          (currentSession.side === 'long' && trade.side === 'sell') ||
          (currentSession.side === 'short' && trade.side === 'buy')
        ) {
          if (currentSession) {
            currentSession.closeTime = trade.timestamp;
            currentSession.durationMs =
              new Date(trade.timestamp).getTime() - new Date(currentSession.openTime).getTime();
            sessions.push(currentSession);
          }

          currentSession = {
            id: `session-${sessionIdCounter++}`,
            symbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
            displaySymbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
            side: trade.side === 'buy' ? 'long' : 'short',
            openTime: trade.timestamp,
            closeTime: null,
            durationMs: 0,
            maxSize: trade.size,
            totalBought: trade.side === 'buy' ? trade.size : 0,
            totalSold: trade.side === 'sell' ? trade.size : 0,
            avgEntryPrice: trade.price,
            avgExitPrice: 0,
            realizedPnl: 0,
            totalFees: trade.size * trade.price * 0.001,
            netPnl: 0,
            tradeCount: 1,
            trades: [trade],
            status: 'open',
          };
        } else {
          currentSession.trades.push(trade);
          currentSession.tradeCount++;
          currentSession.maxSize = Math.max(
            currentSession.maxSize,
            currentSession.maxSize + trade.size
          );

          if (trade.side === 'buy') {
            currentSession.totalBought += trade.size;
            currentSession.avgEntryPrice =
              (currentSession.avgEntryPrice * (currentSession.totalBought - trade.size) +
                trade.price * trade.size) /
              currentSession.totalBought;
          } else {
            currentSession.totalSold += trade.size;
            currentSession.avgExitPrice =
              (currentSession.avgExitPrice * (currentSession.totalSold - trade.size) +
                trade.price * trade.size) /
              currentSession.totalSold;
          }

          currentSession.totalFees += trade.size * trade.price * 0.001;
        }
      }

      if (currentSession) {
        sessions.push(currentSession);
      }

      // Calculate P&L for closed sessions
      sessions.forEach(session => {
        if (session.closeTime) {
          if (session.side === 'long') {
            session.realizedPnl =
              (session.avgExitPrice - session.avgEntryPrice) * session.totalSold;
          } else {
            session.realizedPnl =
              (session.avgEntryPrice - session.avgExitPrice) * session.totalBought;
          }
          session.netPnl = session.realizedPnl - session.totalFees;
          session.status = 'closed';
        }
      });

      let filteredSessions = sessions;
      if (symbol && symbol !== 'btc-usd-perp') {
        filteredSessions = sessions.filter(s => s.symbol === symbol);
      }

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedSessions = filteredSessions.slice(start, end);

      const lightSessions = paginatedSessions.map(s => ({
        ...s,
        trades: [],
      }));

      const result = {
        sessions: lightSessions,
        total: filteredSessions.length,
        page,
        limit,
      };

      const headers = buildApiHeaders({
        cache: 'short',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'sessions',
          'X-Total-Sessions': String(filteredSessions.length),
          'X-Page': String(page),
          'X-Limit': String(limit),
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Get specific session with full trade details
    if (sessionId) {
      const mockSession = {
        id: sessionId,
        symbol: symbol || 'BTCUSD',
        displaySymbol: symbol || 'BTCUSD',
        side: 'long',
        openTime: '2024-01-15T09:30:00Z',
        closeTime: '2024-01-15T16:45:00Z',
        durationMs: 7 * 60 * 60 * 1000,
        maxSize: 50000,
        totalBought: 50000,
        totalSold: 50000,
        avgEntryPrice: 45000,
        avgExitPrice: 47000,
        realizedPnl: 100000,
        totalFees: 1000,
        netPnl: 99000,
        tradeCount: 4,
        trades: [
          {
            id: 't1',
            datetime: '2024-01-15T09:30:00Z',
            side: 'buy',
            price: 45000,
            amount: 20000,
            cost: 900000,
            fee: { cost: 900, currency: 'USD' },
            symbol: symbol || 'BTCUSD',
            displaySymbol: symbol || 'BTCUSD',
            orderID: 'ord-1',
            execType: 'Trade',
          },
          {
            id: 't2',
            datetime: '2024-01-15T10:15:00Z',
            side: 'buy',
            price: 45200,
            amount: 15000,
            cost: 678000,
            fee: { cost: 678, currency: 'USD' },
            symbol: symbol || 'BTCUSD',
            displaySymbol: symbol || 'BTCUSD',
            orderID: 'ord-2',
            execType: 'Trade',
          },
          {
            id: 't3',
            datetime: '2024-01-15T14:30:00Z',
            side: 'sell',
            price: 46800,
            amount: 20000,
            cost: 936000,
            fee: { cost: 936, currency: 'USD' },
            symbol: symbol || 'BTCUSD',
            displaySymbol: symbol || 'BTCUSD',
            orderID: 'ord-3',
            execType: 'Trade',
          },
          {
            id: 't4',
            datetime: '2024-01-15T16:45:00Z',
            side: 'sell',
            price: 47200,
            amount: 15000,
            cost: 708000,
            fee: { cost: 708, currency: 'USD' },
            symbol: symbol || 'BTCUSD',
            displaySymbol: symbol || 'BTCUSD',
            orderID: 'ord-4',
            execType: 'Trade',
          },
        ],
        status: 'closed',
      };

      const result = { session: mockSession };

      const headers = buildApiHeaders({
        cache: 'medium',
        request,
        responseTime: Date.now() - startTime,
        etagContent: result,
        custom: {
          'X-Data-Type': 'session-detail',
          'X-Session-Id': sessionId,
        },
      });

      return NextResponse.json(result, {
        headers: headersToObject(headers),
      });
    }

    // Default: Trade list
    const marketId =
      Object.keys(MARKET_TO_SYMBOL_MAP).find(key => MARKET_TO_SYMBOL_MAP[key] === symbol) ||
      'btc-usd-perp';

    let trades: any[] = [];
    let total = 0;

    try {
      const response = await fetch(
        `${API_CONFIG.backendUrl}/markets/${marketId}/trades?limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        trades = data.trades.map((trade: any) => ({
          id: trade.id,
          datetime: trade.timestamp,
          symbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
          displaySymbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
          side: trade.side,
          price: trade.price,
          amount: trade.size,
          cost: trade.price * trade.size,
          fee: { cost: trade.price * trade.size * 0.001, currency: 'USD' },
          orderID: `order-${trade.id}`,
          execType: 'Trade',
        }));
        total = data.total || trades.length;
      }
    } catch {
      // Backend not available, use mock data
    }

    // Fallback to mock trades if backend unavailable
    if (trades.length === 0) {
      const basePrice = symbol.includes('ETH') ? 3500 : 95000;
      trades = Array.from({ length: Math.min(limit, 100) }, (_, i) => {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
        const amount = Math.floor(Math.random() * 10000) + 100;
        const timestamp = new Date(Date.now() - i * 60000 * Math.random() * 60);
        return {
          id: `mock-${i}-${Date.now()}`,
          datetime: timestamp.toISOString(),
          symbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
          displaySymbol: MARKET_TO_SYMBOL_MAP[marketId] || symbol,
          side,
          price,
          amount,
          cost: price * amount,
          fee: { cost: price * amount * 0.001, currency: 'USD' },
          orderID: `order-mock-${i}`,
          execType: 'Trade',
        };
      });
      total = trades.length;
    }

    const result = {
      trades,
      total,
      page,
      limit,
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: result,
      custom: {
        'X-Data-Type': 'trades',
        'X-Total-Trades': String(result.total),
        'X-Page': String(page),
        'X-Limit': String(limit),
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('API Route Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to load data',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
