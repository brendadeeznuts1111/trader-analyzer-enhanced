import { NextResponse } from 'next/server';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline
const BUN_BACKEND_URL = process.env.BUN_BACKEND_URL || 'http://localhost:8000';

// Map canonical market IDs to symbols for backward compatibility
const MARKET_TO_SYMBOL_MAP: Record<string, string> = {
    'btc-usd-perp': 'BTCUSD',
    'eth-usd-perp': 'ETHUSD',
    'presidential-election-winner-2024': 'PRES24',
    'superbowl-2025': 'SB58',
    'fed-rate-cut-2024': 'FED24'
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const chart = searchParams.get('chart');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol') || 'btc-usd-perp'; // Default to BTC
    const timeframe = (searchParams.get('timeframe') || '1d') as '1h' | '4h' | '1d' | '1w';
    const sessionId = searchParams.get('sessionId');

    try {
        // Chart data - fetch from Bun backend
        if (chart === 'true') {
            const marketId = Object.keys(MARKET_TO_SYMBOL_MAP).find(key =>
                MARKET_TO_SYMBOL_MAP[key] === symbol
            ) || 'btc-usd-perp';

            const response = await fetch(`${BUN_BACKEND_URL}/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=500`);
            if (!response.ok) throw new Error('Failed to fetch OHLCV data');

            const data = await response.json();

            return NextResponse.json({
                candles: data.candles,
                markers: [] // We'll add trade markers later
            });
        }

        // Stats overview - mock for now (would come from user's actual trading data)
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
                    month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    pnl: Math.random() * 20000 - 5000,
                    funding: Math.random() * -1000,
                    trades: Math.floor(Math.random() * 150 + 50)
                }))
            };

            const mockAccount = {
                exportDate: new Date().toISOString(),
                user: {
                    id: 12345,
                    username: 'trader_analyst',
                    email: 'trader@example.com'
                },
                wallet: {
                    walletBalance: 125000,
                    marginBalance: 122250,
                    availableMargin: 110000,
                    unrealisedPnl: 0,
                    realisedPnl: 122250
                },
                positions: []
            };

            return NextResponse.json({ stats: mockStats, account: mockAccount });
        }

        // Equity curve data - mock realistic curve
        if (type === 'equity') {
            const equityCurve = [];
            let balance = 100000;

            for (let i = 365; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);

                // Simulate realistic daily P&L with some volatility
                const dailyReturn = (Math.random() - 0.48) * 0.05; // Slightly positive bias
                balance *= (1 + dailyReturn);

                equityCurve.push({
                    date: date.toISOString().split('T')[0],
                    balance: Math.round(balance),
                    pnl: Math.round(balance - 100000)
                });
            }

            return NextResponse.json({ equityCurve });
        }

        // Funding history - mock data
        if (type === 'funding') {
            const fundingHistory = Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                amount: (Math.random() - 0.5) * 100,
                currency: 'BTC',
                type: Math.random() > 0.5 ? 'paid' : 'received'
            }));

            return NextResponse.json({ fundingHistory });
        }

        // Position Sessions - fetch from Bun backend and adapt to dashboard format
        if (type === 'sessions') {
            const marketId = Object.keys(MARKET_TO_SYMBOL_MAP).find(key =>
                MARKET_TO_SYMBOL_MAP[key] === symbol
            ) || 'btc-usd-perp';

            const response = await fetch(`${BUN_BACKEND_URL}/markets/${marketId}/trades?limit=1000`);
            if (!response.ok) throw new Error('Failed to fetch trades');

            const data = await response.json();

            // Group trades into position sessions (simplified logic)
            const sessions = [];
            let currentSession = null;
            let sessionId = 1;

            for (const trade of data.trades) {
                if (!currentSession || (currentSession.side === 'long' && trade.side === 'sell') ||
                    (currentSession.side === 'short' && trade.side === 'buy')) {

                    if (currentSession) {
                        // Close previous session
                        currentSession.closeTime = trade.timestamp;
                        currentSession.durationMs = new Date(trade.timestamp).getTime() - new Date(currentSession.openTime).getTime();
                        sessions.push(currentSession);
                    }

                    // Start new session
                    currentSession = {
                        id: `session-${sessionId++}`,
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
                        totalFees: trade.size * trade.price * 0.001, // 0.1% fee
                        netPnl: 0,
                        tradeCount: 1,
                        trades: [trade],
                        status: 'open'
                    };
                } else {
                    // Add to current session
                    currentSession.trades.push(trade);
                    currentSession.tradeCount++;
                    currentSession.maxSize = Math.max(currentSession.maxSize, currentSession.maxSize + trade.size);

                    if (trade.side === 'buy') {
                        currentSession.totalBought += trade.size;
                        currentSession.avgEntryPrice = (currentSession.avgEntryPrice * (currentSession.totalBought - trade.size) + trade.price * trade.size) / currentSession.totalBought;
                    } else {
                        currentSession.totalSold += trade.size;
                        currentSession.avgExitPrice = (currentSession.avgExitPrice * (currentSession.totalSold - trade.size) + trade.price * trade.size) / currentSession.totalSold;
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
                        session.realizedPnl = (session.avgExitPrice - session.avgEntryPrice) * session.totalSold;
                    } else {
                        session.realizedPnl = (session.avgEntryPrice - session.avgExitPrice) * session.totalBought;
                    }
                    session.netPnl = session.realizedPnl - session.totalFees;
                    session.status = 'closed';
                }
            });

            // Filter by symbol if specified
            let filteredSessions = sessions;
            if (symbol && symbol !== 'btc-usd-perp') {
                filteredSessions = sessions.filter(s => s.symbol === symbol);
            }

            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedSessions = filteredSessions.slice(start, end);

            // Don't send full trade arrays for list view
            const lightSessions = paginatedSessions.map(s => ({
                ...s,
                trades: []
            }));

            return NextResponse.json({
                sessions: lightSessions,
                total: filteredSessions.length,
                page,
                limit
            });
        }

        // Get specific session with full trade details
        if (sessionId) {
            // For now, return mock session - in production, you'd store sessions
            const mockSession = {
                id: sessionId,
                symbol: symbol || 'BTCUSD',
                displaySymbol: symbol || 'BTCUSD',
                side: 'long',
                openTime: '2024-01-15T09:30:00Z',
                closeTime: '2024-01-15T16:45:00Z',
                durationMs: 7 * 60 * 60 * 1000, // 7 hours
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
                        execType: 'Trade'
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
                        execType: 'Trade'
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
                        execType: 'Trade'
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
                        execType: 'Trade'
                    }
                ],
                status: 'closed'
            };

            return NextResponse.json({ session: mockSession });
        }

        // Default: Trade list - fetch from Bun backend
        const marketId = Object.keys(MARKET_TO_SYMBOL_MAP).find(key =>
            MARKET_TO_SYMBOL_MAP[key] === symbol
        ) || 'btc-usd-perp';

        const response = await fetch(`${BUN_BACKEND_URL}/markets/${marketId}/trades?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch trades');

        const data = await response.json();

        // Adapt Bun trades to dashboard format
        const trades = data.trades.map((trade: any) => ({
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
            execType: 'Trade'
        }));

        return NextResponse.json({
            trades,
            total: data.total || trades.length,
            page,
            limit
        });

    } catch (error) {
        console.error("API Route Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            error: 'Failed to load data',
            details: errorMessage
        }, { status: 500 });
    }
}