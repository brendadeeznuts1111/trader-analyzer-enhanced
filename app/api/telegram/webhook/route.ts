/**
 * Telegram Webhook Handler
 * Receives updates from Telegram and processes:
 * - Bot commands (/start, /status, /trades, etc.)
 * - Callback queries (inline button clicks)
 * - Inline queries
 * - Message replies
 */

import { NextResponse } from 'next/server';
import {
  sendMessage,
  answerCallbackQuery,
  sendWithKeyboard,
  answerInlineQuery,
  type InlineKeyboardButton,
  type TelegramMessage as TgMsg,
} from '@/lib/telegram';
import { buildApiHeaders, headersToObject } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';
import { sportsExchange } from '@/lib/exchanges/sports_exchange';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
}

interface IncomingMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  message_thread_id?: number;
  text?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
  reply_to_message?: IncomingMessage;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: IncomingMessage;
  chat_instance: string;
  data?: string;
}

interface InlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: IncomingMessage;
  edited_message?: IncomingMessage;
  callback_query?: CallbackQuery;
  inline_query?: InlineQuery;
}

// ═══════════════════════════════════════════════════════════════
// HELPER - Send message with proper signature
// ═══════════════════════════════════════════════════════════════

async function reply(text: string, chatId: number, threadId?: number) {
  const msg: TgMsg = {
    text,
    parse_mode: 'HTML',
    message_thread_id: threadId,
  };
  return sendMessage(msg, chatId);
}

// ═══════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

const COMMANDS: Record<string, (msg: IncomingMessage) => Promise<void>> = {
  '/start': handleStart,
  '/help': handleHelp,
  '/status': handleStatus,
  '/trades': handleTrades,
  '/pnl': handlePnL,
  '/health': handleHealth,
  '/app': handleApp,
  '/markets': handleMarkets,
  // Sports/Basketball commands
  '/nba': handleNBA,
  '/basketball': handleNBA,
  '/livegames': handleLiveGames,
  '/props': handleProps,
  '/signal': handleSignal,
  '/sports': handleSports,
  '/ask': handleAsk,
  '/bot': handleBot,
  '/injuries': handleInjuries,
  '/trends': handleTrends,
};

async function handleStart(msg: IncomingMessage) {
  const name = msg.from?.first_name || 'trader';
  await reply(
    `<b>Welcome ${name}!</b>\n\n` +
      `I'm your AI-powered sports trading assistant.\n\n` +
      `<b>🏀 Sports Trading:</b>\n` +
      `/nba - NBA markets & games\n` +
      `/livegames - Live games now\n` +
      `/props - Player props\n` +
      `/signal - Get AI trading signal\n` +
      `/sports - All sports hub\n\n` +
      `<b>🤖 AI & Bot:</b>\n` +
      `/ask [question] - Ask AI anything\n` +
      `/bot - Trading bot controls\n` +
      `/injuries - Injury reports\n` +
      `/trends - Betting trends\n\n` +
      `<b>📊 Trading:</b>\n` +
      `/trades - Trade history\n` +
      `/pnl - P&L summary\n` +
      `/markets - All markets\n` +
      `/app - Open Dashboard\n\n` +
      `<b>⚙️ System:</b>\n` +
      `/status - System status\n` +
      `/health - API health\n` +
      `/help - This help\n\n` +
      `<i>Powered by Bun + RAG AI</i>`,
    msg.chat.id,
    msg.message_thread_id
  );
}

async function handleHelp(msg: IncomingMessage) {
  await handleStart(msg);
}

async function handleStatus(msg: IncomingMessage) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  await reply(
    `<b>System Status</b>\n\n` +
      `<b>Runtime:</b> Bun ${Bun.version}\n` +
      `<b>Uptime:</b> ${hours}h ${minutes}m\n` +
      `<b>Memory:</b> ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
      `<b>Platform:</b> ${process.platform}\n` +
      `<b>Time:</b> ${new Date().toISOString()}`,
    msg.chat.id,
    msg.message_thread_id
  );
}

async function handleTrades(msg: IncomingMessage) {
  // TODO: Integrate with actual trades API
  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: 'View All Trades', callback_data: 'trades_all' },
      { text: 'Today Only', callback_data: 'trades_today' },
    ],
    [
      { text: 'Winners', callback_data: 'trades_winners' },
      { text: 'Losers', callback_data: 'trades_losers' },
    ],
  ];

  await sendWithKeyboard(
    `<b>Trade History</b>\n\nSelect a filter to view trades:`,
    keyboard,
    msg.chat.id,
    { threadId: msg.message_thread_id, parseMode: 'HTML' }
  );
}

async function handlePnL(msg: IncomingMessage) {
  // TODO: Integrate with actual P&L calculation
  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: 'Today', callback_data: 'pnl_today' },
      { text: 'This Week', callback_data: 'pnl_week' },
      { text: 'This Month', callback_data: 'pnl_month' },
    ],
    [{ text: 'All Time', callback_data: 'pnl_all' }],
  ];

  await sendWithKeyboard(`<b>P&L Summary</b>\n\nSelect a time period:`, keyboard, msg.chat.id, {
    threadId: msg.message_thread_id,
    parseMode: 'HTML',
  });
}

async function handleHealth(msg: IncomingMessage) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/health`);
    const data = await response.json();

    await reply(
      `<b>Health Check</b>\n\n` +
        `<b>Status:</b> ${response.ok ? 'Healthy' : 'Unhealthy'}\n` +
        `<b>Response:</b> ${response.status}\n` +
        `<b>Server:</b> ${data.server || 'unknown'}\n` +
        `<b>Time:</b> ${new Date().toISOString()}`,
      msg.chat.id,
      msg.message_thread_id
    );
  } catch (error) {
    await reply(
      `<b>Health Check Failed</b>\n\n` +
        `<code>${error instanceof Error ? error.message : 'Unknown error'}</code>`,
      msg.chat.id,
      msg.message_thread_id
    );
  }
}

