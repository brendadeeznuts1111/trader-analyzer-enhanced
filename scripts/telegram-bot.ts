#!/usr/bin/env bun
/**
 * Telegram Bot Polling Script
 * Run this locally to process bot messages without deploying a webhook
 *
 * Usage: bun run scripts/telegram-bot.ts
 */

import {
  sendMessage,
  answerCallbackQuery,
  sendWithKeyboard,
  answerInlineQuery,
  getUpdates,
  type InlineKeyboardButton,
  type TelegramMessage as TgMsg,
} from '../lib/telegram';
import { ThreadManager } from '../lib/thread-manager';
import { Ref, formatSignal, formatError } from '../lib/ref-tagger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
}

interface IncomingMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  message_thread_id?: number;
  text?: string;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: IncomingMessage;
  data?: string;
}

interface InlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
}

interface Update {
  update_id: number;
  message?: IncomingMessage;
  callback_query?: CallbackQuery;
  inline_query?: InlineQuery;
}

// ═══════════════════════════════════════════════════════════════
// HELPER
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

async function handleStart(msg: IncomingMessage) {
  const name = msg.from?.first_name || 'trader';
  await reply(
    `<b>Welcome ${name}!</b>\n\n` +
      `I'm your trading assistant bot. Here's what I can do:\n\n` +
      `<b>📊 Trading:</b>\n` +
      `/status - System status\n` +
      `/trades - Recent trades\n` +
      `/pnl - P&L summary\n` +
      `/markets - Active markets\n` +
      `/app - Open Mini App\n\n` +
      `<b>📍 Topics:</b>\n` +
      `/topics - Show topic mapping\n` +
      `/pin_alerts - Pin for alerts\n` +
      `/pin_errors - Pin for errors\n` +
      `/pin_trades - Pin for trades\n\n` +
      `<b>🧪 Testing:</b>\n` +
      `/test_signal - Send test signal\n` +
      `/test_error - Send test error\n` +
      `/ref_stats - Show ref counters\n\n` +
      `<i>Built with Bun + Next.js</i>`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ /start from ${msg.from?.username || msg.from?.first_name}`);
}

async function handleTopics(msg: IncomingMessage) {
  const list = ThreadManager.formatTopicsList(msg.chat.id);
  await reply(list, msg.chat.id, msg.message_thread_id);
  console.log(`✓ /topics from ${msg.from?.username || msg.from?.first_name}`);
}

async function handlePinAlerts(msg: IncomingMessage) {
  const threadId = msg.message_thread_id ?? null;
  const topicName = threadId ? `Topic ${threadId}` : 'General';

  ThreadManager.register(msg.chat.id, threadId, topicName, 'alerts');
  ThreadManager.setPinned(msg.chat.id, threadId, 'alerts');

  await reply(
    `✅ <b>Alerts pinned!</b>\n\n` +
      `All trading alerts will now be sent to this topic.\n` +
      `Thread ID: <code>${threadId ?? 'null'}</code>`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ /pin_alerts → thread ${threadId} from ${msg.from?.username}`);
}

async function handlePinErrors(msg: IncomingMessage) {
  const threadId = msg.message_thread_id ?? null;
  const topicName = threadId ? `Topic ${threadId}` : 'General';

  ThreadManager.register(msg.chat.id, threadId, topicName, 'errors');
  ThreadManager.setPinned(msg.chat.id, threadId, 'errors');

  await reply(
    `✅ <b>Errors pinned!</b>\n\n` +
      `All error logs will now be sent to this topic.\n` +
      `Thread ID: <code>${threadId ?? 'null'}</code>`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ /pin_errors → thread ${threadId} from ${msg.from?.username}`);
}

async function handlePinTrades(msg: IncomingMessage) {
  const threadId = msg.message_thread_id ?? null;
  const topicName = threadId ? `Topic ${threadId}` : 'General';

  ThreadManager.register(msg.chat.id, threadId, topicName, 'trades');
  ThreadManager.setPinned(msg.chat.id, threadId, 'trades');

  await reply(
    `✅ <b>Trades pinned!</b>\n\n` +
      `All trade notifications will now be sent to this topic.\n` +
      `Thread ID: <code>${threadId ?? 'null'}</code>`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ /pin_trades → thread ${threadId} from ${msg.from?.username}`);
}

