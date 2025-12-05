import { NextResponse } from 'next/server';
import { sportsExchange, SportType } from '@/lib/exchanges/sports_exchange';
import { createPreflightResponse } from '@/lib/security/profiles';

// Bot state with trading activity
const botState = {
  running: false,
  startedAt: null as number | null,
  botId: null as string | null,
  sessionTrades: 0,
  sessionPnL: 0,
  lastTradeTime: null as string | null,
};

// Trading configuration
const tradingConfig = {
  sports: ['basketball'] as SportType[],
  interval: 30000, // 30 seconds for demo
  maxDailyBets: 10,
  stakeSizing: 'fixed' as const,
  baseStake: 100,
  stopLoss: -500,
  takeProfit: 1000,
};

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

export async function GET() {
  const now = Date.now();
  const uptime = botState.startedAt ? Math.floor((now - botState.startedAt) / 1000) : 0;

  // If bot is running, fetch real status from exchange
  if (botState.running && botState.botId) {
    try {
      const realStatus = await sportsExchange.getTradingBotStatus(botState.botId);
      botState.sessionTrades = realStatus.betsPlaced || 0;
      botState.sessionPnL = realStatus.pnl || 0;

      if (realStatus.lastBet) {
        botState.lastTradeTime = new Date().toISOString();
      }
    } catch (error) {
      console.error('Failed to get trading bot status:', error);
      // Reset to safe defaults if exchange fails
      botState.running = false;
      botState.botId = null;
    }
  }

  return NextResponse.json({
    running: botState.running,
    uptime,
    sessionTrades: botState.sessionTrades,
    sessionPnL: botState.sessionPnL,
    lastTrade: botState.lastTradeTime ? botState.lastTradeTime : '-',
  });
}

export async function POST(request: Request) {
  let action: string;
  try {
    const body = await request.json();
    action = body.action;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!action || !['start', 'stop'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "start" or "stop"' },
      { status: 400 }
    );
  }

  if (action === 'start') {
    if (botState.running) {
      return NextResponse.json({ error: 'Bot already running' }, { status: 400 });
    }

    try {
      // Initialize sports exchange if needed
      await sportsExchange.initialize({} as any);

      // Start the actual trading bot
      const botResult = await sportsExchange.runTradingBot(tradingConfig);

      if (botResult.started) {
        botState.running = true;
        botState.botId = botResult.botId;
        botState.startedAt = Date.now();
        botState.sessionTrades = 0;
        botState.sessionPnL = 0;
        botState.lastTradeTime = null;

        return NextResponse.json({
          success: true,
          running: true,
          uptime: 0,
          botId: botResult.botId,
        });
      } else {
        return NextResponse.json({ error: 'Failed to start trading bot' }, { status: 500 });
      }
    } catch (error) {
      console.error('Failed to start trading bot:', error);
      return NextResponse.json({ error: 'Failed to start trading bot' }, { status: 500 });
    }
  } else if (action === 'stop') {
    if (!botState.running) {
      return NextResponse.json({ error: 'Bot not running' }, { status: 400 });
    }
    const finalUptime = botState.startedAt
      ? Math.floor((Date.now() - botState.startedAt) / 1000)
      : 0;
    botState.running = false;
    botState.startedAt = null;
    botState.botId = null;
    botState.sessionTrades = 0;
    botState.sessionPnL = 0;
    botState.lastTradeTime = null;

    return NextResponse.json({
      success: true,
      running: false,
      uptime: finalUptime,
    });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
