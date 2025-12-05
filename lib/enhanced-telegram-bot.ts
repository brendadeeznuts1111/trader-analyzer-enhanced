#!/usr/bin/env bun
/**
 * Enhanced Telegram Bot with Advanced Topic Integration
 * Integrates with the new topic management system
 */

import { EnhancedTopicManager } from './enhanced-topic-manager';
import { TopicAnalytics } from './topic-analytics';
import { IntelligentTopicRouter } from './intelligent-router';
import { TopicDashboard } from './topic-dashboard';
import { PolymarketPipeline } from './market_mapping';
import { sendMessage } from './telegram';
import { ThreadManager } from './thread-manager';
import { getBuildInfo, getBuildString } from './build-info';

// Telegram message options interface
interface SendMessageOptions {
  text: string;
  parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  message_thread_id?: number;
  reply_markup?: unknown;
}

// Lazy load config to avoid process.exit during Next.js build
function getConfig() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  const GROUP_ID = parseInt(process.env.TELEGRAM_GROUP_ID || '0');
  return { BOT_TOKEN, GROUP_ID };
}

// Validation function for runtime only
function validateConfig() {
  const { BOT_TOKEN, GROUP_ID } = getConfig();
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }
  if (!GROUP_ID) {
    throw new Error('TELEGRAM_GROUP_ID not set');
  }
  return { BOT_TOKEN, GROUP_ID };
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED BOT WITH TOPIC INTEGRATION
// ═══════════════════════════════════════════════════════════════

class EnhancedTelegramBot {
  private topicManager!: EnhancedTopicManager;
  private analytics!: TopicAnalytics;
  private router!: IntelligentTopicRouter;
  private dashboard!: TopicDashboard;
  private polymarketPipeline!: PolymarketPipeline;
  private initialized = false;

  constructor() {
    // Lazy initialization - actual setup happens in initialize()
  }

  private ensureInitialized() {
    if (!this.initialized) {
      const { BOT_TOKEN, GROUP_ID } = validateConfig();
      this.topicManager = new EnhancedTopicManager(BOT_TOKEN, GROUP_ID);
      this.analytics = new TopicAnalytics(this.topicManager);
      this.router = new IntelligentTopicRouter(this.topicManager, this.analytics);
      this.dashboard = new TopicDashboard(this.topicManager, this.analytics);
      this.polymarketPipeline = new PolymarketPipeline();
      this.initialized = true;
    }
  }

  async initialize(): Promise<void> {
    this.ensureInitialized();
    const buildInfo = getBuildInfo();
    console.log(`🚀 Initializing Enhanced Telegram Bot ${getBuildString()}...`);

    await this.topicManager.initialize();

    // Setup intelligent routing rules
    this.setupRoutingRules();

    // Create initial topic structure
    await this.createInitialTopics();

    console.log(`✅ Enhanced Telegram Bot initialized (v${buildInfo.version} [${buildInfo.env}])`);
  }

  private setupRoutingRules(): void {
    // Add intelligent routing rules
    this.router.addRoutingRule('alert', this.getOrCreateTopicId('Trading Alerts'), 10);
    this.router.addRoutingRule('signal', this.getOrCreateTopicId('Trading Signals'), 10);
    this.router.addRoutingRule('error', this.getOrCreateTopicId('System Errors'), 10);
    this.router.addRoutingRule('bug', this.getOrCreateTopicId('Bug Reports'), 8);
    this.router.addRoutingRule('help', this.getOrCreateTopicId('Support'), 8);
    this.router.addRoutingRule('question', this.getOrCreateTopicId('Questions'), 8);
    this.router.addRoutingRule('announcement', this.getOrCreateTopicId('Announcements'), 9);

    // Polymarket-specific rules
    this.router.addRoutingRule('polymarket', this.getOrCreateTopicId('Polymarket'), 9);
    this.router.addRoutingRule('prediction', this.getOrCreateTopicId('Predictions'), 7);

    // Keyword mappings
    this.router.addKeywordMapping('trade', this.getOrCreateTopicId('Trading'));
    this.router.addKeywordMapping('market', this.getOrCreateTopicId('Markets'));
    this.router.addKeywordMapping('price', this.getOrCreateTopicId('Price Alerts'));
    this.router.addKeywordMapping('git', this.getOrCreateTopicId('Development'));
    this.router.addKeywordMapping('deploy', this.getOrCreateTopicId('Deployments'));
  }