async function handleTestSignal(msg: IncomingMessage) {
  const alertsThread = ThreadManager.getAlertsThread(msg.chat.id);

  // Generate a test signal with elite formatting
  const signalText = formatSignal({
    percentChange: 26.4,
    player: 'Jiri Plachy',
    opponent: 'M. Regner',
    odds: 3.92,
    league: 'CZ Liga Pro',
    isLive: true,
  });

  const targetThread = alertsThread ?? msg.message_thread_id;

  await reply(signalText, msg.chat.id, targetThread);

  if (alertsThread) {
    await reply(
      `✅ Test signal sent to alerts topic (thread ${alertsThread})`,
      msg.chat.id,
      msg.message_thread_id
    );
  }
  console.log(`✓ /test_signal → thread ${targetThread} from ${msg.from?.username}`);
}

async function handleTestError(msg: IncomingMessage) {
  const errorsThread = ThreadManager.getErrorsThread(msg.chat.id);

  // Generate a test error with elite formatting
  const errorText = formatError({
    service: 'Kalshi API',
    code: 429,
    message: 'rate limit exceeded',
    action: 'retry #3 in 5s',
  });

  const targetThread = errorsThread ?? msg.message_thread_id;

  await reply(errorText, msg.chat.id, targetThread);

  if (errorsThread) {
    await reply(
      `✅ Test error sent to errors topic (thread ${errorsThread})`,
      msg.chat.id,
      msg.message_thread_id
    );
  }
  console.log(`✓ /test_error → thread ${targetThread} from ${msg.from?.username}`);
}

