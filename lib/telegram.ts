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
// CUSTOM ERRORS
// ═══════════════════════════════════════════════════════════════

export class TelegramError extends Error {
  constructor(
    message: string,
    public code?: number,
    public description?: string
  ) {
    super(message);
    this.name = 'TelegramError';
  }
}

export class TelegramRateLimitError extends TelegramError {
  constructor(
    description: string,
    public retryAfter?: number
  ) {
    super(`Rate limit exceeded: ${description}`, 429, description);
    this.name = 'TelegramRateLimitError';
  }
}

export class TelegramAuthError extends TelegramError {
  constructor(description: string) {
    super(`Authentication failed: ${description}`, 401, description);
    this.name = 'TelegramAuthError';
  }
}

export class TelegramValidationError extends TelegramError {
  constructor(description: string) {
    super(`Validation error: ${description}`, 400, description);
    this.name = 'TelegramValidationError';
  }
}

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

export interface TelegramResponse<T = unknown> {
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

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
  active_usernames?: string[];
  emoji_status_custom_emoji_id?: string;
  bio?: string;
  has_private_forwards?: boolean;
  has_restricted_voice_and_video_messages?: boolean;
  join_to_send_messages?: boolean;
  join_by_request?: boolean;
  description?: string;
  invite_link?: string;
  pinned_message?: MessageResult;
  permissions?: ChatPermissions;
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  has_aggressive_anti_spam_enabled?: boolean;
  has_hidden_members?: boolean;
  has_protected_content?: boolean;
  sticker_set_name?: string;
  can_set_sticker_set?: boolean;
  linked_chat_id?: number;
  location?: ChatLocation;
}

export interface ChatPermissions {
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
}

export interface ChatLocation {
  location: {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
  };
  address: string;
}

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface Update {
  update_id: number;
  message?: MessageResult;
  edited_message?: MessageResult;
  channel_post?: MessageResult;
  edited_channel_post?: MessageResult;
  inline_query?: InlineQuery;
  chosen_inline_result?: ChosenInlineResult;
  callback_query?: CallbackQuery;
  shipping_query?: ShippingQuery;
  pre_checkout_query?: PreCheckoutQuery;
  poll?: Poll;
  poll_answer?: PollAnswer;
  my_chat_member?: ChatMemberUpdated;
  chat_member?: ChatMemberUpdated;
  chat_join_request?: ChatJoinRequest;
}

export interface InlineQuery {
  id: string;
  from: User;
  query: string;
  offset: string;
  chat_type?: string;
  location?: {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
  };
}

export interface ChosenInlineResult {
  result_id: string;
  from: User;
  location?: {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
  };
  inline_message_id?: string;
  query: string;
}

export interface CallbackQuery {
  id: string;
  from: User;
  message?: MessageResult;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface ShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
  };
}

export interface PreCheckoutQuery {
  id: string;
  from: User;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: OrderInfo;
}

export interface OrderInfo {
  name?: string;
  phone_number?: string;
  email?: string;
  shipping_address?: {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
  };
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: MessageEntity[];
  open_period?: number;
  close_date?: number;
}

export interface PollOption {
  text: string;
  voter_count: number;
}

export interface PollAnswer {
  poll_id: string;
  user: User;
  option_ids: number[];
}

export interface ChatMemberUpdated {
  chat: Chat;
  from: User;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: ChatInviteLink;
}

