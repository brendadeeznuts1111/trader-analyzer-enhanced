#!/usr/bin/env bun
/**
 * Intelligent Topic Router
 * AI-powered routing system for automated topic assignment
 */

import { EnhancedTopicManager, RoutingRule } from './enhanced-topic-manager';
import { TopicAnalytics } from './topic-analytics';

export class IntelligentTopicRouter {
  private manager: EnhancedTopicManager;
  private analytics: TopicAnalytics;
  private routingRules: RoutingRule[] = [];
  private keywordMappings: Map<string, number> = new Map();
  private patternStats: Map<string, { matches: number; lastMatch: Date }> = new Map();

  constructor(manager: EnhancedTopicManager, analytics: TopicAnalytics) {
    this.manager = manager;
    this.analytics = analytics;
  }

  addRoutingRule(pattern: string, threadId: number, priority: number = 1): void {
    const rule: RoutingRule = {
      pattern: pattern.toLowerCase(),
      threadId,
      priority,
      matchCount: 0,
      lastMatched: new Date(0)
    };

    this.routingRules.push(rule);

    // Sort by priority (highest first)
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  addKeywordMapping(keyword: string, threadId: number): void {
    this.keywordMappings.set(keyword.toLowerCase(), threadId);
  }

  async routeMessage(text: string, userId: number, context?: {
    currentThreadId?: number;
    messageType?: string;
    hasMedia?: boolean;
  }): Promise<number | null> {
    const textLower = text.toLowerCase();

    // 1. Check keyword mappings first (exact matches)
    for (const [keyword, threadId] of this.keywordMappings) {
      if (textLower.split(/\s+/).includes(keyword)) {
        // eslint-disable-next-line no-console
        console.log(`🔀 Routing to thread ${threadId} via keyword '${keyword}'`);
        return threadId;
      }
    }

    // 2. Check pattern rules
    for (const rule of this.routingRules) {
      if (textLower.includes(rule.pattern)) {
        rule.matchCount++;
        rule.lastMatched = new Date();

        // Update pattern stats
        const stats = this.patternStats.get(rule.pattern) || { matches: 0, lastMatch: new Date(0) };
        stats.matches++;
        stats.lastMatch = new Date();
        this.patternStats.set(rule.pattern, stats);

        // eslint-disable-next-line no-console
        console.log(`🔀 Routing to thread ${rule.threadId} via pattern '${rule.pattern}'`);
        return rule.threadId;
      }
    }

    // 3. Check user's recent activity
    const userActivity = this.analytics.getUserActivity(userId);
    if (userActivity && userActivity.threadsParticipated.size > 0) {
      // Get user's most active recent thread
      const userMessages = this.getUserRecentMessages(userId, 10);
      const threadCounts = new Map<number, number>();

      for (const msg of userMessages) {
        threadCounts.set(msg.threadId, (threadCounts.get(msg.threadId) || 0) + 1);
      }

      if (threadCounts.size > 0) {
        const mostCommon = Array.from(threadCounts.entries())
          .sort((a, b) => b[1] - a[1])[0][0];

        // eslint-disable-next-line no-console
        console.log(`🔀 Routing to user's recent thread ${mostCommon}`);
        return mostCommon;
      }
    }

    // 4. Check trending topics
    const trending = this.analytics.getTrendingTopics(3, '24h');
    if (trending.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`🔀 Routing to trending topic: ${trending[0].title}`);
      return trending[0].threadId;
    }

    // 5. Context-based routing
    if (context) {
      const contextualThread = await this.routeByContext(text, context);
      if (contextualThread) {
        return contextualThread;
      }
    }

    // 6. Create new topic if no match
    console.log("🔀 No match found, creating new topic");
    return await this.createTopicForMessage(text);
  }

  private async routeByContext(text: string, context: any): Promise<number | null> {
    // Route based on message type
    if (context.messageType === 'photo' || context.hasMedia) {
      const mediaTopic = this.keywordMappings.get('media') || this.keywordMappings.get('images');
      if (mediaTopic) return mediaTopic;
    }

    // Route based on content analysis
    if (this.isQuestion(text)) {
      const questionTopic = this.keywordMappings.get('questions') || this.keywordMappings.get('help');
      if (questionTopic) return questionTopic;
    }

    if (this.isErrorMessage(text)) {
      const errorTopic = this.keywordMappings.get('errors') || this.keywordMappings.get('issues');
      if (errorTopic) return errorTopic;
    }

    if (this.isTradingSignal(text)) {
      const signalTopic = this.keywordMappings.get('signals') || this.keywordMappings.get('trading');
      if (signalTopic) return signalTopic;
    }

    return null;
  }

  private isQuestion(text: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', '?'];
    const textLower = text.toLowerCase();

    return questionWords.some(word =>
      textLower.includes(word) && textLower.includes('?')
    ) || textLower.includes('?');
  }

  private isErrorMessage(text: string): boolean {
    const errorIndicators = ['error', 'exception', 'failed', 'crash', 'bug', 'issue'];
    const textLower = text.toLowerCase();

    return errorIndicators.some(indicator => textLower.includes(indicator));
  }

  private isTradingSignal(text: string): boolean {
    const signalIndicators = ['signal', 'alert', 'trade', 'buy', 'sell', 'long', 'short'];
    const textLower = text.toLowerCase();

    return signalIndicators.some(indicator => textLower.includes(indicator));
  }

  private getUserRecentMessages(_userId: number, _limit: number): Array<{ threadId: number; timestamp: Date }> {
    // This would need access to the message log from analytics
    // For now, return empty array - would be implemented with proper data access
    return [];
  }