async function handleRefStats(msg: IncomingMessage) {
  const stats = Ref.getStats();

  await reply(
    `<b>Reference Counters</b>\n\n` +
      `<b>Year:</b> ${stats.year}\n` +
      `<b>Signals:</b> ${stats.signal}\n` +
      `<b>Errors:</b> ${stats.error}\n` +
      `<b>PRs:</b> ${stats.pr}\n` +
      `<b>Issues:</b> ${stats.issue}\n` +
      `<b>RFCs:</b> ${stats.rfc}`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ /ref_stats from ${msg.from?.username}`);
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
  console.log(`✓ Responded to /status from ${msg.from?.username || msg.from?.first_name}`);
}

async function handleTradesCmd(msg: IncomingMessage) {
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
  console.log(`✓ /trades from ${msg.from?.username || msg.from?.first_name}`);
}

async function handlePnL(msg: IncomingMessage) {
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
  console.log(`✓ Responded to /pnl from ${msg.from?.username || msg.from?.first_name}`);
}

async function handleHealth(msg: IncomingMessage) {
  await reply(
    `<b>Health Check</b>\n\n` +
      `<b>Bot Status:</b> Running\n` +
      `<b>Runtime:</b> Bun ${Bun.version}\n` +
      `<b>Time:</b> ${new Date().toISOString()}`,
    msg.chat.id,
    msg.message_thread_id
  );
  console.log(`✓ Responded to /health from ${msg.from?.username || msg.from?.first_name}`);
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
  console.log(`✓ Responded to /markets from ${msg.from?.username || msg.from?.first_name}`);
}

async function handleApp(msg: IncomingMessage) {
  const appUrl = process.env.MINIAPP_URL || 'https://edgeterminal.fly.dev';

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
  console.log(`✓ Responded to /app from ${msg.from?.username || msg.from?.first_name}`);
}

const COMMANDS: Record<string, (msg: IncomingMessage) => Promise<void>> = {
  '/start': handleStart,
  '/help': handleStart,
  '/status': handleStatus,
  '/trades': handleTradesCmd,
  '/pnl': handlePnL,
  '/health': handleHealth,
  '/markets': handleMarkets,
  '/app': handleApp,
  '/topics': handleTopics,
  '/pin_alerts': handlePinAlerts,
  '/pin_errors': handlePinErrors,
  '/pin_trades': handlePinTrades,
  '/test_signal': handleTestSignal,
  '/test_error': handleTestError,
  '/ref_stats': handleRefStats,
};

// ═══════════════════════════════════════════════════════════════
// CALLBACK HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleCallback(query: CallbackQuery) {
  const data = query.data || '';
  const chatId = query.message?.chat.id;
  const threadId = query.message?.message_thread_id;

  await answerCallbackQuery(query.id);

  if (!chatId) return;

  if (data.startsWith('trades_')) {
    const filter = data.replace('trades_', '');
    await reply(
      `<b>Trades - ${filter.charAt(0).toUpperCase() + filter.slice(1)}</b>\n\n` +
        `<i>Trade data coming soon...</i>`,
      chatId,
      threadId
    );
  } else if (data.startsWith('pnl_')) {
    const period = data.replace('pnl_', '');
    await reply(
      `<b>P&L - ${period.charAt(0).toUpperCase() + period.slice(1)}</b>\n\n` +
        `<i>P&L data coming soon...</i>`,
      chatId,
      threadId
    );
  } else if (data.startsWith('markets_')) {
    const exchange = data.replace('markets_', '');
    await reply(
      `<b>Markets - ${exchange.charAt(0).toUpperCase() + exchange.slice(1)}</b>\n\n` +
        `<i>Market data coming soon...</i>`,
      chatId,
      threadId
    );
  }

  console.log(`✓ Handled callback: ${data} from ${query.from.username || query.from.first_name}`);
}

// ═══════════════════════════════════════════════════════════════
// INLINE QUERY HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleInlineQuery(query: InlineQuery) {
  const results = [
    {
      type: 'article' as const,
      id: 'status',
      title: 'System Status',
      description: 'Check system status',
      input_message_content: { message_text: '/status' },
    },
    {
      type: 'article' as const,
      id: 'trades',
      title: 'View Trades',
      description: 'View trade history',
      input_message_content: { message_text: '/trades' },
    },
    {
      type: 'article' as const,
      id: 'pnl',
      title: 'P&L Summary',
      description: 'View profit/loss',
      input_message_content: { message_text: '/pnl' },
    },
  ];

  const searchQuery = query.query.toLowerCase().trim();
  const filtered = searchQuery
    ? results.filter(r => r.title.toLowerCase().includes(searchQuery))
    : results;

  await answerInlineQuery(query.id, filtered);
  console.log(
    `✓ Answered inline query: "${query.query}" from ${query.from.username || query.from.first_name}`
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN POLLING LOOP
// ═══════════════════════════════════════════════════════════════

async function processUpdate(update: Update) {
  try {
    if (update.message?.text) {
      const msg = update.message;
      const text = msg.text!;

      // Auto-track topic usage
      ThreadManager.markUsed(msg.chat.id, msg.message_thread_id ?? null);

      const command = text.split(' ')[0].split('@')[0];

      if (COMMANDS[command]) {
        await COMMANDS[command](msg);
      }
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
    }
  } catch (error) {
    console.error('Error processing update:', error);
  }
}

async function poll() {
  let offset = 0;

  console.log('╔════════════════════════════════════════╗');
  console.log('║  Telegram Bot - Polling Mode          ║');
  console.log('║  Press Ctrl+C to stop                 ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  while (true) {
    try {
      const response = await getUpdates(offset, 100);

      if (response.ok && response.result && response.result.length > 0) {
        for (const update of response.result as Update[]) {
          await processUpdate(update);
          offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      await Bun.sleep(5000); // Wait before retrying
    }
  }
}

// Start polling
poll();
