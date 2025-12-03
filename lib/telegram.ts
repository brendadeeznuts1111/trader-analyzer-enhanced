/**
 * Telegram Notification Service
 * Sends trading alerts, position updates, and system notifications
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_notification?: boolean;
}

export interface TradeAlert {
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'liquidation';
  symbol: string;
  side: 'long' | 'short';
  price: number;
  size: number;
  pnl?: number;
  timestamp?: string;
}

export interface SystemAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp?: string;
}

/**
 * Send a raw message to Telegram
 */
export async function sendMessage(message: TelegramMessage): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram not configured: missing BOT_TOKEN or CHAT_ID');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        disable_notification: message.disable_notification || false,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

/**
 * Send a trade alert notification
 */
export async function sendTradeAlert(alert: TradeAlert): Promise<boolean> {
  const emoji = {
    entry: alert.side === 'long' ? '🟢' : '🔴',
    exit: '⚪',
    stop_loss: '🛑',
    take_profit: '🎯',
    liquidation: '💀',
  };

  const typeLabel = {
    entry: 'ENTRY',
    exit: 'EXIT',
    stop_loss: 'STOP LOSS',
    take_profit: 'TAKE PROFIT',
    liquidation: 'LIQUIDATION',
  };

  const pnlText =
    alert.pnl !== undefined
      ? `\n<b>PnL:</b> ${alert.pnl >= 0 ? '+' : ''}${alert.pnl.toFixed(2)} USD ${alert.pnl >= 0 ? '✅' : '❌'}`
      : '';

  const text = `
${emoji[alert.type]} <b>${typeLabel[alert.type]}</b> ${emoji[alert.type]}

<b>Symbol:</b> ${alert.symbol}
<b>Side:</b> ${alert.side.toUpperCase()}
<b>Price:</b> $${alert.price.toLocaleString()}
<b>Size:</b> ${alert.size.toLocaleString()}${pnlText}

<i>${alert.timestamp || new Date().toISOString()}</i>
`.trim();

  return sendMessage({ text });
}

/**
 * Send a system alert notification
 */
export async function sendSystemAlert(alert: SystemAlert): Promise<boolean> {
  const emoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
    success: '✅',
  };

  const text = `
${emoji[alert.type]} <b>${alert.title}</b>

${alert.message}

<i>${alert.timestamp || new Date().toISOString()}</i>
`.trim();

  return sendMessage({
    text,
    disable_notification: alert.type === 'info',
  });
}

/**
 * Send daily performance summary
 */
export async function sendDailySummary(stats: {
  totalTrades: number;
  winRate: number;
  pnl: number;
  bestTrade: number;
  worstTrade: number;
}): Promise<boolean> {
  const pnlEmoji = stats.pnl >= 0 ? '📈' : '📉';

  const text = `
📊 <b>DAILY SUMMARY</b> 📊

<b>Total Trades:</b> ${stats.totalTrades}
<b>Win Rate:</b> ${(stats.winRate * 100).toFixed(1)}%
<b>Net PnL:</b> ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toLocaleString()} ${pnlEmoji}

<b>Best Trade:</b> +$${stats.bestTrade.toLocaleString()} 🏆
<b>Worst Trade:</b> -$${Math.abs(stats.worstTrade).toLocaleString()} 

<i>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</i>
`.trim();

  return sendMessage({ text });
}

/**
 * Send health check notification
 */
export async function sendHealthCheck(): Promise<boolean> {
  const text = `
🏥 <b>HEALTH CHECK</b>

<b>Status:</b> Online ✅
<b>Server:</b> trader-analyzer
<b>Uptime:</b> ${Math.floor(process.uptime() / 60)} minutes

<i>${new Date().toISOString()}</i>
`.trim();

  return sendMessage({ text, disable_notification: true });
}

/**
 * Get bot info for verification
 */
export async function getBotInfo(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { error: 'Bot token not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    return await response.json();
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * Get recent updates (for finding chat ID)
 */
export async function getUpdates(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { error: 'Bot token not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/getUpdates`);
    return await response.json();
  } catch (error) {
    return { error: String(error) };
  }
}
