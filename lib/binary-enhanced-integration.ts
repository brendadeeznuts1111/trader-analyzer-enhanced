/**
 * Binary Stream Integration with Enhanced Topic Manager
 * Connects BinaryStreamManager to existing EnhancedTopicManager
 * [#REF:BIN-ENH-INT:0x42494E45]
 */

import { BinaryStreamManager, ExchangeMessage, StreamConsumer } from './binary-utils';
import { EnhancedTopicManager } from './enhanced-topic-manager';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════
// INTEGRATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface BinaryTopicConfig {
  /** Map stream consumer types to topic categories */
  consumerTopicMapping: Record<string, string>;
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

// ═══════════════════════════════════════════════════════════════
// BINARY-ENHANCED INTEGRATION
// ═══════════════════════════════════════════════════════════════

export class BinaryEnhancedIntegration {
  private streamManager: BinaryStreamManager;
  private topicManager: EnhancedTopicManager;
  private config: BinaryTopicConfig;
  private rateLimitTracker: Map<string, number[]> = new Map();
  private isEnabled = true;

  constructor(
    streamManager: BinaryStreamManager,
    topicManager: EnhancedTopicManager,
    config: Partial<BinaryTopicConfig> = {}
  ) {
    this.streamManager = streamManager;
    this.topicManager = topicManager;
    this.config = {
      consumerTopicMapping: {
        'alerts': 'price-alerts',
        'analytics': 'analytics',
        'cache': 'system',
        'processor': 'trading',
        'ui': 'general',
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

    logger.info('Binary-Enhanced Integration initialized');
  }

  /**
   * Enable/disable the integration
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Binary-Enhanced integration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Connect a stream consumer to Enhanced Topic Manager
   */
  async connectConsumer(
    consumerKey: string,
    consumer: StreamConsumer
  ): Promise<void> {
    const consumerType = consumer.type;
    const topicCategory = this.config.consumerTopicMapping[consumerType];

    if (!topicCategory) {
      logger.warn(`No topic mapping for consumer type: ${consumerType}`);
      return;
    }

    logger.info(`Connecting consumer ${consumerKey} to topic category: ${topicCategory}`);

    // Create a transform that routes to Enhanced Topic Manager
    const topicTransform = (message: ExchangeMessage): ExchangeMessage => {
      if (!this.isEnabled) return message;

      // Check rate limiting
      if (!this.checkRateLimit(consumerType)) {
        return message;
      }

      // Route to Enhanced Topic Manager
      this.routeToTopicManager(message, consumerType, topicCategory)
        .catch(error => {
          logger.error('Failed to route message to Enhanced Topic Manager', { error, consumerType });
        });

      return message;
    };

    // Apply the transform
    if (consumer.transform) {
      const originalTransform = consumer.transform;
      consumer.transform = (message) => {
        const transformed = originalTransform(message);
        return topicTransform(transformed);
      };
    } else {
      consumer.transform = topicTransform;
    }
  }

  /**
   * Route message to Enhanced Topic Manager
   */
  private async routeToTopicManager(
    message: ExchangeMessage,
    consumerType: string,
    topicCategory: string
  ): Promise<void> {
    const formattedMessage = this.formatMessage(message, consumerType);
    
    // Use Enhanced Topic Manager's intelligent routing
    await this.topicManager.routeMessage(formattedMessage, {
      category: topicCategory,
      metadata: {
        source: 'binary-stream',
        exchange: message.exchange,
        symbol: message.symbol,
        messageType: message.type,
        consumerType,
        timestamp: message.timestamp,
      },
    });
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(consumerType: string): boolean {
    const now = Date.now();
    const key = consumerType;
    const timestamps = this.rateLimitTracker.get(key) || [];

    // Clean old timestamps
    const oneSecondAgo = now - 1000;
    const recent = timestamps.filter(t => t > oneSecondAgo);

    if (recent.length >= this.config.rateLimit.messagesPerSecond) {
      return false;
    }

    recent.push(now);
    this.rateLimitTracker.set(key, recent);
    return true;
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
      case 'analytics':
        lines.push('📊 *Analytics Update*');
        break;
      case 'cache':
        lines.push('💾 *Cache Update*');
        break;
      case 'processor':
        lines.push('⚙️ *Processing Update*');
        break;
      case 'ui':
        lines.push('🖥️ *UI Update*');
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
        .slice(0, 3)
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
   * Update configuration
   */
  updateConfig(updates: Partial<BinaryTopicConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Binary-Enhanced integration config updated', { updates });
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Create integration between BinaryStreamManager and EnhancedTopicManager
 */
export function createBinaryEnhancedIntegration(
  streamManager: BinaryStreamManager,
  topicManager: EnhancedTopicManager,
  config?: Partial<BinaryTopicConfig>
): BinaryEnhancedIntegration {
  return new BinaryEnhancedIntegration(streamManager, topicManager, config);
}