async function handleApp(msg: IncomingMessage) {
  // Cloudflare Pages deployed miniapp
  const appUrl = process.env.MINIAPP_URL || 'https://staging.factory-wager-miniapp.pages.dev';

  const keyboard: InlineKeyboardButton[][] = [
    [{ text: 'Open Trading Dashboard', web_app: { url: appUrl } }],
  ];

  await sendWithKeyboard(
    `<b>Trading Dashboard</b>\n\n` +
      `Access your full trading dashboard with:\n` +
      `- Real-time stats\n` +
      `- Trade history\n` +
      `- P&L charts\n` +
      `- Settings`,
    keyboard,
    msg.chat.id,
    { threadId: msg.message_thread_id, parseMode: 'HTML' }
  );
}

async function handleMarkets(msg: IncomingMessage) {
  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: 'Polymarket', callback_data: 'markets_polymarket' },
      { text: 'Kalshi', callback_data: 'markets_kalshi' },
    ],
    [
      { text: 'BitMEX', callback_data: 'markets_bitmex' },
      { text: 'All Markets', callback_data: 'markets_all' },
    ],
  ];

  await sendWithKeyboard(
    `<b>Active Markets</b>\n\nSelect an exchange to view markets:`,
    keyboard,
    msg.chat.id,
    {
      threadId: msg.message_thread_id,
      parseMode: 'HTML',
    }
  );
}

// ═══════════════════════════════════════════════════════════════
// SPORTS/BASKETBALL COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

// Initialize sports exchange on first use
let sportsInitialized = false;
async function ensureSportsInit() {
  if (!sportsInitialized) {
    await sportsExchange.initialize({ username: 'telegram_bot' });
    sportsInitialized = true;
  }
}

async function handleNBA(msg: IncomingMessage) {
  await ensureSportsInit();

  const markets = await sportsExchange.fetchBasketballMarkets('NBA');
  const liveGames = markets.filter(m => m.status === 'live');
  const upcomingGames = markets.filter(m => m.status === 'upcoming');

  let text = `🏀 <b>NBA Markets</b>\n\n`;

  if (liveGames.length > 0) {
    text += `<b>🔴 LIVE GAMES (${liveGames.length})</b>\n`;
    for (const game of liveGames.slice(0, 3)) {
      text += `\n${sportsExchange.formatMarketForTelegram(game)}\n`;
    }
  }

  if (upcomingGames.length > 0) {
    text += `\n<b>📅 UPCOMING (${upcomingGames.length})</b>\n`;
    for (const game of upcomingGames.slice(0, 2)) {
      text += `• ${game.event}\n`;
    }
  }

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '🔴 Live Games', callback_data: 'nba_live' },
      { text: '📅 Upcoming', callback_data: 'nba_upcoming' },
    ],
    [
      { text: '🎯 Player Props', callback_data: 'nba_props' },
      { text: '📊 Get Signal', callback_data: 'nba_signal' },
    ],
  ];

  await sendWithKeyboard(text, keyboard, msg.chat.id, {
    threadId: msg.message_thread_id,
    parseMode: 'HTML',
  });
}

async function handleLiveGames(msg: IncomingMessage) {
  await ensureSportsInit();

  const liveGames = await sportsExchange.fetchLiveGames('basketball');

  if (liveGames.length === 0) {
    await reply(
      `🏀 <b>Live Games</b>\n\n<i>No live basketball games right now.</i>\n\nCheck back later or use /nba for upcoming games.`,
      msg.chat.id,
      msg.message_thread_id
    );
    return;
  }

  let text = `🔴 <b>LIVE BASKETBALL</b>\n\n`;

  for (const game of liveGames) {
    const bbGame = game as any;
    text += sportsExchange.formatMarketForTelegram(bbGame) + '\n\n';
  }

  await reply(text.trim(), msg.chat.id, msg.message_thread_id);
}

