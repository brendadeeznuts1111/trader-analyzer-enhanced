#!/usr/bin/env bun
/**
 * Enhanced Telegram Bot with Advanced Topic Management
 * Extends the existing telegram-bot.ts with sophisticated topic features
 */

import { enhancedBot } from '../lib/enhanced-telegram-bot';
import { sendMessage } from '../lib/telegram';

// Telegram message options interface
interface SendMessageOptions {
  text: string;
  parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  message_thread_id?: number;
  reply_markup?: unknown;
}

interface Message {
  chat: { id: number };
  from?: { first_name?: string; id?: number };
  message_thread_id?: number | null;
}

interface Command {
  args: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = parseInt(process.env.TELEGRAM_GROUP_ID || '0');

if (!BOT_TOKEN) {
  // eslint-disable-next-line no-console
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

if (!GROUP_ID) {
  // eslint-disable-next-line no-console
  console.error('TELEGRAM_GROUP_ID not set');
  process.exit(1);
}

// Initialize enhanced bot
await enhancedBot.initialize();

// ═══════════════════════════════════════════════════════════════
// ENHANCED COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

// Enhanced /start command with topic information
async function handleEnhancedStart(msg: Message) {
  const name = msg.from?.first_name || 'trader';
  await reply(
    `<b>🚀 Enhanced Welcome ${name}!</b>\n\n` +
      `I'm your advanced trading assistant with intelligent topic management.\n\n` +
      `<b>📊 Trading & Analytics:</b>\n` +
      `/status - System status\n` +
      `/analytics - Topic analytics\n` +
      `/dashboard - Dashboard overview\n` +
      `/polymarket - Market data\n\n` +
      `<b>🧠 Smart Topics:</b>\n` +
      `/topics - Enhanced topic listing\n` +
      `/create_topic - Create new topic\n` +
      `/route_test - Test auto-routing\n\n` +
      `<b>📍 Legacy Commands:</b>\n` +
      `/pin_alerts - Pin alerts topic\n` +
      `/test_signal - Send test signal\n\n` +
      `<i>Powered by Bun + Advanced Topic AI</i>`,
    msg.chat.id,
    msg.message_thread_id ?? undefined
  );
}

// Enhanced topics command
async function handleEnhancedTopics(msg: Message) {
  // Use the enhanced bot's analytics
  const analytics = enhancedBot.getAnalytics();
  const engagement = analytics.getEngagementReport('24h');

  let response = `📚 **Enhanced Topic Analytics**\n\n`;
  response += `📈 **24h Activity:**\n`;
  response += `• ${engagement.totalMessages} messages\n`;
  response += `• ${engagement.activeTopics} active topics\n`;
  response += `• ${engagement.activeUsers} active users\n`;
  response += `• Avg engagement: ${engagement.avgEngagementScore.toFixed(1)}\n\n`;

  // Get trending topics
  const trending = analytics.getTrendingTopics(5, '24h');
  if (trending.length > 0) {
    response += `🔥 **Trending Topics:**\n`;
    trending.forEach((topic, i) => {
      response += `${i + 1}. ${topic.title} (${topic.messageCount} msgs, ${topic.velocity.toFixed(1)}/hr)\n`;
    });
    response += `\n`;
  }

  // Show topic list (limited)
  const manager = enhancedBot.getTopicManager();
  const topics = manager.getActiveTopics().slice(0, 5);

  response += `📂 **Active Topics:**\n`;
  topics.forEach(topic => {
    const topicEngagement = analytics.getTopicEngagement(topic.threadId, '24h');
    const engagementIcon = topicEngagement.engagementScore > 70 ? '🔥' : topicEngagement.engagementScore > 40 ? '📈' : '📊';

    response += `${engagementIcon} **${topic.title}**\n`;
    response += `   🆔 \`${topic.threadId}\` • 💬 ${topic.messageCount} • 👥 ${topic.participantCount}\n`;
    if (topic.tags.size > 0) {
      response += `   🏷️ ${Array.from(topic.tags).slice(0, 3).join(', ')}\n`;
    }
    response += `\n`;
  });

  response += `💡 Use /create_topic to make new topics!`;

  await reply(response, msg.chat.id, msg.message_thread_id ?? undefined);
}

// Enhanced command handlers with proper typing
async function handleCreateTopic(message: Message, command?: Command) {
  const args = (command?.args || '').split(' ');
  const title = args[0];
  const tags = args.slice(1).filter((arg: string) => !arg.startsWith('#')); // Remove category markers
  const category = args.find((arg: string) => arg.startsWith('#'))?.slice(1) || 'general';

  try {
    const manager = enhancedBot.getTopicManager();
    const threadId = await manager.createTopic(title, tags, category);

    // Send welcome message to new topic
    await manager.sendToTopic(threadId,
      `🎉 **Topic Created!**\n\n` +
      `**${title}**\n` +
      `Thread ID: \`${threadId}\`\n` +
      `Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}\n` +
      `Category: ${category}\n\n` +
      `This topic is now active for discussions!`
    );

    await reply(
      `✅ **Topic Created Successfully!**\n\n` +
      `📝 Title: ${title}\n` +
      `🆔 Thread ID: \`${threadId}\`\n` +
      `🏷️ Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}\n` +
      `📁 Category: ${category}\n\n` +
      `Welcome message sent to the new topic!`,
      message.chat.id,
    );

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create topic:', error);
    await reply(
      `❌ Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      message.chat.id,
      message.message_thread_id ?? undefined
    );
  }
}

// Route test command
async function handleRouteTest(message: Message, command?: Command) {
  if (!command?.args) {
    await reply(
      `🧠 **AI Routing Test**\n\n` +
      `Test the intelligent routing system:\n\n` +
      `/route_test "I found a trading signal for BTC"\n` +
      `/route_test "There's a bug in the system"\n` +
      `/route_test "How do I use the dashboard?"\n` +
      `/route_test "Polymarket odds changed dramatically"`,
      message.chat.id,
      message.message_thread_id ?? undefined
    );
    return;
  }

  const testText = command.args;
  const router = enhancedBot.getRouter();

  try {
    const targetThreadId = await router.routeMessage(testText, message.from?.id || 0);
    const manager = enhancedBot.getTopicManager();
    const topic = targetThreadId !== null ? manager.getTopic(targetThreadId) : null;

    await reply(
      `🧠 **Routing Analysis**\n\n` +
      `📝 Text: "${testText}"\n` +
      `🎯 Target: ${topic ? `**${topic.title}** (ID: ${targetThreadId})` : `Thread ${targetThreadId}`}\n\n` +
      `The message would be automatically routed to this topic!`,
      message.chat.id,
      message.message_thread_id ?? undefined
    );

    // Also send a test message to the target topic
    if (topic && targetThreadId !== null) {
      await manager.sendToTopic(targetThreadId,
        `🧪 **Routing Test Message**\n\n` +
        `"${testText}"\n\n` +
        `_Sent from routing test by ${message.from?.first_name}_`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Routing test failed:', error);
    await reply(
      `❌ Routing test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      message.chat.id,
      message.message_thread_id ?? undefined
    );
  }
}

// Polymarket command
async function handlePolymarketCmd(msg: Message) {
  try {
    // This would integrate with the existing PolymarketPipeline
    const dashboard = enhancedBot.getDashboard();
    await dashboard.generatePolymarketDashboard();

    // For Telegram, we'll send a summary instead of HTML
    const summary = `🎯 **Polymarket Integration Active**\n\n` +
                   `📊 Real-time market monitoring\n` +
                   `🚨 Automated alert routing\n` +
                   `📈 Price movement detection\n` +
                   `🎪 Market resolution tracking\n\n` +
                   `Use /dashboard for full analytics`;

    await reply(summary, msg.chat.id, msg.message_thread_id ?? undefined);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Polymarket command failed:', error);
    await reply(
      `❌ Failed to fetch Polymarket data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      msg.chat.id,
      msg.message_thread_id ?? undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION WITH EXISTING BOT
// ═══════════════════════════════════════════════════════════════

// Extend the existing COMMANDS object
const ENHANCED_COMMANDS: Record<string, (msg: Message, command?: Command) => Promise<void>> = {
  '/enhanced_start': handleEnhancedStart,
  '/enhanced_topics': handleEnhancedTopics,
  '/create_topic': handleCreateTopic,
  '/route_test': handleRouteTest,
  '/polymarket': handlePolymarketCmd,
  '/analytics': handleEnhancedTopics, // Alias
  '/dashboard': handlePolymarketCmd, // Alias
};

// Enhanced message processing
async function processEnhancedUpdate(update: any) {
  try {
    if (update.message?.text) {
      const msg = update.message;
      const text = msg.text;

      // Log with enhanced analytics
      enhancedBot.handleIncomingMessage(msg);

      // Check for enhanced commands first
      const command = text.split(' ')[0].toLowerCase();

      if (ENHANCED_COMMANDS[command]) {
        const commandObj = { args: text.split(' ').slice(1).join(' ') };
        await ENHANCED_COMMANDS[command](msg, commandObj);
        return;
      }

      // Override /start to use enhanced version
      if (command === '/start') {
        await handleEnhancedStart(msg);
        return;
      }

      // Override /topics to use enhanced version
      if (command === '/topics') {
        await handleEnhancedTopics(msg);
        return;
      }
    }

    // Let original processing continue for other updates
    // (This would be integrated with the existing processUpdate function)

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Enhanced update processing error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function reply(text: string, chatId: number, threadId?: number) {
  const msg: SendMessageOptions = {
    text,
    parse_mode: 'Markdown' as const,
    message_thread_id: threadId,
  };
  return sendMessage(msg, chatId);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FOR INTEGRATION
// ═══════════════════════════════════════════════════════════════

export {
  enhancedBot,
  handleEnhancedStart,
  handleEnhancedTopics,
  handleCreateTopic,
  handleRouteTest,
  processEnhancedUpdate
};

// For standalone testing
if (import.meta.main) {
  // eslint-disable-next-line no-console
  console.log('🚀 Enhanced Telegram Bot Features Loaded');
  // eslint-disable-next-line no-console
  console.log('💡 Available enhanced commands:');
  // eslint-disable-next-line no-console
  console.log('   /enhanced_start - Enhanced welcome');
  // eslint-disable-next-line no-console
  console.log('   /enhanced_topics - Advanced topic analytics');
  // eslint-disable-next-line no-console
  console.log('   /create_topic - Create new topics');
  // eslint-disable-next-line no-console
  console.log('   /route_test - Test AI routing');
  // eslint-disable-next-line no-console
  console.log('   /polymarket - Polymarket integration');
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('🔗 Integrates with existing telegram-bot.ts');
}
