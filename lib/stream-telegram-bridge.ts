/**
 * Stream-Telegram Bridge - Connects BinaryStreamManager to ThreadManager
 * Routes stream consumers (alerts, trades, errors) to Telegram forum topics
 * [#REF:STREAM-TEL-BRIDGE:0x53544252]
 */

import { BinaryStreamManager, ExchangeMessage, StreamConsumer } from './binary-utils';
import { ThreadManagerClass } from './thread-manager';
import { sendToThread, sendMessage } from './telegram';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface StreamTelegramConfig {
  /** Default chat ID for routing */
  defaultChatId: number;
  /** Enable/disable specific consumer types */
  enabledConsumers: {
    alerts: boolean;
    analytics: boolean;
    trades: boolean;
    errors: boolean;
    system: boolean;
    general: boolean;
    cache: boolean;
    processor: boolean;
    ui: boolean;
  };
  /** Message formatting options */
  formatting: {
    includeMetadata: boolean;
    includeTimestamp: boolean;
    includeExchange: boolean;
    maxMessageLength: number;
  };
  /** Rate limiting */
  rateLimit: {
    messagesPerSecond: number;
    burstLimit: number;
  };
}

export interface BridgeStats {
  messagesRouted: number;
  messagesDropped: number;
  lastRouteTime: number;
  errors: number;
  consumerStats: Record<string, {
    processed: number;
    routed: number;
    failed: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// STREAM-TELEGRAM BRIDGE
// ═══════════════════════════════════════════════════════════════

export class StreamTelegramBridge {
  private streamManager: BinaryStreamManager;
  private threadManager: ThreadManagerClass;
  private config: StreamTelegramConfig;
  private stats: BridgeStats;
  private rateLimitTracker: Map<string, number[]> = new Map();
  private isEnabled = true;

  constructor(
    streamManager: BinaryStreamManager,
    threadManager: ThreadManagerClass,
    config: Partial<StreamTelegramConfig> = {}
  ) {
    this.streamManager = streamManager;
    this.threadManager = threadManager;
    this.config = {
      defaultChatId: 8013171035, // From thread-manager.json
      enabledConsumers: {
        alerts: true,
        analytics: false,
        trades: true,
        errors: true,
        system: false,
        general: true,
        cache: false,
        processor: false,
        ui: false,
      },
      formatting: {
        includeMetadata: true,
        includeTimestamp: true,
        includeExchange: true,
        maxMessageLength: 4000,
      },
      rateLimit: {
        messagesPerSecond: 5,
        burstLimit: 10,
      },
      ...config,
    };

    this.stats = {
      messagesRouted: 0,
      messagesDropped: 0,
      lastRouteTime: Date.now(),
      errors: 0,
      consumerStats: {},
    };

    this.initializeConsumerStats();
  }

  /**
   * Initialize stats tracking for all consumer types
   */
  private initializeConsumerStats(): void {
    const consumerTypes = ['alerts', 'analytics', 'cache', 'processor', 'ui'];
    for (const type of consumerTypes) {
      this.stats.consumerStats[type] = {
        processed: 0,
        routed: 0,
        failed: 0,
      };
    }
  }

  /**
   * Enable/disable the bridge
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Stream-Telegram bridge ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Bridge a stream consumer to Telegram
   */
  async bridgeConsumer(
    consumerKey: string,
    consumer: StreamConsumer,
    chatId?: number
  ): Promise<void> {
    const targetChatId = chatId || this.config.defaultChatId;
    const consumerType = consumer.type;

    // Check if this consumer type is enabled and valid
    if (!this.config.enabledConsumers[consumerType as keyof typeof this.config.enabledConsumers]) {
      logger.debug(`Consumer type ${consumerType} is disabled, skipping bridge`);
      return;
    }

    // Get thread ID for this consumer type
    const threadId = this.getThreadIdForConsumer(targetChatId, consumerType);
    if (!threadId) {
      logger.warn(`No thread found for consumer type ${consumerType} in chat ${targetChatId}`);
      return;
    }

    logger.info(`Bridging consumer ${consumerKey} (${consumerType}) to Telegram thread ${threadId || 'general'}`);

    // Set up message forwarding
    await this.setupMessageForwarding(consumerKey, consumer, targetChatId, threadId);
  }

  /**
   * Get thread ID for consumer type
   */
  private getThreadIdForConsumer(chatId: number, consumerType: string): number | null {
    switch (consumerType) {
      case 'alerts':
        return this.threadManager.getAlertsThread(chatId) ?? null;
      case 'analytics':
        return this.threadManager.getThreadForPurpose(chatId, 'analytics') ?? null;
      case 'trades':
        return this.threadManager.getThreadForPurpose(chatId, 'trades') ?? null;
      case 'errors':
        return this.threadManager.getThreadForPurpose(chatId, 'system') ?? null;
      case 'system':
        return this.threadManager.getThreadForPurpose(chatId, 'system') ?? null;
      case 'general':
        return null; // General chat uses no thread
      case 'cache':
      case 'processor':
      case 'ui':
        return null; // These don't have specific threads
      default:
        return null; // Unsupported type
    }
  }

  /**
   * Set up message forwarding for a consumer
   */
  private async setupMessageForwarding(
    consumerKey: string,
    consumer: StreamConsumer,
    chatId: number,
    threadId: number | null
  ): Promise<void> {
    // Create a custom transform that forwards to Telegram
    const telegramTransform = (message: ExchangeMessage): ExchangeMessage => {
      // Update stats
      this.stats.consumerStats[consumer.type].processed++;
      this.stats.lastRouteTime = Date.now();

      // Check rate limiting
      if (!this.checkRateLimit(consumer.type)) {
        this.stats.messagesDropped++;
        this.stats.consumerStats[consumer.type].failed++;
        return message;
      }

      // Format and send to Telegram
      this.sendToTelegram(message, consumer.type, chatId, threadId)
        .then(() => {
          this.stats.messagesRouted++;
          this.stats.consumerStats[consumer.type].routed++;
        })
        .catch((error) => {
          this.stats.errors++;
          this.stats.consumerStats[consumer.type].failed++;
          logger.error('Failed to send message to Telegram', { error, consumerKey, messageType: message.type });
        });

      // Return original message (don't transform)
      return message;
    };

    // Apply the transform to the consumer
    if (consumer.transform) {
      const originalTransform = consumer.transform;
      consumer.transform = (message) => {
        const transformed = originalTransform(message);
        return telegramTransform(transformed);
      };
    } else {
      consumer.transform = telegramTransform;
    }
  }

  /**
   * Check rate limiting for a consumer type
   */
  private checkRateLimit(consumerType: string): boolean {
    const now = Date.now();
    const key = consumerType;
    const timestamps = this.rateLimitTracker.get(key) || [];

    // Clean old timestamps (older than 1 second)
    const oneSecondAgo = now - 1000;
    const recent = timestamps.filter(t => t > oneSecondAgo);

    // Check if we're over the limit
    if (recent.length >= this.config.rateLimit.messagesPerSecond) {
      return false;
    }

    // Add current timestamp
    recent.push(now);
    this.rateLimitTracker.set(key, recent);

    return true;
  }

  /**
   * Send message to Telegram
   */
  private async sendToTelegram(
    message: ExchangeMessage,
    consumerType: string,
    chatId: number,
    threadId: number | null
  ): Promise<void> {
    const formattedMessage = this.formatMessage(message, consumerType);
    
    if (threadId) {
      // Send to specific thread
      await sendToThread(threadId, formattedMessage, {
        parse_mode: 'Markdown',
      });
    } else {
      // Send to general chat (no thread)
      await sendMessage({
        text: formattedMessage,
        parse_mode: 'Markdown',
      });
    }

    // Mark thread as used
    this.threadManager.markUsed(chatId, threadId);
  }

  /**
   * Format message for Telegram
   */
  private formatMessage(message: ExchangeMessage, consumerType: string): string {
    const lines: string[] = [];

    // Header based on consumer type
    switch (consumerType) {
      case 'alerts':
        lines.push('🚨 *Stream Alert*');
        break;
      case 'trades':
        lines.push('💰 *Trade Update*');
        break;
      case 'errors':
        lines.push('❌ *Stream Error*');
        break;
      case 'analytics':
        lines.push('📊 *Analytics Update*');
        break;
      default:
        lines.push('📡 *Stream Message*');
    }

    lines.push('');

    // Exchange and symbol
    if (this.config.formatting.includeExchange) {
      lines.push(`🏢 ${message.exchange.toUpperCase()}`);
    }
    lines.push(`📈 ${message.symbol}`);

    // Message type and data
    lines.push(`📝 Type: ${message.type}`);
    
    if (message.data && typeof message.data === 'object') {
      // Add key data points
      if ('price' in message.data) {
        lines.push(`💵 Price: ${message.data.price}`);
      }
      if ('volume' in message.data) {
        lines.push(`📊 Volume: ${message.data.volume}`);
      }
      if ('side' in message.data) {
        lines.push(`⬆️ Side: ${message.data.side}`);
      }
    }

    // Timestamp
    if (this.config.formatting.includeTimestamp) {
      const time = new Date(message.timestamp).toLocaleTimeString();
      lines.push(`⏰ ${time}`);
    }

    // Metadata
    if (this.config.formatting.includeMetadata && message.metadata) {
      const metadata = Object.entries(message.metadata)
        .slice(0, 3) // Limit to 3 metadata fields
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (metadata) {
        lines.push(`ℹ️ ${metadata}`);
      }
    }

    let formatted = lines.join('\n');

    // Truncate if too long
    if (formatted.length > this.config.formatting.maxMessageLength) {
      formatted = formatted.substring(0, this.config.formatting.maxMessageLength - 3) + '...';
    }

    return formatted;
  }

  /**
   * Get bridge statistics
   */
  getStats(): BridgeStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.messagesRouted = 0;
    this.stats.messagesDropped = 0;
    this.stats.errors = 0;
    this.initializeConsumerStats();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<StreamTelegramConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Stream-Telegram bridge config updated', { updates });
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════

/**
 * Create and configure a Stream-Telegram bridge
 */
export function createStreamTelegramBridge(
  streamManager: BinaryStreamManager,
  threadManager: ThreadManagerClass,
  config?: Partial<StreamTelegramConfig>
): StreamTelegramBridge {
  return new StreamTelegramBridge(streamManager, threadManager, config);
}