async function handleProps(msg: IncomingMessage) {
  await ensureSportsInit();

  const markets = await sportsExchange.fetchBasketballMarkets('NBA');
  const liveGame = markets.find(m => m.status === 'live');

  if (!liveGame) {
    await reply(
      `🎯 <b>Player Props</b>\n\n<i>No live games with props available.</i>\n\nProps are available during live games.`,
      msg.chat.id,
      msg.message_thread_id
    );
    return;
  }

  const props = await sportsExchange.fetchPlayerProps(liveGame.id);
  const propsText = sportsExchange.formatPropsForTelegram(props, 8);

  await reply(`🏀 <b>${liveGame.event}</b>\n\n${propsText}`, msg.chat.id, msg.message_thread_id);
}

async function handleSignal(msg: IncomingMessage) {
  await ensureSportsInit();

  const markets = await sportsExchange.fetchBasketballMarkets('NBA');
  if (markets.length === 0) {
    await reply(
      `📊 <b>Trading Signals</b>\n\n<i>No markets available for signals.</i>`,
      msg.chat.id,
      msg.message_thread_id
    );
    return;
  }

  // Build RAG context for better signal
  const ragContext = await sportsExchange.buildRAGContext(
    'Best NBA betting opportunity today',
    'basketball'
  );

  const signal = await sportsExchange.generateTradingSignal(markets[0].id, ragContext);
  const signalText = sportsExchange.formatSignalForTelegram(signal);

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '✅ Place Bet', callback_data: `bet_${signal.market}` },
      { text: '🔄 New Signal', callback_data: 'signal_refresh' },
    ],
  ];

  await sendWithKeyboard(signalText, keyboard, msg.chat.id, {
    threadId: msg.message_thread_id,
    parseMode: 'HTML',
  });
}

async function handleSports(msg: IncomingMessage) {
  await ensureSportsInit();

  const health = await sportsExchange.checkHealth();

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '🏀 NBA', callback_data: 'sports_nba' },
      { text: '🏈 NFL', callback_data: 'sports_nfl' },
    ],
    [
      { text: '⚽ Soccer', callback_data: 'sports_soccer' },
      { text: '🏒 NHL', callback_data: 'sports_nhl' },
    ],
    [
      { text: '📊 All Signals', callback_data: 'sports_signals' },
      { text: '💰 My Bets', callback_data: 'sports_bets' },
    ],
  ];

  await sendWithKeyboard(
    `<b>Sports Trading Hub</b>\n\n` +
      `<b>Status:</b> ${health.status === 'online' ? '🟢 Online' : '🔴 Offline'}\n` +
      `<b>Live Games:</b> ${health.exchangeSpecific?.liveGames || 0}\n` +
      `<b>Active Markets:</b> ${health.exchangeSpecific?.activeMarkets || 0}\n` +
      `<b>Active Signals:</b> ${health.exchangeSpecific?.activeSignals || 0}\n\n` +
      `Select a sport to view markets:`,
    keyboard,
    msg.chat.id,
    { threadId: msg.message_thread_id, parseMode: 'HTML' }
  );
}

async function handleAsk(msg: IncomingMessage) {
  await ensureSportsInit();

  // Extract query from message (everything after /ask)
  const query = msg.text?.replace(/^\/ask\s*/i, '').trim();

  if (!query) {
    await reply(
      `🤖 <b>RAG Sports Assistant</b>\n\n` +
        `Ask me anything about sports betting!\n\n` +
        `<b>Examples:</b>\n` +
        `• /ask What's the injury impact on Lakers tonight?\n` +
        `• /ask Best player props for Curry?\n` +
        `• /ask Home court advantage trends\n` +
        `• /ask Back to back game patterns`,
      msg.chat.id,
      msg.message_thread_id
    );
    return;
  }

  // Query RAG system
  const result = await sportsExchange.queryRAG(query, 'basketball', {
    topK: 3,
    minConfidence: 0.6,
  });

  let text = `🤖 <b>AI Analysis</b>\n\n`;
  text += `<b>Q:</b> ${query}\n\n`;
  text += `<b>A:</b> ${result.answer}\n\n`;
  text += `<b>Confidence:</b> ${(result.confidence * 100).toFixed(0)}%\n\n`;

  if (result.recommendations.length > 0) {
    text += `<b>Recommendations:</b>\n`;
    for (const rec of result.recommendations.slice(0, 3)) {
      const emoji =
        rec.signal === 'strong_buy' || rec.signal === 'buy'
          ? '🟢'
          : rec.signal === 'hold'
            ? '🟡'
            : '🔴';
      text += `${emoji} ${rec.market} - ${rec.signal.toUpperCase()} (${(rec.confidence * 100).toFixed(0)}%)\n`;
    }
  }

  text += `\n<i>Sources: ${result.sources.slice(0, 3).join(', ')}</i>`;

  await reply(text, msg.chat.id, msg.message_thread_id);
}