export interface ChatInviteLink {
  invite_link: string;
  creator: User;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

export interface ChatJoinRequest {
  chat: Chat;
  from: User;
  user_chat_id: number;
  date: number;
  bio?: string;
  invite_link?: ChatInviteLink;
}

export interface MessageEntity {
  type:
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bot_command'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'spoiler'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'text_mention';
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
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
// CONFIGURATION & UTILITIES
// ═══════════════════════════════════════════════════════════════

interface TelegramConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

const DEFAULT_CONFIG: TelegramConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  timeout: 30000, // 30 seconds
  rateLimit: {
    maxRequests: 20, // Conservative limit (Telegram allows ~30/sec)
    windowMs: 1000, // 1 second window
  },
  logging: {
    enabled: false,
    level: 'error',
  },
};

let telegramConfig = { ...DEFAULT_CONFIG };

// Rate limiting state
let rateLimitTokens = telegramConfig.rateLimit.maxRequests;
let lastRefillTime = Date.now();

/**
 * Configure Telegram API behavior
 */
export function configureTelegram(config: Partial<TelegramConfig>): void {
  telegramConfig = { ...telegramConfig, ...config };
}

// Logging utilities
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level: keyof typeof LOG_LEVELS, message: string, data?: any): void {
  if (
    !telegramConfig.logging.enabled ||
    LOG_LEVELS[level] > LOG_LEVELS[telegramConfig.logging.level]
  ) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  } else if (!TELEGRAM_BOT_TOKEN.startsWith('bot') || TELEGRAM_BOT_TOKEN.length < 45) {
    errors.push(
      'TELEGRAM_BOT_TOKEN appears to be invalid (should start with "bot" and be at least 45 characters)'
    );
  }

  if (!TELEGRAM_CHAT_ID) {
    errors.push('TELEGRAM_CHAT_ID is required');
  } else {
    const chatId = TELEGRAM_CHAT_ID;
    if (typeof chatId === 'string' && !validateChatId(chatId)) {
      errors.push('TELEGRAM_CHAT_ID appears to be invalid');
    }
  }

  // Optional but validate if present
  if (TELEGRAM_CHANNEL_ID && !validateChatId(TELEGRAM_CHANNEL_ID)) {
    errors.push('TELEGRAM_CHANNEL_ID appears to be invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number): number {
  const delay = telegramConfig.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, telegramConfig.maxDelay);
}

/**
 * Check and consume rate limit token
 */