  private getOrCreateTopicId(topicName: string): number {
    // This is a simplified version - in practice you'd need to track these
    const topicMap: Record<string, number> = {
      'Trading Alerts': 1001,
      'Trading Signals': 1002,
      'System Errors': 1003,
      'Bug Reports': 1004,
      Support: 1005,
      Questions: 1006,
      Announcements: 1007,
      Polymarket: 1008,
      Predictions: 1009,
      Trading: 1010,
      Markets: 1011,
      'Price Alerts': 1012,
      Development: 1013,
      Deployments: 1014,
    };

    return topicMap[topicName] || 1000;
  }

  private async createInitialTopics(): Promise<void> {
    const initialTopics = [
      {
        name: '📢 Announcements',
        tags: ['announcement', 'official', 'news'],
        category: 'announcements',
      },
      {
        name: '💡 Ideas & Suggestions',
        tags: ['idea', 'suggestion', 'feedback'],
        category: 'general',
      },
      { name: '🐛 Bug Reports', tags: ['bug', 'issue', 'error'], category: 'technical' },
      {
        name: '❓ Questions & Support',
        tags: ['question', 'help', 'support'],
        category: 'support',
      },
      {
        name: '💬 General Discussion',
        tags: ['general', 'chat', 'discussion'],
        category: 'general',
      },
      {
        name: '🚀 Development Updates',
        tags: ['dev', 'update', 'progress'],
        category: 'technical',
      },
      { name: '🎨 Design & UX', tags: ['design', 'ui', 'ux'], category: 'general' },
      {
        name: '📊 Analytics & Metrics',
        tags: ['analytics', 'metrics', 'data'],
        category: 'technical',
      },
      { name: '💰 Trading Signals', tags: ['trading', 'signals', 'alerts'], category: 'trading' },
      { name: '🎯 Polymarket', tags: ['polymarket', 'prediction', 'odds'], category: 'trading' },
    ];

    for (const topicData of initialTopics) {
      try {
        const threadId = await this.topicManager.createTopic(
          topicData.name,
          topicData.tags,
          topicData.category
        );
        console.log(`✅ Created topic: ${topicData.name} (ID: ${threadId})`);

        // Register with existing ThreadManager for compatibility
        const { GROUP_ID } = getConfig();
        ThreadManager.register(GROUP_ID, threadId, topicData.name, topicData.category || 'general');
      } catch (error) {
        console.error(`Failed to create topic ${topicData.name}:`, error);
      }
    }
  }

  // Polymarket alert integration
  async sendPolymarketAlert(
    marketData: any,
    alertType: 'opportunity' | 'movement' | 'resolution' = 'opportunity'
  ): Promise<void> {
    const polymarketTopic = this.topicManager.getTopicByTitle('🎯 Polymarket');
    if (!polymarketTopic) return;

    let alertText = '';
    let topicId = polymarketTopic.threadId;

    switch (alertType) {
      case 'opportunity':
        alertText = this.formatPolymarketOpportunity(marketData);
        break;
      case 'movement':
        alertText = this.formatPolymarketMovement(marketData);
        topicId = this.topicManager.getTopicByTitle('💰 Trading Signals')?.threadId || topicId;
        break;
      case 'resolution':
        alertText = this.formatPolymarketResolution(marketData);
        break;
    }

    if (alertText) {
      await this.topicManager.sendToTopic(topicId, alertText);
      console.log(`📊 Sent Polymarket ${alertType} alert to topic ${topicId}`);
    }
  }

  private formatPolymarketOpportunity(market: any): string {
    const odds = market.odds || { yes: 50, no: 50 };
    const spread = Math.abs(odds.yes - odds.no);

    return (
      `🎯 **Polymarket Opportunity**\n\n` +
      `📊 **${market.question}**\n` +
      `✅ Yes: ${odds.yes.toFixed(1)}% | ❌ No: ${odds.no.toFixed(1)}%\n` +
      `📈 Spread: ${spread.toFixed(1)}%\n` +
      `💰 Volume: $${market.volume?.toLocaleString() || 'N/A'}\n` +
      `⏰ End Date: ${market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A'}\n\n` +
      `🔗 [View on Polymarket](${market.url || 'https://polymarket.com'})`
    );
  }

  private formatPolymarketMovement(market: any): string {
    const change = market.change || 0;
    const direction = change > 0 ? '📈' : '📉';

    return (
      `${direction} **Price Movement Alert**\n\n` +
      `🎯 ${market.question}\n` +
      `📊 Change: ${change > 0 ? '+' : ''}${change.toFixed(2)}%\n` +
      `💰 Current Odds: ${market.odds?.yes?.toFixed(1) || 'N/A'}% Yes\n` +
      `📊 Volume: $${market.volume?.toLocaleString() || 'N/A'}`
    );
  }