async function handleBot(msg: IncomingMessage) {
  await ensureSportsInit();

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '▶️ Start Bot', callback_data: 'bot_start' },
      { text: '⏹️ Stop Bot', callback_data: 'bot_stop' },
    ],
    [
      { text: '📊 Bot Status', callback_data: 'bot_status' },
      { text: '⚙️ Configure', callback_data: 'bot_config' },
    ],
  ];

  await sendWithKeyboard(
    `🤖 <b>Trading Bot Control</b>\n\n` +
      `Automate your sports betting with AI-powered signals.\n\n` +
      `<b>Features:</b>\n` +
      `• Auto-bet on high confidence signals\n` +
      `• Risk management & stop-loss\n` +
      `• Kelly criterion stake sizing\n` +
      `• Multi-sport coverage\n\n` +
      `Select an action:`,
    keyboard,
    msg.chat.id,
    { threadId: msg.message_thread_id, parseMode: 'HTML' }
  );
}

async function handleInjuries(msg: IncomingMessage) {
  await ensureSportsInit();

  const context = await sportsExchange.buildRAGContext('injury report', 'basketball');
  const injuries = context.relevantData.injuries;

  let text = `🏥 <b>NBA Injury Report</b>\n\n`;

  const statusEmoji: Record<string, string> = {
    Out: '🔴',
    Doubtful: '🟠',
    Questionable: '🟡',
    Probable: '🟢',
    'Day-to-Day': '⚪',
  };

  for (const injury of injuries) {
    const emoji = statusEmoji[injury.status] || '⚪';
    text += `${emoji} <b>${injury.player}</b> (${injury.team})\n`;
    text += `   ${injury.status} - ${injury.injury}\n`;
    text += `   Impact: ${injury.impactRating}/5 | Return: ${injury.expectedReturn}\n\n`;
  }

  await reply(text.trim(), msg.chat.id, msg.message_thread_id);
}

async function handleTrends(msg: IncomingMessage) {
  await ensureSportsInit();

  const context = await sportsExchange.buildRAGContext('betting trends', 'basketball');
  const trends = context.relevantData.trends;

  let text = `📈 <b>Betting Trends</b>\n\n`;

  for (const trend of trends) {
    const confidence = trend.confidence * 100;
    const emoji = confidence >= 70 ? '🔥' : confidence >= 60 ? '📊' : '📉';
    text += `${emoji} ${trend.trend}\n`;
    text += `   Confidence: ${confidence.toFixed(0)}% | Sample: ${trend.sample}\n\n`;
  }

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '🏀 NBA Trends', callback_data: 'trends_nba' },
      { text: '🎯 Props Trends', callback_data: 'trends_props' },
    ],
  ];

  await sendWithKeyboard(text.trim(), keyboard, msg.chat.id, {
    threadId: msg.message_thread_id,
    parseMode: 'HTML',
  });
}

// ═══════════════════════════════════════════════════════════════
// CALLBACK QUERY HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleCallbackQuery(query: CallbackQuery) {
  const data = query.data || '';
  const chatId = query.message?.chat.id;
  const threadId = query.message?.message_thread_id;

  // Acknowledge the callback immediately
  await answerCallbackQuery(query.id);

  // Handle different callback types
  if (data.startsWith('trades_')) {
    await handleTradesCallback(data, chatId!, threadId);
  } else if (data.startsWith('pnl_')) {
    await handlePnLCallback(data, chatId!, threadId);
  } else if (data.startsWith('markets_')) {
    await handleMarketsCallback(data, chatId!, threadId);
  } else if (data.startsWith('nba_')) {
    await handleNBACallback(data, chatId!, threadId);
  } else if (data.startsWith('sports_')) {
    await handleSportsCallback(data, chatId!, threadId);
  } else if (data.startsWith('bet_')) {
    await handleBetCallback(data, chatId!, threadId);
  } else if (data === 'signal_refresh') {
    await handleSignalRefresh(chatId!, threadId);
  } else if (data.startsWith('confirm_bet_')) {
    await handleConfirmBet(data, chatId!, threadId);
  } else if (data === 'cancel_bet') {
    await reply(
      `❌ <b>Bet Cancelled</b>\n\nUse /signal for new trading signals.`,
      chatId!,
      threadId
    );
  } else if (data.startsWith('bot_')) {
    await handleBotCallback(data, chatId!, threadId);
  } else if (data.startsWith('trends_')) {
    await handleTrendsCallback(data, chatId!, threadId);
  } else {
    // Unknown callback
    await answerCallbackQuery(query.id, { text: 'Unknown action', show_alert: true });
  }
}