  async createTopicForMessage(text: string): Promise<number> {
    // Extract key terms for topic title
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const keyTerms = words.slice(0, 3);

    let title: string;
    if (keyTerms.length > 0) {
      title = keyTerms.join(' ').slice(0, 50);
    } else {
      title = "General Discussion";
    }

    // Determine category and tags based on content
    const category = this.inferCategory(text);
    const tags = this.extractTags(text);

    // Create topic
    const threadId = await this.manager.createTopic(title, tags, category);

    // Add keyword mappings for future messages
    for (const tag of tags) {
      this.addKeywordMapping(tag, threadId);
    }

    return threadId;
  }

  private inferCategory(text: string): string {
    const textLower = text.toLowerCase();

    if (this.isTradingSignal(text)) return 'trading';
    if (this.isErrorMessage(text)) return 'technical';
    if (this.isQuestion(text)) return 'support';
    if (textLower.includes('announcement') || textLower.includes('update')) return 'announcements';

    return 'general';
  }

  private extractTags(text: string): string[] {
    const textLower = text.toLowerCase();
    const tags: string[] = [];

    // Common tags based on content
    const tagMappings = {
      'trading': ['trade', 'market', 'price', 'buy', 'sell'],
      'technical': ['error', 'bug', 'fix', 'code', 'debug'],
      'support': ['help', 'question', 'how', 'what', 'why'],
      'announcements': ['announcement', 'update', 'news', 'release'],
      'polymarket': ['polymarket', 'prediction', 'odds', 'outcome'],
      'sports': ['sports', 'game', 'match', 'team', 'player'],
      'crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto']
    };

    for (const [tag, keywords] of Object.entries(tagMappings)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags.slice(0, 3); // Max 3 tags
  }

  trainFromHistory(messageLog: Array<{ threadId: number; text: string; userId: number }>, minSamples: number = 10): void {
    // Group messages by thread and analyze keywords
    const threadMessages = new Map<number, string[]>();

    for (const msg of messageLog) {
      if (!threadMessages.has(msg.threadId)) {
        threadMessages.set(msg.threadId, []);
      }
      threadMessages.get(msg.threadId)!.push(msg.text);
    }

    // Analyze frequent terms per thread
    for (const [threadId, messages] of threadMessages) {
      if (messages.length >= minSamples) {
        const keywords = this.extractKeywords(messages);

        for (const keyword of keywords.slice(0, 5)) { // Top 5 keywords
          this.addKeywordMapping(keyword, threadId);
        }

        console.log(`🎯 Trained on thread ${threadId}: ${keywords.slice(0, 3).join(', ')}`);
      }
    }
  }

  private extractKeywords(messages: string[]): string[] {
    const wordCounts = new Map<string, number>();
    const commonWords = new Set([
      'the', 'and', 'you', 'for', 'that', 'this', 'with', 'have', 'are', 'was',
      'but', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about',
      'which', 'when', 'where', 'who', 'how', 'all', 'can', 'her', 'was', 'one',
      'our', 'had', 'by', 'word', 'here', 'said', 'each', 'which', 'she', 'time'
    ]);

    // Combine all messages and extract words
    const allText = messages.join(' ').toLowerCase();
    const words = allText.match(/\b[a-z]{4,}\b/g) || [];

    // Count word frequencies
    for (const word of words) {
      if (!commonWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Return sorted by frequency
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  // Management methods
  removeRoutingRule(pattern: string): boolean {
    const index = this.routingRules.findIndex(rule => rule.pattern === pattern.toLowerCase());
    if (index > -1) {
      this.routingRules.splice(index, 1);
      return true;
    }
    return false;
  }

  removeKeywordMapping(keyword: string): boolean {
    return this.keywordMappings.delete(keyword.toLowerCase());
  }

  getRoutingStats(): {
    totalRules: number;
    totalMappings: number;
    ruleMatches: Array<{ pattern: string; matches: number; lastMatch: Date }>;
    topKeywords: Array<{ keyword: string; threadId: number }>;
  } {
    const ruleMatches = this.routingRules.map(rule => ({
      pattern: rule.pattern,
      matches: rule.matchCount,
      lastMatch: rule.lastMatched
    }));

    const topKeywords = Array.from(this.keywordMappings.entries())
      .slice(0, 10)
      .map(([keyword, threadId]) => ({ keyword, threadId }));

    return {
      totalRules: this.routingRules.length,
      totalMappings: this.keywordMappings.size,
      ruleMatches,
      topKeywords
    };
  }

  clearRules(): void {
    this.routingRules = [];
    this.keywordMappings.clear();
    this.patternStats.clear();
  }

  // Auto-learning methods
  async learnFromSuccessfulRoute(threadId: number, text: string): Promise<void> {
    // Extract keywords from successful routing and reinforce them
    const keywords = this.extractKeywords([text]);

    for (const keyword of keywords.slice(0, 3)) {
      if (!this.keywordMappings.has(keyword)) {
        this.addKeywordMapping(keyword, threadId);
        // eslint-disable-next-line no-console
        console.log(`🎯 Learned keyword '${keyword}' → thread ${threadId}`);
      }
    }
  }

  async suggestNewRules(): Promise<Array<{ pattern: string; confidence: number; threadId: number }>> {
    // Analyze message patterns that aren't currently routed
    const _unroutedMessages: Array<{ text: string; threadId: number }> = [];

    // This would analyze messages that went to default routing
    // For now, return empty suggestions
    return [];
  }
}