  private formatPolymarketResolution(market: any): string {
    const outcome = market.resolvedOutcome || 'Unknown';

    return (
      `🏁 **Market Resolved**\n\n` +
      `🎯 ${market.question}\n` +
      `✅ **Outcome: ${outcome}**\n` +
      `💰 Final Payout: ${market.payout || 'N/A'}\n` +
      `📊 Total Volume: $${market.totalVolume?.toLocaleString() || 'N/A'}`
    );
  }

  // Enhanced message handling with topic routing
  async handleIncomingMessage(message: any): Promise<void> {
    const text = message.text;
    if (!text) return;

    // Log message for analytics
    this.analytics.logMessage(
      message.message_thread_id || 1,
      message.from.id,
      message.message_id,
      text
    );

    // Auto-route messages if not in a specific topic
    if (!message.message_thread_id && text.length > 10) {
      try {
        const targetThreadId = await this.router.routeMessage(text, message.from.id);

        if (targetThreadId) {
          const topic = this.topicManager.getTopic(targetThreadId);
          const forwardedText = `🗣️ *Message from ${message.from.first_name}:*\n\n${text}`;

          await this.topicManager.sendToTopic(targetThreadId, forwardedText, {
            parse_mode: 'Markdown',
          });

          // Delete original message to keep main chat clean
          try {
            await this.deleteMessage(message.chat.id, message.message_id);
          } catch (e) {
            // Ignore permission errors
          }

          console.log(`🔀 Auto-routed message to topic: ${topic?.title || targetThreadId}`);
          return;
        }
      } catch (error) {
        console.error('Auto-routing failed:', error);
      }
    }

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(message);
    }
  }

  private async handleCommand(message: any): Promise<void> {
    const command = message.text.split(' ')[0].toLowerCase();

    switch (command) {
      case '/topics':
        await this.handleTopicsCommand(message);
        break;
      case '/analytics':
        await this.handleAnalyticsCommand(message);
        break;
      case '/polymarket':
        await this.handlePolymarketCommand(message);
        break;
      case '/dashboard':
        await this.handleDashboardCommand(message);
        break;
      case '/version':
        await this.handleVersionCommand(message);
        break;
      case '/status':
        await this.handleStatusCommand(message);
        break;
      case '/test':
        await this.handleTestCommand(message);
        break;
      case '/createtopic':
        await this.handleCreateTopicCommand(message);
        break;
      case '/listtopics':
        await this.handleListTopicsCommand(message);
        break;
      case '/sendto':
        await this.handleSendToTopicCommand(message);
        break;
      // Add more enhanced commands here
      default:
        // Let the original bot handle other commands
        break;
    }
  }

  private async handleTopicsCommand(message: any): Promise<void> {
    const topics = this.topicManager.getActiveTopics();
    const threadId = message.message_thread_id;

    let response = `📚 **Active Topics (${topics.length})**\n\n`;

    topics.slice(0, 10).forEach((topic, i) => {
      const engagement = this.analytics.getTopicEngagement(topic.threadId, '24h');
      const engagementIcon =
        engagement.engagementScore > 70 ? '🔥' : engagement.engagementScore > 40 ? '📈' : '📊';

      response += `${engagementIcon} **${topic.title}**\n`;
      response += `   🆔 \`${topic.threadId}\`\n`;
      response += `   💬 ${topic.messageCount} messages\n`;
      response += `   👥 ${topic.participantCount} participants\n`;
      if (topic.tags.size > 0) {
        response += `   🏷️ ${Array.from(topic.tags).join(', ')}\n`;
      }
      response += `\n`;
    });

    if (topics.length > 10) {
      response += `... and ${topics.length - 10} more topics`;
    }

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleAnalyticsCommand(message: any): Promise<void> {
    const engagement = this.analytics.getEngagementReport('24h');
    const summary = this.analytics.getAnalyticsSummary();
    const threadId = message.message_thread_id;

    const response =
      `📊 **Analytics Summary**\n\n` +
      `📈 **Engagement (24h):**\n` +
      `   Messages: ${engagement.totalMessages}\n` +
      `   Active Topics: ${engagement.activeTopics}\n` +
      `   Active Users: ${engagement.activeUsers}\n` +
      `   Avg Score: ${engagement.avgEngagementScore.toFixed(1)}\n\n` +
      `📊 **Overall:**\n` +
      `   Total Messages: ${summary.totalMessagesLogged}\n` +
      `   Active Users: ${summary.activeUsers}\n` +
      `   Top Time: ${summary.mostActiveTime}\n` +
      `   Topics: ${summary.totalTopics}`;

    await this.reply(response, message.chat.id, threadId);
  }

  private async handlePolymarketCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const markets = await this.polymarketPipeline.fetchAndNormalize();

    const topMarkets = markets.slice(0, 5);
    let response = `🎯 **Polymarket Top Markets**\n\n`;

    topMarkets.forEach((market, i) => {
      response += `${i + 1}. **${market.question.slice(0, 50)}**\n`;
      response += `   ✅ ${market.odds.yes.toFixed(1)}% | ❌ ${market.odds.no.toFixed(1)}%\n`;
      response += `   💰 $${market.volume.toLocaleString()}\n\n`;
    });

    response += `📊 Total Markets: ${markets.length}`;

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleDashboardCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const health = await this.dashboard.getHealthCheck();

    const response =
      `🌐 **Dashboard Status**\n\n` +
      `✅ Status: ${health.status}\n` +
      `🕐 Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m\n` +
      `📚 Topics: ${health.topics}\n` +
      `💬 Messages: ${health.messages}\n` +
      `👥 Users: ${health.users}\n\n` +
      `🔗 Web Dashboard: Available at /api/dashboard`;

    await this.reply(response, message.chat.id, threadId);
  }

  // ═══════════════════════════════════════════════════════════════
  // NEW TESTING & VERSION COMMANDS
  // ═══════════════════════════════════════════════════════════════

  private async handleVersionCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const buildInfo = getBuildInfo();

    const response =
      `🤖 **Trader Analyzer Bot**\n\n` +
      `📦 Version: \`${buildInfo.version}\`\n` +
      `🔀 Branch: \`${buildInfo.gitBranch}\`\n` +
      `📝 Commit: \`${buildInfo.gitCommit}\`\n` +
      `🏗️ Built: ${buildInfo.buildTime}\n` +
      `🌍 Environment: \`${buildInfo.env}\`\n` +
      `🐛 Debug: ${buildInfo.debug ? '✅' : '❌'}\n\n` +
      `🔗 API: ${buildInfo.api.baseUrl}`;

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleStatusCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const buildInfo = getBuildInfo();
    const topics = this.topicManager.getActiveTopics();
    const summary = this.analytics.getAnalyticsSummary();
    const health = await this.dashboard.getHealthCheck();

    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);

    const response =
      `📊 **System Status**\n\n` +
      `🟢 **Bot Status:** Online\n` +
      `📦 **Version:** ${buildInfo.version}\n` +
      `🕐 **Uptime:** ${uptimeHours}h ${uptimeMinutes}m\n` +
      `💾 **Memory:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n` +
      `📚 **Topics:** ${topics.length} active\n` +
      `💬 **Messages:** ${summary.totalMessagesLogged}\n` +
      `👥 **Users:** ${summary.activeUsers}\n\n` +
      `🌐 **Dashboard:** ${health.status}\n` +
      `🔗 **API:** ${buildInfo.api.baseUrl}`;

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleTestCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const args = message.text.split(' ').slice(1);
    const testType = args[0] || 'ping';

    let response = '';

    switch (testType) {
      case 'ping':
        const start = Date.now();
        response = `🏓 **Pong!**\n\nLatency: ${Date.now() - start}ms`;
        break;

      case 'topic':
        const topicId = parseInt(args[1]);
        if (!topicId) {
          response = `❌ Usage: /test topic <thread_id>`;
        } else {
          const topic = this.topicManager.getTopic(topicId);
          if (topic) {
            response =
              `✅ **Topic Found**\n\n` +
              `📌 Title: ${topic.title}\n` +
              `🆔 ID: ${topic.threadId}\n` +
              `📊 Messages: ${topic.messageCount}\n` +
              `👥 Participants: ${topic.participantCount}\n` +
              `🏷️ Tags: ${Array.from(topic.tags).join(', ') || 'none'}`;
          } else {
            response = `❌ Topic not found: ${topicId}`;
          }
        }
        break;

      case 'route':
        const testMessage = args.slice(1).join(' ') || 'test message';
        const routedTopicId = await this.router.routeMessage(testMessage, message.from.id);
        if (routedTopicId) {
          const routedTopic = this.topicManager.getTopic(routedTopicId);
          response =
            `🔀 **Routing Test**\n\n` +
            `📝 Message: "${testMessage}"\n` +
            `➡️ Would route to: ${routedTopic?.title || routedTopicId}`;
        } else {
          response = `🔀 **Routing Test**\n\n📝 Message: "${testMessage}"\n❌ No topic match`;
        }
        break;

      case 'send':
        const targetTopicId = parseInt(args[1]);
        const testText = args.slice(2).join(' ') || 'Test message from /test send';
        if (!targetTopicId) {
          response = `❌ Usage: /test send <thread_id> <message>`;
        } else {
          try {
            await this.topicManager.sendToTopic(targetTopicId, `🧪 ${testText}`);
            response = `✅ Test message sent to topic ${targetTopicId}`;
          } catch (error) {
            response = `❌ Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
        break;

      case 'analytics':
        const engagement = this.analytics.getEngagementReport('24h');
        response =
          `📊 **Analytics Test**\n\n` +
          `✅ Analytics system working\n` +
          `📈 Messages (24h): ${engagement.totalMessages}\n` +
          `📚 Active Topics: ${engagement.activeTopics}\n` +
          `👥 Active Users: ${engagement.activeUsers}`;
        break;

      default:
        response =
          `🧪 **Available Tests**\n\n` +
          `/test ping - Check latency\n` +
          `/test topic <id> - Test topic lookup\n` +
          `/test route <message> - Test message routing\n` +
          `/test send <id> <msg> - Send test message\n` +
          `/test analytics - Test analytics system`;
    }

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleCreateTopicCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const args = message.text.split(' ').slice(1);

    if (args.length < 1) {
      await this.reply(
        `❌ Usage: /createtopic <name> [tags...]\n\nExample: /createtopic 🔥 Hot Deals trading alerts hot`,
        message.chat.id,
        threadId
      );
      return;
    }

    const topicName = args[0];
    const tags = args.slice(1);

    try {
      const newThreadId = await this.topicManager.createTopic(topicName, tags, 'general');
      await this.reply(
        `✅ **Topic Created**\n\n📌 Name: ${topicName}\n🆔 Thread ID: ${newThreadId}\n🏷️ Tags: ${tags.join(', ') || 'none'}`,
        message.chat.id,
        threadId
      );
    } catch (error) {
      await this.reply(
        `❌ Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message.chat.id,
        threadId
      );
    }
  }

  private async handleListTopicsCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const topics = this.topicManager.getActiveTopics();

    if (topics.length === 0) {
      await this.reply(`📚 No active topics found.`, message.chat.id, threadId);
      return;
    }

    let response = `📚 **All Topics (${topics.length})**\n\n`;

    topics.forEach((topic, i) => {
      response += `${i + 1}. **${topic.title}**\n`;
      response += `   🆔 \`${topic.threadId}\`\n`;
      response += `   💬 ${topic.messageCount} msgs | 👥 ${topic.participantCount} users\n`;
      if (topic.category) {
        response += `   📁 ${topic.category}\n`;
      }
      response += `\n`;
    });

    await this.reply(response, message.chat.id, threadId);
  }

  private async handleSendToTopicCommand(message: any): Promise<void> {
    const threadId = message.message_thread_id;
    const args = message.text.split(' ').slice(1);

    if (args.length < 2) {
      await this.reply(
        `❌ Usage: /sendto <thread_id> <message>\n\nExample: /sendto 1001 Hello from the bot!`,
        message.chat.id,
        threadId
      );
      return;
    }

    const targetId = parseInt(args[0]);
    const messageText = args.slice(1).join(' ');

    if (isNaN(targetId)) {
      await this.reply(`❌ Invalid thread ID: ${args[0]}`, message.chat.id, threadId);
      return;
    }

    try {
      await this.topicManager.sendToTopic(targetId, messageText);
      const topic = this.topicManager.getTopic(targetId);
      await this.reply(
        `✅ Message sent to ${topic?.title || `topic ${targetId}`}`,
        message.chat.id,
        threadId
      );
    } catch (error) {
      await this.reply(
        `❌ Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message.chat.id,
        threadId
      );
    }
  }

  private async reply(text: string, chatId: number, threadId?: number): Promise<void> {
    const msg: SendMessageOptions = {
      text,
      parse_mode: 'Markdown',
      message_thread_id: threadId,
    };
    await sendMessage(msg, chatId);
  }

  private async deleteMessage(chatId: number, messageId: number): Promise<void> {
    // Implement message deletion if needed
    console.log(`Attempting to delete message ${messageId} from chat ${chatId}`);
  }

  // Getters for external access
  getTopicManager(): EnhancedTopicManager {
    this.ensureInitialized();
    return this.topicManager;
  }

  getAnalytics(): TopicAnalytics {
    this.ensureInitialized();
    return this.analytics;
  }

  getRouter(): IntelligentTopicRouter {
    this.ensureInitialized();
    return this.router;
  }

  getDashboard(): TopicDashboard {
    this.ensureInitialized();
    return this.dashboard;
  }
}

// Export singleton instance
export const enhancedBot = new EnhancedTelegramBot();