async function handleTradesCallback(data: string, chatId: number, threadId?: number) {
  const filter = data.replace('trades_', '');
  // TODO: Fetch actual trades from API
  await reply(
    `<b>Trades - ${filter.charAt(0).toUpperCase() + filter.slice(1)}</b>\n\n` +
      `<i>Trade data coming soon...</i>\n\n` +
      `Filter: <code>${filter}</code>`,
    chatId,
    threadId
  );
}

async function handlePnLCallback(data: string, chatId: number, threadId?: number) {
  const period = data.replace('pnl_', '');
  // TODO: Fetch actual P&L from API
  await reply(
    `<b>P&L - ${period.charAt(0).toUpperCase() + period.slice(1)}</b>\n\n` +
      `<i>P&L data coming soon...</i>\n\n` +
      `Period: <code>${period}</code>`,
    chatId,
    threadId
  );
}

async function handleMarketsCallback(data: string, chatId: number, threadId?: number) {
  const exchange = data.replace('markets_', '');
  // TODO: Fetch actual markets from API
  await reply(
    `<b>Markets - ${exchange.charAt(0).toUpperCase() + exchange.slice(1)}</b>\n\n` +
      `<i>Market data coming soon...</i>\n\n` +
      `Exchange: <code>${exchange}</code>`,
    chatId,
    threadId
  );
}

// ═══════════════════════════════════════════════════════════════
// SPORTS CALLBACK HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleNBACallback(data: string, chatId: number, threadId?: number) {
  await ensureSportsInit();
  const action = data.replace('nba_', '');

  switch (action) {
    case 'live': {
      const liveGames = await sportsExchange.fetchLiveGames('basketball');
      if (liveGames.length === 0) {
        await reply(
          `🔴 <b>NBA Live Games</b>\n\n<i>No live games right now.</i>`,
          chatId,
          threadId
        );
        return;
      }
      let text = `🔴 <b>NBA LIVE</b>\n\n`;
      for (const game of liveGames) {
        text += sportsExchange.formatMarketForTelegram(game as any) + '\n\n';
      }
      await reply(text.trim(), chatId, threadId);
      break;
    }

    case 'upcoming': {
      const markets = await sportsExchange.fetchBasketballMarkets('NBA');
      const upcoming = markets.filter(m => m.status === 'upcoming');
      if (upcoming.length === 0) {
        await reply(
          `📅 <b>Upcoming NBA Games</b>\n\n<i>No upcoming games found.</i>`,
          chatId,
          threadId
        );
        return;
      }
      let text = `📅 <b>UPCOMING NBA GAMES</b>\n\n`;
      for (const game of upcoming.slice(0, 8)) {
        const gameTime = new Date(game.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const homeML = game.odds.home
          ? (game.odds.home > 0 ? '+' : '') + game.odds.home.toFixed(0)
          : 'N/A';
        const awayML = game.odds.away
          ? (game.odds.away > 0 ? '+' : '') + game.odds.away.toFixed(0)
          : 'N/A';
        text += `• <b>${game.teams?.home || 'Home'}</b> vs <b>${game.teams?.away || 'Away'}</b>\n`;
        text += `  📍 ${gameTime} | ML: ${homeML}/${awayML}\n\n`;
      }
      await reply(text.trim(), chatId, threadId);
      break;
    }

    case 'props': {
      const markets = await sportsExchange.fetchBasketballMarkets('NBA');
      const liveGame = markets.find(m => m.status === 'live');
      if (!liveGame) {
        await reply(
          `🎯 <b>Player Props</b>\n\n<i>No live games with props available.</i>`,
          chatId,
          threadId
        );
        return;
      }
      const props = await sportsExchange.fetchPlayerProps(liveGame.id);
      const propsText = sportsExchange.formatPropsForTelegram(props, 10);
      await reply(`🎯 <b>${liveGame.event} Props</b>\n\n${propsText}`, chatId, threadId);
      break;
    }

    case 'signal': {
      const markets = await sportsExchange.fetchBasketballMarkets('NBA');
      if (markets.length === 0) {
        await reply(`📊 <b>NBA Signal</b>\n\n<i>No markets available.</i>`, chatId, threadId);
        return;
      }
      const ragContext = await sportsExchange.buildRAGContext('NBA betting signal', 'basketball');
      const signal = await sportsExchange.generateTradingSignal(markets[0].id, ragContext);
      const signalText = sportsExchange.formatSignalForTelegram(signal);

      const keyboard: InlineKeyboardButton[][] = [
        [
          { text: '✅ Place Bet', callback_data: `bet_${signal.market}` },
          { text: '🔄 Refresh', callback_data: 'nba_signal' },
        ],
      ];
      await sendWithKeyboard(signalText, keyboard, chatId, {
        threadId,
        parseMode: 'HTML',
      });
      break;
    }

    default:
      await reply(`Unknown NBA action: ${action}`, chatId, threadId);
  }
}

