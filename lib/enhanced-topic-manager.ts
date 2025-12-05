#!/usr/bin/env bun
/**
 * Enhanced Telegram Super Group Topic Integration Engine
 * Advanced topic management, analytics, and intelligent routing for Bun/TypeScript
 *
 * Features:
 * - Comprehensive topic management with metadata
 * - Real-time analytics and engagement tracking
 * - Intelligent message routing with keyword mappings
 * - Polymarket alert integration
 * - Thread-based organization with advanced indexing
 */

// Check if grammy is available (runtime check)
let GrammyAvailable = false;
let GrammyBot: { new (token: string): { api: any } } | null = null;

try {
  // Dynamic import to avoid TypeScript compilation errors
  // @ts-ignore: grammy might not be installed
  const grammyModule = await import('grammy');
  GrammyBot = grammyModule.Bot;
  GrammyAvailable = true;
} catch {
  GrammyAvailable = false;
}

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═════════════════════════════════════════════════════════════════

export interface TopicThread {
  threadId: number;
  title: string;
  iconColor: number;
  iconCustomEmojiId?: string;
  createdAt: Date;
  lastMessageId?: number;
  messageCount: number;
  participantCount: number;
  tags: Set<string>;
  metadata: Record<string, unknown>;
  isActive: boolean;
  category?: string;
}

export interface MessageAnalytics {
  timestamp: Date;
  threadId: number;
  userId: number;
  messageId: number;
  textLength: number;
  hasMedia: boolean;
  isReply: boolean;
  messageType: 'text' | 'photo' | 'document' | 'video' | 'audio' | 'sticker' | 'other';
}

export interface UserActivity {
  totalMessages: number;
  threadsParticipated: Set<number>;
  lastActive: Date;
  activityScore: number;
  preferredTopics: number[];
}

export interface TopicEngagement {
  threadId: number;
  messageCount: number;
  uniqueParticipants: number;
  avgMessageLength: number;
  avgResponseTimeSeconds: number;
  engagementScore: number;
  timePeriod: '1h' | '24h' | '7d';
}

export interface RoutingRule {
  pattern: string;
  threadId: number;
  priority: number;
  matchCount: number;
  lastMatched: Date;
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED TOPIC MANAGER
// ═════════════════════════════════════════════════════════════════

export class EnhancedTopicManager {
  private bot: { api: any } | null;
  private groupId: number;
  private topics: Map<number, TopicThread> = new Map();
  private topicIndices = {
    byTitle: new Map<string, number>(),
    byTag: new Map<string, number[]>(),
    byDate: new Map<string, number[]>(),
    byCategory: new Map<string, number[]>(),
  };

  constructor(botToken: string, groupId: number) {
    if (GrammyAvailable && GrammyBot) {
      this.bot = new GrammyBot(botToken) as { api: any };
    } else {
      // eslint-disable-next-line no-console
      console.warn('Grammy not available - forum topic features disabled');
      this.bot = null;
    }
    this.groupId = groupId;
  }

  async initialize(): Promise<void> {
    await this.fetchExistingTopics();
    // eslint-disable-next-line no-console
    console.log(`📚 Loaded ${this.topics.size} topics from group ${this.groupId}`);
  }

