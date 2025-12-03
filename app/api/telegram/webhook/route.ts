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
} from '../../../../lib/telegram';
import { buildApiHeaders, headersToObject } from '../../../../lib/api-headers';

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
};

async function handleStart(msg: IncomingMessage) {
  const name = msg.from?.first_name || 'trader';
  await reply(
    `<b>Welcome ${name}!</b>\n\n` +
      `I'm your trading assistant bot. Here's what I can do:\n\n` +
      `<b>Commands:</b>\n` +
      `/status - System status\n` +
      `/trades - Recent trades\n` +
      `/pnl - P&L summary\n` +
      `/health - API health check\n` +
      `/markets - Active markets\n` +
      `/app - Open Mini App\n` +
      `/help - Show this help\n\n` +
      `<i>Built with Bun + Next.js</i>`,
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/health`);
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
  const appUrl =
    process.env.MINIAPP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://trader-analyzer.fly.dev';

  const keyboard: InlineKeyboardButton[][] = [
    [{ text: 'Open Trading Dashboard', web_app: { url: `${appUrl}/miniapp` } }],
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
// INLINE QUERY HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleInlineQuery(query: InlineQuery) {
  const searchQuery = query.query.toLowerCase().trim();

  // Default results when no query
  const results = [
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