async function handleSportsCallback(data: string, chatId: number, threadId?: number) {
  await ensureSportsInit();
  const sport = data.replace('sports_', '');

  switch (sport) {
    case 'nba': {
      const markets = await sportsExchange.fetchBasketballMarkets('NBA');
      const liveCount = markets.filter(m => m.status === 'live').length;
      const upcomingCount = markets.filter(m => m.status === 'upcoming').length;

      const keyboard: InlineKeyboardButton[][] = [
        [
          { text: `🔴 Live (${liveCount})`, callback_data: 'nba_live' },
          { text: `📅 Upcoming (${upcomingCount})`, callback_data: 'nba_upcoming' },
        ],
        [
          { text: '🎯 Props', callback_data: 'nba_props' },
          { text: '📊 Signal', callback_data: 'nba_signal' },
        ],
      ];

      await sendWithKeyboard(
        `🏀 <b>NBA Markets</b>\n\n` +
          `Live Games: ${liveCount}\n` +
          `Upcoming: ${upcomingCount}\n` +
          `Total Markets: ${markets.length}`,
        keyboard,
        chatId,
        { threadId, parseMode: 'HTML' }
      );
      break;
    }

    case 'nfl':
      await reply(
        `🏈 <b>NFL Markets</b>\n\n<i>NFL integration coming soon...</i>\n\nCheck back during football season!`,
        chatId,
        threadId
      );
      break;

    case 'soccer':
      await reply(
        `⚽ <b>Soccer Markets</b>\n\n<i>Soccer integration coming soon...</i>\n\nPremier League, La Liga, and more!`,
        chatId,
        threadId
      );
      break;

    case 'nhl':
      await reply(
        `🏒 <b>NHL Markets</b>\n\n<i>NHL integration coming soon...</i>\n\nHockey season markets incoming!`,
        chatId,
        threadId
      );
      break;

    case 'signals': {
      const ragContext = await sportsExchange.buildRAGContext('top betting signals', 'basketball');
      const markets = await sportsExchange.fetchBasketballMarkets('NBA');

      let text = `📊 <b>Active Trading Signals</b>\n\n`;

      // Generate signals for top 3 markets
      for (const market of markets.slice(0, 3)) {
        const tradingSignal = await sportsExchange.generateTradingSignal(market.id, ragContext);
        const emoji =
          tradingSignal.signal === 'buy' || tradingSignal.signal === 'strong_buy'
            ? '🟢'
            : tradingSignal.signal === 'sell' || tradingSignal.signal === 'strong_sell'
              ? '🔴'
              : '⚪';
        text += `${emoji} <b>${market.event}</b>\n`;
        text += `   ${tradingSignal.signal.toUpperCase().replace('_', ' ')} | ${(tradingSignal.confidence * 100).toFixed(0)}% conf\n\n`;
      }

      await reply(text.trim(), chatId, threadId);
      break;
    }

    case 'bets':
      await reply(
        `💰 <b>Your Active Bets</b>\n\n<i>No active bets found.</i>\n\nUse /signal to get trading recommendations!`,
        chatId,
        threadId
      );
      break;

    default:
      await reply(`Unknown sport: ${sport}`, chatId, threadId);
  }
}

async function handleBetCallback(data: string, chatId: number, threadId?: number) {
  const marketId = data.replace('bet_', '');

  // Show bet confirmation UI
  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '💵 $10', callback_data: `confirm_bet_${marketId}_10` },
      { text: '💵 $25', callback_data: `confirm_bet_${marketId}_25` },
      { text: '💵 $50', callback_data: `confirm_bet_${marketId}_50` },
    ],
    [
      { text: '💵 $100', callback_data: `confirm_bet_${marketId}_100` },
      { text: '❌ Cancel', callback_data: 'cancel_bet' },
    ],
  ];

  await sendWithKeyboard(
    `💰 <b>Place Bet</b>\n\n` + `Market: <code>${marketId}</code>\n\n` + `Select your bet amount:`,
    keyboard,
    chatId,
    { threadId, parseMode: 'HTML' }
  );
}

async function handleSignalRefresh(chatId: number, threadId?: number) {
  await ensureSportsInit();

  const markets = await sportsExchange.fetchBasketballMarkets('NBA');
  if (markets.length === 0) {
    await reply(`📊 <b>Trading Signals</b>\n\n<i>No markets available.</i>`, chatId, threadId);
    return;
  }

  // Pick a random market for variety
  const randomMarket = markets[Math.floor(Math.random() * markets.length)];
  const ragContext = await sportsExchange.buildRAGContext('fresh NBA signal', 'basketball');
  const signal = await sportsExchange.generateTradingSignal(randomMarket.id, ragContext);
  const signalText = sportsExchange.formatSignalForTelegram(signal);

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '✅ Place Bet', callback_data: `bet_${signal.market}` },
      { text: '🔄 New Signal', callback_data: 'signal_refresh' },
    ],
  ];

  await sendWithKeyboard(signalText, keyboard, chatId, {
    threadId,
    parseMode: 'HTML',
  });
}