  async fetchExistingTopics(): Promise<void> {
    if (!GrammyAvailable || !this.bot) {
      // eslint-disable-next-line no-console
      console.log('Forum topic fetching disabled - grammy not available');
      return;
    }

    try {
      const forumTopics = await this.bot.api.getForumTopics(this.groupId);
      const now = new Date();

      for (const topic of forumTopics.topics) {
        const thread: TopicThread = {
          threadId: topic.message_thread_id,
          title: topic.name,
          iconColor: topic.icon_color,
          iconCustomEmojiId: topic.icon_custom_emoji_id,
          createdAt: now, // API doesn't provide creation date
          messageCount: 0,
          participantCount: 0,
          tags: new Set(),
          metadata: {},
          isActive: true,
        };

        this.topics.set(thread.threadId, thread);
        this.indexTopic(thread);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch topics:', error);
    }
  }

  private indexTopic(topic: TopicThread): void {
    // Index by title
    this.topicIndices.byTitle.set(topic.title.toLowerCase(), topic.threadId);

    // Index by creation date (by day)
    const dateKey = topic.createdAt.toISOString().split('T')[0];
    if (!this.topicIndices.byDate.has(dateKey)) {
      this.topicIndices.byDate.set(dateKey, []);
    }
    this.topicIndices.byDate.get(dateKey)!.push(topic.threadId);

    // Index by tags
    for (const tag of topic.tags) {
      if (!this.topicIndices.byTag.has(tag)) {
        this.topicIndices.byTag.set(tag, []);
      }
      this.topicIndices.byTag.get(tag)!.push(topic.threadId);
    }

    // Index by category
    if (topic.category) {
      if (!this.topicIndices.byCategory.has(topic.category)) {
        this.topicIndices.byCategory.set(topic.category, []);
      }
      this.topicIndices.byCategory.get(topic.category)!.push(topic.threadId);
    }
  }

  async createTopic(
    title: string,
    tags: string[] = [],
    category?: string,
    iconColor: number = 0x6fb9f0,
    iconEmojiId?: string
  ): Promise<number> {
    try {
      let threadId: number;

      if (GrammyAvailable && this.bot) {
        const result = await this.bot.api.createForumTopic(
          this.groupId,
          title,
          iconColor,
          iconEmojiId
        );
        threadId = result.message_thread_id;
      } else {
        // Create mock topic when grammy is not available
        threadId = Date.now() + Math.floor(Math.random() * 1000);
        // eslint-disable-next-line no-console
        console.log(`🎭 Created mock topic: ${title} (ID: ${threadId}) - grammy not available`);
      }

      const thread: TopicThread = {
        threadId,
        title,
        iconColor,
        iconCustomEmojiId: iconEmojiId,
        createdAt: new Date(),
        messageCount: 0,
        participantCount: 0,
        tags: new Set(tags),
        metadata: {},
        isActive: true,
        category,
      };

      this.topics.set(threadId, thread);
      this.indexTopic(thread);

      // Send welcome message (skip if no bot available)
      if (GrammyAvailable && this.bot) {
        await this.sendToTopic(threadId, this.generateWelcomeMessage(thread));
      }

      // eslint-disable-next-line no-console
      console.log(`✅ Created topic: ${title} (ID: ${threadId})`);
      return threadId;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to create topic "${title}":`, error);
      throw error;
    }
  }

  private generateWelcomeMessage(topic: TopicThread): string {
    const tagsStr = topic.tags.size > 0 ? `\\n🏷️ Tags: ${Array.from(topic.tags).join(', ')}` : '';
    const categoryStr = topic.category ? `\\n📁 Category: ${topic.category}` : '';

    return (
      `📌 **Topic Created: ${topic.title}**\\n\\n` +
      `🆔 Thread ID: \`${topic.threadId}\`${tagsStr}${categoryStr}\\n\\n` +
      `💬 This topic is now active for discussions and alerts.`
    );
  }

  async sendToTopic(
    threadId: number,
    text: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!GrammyAvailable || !this.bot) {
      // eslint-disable-next-line no-console
      console.log(`📤 Mock message to topic ${threadId}: ${text.substring(0, 50)}...`);
      return { ok: true, mock: true };
    }

    return await this.bot.api.sendMessage(this.groupId, text, {
      message_thread_id: threadId,
      parse_mode: 'Markdown',
      ...options,
    });
  }

  async replyInTopic(
    threadId: number,
    messageId: number,
    text: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!GrammyAvailable || !this.bot) {
      // eslint-disable-next-line no-console
      console.log(`📤 Mock reply to message ${messageId} in topic ${threadId}: ${text.substring(0, 50)}...`);
      return { ok: true, mock: true };
    }

    return await this.bot.api.sendMessage(this.groupId, text, {
      message_thread_id: threadId,
      reply_to_message_id: messageId,
      parse_mode: 'Markdown',
      ...options,
    });
  }

  // Topic retrieval methods
  getTopic(threadId: number): TopicThread | undefined {
    return this.topics.get(threadId);
  }

  getTopicByTitle(title: string): TopicThread | undefined {
    const threadId = this.topicIndices.byTitle.get(title.toLowerCase());
    return threadId ? this.topics.get(threadId) : undefined;
  }

  getTopicsByTag(tag: string): TopicThread[] {
    const threadIds = this.topicIndices.byTag.get(tag) || [];
    return threadIds.map(id => this.topics.get(id)!).filter(Boolean);
  }

  getTopicsByCategory(category: string): TopicThread[] {
    const threadIds = this.topicIndices.byCategory.get(category) || [];
    return threadIds.map(id => this.topics.get(id)!).filter(Boolean);
  }

  getTopicsByDate(date: Date): TopicThread[] {
    const dateKey = date.toISOString().split('T')[0];
    const threadIds = this.topicIndices.byDate.get(dateKey) || [];
    return threadIds.map(id => this.topics.get(id)!).filter(Boolean);
  }

  // Topic management
  async updateTopicMetadata(threadId: number, metadata: Record<string, unknown>): Promise<void> {
    const topic = this.topics.get(threadId);
    if (topic) {
      topic.metadata = { ...topic.metadata, ...metadata };
    }
  }

  async addTag(threadId: number, tag: string): Promise<void> {
    const topic = this.topics.get(threadId);
    if (topic) {
      topic.tags.add(tag);

      // Update index
      if (!this.topicIndices.byTag.has(tag)) {
        this.topicIndices.byTag.set(tag, []);
      }
      const tagThreads = this.topicIndices.byTag.get(tag)!;
      if (!tagThreads.includes(threadId)) {
        tagThreads.push(threadId);
      }
    }
  }

  async removeTag(threadId: number, tag: string): Promise<void> {
    const topic = this.topics.get(threadId);
    if (topic) {
      topic.tags.delete(tag);

      // Update index
      const tagThreads = this.topicIndices.byTag.get(tag);
      if (tagThreads) {
        const index = tagThreads.indexOf(threadId);
        if (index > -1) {
          tagThreads.splice(index, 1);
        }
      }
    }
  }

