/**
 * Telegram Bot Service
 * Full-featured Telegram integration with:
 * - Message sending & formatting
 * - Forum topic management
 * - Message pinning
 * - Thread-specific messaging
 * - Group/channel management
 * - Admin controls
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_notification?: boolean;
  message_thread_id?: number;
  reply_to_message_id?: number;
  protect_content?: boolean;
}

export interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface MessageResult {
  message_id: number;
  chat: { id: number; title?: string; type: string };
  date: number;
  text?: string;
}

export interface ForumTopic {
  message_thread_id: number;
  name: string;
  icon_color: number;
  icon_custom_emoji_id?: string;
}

export interface ChatMember {
  user: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
}

export interface TradeAlert {
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'liquidation';
  symbol: string;
  side: 'long' | 'short';
  price: number;
  size: number;
  pnl?: number;
  timestamp?: string;
  threadId?: number;
}

export interface SystemAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp?: string;
  threadId?: number;
}

// Icon colors for forum topics (Telegram's preset colors)
export const TOPIC_COLORS = {
  BLUE: 7322096,
  YELLOW: 16766590,
  PURPLE: 13338331,
  GREEN: 9367192,
  PINK: 16749490,
  RED: 16478047,
} as const;

// ═══════════════════════════════════════════════════════════════
// CORE API HELPER
// ═══════════════════════════════════════════════════════════════

async function telegramApi<T = any>(
  method: string,
  params: Record<string, any> = {}
): Promise<TelegramResponse<T>> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    return await response.json();
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE SENDING
// ═══════════════════════════════════════════════════════════════

/**
 * Send a message to a chat or thread
 */
export async function sendMessage(
  message: TelegramMessage,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  return telegramApi<MessageResult>('sendMessage', {
    chat_id: chatId,
    text: message.text,
    parse_mode: message.parse_mode || 'HTML',
    disable_notification: message.disable_notification || false,
    message_thread_id: message.message_thread_id,
    reply_to_message_id: message.reply_to_message_id,
    protect_content: message.protect_content,
  });
}

/**
 * Send message to a specific forum topic/thread
 */
export async function sendToThread(
  threadId: number,
  text: string,
  options: Partial<TelegramMessage> = {}
): Promise<TelegramResponse<MessageResult>> {
  return sendMessage({
    text,
    message_thread_id: threadId,
    ...options,
  });
}

/**
 * Forward a message to another chat
 */
export async function forwardMessage(
  fromChatId: string | number,
  messageId: number,
  toChatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  return telegramApi<MessageResult>('forwardMessage', {
    chat_id: toChatId,
    from_chat_id: fromChatId,
    message_id: messageId,
  });
}

/**
 * Copy a message to another chat (without "Forwarded from" header)
 */
export async function copyMessage(
  fromChatId: string | number,
  messageId: number,
  toChatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<{ message_id: number }>> {
  return telegramApi('copyMessage', {
    chat_id: toChatId,
    from_chat_id: fromChatId,
    message_id: messageId,
  });
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE PINNING
// ═══════════════════════════════════════════════════════════════

/**
 * Pin a message in a chat
 */
export async function pinMessage(
  messageId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  disableNotification: boolean = false
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: disableNotification,
  });
}

/**
 * Unpin a specific message
 */