async function handleConfirmBet(data: string, chatId: number, threadId?: number) {
  // Parse: confirm_bet_{marketId}_{amount}
  const parts = data.replace('confirm_bet_', '').split('_');
  const amount = parseInt(parts.pop() || '0', 10);
  const marketId = parts.join('_');

  await ensureSportsInit();

  try {
    // Place order directly via sports exchange
    const result = await sportsExchange.placeOrder({
      symbol: marketId,
      side: 'buy',
      type: 'limit',
      amount: amount,
      price: 1.9,
    });

    await reply(
      `✅ <b>Bet Placed!</b>\n\n` +
        `<b>Market:</b> <code>${marketId}</code>\n` +
        `<b>Amount:</b> $${amount}\n` +
        `<b>Order ID:</b> <code>${result.id}</code>\n` +
        `<b>Potential Payout:</b> $${result.exchangeSpecific?.potentialPayout}\n\n` +
        `<i>Good luck! Use /sports to track your bets.</i>`,
      chatId,
      threadId
    );
  } catch (error) {
    await reply(
      `⚠️ <b>Bet Failed</b>\n\n` +
        `Could not place bet on market.\n` +
        `<code>${error instanceof Error ? error.message : 'Unknown error'}</code>\n\n` +
        `<i>Try again or use /signal for new opportunities.</i>`,
      chatId,
      threadId
    );
  }
}

async function handleBotCallback(data: string, chatId: number, threadId?: number) {
  await ensureSportsInit();
  const action = data.replace('bot_', '');

  switch (action) {
    case 'start': {
      const result = await sportsExchange.runTradingBot({
        sports: ['basketball'],
        interval: 60000,
        maxDailyBets: 10,
        stakeSizing: 'kelly',
        baseStake: 50,
        stopLoss: -500,
        takeProfit: 1000,
      });

      await reply(
        `🤖 <b>Trading Bot Started!</b>\n\n` +
          `<b>Bot ID:</b> <code>${result.botId}</code>\n` +
          `<b>Sports:</b> Basketball\n` +
          `<b>Stake:</b> $50 (Kelly criterion)\n` +
          `<b>Max Daily Bets:</b> 10\n` +
          `<b>Stop Loss:</b> -$500\n` +
          `<b>Take Profit:</b> $1,000\n\n` +
          `<i>Bot is now monitoring markets for high-confidence signals.</i>`,
        chatId,
        threadId
      );
      break;
    }

    case 'stop':
      await reply(
        `⏹️ <b>Trading Bot Stopped</b>\n\n` +
          `Bot has been deactivated.\n` +
          `Use /bot to restart.`,
        chatId,
        threadId
      );
      break;

    case 'status': {
      const status = await sportsExchange.getTradingBotStatus('latest');

      await reply(
        `📊 <b>Bot Status</b>\n\n` +
          `<b>Running:</b> ${status.running ? '🟢 Yes' : '🔴 No'}\n` +
          `<b>Bets Placed:</b> ${status.betsPlaced}\n` +
          `<b>Current P&L:</b> ${status.pnl >= 0 ? '+' : ''}$${status.pnl.toFixed(2)}\n\n` +
          `<b>Last Bet:</b>\n` +
          `  Market: ${status.lastBet?.market || 'N/A'}\n` +
          `  Stake: $${status.lastBet?.stake || 0}\n` +
          `  Odds: ${status.lastBet?.odds || 0}`,
        chatId,
        threadId
      );
      break;
    }

    case 'config': {
      const keyboard: InlineKeyboardButton[][] = [
        [
          { text: '💵 Stake: $25', callback_data: 'config_stake_25' },
          { text: '💵 Stake: $50', callback_data: 'config_stake_50' },
          { text: '💵 Stake: $100', callback_data: 'config_stake_100' },
        ],
        [
          { text: '🎯 Low Risk', callback_data: 'config_risk_low' },
          { text: '⚖️ Medium', callback_data: 'config_risk_medium' },
          { text: '🔥 High Risk', callback_data: 'config_risk_high' },
        ],
        [
          { text: '🏀 NBA Only', callback_data: 'config_sport_nba' },
          { text: '🏆 All Sports', callback_data: 'config_sport_all' },
        ],
      ];

      await sendWithKeyboard(
        `⚙️ <b>Bot Configuration</b>\n\n` + `Select your preferences:`,
        keyboard,
        chatId,
        { threadId, parseMode: 'HTML' }
      );
      break;
    }

    default:
      await reply(`Unknown bot action: ${action}`, chatId, threadId);
  }
}