  async deleteTopic(threadId: number): Promise<void> {
    try {
      if (GrammyAvailable && this.bot) {
        await this.bot.api.deleteForumTopic(this.groupId, threadId);
      } else {
        // eslint-disable-next-line no-console
        console.log(`🗑️ Mock deleted topic ${threadId} - grammy not available`);
      }

      const topic = this.topics.get(threadId);
      if (topic) {
        // Remove from indices
        this.topicIndices.byTitle.delete(topic.title.toLowerCase());

        for (const tag of topic.tags) {
          const tagThreads = this.topicIndices.byTag.get(tag);
          if (tagThreads) {
            const index = tagThreads.indexOf(threadId);
            if (index > -1) {
              tagThreads.splice(index, 1);
            }
          }
        }

        if (topic.category) {
          const categoryThreads = this.topicIndices.byCategory.get(topic.category);
          if (categoryThreads) {
            const index = categoryThreads.indexOf(threadId);
            if (index > -1) {
              categoryThreads.splice(index, 1);
            }
          }
        }

        this.topics.delete(threadId);
        // eslint-disable-next-line no-console
        console.log(`🗑️ Deleted topic: ${topic.title}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to delete topic ${threadId}:`, error);
      throw error;
    }
  }

  async closeTopic(threadId: number): Promise<void> {
    if (GrammyAvailable && this.bot) {
      await this.bot.api.closeForumTopic(this.groupId, threadId);
    } else {
      // eslint-disable-next-line no-console
      console.log(`🔒 Mock closed topic ${threadId} - grammy not available`);
    }
    const topic = this.topics.get(threadId);
    if (topic) {
      topic.isActive = false;
    }
  }

  async reopenTopic(threadId: number): Promise<void> {
    if (GrammyAvailable && this.bot) {
      await this.bot.api.reopenForumTopic(this.groupId, threadId);
    } else {
      // eslint-disable-next-line no-console
      console.log(`🔓 Mock reopened topic ${threadId} - grammy not available`);
    }
    const topic = this.topics.get(threadId);
    if (topic) {
      topic.isActive = true;
    }
  }

  async editTopic(
    threadId: number,
    updates: {
      title?: string;
      iconColor?: number;
      iconCustomEmojiId?: string;
    }
  ): Promise<void> {
    if (GrammyAvailable && this.bot) {
      await this.bot.api.editForumTopic(this.groupId, threadId, updates);
    } else {
      // eslint-disable-next-line no-console
      console.log(`✏️ Mock edited topic ${threadId} - grammy not available`);
    }

    const topic = this.topics.get(threadId);
    if (topic) {
      if (updates.title) {
        // Update title index
        this.topicIndices.byTitle.delete(topic.title.toLowerCase());
        topic.title = updates.title;
        this.topicIndices.byTitle.set(topic.title.toLowerCase(), threadId);
      }

      if (updates.iconColor !== undefined) {
        topic.iconColor = updates.iconColor;
      }

      if (updates.iconCustomEmojiId !== undefined) {
        topic.iconCustomEmojiId = updates.iconCustomEmojiId;
      }
    }
  }

  // Statistics and reporting
  getStats(): {
    totalTopics: number;
    activeTopics: number;
    totalMessages: number;
    totalParticipants: number;
    avgMessagesPerTopic: number;
    mostActiveTopic: string;
    topTags: Array<{ tag: string; count: number }>;
    topicsByCategory: Record<string, number>;
  } {
    const activeTopics = Array.from(this.topics.values()).filter(t => t.isActive);
    const totalMessages = activeTopics.reduce((sum, t) => sum + t.messageCount, 0);
    const totalParticipants = activeTopics.reduce((sum, t) => sum + t.participantCount, 0);

    // Tag statistics
    const tagCounts = new Map<string, number>();
    for (const topic of activeTopics) {
      for (const tag of topic.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Category statistics
    const categoryCounts = new Map<string, number>();
    for (const topic of activeTopics) {
      if (topic.category) {
        categoryCounts.set(topic.category, (categoryCounts.get(topic.category) || 0) + 1);
      }
    }

    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTopics: this.topics.size,
      activeTopics: activeTopics.length,
      totalMessages,
      totalParticipants,
      avgMessagesPerTopic: activeTopics.length > 0 ? totalMessages / activeTopics.length : 0,
      mostActiveTopic:
        activeTopics.length > 0
          ? activeTopics.reduce((prev, curr) =>
              prev.messageCount > curr.messageCount ? prev : curr
            ).title
          : 'None',
      topTags,
      topicsByCategory: Object.fromEntries(categoryCounts),
    };
  }

  // Utility methods
  getAllTopics(): TopicThread[] {
    return Array.from(this.topics.values());
  }

  getActiveTopics(): TopicThread[] {
    return Array.from(this.topics.values()).filter(t => t.isActive);
  }

  searchTopics(query: string): TopicThread[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.topics.values()).filter(
      topic =>
        topic.title.toLowerCase().includes(lowercaseQuery) ||
        Array.from(topic.tags).some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
        (topic.category && topic.category.toLowerCase().includes(lowercaseQuery))
    );
  }
}