function checkRateLimit(): number | null {
  const now = Date.now();
  const timePassed = now - lastRefillTime;
  const tokensToAdd =
    Math.floor(timePassed / telegramConfig.rateLimit.windowMs) *
    telegramConfig.rateLimit.maxRequests;

  if (tokensToAdd > 0) {
    rateLimitTokens = Math.min(telegramConfig.rateLimit.maxRequests, rateLimitTokens + tokensToAdd);
    lastRefillTime = now;
  }

  if (rateLimitTokens > 0) {
    rateLimitTokens--;
    return null; // Allow request
  }

  // Calculate wait time for next token
  const waitTime =
    telegramConfig.rateLimit.windowMs - (timePassed % telegramConfig.rateLimit.windowMs);
  return waitTime;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Validate and normalize a chat ID
 */
export function normalizeChatId(chatId: string | number): string | number {
  if (typeof chatId === 'string') {
    // Remove @ prefix if present for consistency
    return chatId.startsWith('@') ? chatId : chatId;
  }
  return chatId;
}

/**
 * Format a number with appropriate decimal places and thousand separators
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currency === 'USD' ? '$' : currency + ' '}${formatNumber(amount)}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value, decimals)}%`;
}

/**
 * Create a formatted timestamp string
 */
export function formatTimestamp(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Escape HTML characters for safe message sending
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Create a simple inline keyboard from button definitions
 */
export function createInlineKeyboard(
  buttons: Array<{ text: string; callbackData?: string; url?: string }>
): InlineKeyboardButton[][] {
  return [
    buttons.map(btn => ({
      text: btn.text,
      callback_data: btn.callbackData,
      url: btn.url,
    })),
  ];
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK SECURITY
// ═══════════════════════════════════════════════════════════════

/**
 * Validate webhook request (basic security checks)
 */
export function validateWebhookRequest(
  request: {
    body: any;
    headers: Record<string, string>;
    method: string;
    url: string;
  },
  options: {
    secretToken?: string;
    allowedIPs?: string[];
    maxBodySize?: number;
  } = {}
): { valid: boolean; reason?: string } {
  // Check HTTP method
  if (request.method !== 'POST') {
    return { valid: false, reason: 'Invalid HTTP method' };
  }

  // Check content type
  const contentType = request.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return { valid: false, reason: 'Invalid content type' };
  }

  // Check body size
  if (options.maxBodySize && JSON.stringify(request.body).length > options.maxBodySize) {
    return { valid: false, reason: 'Request body too large' };
  }

  // Validate secret token if provided
  if (options.secretToken) {
    const authHeader =
      request.headers['authorization'] || request.headers['x-telegram-bot-api-secret-token'];
    if (!authHeader || authHeader !== options.secretToken) {
      return { valid: false, reason: 'Invalid secret token' };
    }
  }

  // Basic structure validation for Telegram webhook
  if (!request.body || typeof request.body !== 'object') {
    return { valid: false, reason: 'Invalid request body' };
  }

  // Check for required Telegram webhook fields
  if (!request.body.update_id) {
    return { valid: false, reason: 'Missing update_id' };
  }

  return { valid: true };
}

/**
 * Generate a simple HMAC signature for webhook verification
 * Note: Telegram doesn't provide built-in signatures, this is for custom implementations
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  // Simple HMAC-like implementation (for demonstration)
  // In production, use crypto.createHmac
  let hash = 0;
  const combined = payload + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Validate chat ID
 */
function validateChatId(chatId: string | number | undefined): boolean {
  if (!chatId) return false;
  if (typeof chatId === 'string') {
    return (
      chatId.length > 0 &&
      (chatId.startsWith('@') || chatId.startsWith('-') || /^\d+$/.test(chatId))
    );
  }
  if (typeof chatId === 'number') {
    return chatId !== 0;
  }
  return false;
}

/**
 * Validate message ID
 */
function validateMessageId(messageId: number): boolean {
  return typeof messageId === 'number' && messageId > 0;
}

// ═══════════════════════════════════════════════════════════════
// CORE API HELPER
// ═══════════════════════════════════════════════════════════════

async function telegramApi<T = any>(
  method: string,
  params: Record<string, any> = {},
  attempt: number = 0
): Promise<TelegramResponse<T>> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new TelegramAuthError('Bot token not configured');
  }

  // Check rate limit
  const waitTime = checkRateLimit();
  if (waitTime !== null) {
    log('debug', `Rate limited, waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  log('debug', `Calling ${method}`, { params, attempt });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), telegramConfig.timeout);

    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result: TelegramResponse<T> = await response.json();

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      log('warn', `Rate limit hit for ${method}, retry after ${retryAfter}s`);
      throw new TelegramRateLimitError(result.description || 'Rate limit exceeded', retryAfter);
    }

    // Handle other HTTP errors
    if (!response.ok) {
      switch (response.status) {
        case 401:
        case 403:
          throw new TelegramAuthError(result.description || 'Authentication failed');
        case 400:
          throw new TelegramValidationError(result.description || 'Invalid request');
        default:
          throw new TelegramError(
            result.description || `HTTP ${response.status}`,
            response.status,
            result.description
          );
      }
    }

    // Handle API-level errors
    if (!result.ok) {
      switch (result.error_code) {
        case 429:
          throw new TelegramRateLimitError(result.description || 'Rate limit exceeded');
        case 401:
        case 403:
          throw new TelegramAuthError(result.description || 'Authentication failed');
        case 400:
          throw new TelegramValidationError(result.description || 'Invalid request');
        default:
          throw new TelegramError(
            result.description || 'API error',
            result.error_code,
            result.description
          );
      }
    }

    return result;
  } catch (error) {
    // Handle network errors and timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TelegramError('Request timeout', 408, 'Request timed out');
    }

    // Retry logic for retryable errors
    if (
      error instanceof TelegramRateLimitError ||
      (error instanceof TelegramError && error.code && error.code >= 500) ||
      (error instanceof Error && error.message.includes('fetch'))
    ) {
      if (attempt < telegramConfig.maxRetries) {
        const delay =
          error instanceof TelegramRateLimitError && error.retryAfter
            ? error.retryAfter * 1000
            : calculateDelay(attempt);

        log(
          'warn',
          `Retrying ${method} in ${delay}ms (attempt ${attempt + 1}/${telegramConfig.maxRetries})`,
          { error: error.message }
        );
        await sleep(delay);
        return telegramApi<T>(method, params, attempt + 1);
      }
    }

    // Re-throw if not retryable or max retries reached
    if (error instanceof TelegramError) {
      throw error;
    }

    // Wrap unknown errors
    throw new TelegramError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE SENDING
// ═══════════════════════════════════════════════════════════════

/**
 * Send a message to a chat or thread
 *
 * @param message - The message configuration including text and optional formatting
 * @param chatId - Target chat ID (defaults to TELEGRAM_CHAT_ID env var)
 * @returns Promise resolving to Telegram API response with message result
 *
 * @example
 * ```typescript
 * const response = await sendMessage({
 *   text: "Hello, world!",
 *   parse_mode: "HTML"
 * });
 * ```
 */
export async function sendMessage(
  message: TelegramMessage,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  try {
    return await telegramApi<MessageResult>('sendMessage', {
      chat_id: chatId,
      text: message.text,
      parse_mode: message.parse_mode || 'HTML',
      disable_notification: message.disable_notification || false,
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.reply_to_message_id,
      protect_content: message.protect_content,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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
  if (!validateMessageId(messageId)) {
    return { ok: false, description: 'Invalid message ID' };
  }

  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<boolean>('pinChatMessage', {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: disableNotification,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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
): Promise<TelegramResponse<Chat>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<Chat>('getChat', { chat_id: chatId });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  if (typeof userId !== 'number' || userId <= 0) {
    return { ok: false, description: 'Invalid user ID' };
  }

  if (
    untilDate !== undefined &&
    (typeof untilDate !== 'number' || untilDate <= Date.now() / 1000)
  ) {
    return { ok: false, description: 'Invalid until date - must be a future Unix timestamp' };
  }

  try {
    return await telegramApi<boolean>('banChatMember', {
      chat_id: chatId,
      user_id: userId,
      until_date: untilDate,
      revoke_messages: revokeMessages,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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
  if (!validateMessageId(messageId)) {
    return { ok: false, description: 'Invalid message ID' };
  }

  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<boolean>('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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
 * Send a trade alert notification with formatted message
 *
 * @param alert - Trade alert configuration
 * @param alert.type - Type of trade alert (entry, exit, stop_loss, take_profit, liquidation)
 * @param alert.symbol - Trading symbol (e.g., "BTC/USD")
 * @param alert.side - Trade side (long or short)
 * @param alert.price - Trade execution price
 * @param alert.size - Trade size/quantity
 * @param alert.pnl - Optional profit/loss amount
 * @param alert.timestamp - Optional timestamp (defaults to current time)
 * @param alert.threadId - Optional forum thread ID for organization
 * @returns Promise resolving to Telegram API response
 *
 * @example
 * ```typescript
 * await sendTradeAlert({
 *   type: 'entry',
 *   symbol: 'BTC/USD',
 *   side: 'long',
 *   price: 45000,
 *   size: 0.1,
 *   threadId: 12345
 * });
 * ```
 */
export async function sendTradeAlert(alert: TradeAlert): Promise<TelegramResponse<MessageResult>> {
  // Validate input
  if (
    !alert.symbol ||
    !alert.side ||
    typeof alert.price !== 'number' ||
    typeof alert.size !== 'number'
  ) {
    return {
      ok: false,
      description: 'Invalid trade alert data: missing required fields',
    };
  }

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
 * Send health check notification with system metrics
 */
export async function sendHealthCheck(threadId?: number): Promise<TelegramResponse<MessageResult>> {
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
  };

  const text = `
🏥 <b>HEALTH CHECK</b>

<b>Status:</b> Online ✅
<b>Server:</b> trader-analyzer
<b>Uptime:</b> ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s

<b>Memory Usage:</b>
• RSS: ${memUsageMB.rss} MB
• Heap Used: ${memUsageMB.heapUsed} MB
• Heap Total: ${memUsageMB.heapTotal} MB

<b>Environment:</b> ${process.env.NODE_ENV || 'development'}
<b>Platform:</b> ${process.platform} ${process.arch}

<i>${formatTimestamp()}</i>
`.trim();

  return sendMessage({ text, disable_notification: true, message_thread_id: threadId });
}

// ═══════════════════════════════════════════════════════════════
// BOT INFO & UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get bot info for verification
 */
export async function getBotInfo(): Promise<TelegramResponse<User>> {
  try {
    return await telegramApi<User>('getMe');
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Get recent updates (for finding chat ID or polling)
 */
export async function getUpdates(
  offset?: number,
  limit: number = 100,
  timeout: number = 30
): Promise<TelegramResponse<Update[]>> {
  try {
    return await telegramApi<Update[]>('getUpdates', {
      offset,
      limit,
      timeout, // Long polling timeout
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
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

// ═══════════════════════════════════════════════════════════════
// MINI APP (WEB APP) SUPPORT
// ═══════════════════════════════════════════════════════════════

export interface WebAppInfo {
  url: string;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: WebAppInfo;
  login_url?: { url: string };
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Send message with Mini App button
 */
export async function sendWithMiniApp(
  text: string,
  webAppUrl: string,
  buttonText: string = 'Open App',
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  threadId?: number
): Promise<TelegramResponse<MessageResult>> {
  return telegramApi<MessageResult>('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    message_thread_id: threadId,
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, web_app: { url: webAppUrl } }]],
    },
  });
}

/**
 * Send message with inline keyboard
 */
export async function sendWithKeyboard(
  text: string,
  keyboard: InlineKeyboardButton[][],
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    threadId?: number;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  try {
    return await telegramApi<MessageResult>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || 'HTML',
      message_thread_id: options.threadId,
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Edit message reply markup (buttons)
 */
export async function editMessageReplyMarkup(
  messageId: number,
  keyboard: InlineKeyboardButton[][] | null,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  return telegramApi<MessageResult>('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

/**
 * Answer callback query (when user clicks inline button)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  options: {
    text?: string;
    show_alert?: boolean;
    url?: string;
    cache_time?: number;
  } = {}
): Promise<TelegramResponse<boolean>> {
  try {
    return await telegramApi<boolean>('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Set bot menu button (Mini App launcher)
 */
export async function setChatMenuButton(
  chatId?: string | number,
  menuButton?: {
    type: 'commands' | 'web_app' | 'default';
    text?: string;
    web_app?: WebAppInfo;
  }
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setChatMenuButton', {
    chat_id: chatId,
    menu_button: menuButton,
  });
}

/**
 * Get bot menu button
 */
export async function getChatMenuButton(chatId?: string | number): Promise<TelegramResponse<any>> {
  return telegramApi('getChatMenuButton', { chat_id: chatId });
}

// ═══════════════════════════════════════════════════════════════
// CHANNEL SUPPORT
// ═══════════════════════════════════════════════════════════════

const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

/**
 * Send message to channel
 */
export async function sendToChannel(
  text: string,
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableNotification?: boolean;
    protectContent?: boolean;
    keyboard?: InlineKeyboardButton[][];
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!TELEGRAM_CHANNEL_ID) {
    return { ok: false, description: 'Channel ID not configured' };
  }

  return telegramApi<MessageResult>('sendMessage', {
    chat_id: TELEGRAM_CHANNEL_ID,
    text,
    parse_mode: options.parseMode || 'HTML',
    disable_notification: options.disableNotification,
    protect_content: options.protectContent,
    reply_markup: options.keyboard ? { inline_keyboard: options.keyboard } : undefined,
  });
}

/**
 * Forward message to channel
 */
export async function forwardToChannel(
  fromChatId: string | number,
  messageId: number
): Promise<TelegramResponse<MessageResult>> {
  if (!TELEGRAM_CHANNEL_ID) {
    return { ok: false, description: 'Channel ID not configured' };
  }

  return telegramApi<MessageResult>('forwardMessage', {
    chat_id: TELEGRAM_CHANNEL_ID,
    from_chat_id: fromChatId,
    message_id: messageId,
  });
}

/**
 * Get channel info
 */
export async function getChannelInfo(): Promise<TelegramResponse<any>> {
  if (!TELEGRAM_CHANNEL_ID) {
    return { ok: false, description: 'Channel ID not configured' };
  }

  return telegramApi('getChat', { chat_id: TELEGRAM_CHANNEL_ID });
}

/**
 * Get channel member count
 */
export async function getChannelMemberCount(): Promise<TelegramResponse<number>> {
  if (!TELEGRAM_CHANNEL_ID) {
    return { ok: false, description: 'Channel ID not configured' };
  }

  return telegramApi<number>('getChatMemberCount', { chat_id: TELEGRAM_CHANNEL_ID });
}

// ═══════════════════════════════════════════════════════════════
// INLINE QUERIES
// ═══════════════════════════════════════════════════════════════

export interface InlineQueryResult {
  type: 'article' | 'photo' | 'gif' | 'video' | 'audio' | 'document';
  id: string;
  title?: string;
  description?: string;
  thumb_url?: string;
  input_message_content?: {
    message_text: string;
    parse_mode?: string;
  };
  reply_markup?: InlineKeyboardMarkup;
}

/**
 * Answer inline query
 */
export async function answerInlineQuery(
  inlineQueryId: string,
  results: InlineQueryResult[],
  options: {
    cache_time?: number;
    is_personal?: boolean;
    next_offset?: string;
    button?: {
      text: string;
      web_app?: WebAppInfo;
      start_parameter?: string;
    };
  } = {}
): Promise<TelegramResponse<boolean>> {
  try {
    return await telegramApi<boolean>('answerInlineQuery', {
      inline_query_id: inlineQueryId,
      results,
      ...options,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// BOT COMMANDS
// ═══════════════════════════════════════════════════════════════

export interface BotCommand {
  command: string;
  description: string;
}

/**
 * Set bot commands
 */
export async function setMyCommands(
  commands: BotCommand[],
  scope?: {
    type:
      | 'default'
      | 'all_private_chats'
      | 'all_group_chats'
      | 'all_chat_administrators'
      | 'chat'
      | 'chat_administrators'
      | 'chat_member';
    chat_id?: string | number;
    user_id?: number;
  },
  languageCode?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setMyCommands', {
    commands,
    scope,
    language_code: languageCode,
  });
}

/**
 * Get bot commands
 */
export async function getMyCommands(
  scope?: {
    type: string;
    chat_id?: string | number;
    user_id?: number;
  },
  languageCode?: string
): Promise<TelegramResponse<BotCommand[]>> {
  return telegramApi<BotCommand[]>('getMyCommands', {
    scope,
    language_code: languageCode,
  });
}

/**
 * Delete bot commands
 */
export async function deleteMyCommands(
  scope?: {
    type: string;
    chat_id?: string | number;
    user_id?: number;
  },
  languageCode?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('deleteMyCommands', {
    scope,
    language_code: languageCode,
  });
}

/**
 * Set bot name
 */
export async function setMyName(
  name: string,
  languageCode?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setMyName', {
    name,
    language_code: languageCode,
  });
}

/**
 * Set bot description
 */
export async function setMyDescription(
  description: string,
  languageCode?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setMyDescription', {
    description,
    language_code: languageCode,
  });
}

/**
 * Set bot short description (shown in profile)
 */
export async function setMyShortDescription(
  shortDescription: string,
  languageCode?: string
): Promise<TelegramResponse<boolean>> {
  return telegramApi<boolean>('setMyShortDescription', {
    short_description: shortDescription,
    language_code: languageCode,
  });
}

// ═══════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

export interface BatchMessageResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    messageId?: number;
    error?: string;
  }>;
}

/**
 * Send multiple messages in batch with rate limiting
 *
 * @param messages - Array of messages to send
 * @param chatId - Target chat ID
 * @param options - Batch options
 * @returns Aggregated results for all messages
 *
 * @example
 * ```typescript
 * const results = await sendBatchMessages([
 *   { text: 'Message 1' },
 *   { text: 'Message 2' },
 *   { text: 'Message 3' },
 * ]);
 * console.log(`Sent ${results.successful}/${results.total} messages`);
 * ```
 */
export async function sendBatchMessages(
  messages: TelegramMessage[],
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    delayBetween?: number; // ms between messages (default 50)
    stopOnError?: boolean; // stop if any message fails (default false)
    concurrency?: number; // max concurrent messages (default 1)
  } = {}
): Promise<BatchMessageResult> {
  const { delayBetween = 50, stopOnError = false, concurrency = 1 } = options;

  const result: BatchMessageResult = {
    total: messages.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  if (concurrency === 1) {
    // Sequential processing
    for (let i = 0; i < messages.length; i++) {
      try {
        const response = await sendMessage(messages[i], chatId);

        if (response.ok && response.result) {
          result.successful++;
          result.results.push({
            index: i,
            success: true,
            messageId: response.result.message_id,
          });
        } else {
          result.failed++;
          result.results.push({
            index: i,
            success: false,
            error: response.description || 'Unknown error',
          });

          if (stopOnError) break;
        }

        // Delay between messages
        if (i < messages.length - 1 && delayBetween > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      } catch (error) {
        result.failed++;
        result.results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (stopOnError) break;
      }
    }
  } else {
    // Concurrent processing with limited concurrency
    const chunks: TelegramMessage[][] = [];
    for (let i = 0; i < messages.length; i += concurrency) {
      chunks.push(messages.slice(i, i + concurrency));
    }

    let baseIndex = 0;
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map((msg, idx) =>
          sendMessage(msg, chatId).then(response => ({
            index: baseIndex + idx,
            response,
          }))
        )
      );

      for (const settled of chunkResults) {
        if (settled.status === 'fulfilled') {
          const { index, response } = settled.value;
          if (response.ok && response.result) {
            result.successful++;
            result.results.push({
              index,
              success: true,
              messageId: response.result.message_id,
            });
          } else {
            result.failed++;
            result.results.push({
              index,
              success: false,
              error: response.description || 'Unknown error',
            });
          }
        } else {
          result.failed++;
          result.results.push({
            index: baseIndex,
            success: false,
            error: settled.reason?.message || 'Unknown error',
          });
        }
      }

      baseIndex += chunk.length;

      // Delay between batches
      if (delayBetween > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }

      if (stopOnError && result.failed > 0) break;
    }
  }

  return result;
}

/**
 * Send message to multiple chats
 *
 * @param message - Message to broadcast
 * @param chatIds - Array of target chat IDs
 * @param options - Broadcast options
 * @returns Aggregated results for all chats
 */
export async function broadcastMessage(
  message: TelegramMessage,
  chatIds: (string | number)[],
  options: {
    delayBetween?: number;
    stopOnError?: boolean;
  } = {}
): Promise<BatchMessageResult> {
  const { delayBetween = 100, stopOnError = false } = options;

  const result: BatchMessageResult = {
    total: chatIds.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  for (let i = 0; i < chatIds.length; i++) {
    try {
      const response = await sendMessage(message, chatIds[i]);

      if (response.ok && response.result) {
        result.successful++;
        result.results.push({
          index: i,
          success: true,
          messageId: response.result.message_id,
        });
      } else {
        result.failed++;
        result.results.push({
          index: i,
          success: false,
          error: response.description || 'Unknown error',
        });

        if (stopOnError) break;
      }

      if (i < chatIds.length - 1 && delayBetween > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    } catch (error) {
      result.failed++;
      result.results.push({
        index: i,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (stopOnError) break;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE EDITING
// ═══════════════════════════════════════════════════════════════

/**
 * Edit a text message
 *
 * @param messageId - ID of message to edit
 * @param text - New text content
 * @param chatId - Chat containing the message
 * @param options - Edit options
 */
export async function editMessageText(
  messageId: number,
  text: string,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    replyMarkup?: InlineKeyboardMarkup;
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!validateMessageId(messageId)) {
    return { ok: false, description: 'Invalid message ID' };
  }

  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<MessageResult>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview,
      reply_markup: options.replyMarkup,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Edit message caption (for media messages)
 */
export async function editMessageCaption(
  messageId: number,
  caption: string,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: InlineKeyboardMarkup;
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!validateMessageId(messageId)) {
    return { ok: false, description: 'Invalid message ID' };
  }

  try {
    return await telegramApi<MessageResult>('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption,
      parse_mode: options.parseMode || 'HTML',
      reply_markup: options.replyMarkup,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Reply to a specific message
 *
 * @param replyToMessageId - ID of message to reply to
 * @param text - Reply text
 * @param chatId - Chat ID
 * @param options - Reply options
 */
export async function replyToMessage(
  replyToMessageId: number,
  text: string,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: Partial<TelegramMessage> = {}
): Promise<TelegramResponse<MessageResult>> {
  return sendMessage(
    {
      text,
      reply_to_message_id: replyToMessageId,
      ...options,
    },
    chatId
  );
}

// ═══════════════════════════════════════════════════════════════
// MEDIA SENDING
// ═══════════════════════════════════════════════════════════════

export interface PhotoMessage {
  photo: string; // File ID, URL, or path
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  hasSpoiler?: boolean;
  disableNotification?: boolean;
  protectContent?: boolean;
  replyToMessageId?: number;
  messageThreadId?: number;
}

export interface DocumentMessage {
  document: string; // File ID, URL, or path
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
  protectContent?: boolean;
  replyToMessageId?: number;
  messageThreadId?: number;
}

/**
 * Send a photo
 *
 * @param photo - Photo configuration
 * @param chatId - Target chat ID
 */
export async function sendPhoto(
  photo: PhotoMessage,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<MessageResult>('sendPhoto', {
      chat_id: chatId,
      photo: photo.photo,
      caption: photo.caption,
      parse_mode: photo.parseMode || 'HTML',
      has_spoiler: photo.hasSpoiler,
      disable_notification: photo.disableNotification,
      protect_content: photo.protectContent,
      reply_to_message_id: photo.replyToMessageId,
      message_thread_id: photo.messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Send a document/file
 *
 * @param document - Document configuration
 * @param chatId - Target chat ID
 */
export async function sendDocument(
  document: DocumentMessage,
  chatId: string | number = TELEGRAM_CHAT_ID || ''
): Promise<TelegramResponse<MessageResult>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<MessageResult>('sendDocument', {
      chat_id: chatId,
      document: document.document,
      caption: document.caption,
      parse_mode: document.parseMode || 'HTML',
      disable_notification: document.disableNotification,
      protect_content: document.protectContent,
      reply_to_message_id: document.replyToMessageId,
      message_thread_id: document.messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Send a location
 *
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param chatId - Target chat ID
 * @param options - Location options
 */
export async function sendLocation(
  latitude: number,
  longitude: number,
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    horizontalAccuracy?: number;
    livePeriod?: number;
    heading?: number;
    proximityAlertRadius?: number;
    disableNotification?: boolean;
    protectContent?: boolean;
    replyToMessageId?: number;
    messageThreadId?: number;
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  if (latitude < -90 || latitude > 90) {
    return { ok: false, description: 'Invalid latitude (must be between -90 and 90)' };
  }

  if (longitude < -180 || longitude > 180) {
    return { ok: false, description: 'Invalid longitude (must be between -180 and 180)' };
  }

  try {
    return await telegramApi<MessageResult>('sendLocation', {
      chat_id: chatId,
      latitude,
      longitude,
      horizontal_accuracy: options.horizontalAccuracy,
      live_period: options.livePeriod,
      heading: options.heading,
      proximity_alert_radius: options.proximityAlertRadius,
      disable_notification: options.disableNotification,
      protect_content: options.protectContent,
      reply_to_message_id: options.replyToMessageId,
      message_thread_id: options.messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Send a poll
 *
 * @param question - Poll question
 * @param pollOptions - Array of answer options
 * @param chatId - Target chat ID
 * @param options - Poll options
 */
export async function sendPoll(
  question: string,
  pollOptions: string[],
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    isAnonymous?: boolean;
    type?: 'regular' | 'quiz';
    allowsMultipleAnswers?: boolean;
    correctOptionId?: number;
    explanation?: string;
    explanationParseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    openPeriod?: number;
    closeDate?: number;
    isClosed?: boolean;
    disableNotification?: boolean;
    protectContent?: boolean;
    replyToMessageId?: number;
    messageThreadId?: number;
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  if (pollOptions.length < 2 || pollOptions.length > 10) {
    return { ok: false, description: 'Poll must have 2-10 options' };
  }

  if (question.length > 300) {
    return { ok: false, description: 'Poll question must be 300 characters or less' };
  }

  try {
    return await telegramApi<MessageResult>('sendPoll', {
      chat_id: chatId,
      question,
      options: pollOptions,
      is_anonymous: options.isAnonymous,
      type: options.type,
      allows_multiple_answers: options.allowsMultipleAnswers,
      correct_option_id: options.correctOptionId,
      explanation: options.explanation,
      explanation_parse_mode: options.explanationParseMode,
      open_period: options.openPeriod,
      close_date: options.closeDate,
      is_closed: options.isClosed,
      disable_notification: options.disableNotification,
      protect_content: options.protectContent,
      reply_to_message_id: options.replyToMessageId,
      message_thread_id: options.messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Send a dice/random animation
 *
 * @param emoji - Dice emoji
 * @param chatId - Target chat ID
 * @param options - Dice options
 */
export async function sendDice(
  emoji: string = '🎲',
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  options: {
    disableNotification?: boolean;
    protectContent?: boolean;
    replyToMessageId?: number;
    messageThreadId?: number;
  } = {}
): Promise<TelegramResponse<MessageResult>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<MessageResult>('sendDice', {
      chat_id: chatId,
      emoji,
      disable_notification: options.disableNotification,
      protect_content: options.protectContent,
      reply_to_message_id: options.replyToMessageId,
      message_thread_id: options.messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}

/**
 * Send chat action (typing indicator, etc.)
 *
 * @param action - Chat action type
 * @param chatId - Target chat ID
 * @param messageThreadId - Optional thread ID
 */
export async function sendChatAction(
  action:
    | 'typing'
    | 'upload_photo'
    | 'record_video'
    | 'upload_video'
    | 'record_voice'
    | 'upload_voice'
    | 'upload_document'
    | 'choose_sticker'
    | 'find_location'
    | 'record_video_note'
    | 'upload_video_note',
  chatId: string | number = TELEGRAM_CHAT_ID || '',
  messageThreadId?: number
): Promise<TelegramResponse<boolean>> {
  if (!validateChatId(chatId)) {
    return { ok: false, description: 'Invalid chat ID' };
  }

  try {
    return await telegramApi<boolean>('sendChatAction', {
      chat_id: chatId,
      action,
      message_thread_id: messageThreadId,
    });
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof TelegramError ? error.code : undefined,
    };
  }
}