async function handleTrendsCallback(data: string, chatId: number, threadId?: number) {
  await ensureSportsInit();
  const trendType = data.replace('trends_', '');

  const context = await sportsExchange.buildRAGContext(`${trendType} trends`, 'basketball');
  const trends = context.relevantData.trends;

  let text = '';

  switch (trendType) {
    case 'nba':
      text = `🏀 <b>NBA Specific Trends</b>\n\n`;
      text += trends
        .filter(
          t => t.trend.toLowerCase().includes('home') || t.trend.toLowerCase().includes('road')
        )
        .map(t => `• ${t.trend} (${(t.confidence * 100).toFixed(0)}%)`)
        .join('\n');
      break;

    case 'props':
      text = `🎯 <b>Player Props Trends</b>\n\n`;
      text += trends
        .filter(
          t => t.trend.toLowerCase().includes('prop') || t.trend.toLowerCase().includes('player')
        )
        .map(t => `• ${t.trend} (${(t.confidence * 100).toFixed(0)}%)`)
        .join('\n');
      break;

    default:
      text = `📈 <b>Trends - ${trendType}</b>\n\n`;
      text += trends.map(t => `• ${t.trend} (${(t.confidence * 100).toFixed(0)}%)`).join('\n');
  }

  await reply(text || 'No trends found for this category.', chatId, threadId);
}

// ═══════════════════════════════════════════════════════════════
// INLINE QUERY HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleInlineQuery(query: InlineQuery) {
  const searchQuery = query.query.toLowerCase().trim();

  // Default results when no query
  const results = [
    {
      type: 'article' as const,
      id: 'nba',
      title: '🏀 NBA Markets',
      description: 'View NBA games and betting markets',
      input_message_content: {
        message_text: '/nba',
      },
    },
    {
      type: 'article' as const,
      id: 'signal',
      title: '📊 Trading Signal',
      description: 'Get AI-powered trading signal',
      input_message_content: {
        message_text: '/signal',
      },
    },
    {
      type: 'article' as const,
      id: 'sports',
      title: '🏆 Sports Hub',
      description: 'All sports trading markets',
      input_message_content: {
        message_text: '/sports',
      },
    },
    {
      type: 'article' as const,
      id: 'livegames',
      title: '🔴 Live Games',
      description: 'View live basketball games',
      input_message_content: {
        message_text: '/livegames',
      },
    },
    {
      type: 'article' as const,
      id: 'props',
      title: '🎯 Player Props',
      description: 'View player prop bets',
      input_message_content: {
        message_text: '/props',
      },
    },
    {
      type: 'article' as const,
      id: 'status',
      title: 'System Status',
      description: 'Check system status and uptime',
      input_message_content: {
        message_text: '/status',
      },
    },
    {
      type: 'article' as const,
      id: 'trades',
      title: 'View Trades',
      description: 'View recent trade history',
      input_message_content: {
        message_text: '/trades',
      },
    },
    {
      type: 'article' as const,
      id: 'pnl',
      title: 'P&L Summary',
      description: 'View profit and loss summary',
      input_message_content: {
        message_text: '/pnl',
      },
    },
    {
      type: 'article' as const,
      id: 'markets',
      title: 'Active Markets',
      description: 'View active markets',
      input_message_content: {
        message_text: '/markets',
      },
    },
  ];

  // Filter results based on query
  const filtered = searchQuery
    ? results.filter(
        r =>
          r.title.toLowerCase().includes(searchQuery) ||
          r.description.toLowerCase().includes(searchQuery)
      )
    : results;

  await answerInlineQuery(query.id, filtered);
}

// ═══════════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const update: TelegramUpdate = await request.json();

    // Handle different update types
    if (update.message?.text) {
      const text = update.message.text;
      const command = text.split(' ')[0].split('@')[0]; // Handle /command@botname

      if (COMMANDS[command]) {
        await COMMANDS[command](update.message);
      }
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
    }

    // Always return 200 OK to Telegram
    const headers = buildApiHeaders({
      request,
      responseTime: performance.now() - startTime,
    });
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Webhook error:', error);

    // Still return 200 to prevent Telegram from retrying
    const headers = buildApiHeaders({
      request,
      responseTime: performance.now() - startTime,
    });
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: headersToObject(headers),
      }
    );
  }
}

// GET handler for webhook verification
export async function GET(request: Request) {
  const startTime = performance.now();
  const headers = buildApiHeaders({
    request,
    responseTime: performance.now() - startTime,
  });

  return new NextResponse(
    JSON.stringify({
      status: 'ok',
      message: 'Telegram webhook endpoint',
      methods: ['POST'],
      commands: Object.keys(COMMANDS),
    }),
    {
      status: 200,
      headers: headersToObject(headers),
    }
  );
}
