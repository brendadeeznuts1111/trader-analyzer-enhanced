/**
 * Thread Manager - Forum Topic Routing System
 *
 * Manages topic registration, pinning, and automatic message routing
 * for Telegram forum groups.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type TopicPurpose =
  | 'alerts' // Price alerts, signals
  | 'trades' // Trade notifications
  | 'errors' // Error logs
  | 'commands' // Bot commands
  | 'general' // General chat
  | 'golden' // Golden zone alerts
  | 'pnl' // P&L updates
  | 'system' // System notifications
  | string; // Custom purposes

export interface TopicInfo {
  threadId: number | null;
  name: string;
  purpose: TopicPurpose;
  isPinned: boolean;
  lastUsed: number;
  createdAt: number;
}

export interface ChatTopics {
  chatId: number;
  topics: Map<number | 'general', TopicInfo>;
  pinnedPurposes: Map<TopicPurpose, number | null>; // purpose -> threadId
}

// ═══════════════════════════════════════════════════════════════
// THREAD MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

class ThreadManagerClass {
  private chats: Map<number, ChatTopics> = new Map();
  private persistPath: string | null = null;

  /**
   * Initialize with optional persistence file
   */
  constructor(persistPath?: string) {
    this.persistPath = persistPath || null;
    this.load();
  }

  /**
   * Get or create chat entry
   */
  private getChat(chatId: number): ChatTopics {
    if (!this.chats.has(chatId)) {
      this.chats.set(chatId, {
        chatId,
        topics: new Map(),
        pinnedPurposes: new Map(),
      });
    }
    return this.chats.get(chatId)!;
  }

  /**
   * Register a topic with a purpose
   */
  register(
    chatId: number,
    threadId: number | null,
    name: string,
    purpose: TopicPurpose
  ): TopicInfo {
    const chat = this.getChat(chatId);
    const key = threadId ?? 'general';
    const now = Date.now();

    const info: TopicInfo = {
      threadId,
      name,
      purpose,
      isPinned: false,
      lastUsed: now,
      createdAt: chat.topics.has(key) ? chat.topics.get(key)!.createdAt : now,
    };

    chat.topics.set(key, info);
    this.save();
    return info;
  }

  /**
   * Mark a topic as recently used (auto-registers if new)
   */
  markUsed(chatId: number, threadId: number | null, name?: string): void {
    const chat = this.getChat(chatId);
    const key = threadId ?? 'general';

    if (chat.topics.has(key)) {
      chat.topics.get(key)!.lastUsed = Date.now();
    } else {
      // Auto-register with generic purpose
      this.register(chatId, threadId, name || `Topic ${threadId || 'General'}`, 'general');
    }
  }

  /**
   * Pin a topic for a specific purpose
   */
  setPinned(chatId: number, threadId: number | null, purpose: TopicPurpose): void {
    const chat = this.getChat(chatId);
    const key = threadId ?? 'general';

    // Unpin any existing topic with this purpose
    Array.from(chat.topics.entries()).forEach(([_, info]) => {
      if (info.purpose === purpose && info.isPinned) {
        info.isPinned = false;
      }
    });

    // Pin the new topic
    if (chat.topics.has(key)) {
      const topic = chat.topics.get(key)!;
      topic.isPinned = true;
      topic.purpose = purpose;
    } else {
      this.register(chatId, threadId, `Topic ${threadId || 'General'}`, purpose);
      chat.topics.get(key)!.isPinned = true;
    }

    // Update pinned purposes map
    chat.pinnedPurposes.set(purpose, threadId);
    this.save();
  }

  /**
   * Unpin a topic
   */
  unpin(chatId: number, threadId: number | null): void {
    const chat = this.getChat(chatId);
    const key = threadId ?? 'general';

    if (chat.topics.has(key)) {
      const topic = chat.topics.get(key)!;
      topic.isPinned = false;

      // Remove from pinned purposes
      Array.from(chat.pinnedPurposes.entries()).forEach(([purpose, pinnedThread]) => {
        if (pinnedThread === threadId) {
          chat.pinnedPurposes.delete(purpose);
        }
      });
    }
    this.save();
  }

  /**
   * Quick helper: get thread ID for alerts
   */
  getAlertsThread(chatId: number): number | undefined {
    const threadId = this.getThreadForPurpose(chatId, 'alerts');
    return threadId === null ? undefined : (threadId ?? undefined);
  }

  /**
   * Quick helper: get thread ID for errors
   */
  getErrorsThread(chatId: number): number | undefined {
    const threadId = this.getThreadForPurpose(chatId, 'errors');
    return threadId === null ? undefined : (threadId ?? undefined);
  }

  /**
   * Quick helper: get thread ID for trades
   */
  getTradesThread(chatId: number): number | undefined {
    const threadId = this.getThreadForPurpose(chatId, 'trades');
    return threadId === null ? undefined : (threadId ?? undefined);
  }

  /**
   * Get the thread ID for a specific purpose
   */
  getThreadForPurpose(chatId: number, purpose: TopicPurpose): number | null | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;

    // Check pinned purposes first
    if (chat.pinnedPurposes.has(purpose)) {
      return chat.pinnedPurposes.get(purpose)!;
    }

    // Fall back to any topic with matching purpose
    const topics = Array.from(chat.topics.values());
    for (const info of topics) {
      if (info.purpose === purpose) {
        return info.threadId;
      }
    }

    return undefined;
  }

  /**
   * Get topic info by thread ID
   */
  getTopic(chatId: number, threadId: number | null): TopicInfo | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;

    const key = threadId ?? 'general';
    return chat.topics.get(key);
  }

  /**
   * Get all topics for a chat
   */
  getAllTopics(chatId: number): TopicInfo[] {
    const chat = this.chats.get(chatId);
    if (!chat) return [];

    return Array.from(chat.topics.values()).sort((a, b) => {
      // Pinned first, then by last used
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.lastUsed - a.lastUsed;
    });
  }

  /**
   * Get pinned topics for a chat
   */
  getPinnedTopics(chatId: number): Map<TopicPurpose, TopicInfo> {
    const chat = this.chats.get(chatId);
    const result = new Map<TopicPurpose, TopicInfo>();
    if (!chat) return result;

    Array.from(chat.pinnedPurposes.entries()).forEach(([purpose, threadId]) => {
      const key = threadId ?? 'general';
      const topic = chat.topics.get(key);
      if (topic) {
        result.set(purpose, topic);
      }
    });

    return result;
  }

  /**
   * Format topics list for display
   */
  formatTopicsList(chatId: number): string {
    const topics = this.getAllTopics(chatId);
    if (topics.length === 0) {
      return 'No topics registered yet.\nSend a message in any topic to register it.';
    }

    const lines = [`<b>📋 Topic Mapping</b>`, `<code>chat_id: ${chatId}</code>`, ''];

    for (const topic of topics) {
      const threadStr = topic.threadId === null ? 'null' : String(topic.threadId);
      const pinned = topic.isPinned ? ' ← <b>PINNED</b>' : '';
      const purposeStr = topic.purpose !== 'general' ? ` (${topic.purpose})` : '';
      lines.push(`${topic.name} → <code>${threadStr}</code>${purposeStr}${pinned}`);
    }

    return lines.join('\n');
  }

  /**
   * Save state to file (if persistence enabled)
   */
  private save(): void {
    if (!this.persistPath) return;

    try {
      const data: Record<string, any> = {};

      Array.from(this.chats.entries()).forEach(([chatId, chat]) => {
        const topics: Record<string, TopicInfo> = {};
        Array.from(chat.topics.entries()).forEach(([key, info]) => {
          topics[String(key)] = info;
        });

        const pinnedPurposes: Record<string, number | null> = {};
        Array.from(chat.pinnedPurposes.entries()).forEach(([purpose, threadId]) => {
          pinnedPurposes[purpose] = threadId;
        });

        data[String(chatId)] = { chatId, topics, pinnedPurposes };
      });

      Bun.write(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save thread manager state:', error);
    }
  }

  /**
   * Load state from file (if persistence enabled)
   */
  private load(): void {
    if (!this.persistPath) return;

    try {
      const file = Bun.file(this.persistPath);
      if (!file.size) return;

      const data = JSON.parse(file.toString());

      for (const [chatIdStr, chatData] of Object.entries(data as Record<string, any>)) {
        const chatId = parseInt(chatIdStr);
        const chat = this.getChat(chatId);

        // Load topics
        for (const [key, info] of Object.entries(chatData.topics as Record<string, TopicInfo>)) {
          const topicKey = key === 'general' ? 'general' : parseInt(key);
          chat.topics.set(topicKey as number | 'general', info as TopicInfo);
        }

        // Load pinned purposes
        for (const [purpose, threadId] of Object.entries(
          chatData.pinnedPurposes as Record<string, number | null>
        )) {
          chat.pinnedPurposes.set(purpose as TopicPurpose, threadId);
        }
      }
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      console.log('Starting with fresh thread manager state');
    }
  }

  /**
   * Clear all data for a chat
   */
  clearChat(chatId: number): void {
    this.chats.delete(chatId);
    this.save();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.chats.clear();
    this.save();
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

// Create singleton with persistence
export const ThreadManager = new ThreadManagerClass('.thread-manager.json');

// Also export class for testing or custom instances
export { ThreadManagerClass };