export async function unpinMessage(
  messageId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('unpinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Unpin all messages in a chat
 */
export async function unpinAllMessages(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('unpinAllChatMessages', {
    chat_id: chatId,
  });
}

/**
 * Send and pin a message in one operation
 */
export async function sendAndPin(
  message: TelegramMessage,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<{ sent: TelegramResponse<MessageResult>; pinned: TelegramResponse<boolean> | null }> {
  const sent = await sendMessage(message, chatId);
  let pinned = null;

  if (sent.ok && sent.result) {
    pinned = await pinMessage(sent.result.message_id, chatId, true);
  }

  return { sent, pinned };
}

// ═══════════════════════════════════════════════════════════════
// FORUM TOPIC MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new forum topic
 */
export async function createForumTopic(
  name: string,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  iconColor: number = TOPIC_COLORS.BLUE,
  iconCustomEmojiId?: string
): Promise<TelegramResponse<ForumTopic>> {
  return telegramApi<ForumTopic>('createForumTopic', {
    chat_id: chatId,
    name,
    icon_color: iconColor,
    icon_custom_emoji_id: iconCustomEmojiId,
  });
}

/**
 * Edit a forum topic's name and/or icon
 */
export async function editForumTopic(
  messageThreadId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  name?: string,
  iconCustomEmojiId?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('editForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
    name,
    icon_custom_emoji_id: iconCustomEmojiId,
  });
}

/**
 * Close a forum topic (prevent new messages)
 */
export async function closeForumTopic(
  messageThreadId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('closeForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

/**
 * Reopen a closed forum topic
 */
export async function reopenForumTopic(
  messageThreadId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('reopenForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

/**
 * Delete a forum topic and all its messages
 */
export async function deleteForumTopic(
  messageThreadId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('deleteForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

/**
 * Unpin all messages in a forum topic
 */
export async function unpinAllForumTopicMessages(
  messageThreadId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('unpinAllForumTopicMessages', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

/**
 * Edit the General topic name (main topic in forums)
 */
export async function editGeneralForumTopic(
  name: string,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('editGeneralForumTopic', {
    chat_id: chatId,
    name,
  });
}

/**
 * Close the General forum topic
 */
export async function closeGeneralForumTopic(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('closeGeneralForumTopic', {
    chat_id: chatId,
  });
}

/**
 * Reopen the General forum topic
 */
export async function reopenGeneralForumTopic(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('reopenGeneralForumTopic', {
    chat_id: chatId,
  });
}

/**
 * Hide the General forum topic from the topic list
 */
export async function hideGeneralForumTopic(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('hideGeneralForumTopic', {
    chat_id: chatId,
  });
}

/**
 * Unhide the General forum topic
 */
export async function unhideGeneralForumTopic(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('unhideGeneralForumTopic', {
    chat_id: chatId,
  });
}

// ═══════════════════════════════════════════════════════════════
// GROUP/CHANNEL MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get chat information
 */
export async function getChat(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<any>> {
  return telegramApi('getChat', { chat_id: chatId });
}

/**
 * Get chat administrators
 */
export async function getChatAdministrators(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<ChatMember[]>> {
  return telegramApi<ChatMember[]>('getChatAdministrators', { chat_id: chatId });
}

/**
 * Get chat member count
 */
export async function getChatMemberCount(
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<number>> {
  return telegramApi<number>('getChatMemberCount', { chat_id: chatId });
}

/**
 * Get information about a chat member
 */
export async function getChatMember(
  userId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<ChatMember>> {
  return telegramApi<ChatMember>('getChatMember', {
    chat_id: chatId,
    user_id: userId,
  });
}

/**
 * Set chat title
 */
export async function setChatTitle(
  title: string,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setChatTitle', {
    chat_id: chatId,
    title,
  });
}

/**
 * Set chat description
 */
export async function setChatDescription(
  description: string,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setChatDescription', {
    chat_id: chatId,
    description,
  });
}

/**
 * Leave a chat
 */
export async function leaveChat(chatId: string | number): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('leaveChat', { chat_id: chatId });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN CONTROLS
// ═══════════════════════════════════════════════════════════════

/**
 * Ban a user from a chat
 */
export async function banChatMember(
  userId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  untilDate?: number,
  revokeMessages: boolean = false
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('banChatMember', {
    chat_id: chatId,
    user_id: userId,
    until_date: untilDate,
    revoke_messages: revokeMessages,
  });
}

/**
 * Unban a user from a chat
 */
export async function unbanChatMember(
  userId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  onlyIfBanned: boolean = true
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('unbanChatMember', {
    chat_id: chatId,
    user_id: userId,
    only_if_banned: onlyIfBanned,
  });
}

/**
 * Restrict a user in a chat (limit what they can do)
 */
export async function restrictChatMember(
  userId: number,
  permissions: {
    can_send_messages?: boolean;
    can_send_audios?: boolean;
    can_send_documents?: boolean;
    can_send_photos?: boolean;
    can_send_videos?: boolean;
    can_send_video_notes?: boolean;
    can_send_voice_notes?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
  },
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  untilDate?: number
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('restrictChatMember', {
    chat_id: chatId,
    user_id: userId,
    permissions,
    until_date: untilDate,
  });
}

/**
 * Promote a user to admin
 */
export async function promoteChatMember(
  userId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  permissions: {
    is_anonymous?: boolean;
    can_manage_chat?: boolean;
    can_delete_messages?: boolean;
    can_manage_video_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
  } = {}
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('promoteChatMember', {
    chat_id: chatId,
    user_id: userId,
    ...permissions,
  });
}

/**
 * Set custom admin title
 */
export async function setChatAdministratorCustomTitle(
  userId: number,
  customTitle: string,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setChatAdministratorCustomTitle', {
    chat_id: chatId,
    user_id: userId,
    custom_title: customTitle,
  });
}

/**
 * Delete a message
 */
export async function deleteMessage(
  messageId: number,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Delete multiple messages at once
 */
export async function deleteMessages(
  messageIds: number[],
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('deleteMessages', {
    chat_id: chatId,
    message_ids: messageIds,
  });
}

// ═══════════════════════════════════════════════════════════════
// TRADING ALERTS (HIGH-LEVEL HELPERS)
// ═══════════════════════════════════════════════════════════════

/**
 * Send a trade alert notification
 */
export async function sendTradeAlert(alert: TradeAlert): Promise<TelegramResponse<MessageResult>> {
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

  return sendMessage({
    text,
    message_thread_id: alert.threadId,
  });
}

/**
 * Send a system alert notification
 */
export async function sendSystemAlert(
  alert: SystemAlert
): Promise<TelegramResponse<MessageResult>> {
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
    message_thread_id: alert.threadId,
  });
}

/**
 * Send daily performance summary
 */
export async function sendDailySummary(
  stats: {
    totalTrades: number;
    winRate: number;
    pnl: number;
    bestTrade: number;
    worstTrade: number;
  },
  threadId?: number
): Promise<TelegramResponse<MessageResult>> {
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

  return sendMessage({ text, message_thread_id: threadId });
}

/**
 * Send health check notification
 */
export async function sendHealthCheck(threadId?: number): Promise<TelegramResponse<MessageResult>> {
  const text = `
🏥 <b>HEALTH CHECK</b>

<b>Status:</b> Online ✅
<b>Server:</b> trader-analyzer
<b>Uptime:</b> ${Math.floor(process.uptime() / 60)} minutes

<i>${new Date().toISOString()}</i>
`.trim();

  return sendMessage({ text, disable_notification: true, message_thread_id: threadId });
}

// ═══════════════════════════════════════════════════════════════
// BOT INFO & UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get bot info for verification
 */
export async function getBotInfo(): Promise<TelegramResponse<any>> {
  return telegramApi('getMe');
}

/**
 * Get recent updates (for finding chat ID)
 */
export async function getUpdates(
  offset?: number,
  limit: number = 100
): Promise<TelegramResponse<any[]>> {
  return telegramApi('getUpdates', { offset, limit });
}

/**
 * Set webhook URL
 */
export async function setWebhook(
  url: string,
  options: {
    certificate?: string;
    ip_address?: string;
    max_connections?: number;
    allowed_updates?: string[];
    drop_pending_updates?: boolean;
    secret_token?: string;
  } = {}
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setWebhook', { url, ...options });
}

/**
 * Delete webhook
 */
export async function deleteWebhook(
  dropPendingUpdates: boolean = false
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('deleteWebhook', { drop_pending_updates: dropPendingUpdates });
}

/**
 * Get webhook info
 */
export async function getWebhookInfo(): Promise<TelegramResponse<any>> {
  return telegramApi('getWebhookInfo');
}
