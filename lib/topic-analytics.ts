#!/usr/bin/env bun
/**
 * Topic Analytics Engine
 * Real-time engagement tracking and user activity analysis
 */

import { EnhancedTopicManager, MessageAnalytics, UserActivity, TopicEngagement } from './enhanced-topic-manager';

export class TopicAnalytics {
  private manager: EnhancedTopicManager;
  private messageLog: MessageAnalytics[] = [];
  private userActivity: Map<number, UserActivity> = new Map();
  private engagementCache: Map<string, TopicEngagement> = new Map();
  private readonly maxLogSize = 10000; // Keep last 10k messages

  constructor(manager: EnhancedTopicManager) {
    this.manager = manager;
  }

  logMessage(threadId: number, userId: number, messageId: number, text: string, messageType: MessageAnalytics['messageType'] = 'text'): void {
    const entry: MessageAnalytics = {
      timestamp: new Date(),
      threadId,
      userId,
      messageId,
      textLength: text.length,
      hasMedia: messageType !== 'text',
      isReply: false, // Would need to check message.reply_to_message
      messageType
    };

    this.messageLog.push(entry);

    // Maintain log size
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }

    // Update user activity
    this.updateUserActivity(userId, threadId);

    // Update topic message count
    const topic = this.manager.getTopic(threadId);
    if (topic) {
      topic.messageCount++;
      topic.lastMessageId = messageId;
    }

    // Clear engagement cache for this topic
    this.clearTopicEngagementCache(threadId);
  }

  private updateUserActivity(userId: number, threadId: number): void {
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, {
        totalMessages: 0,
        threadsParticipated: new Set(),
        lastActive: new Date(),
        activityScore: 0,
        preferredTopics: []
      });
    }

    const activity = this.userActivity.get(userId)!;
    activity.totalMessages++;
    activity.threadsParticipated.add(threadId);
    activity.lastActive = new Date();
    activity.activityScore = this.calculateUserActivityScore(activity);

    // Update preferred topics
    this.updatePreferredTopics(activity);
  }

  private calculateUserActivityScore(activity: UserActivity): number {
    const baseScore = Math.min(activity.totalMessages / 100, 50); // Max 50 points for volume
    const diversityScore = Math.min(activity.threadsParticipated.size * 10, 30); // Max 30 for diversity
    const recencyScore = this.calculateRecencyScore(activity.lastActive); // Max 20 for recency

    return Math.min(baseScore + diversityScore + recencyScore, 100);
  }

  private calculateRecencyScore(lastActive: Date): number {
    const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

    if (hoursSinceActive < 1) return 20;
    if (hoursSinceActive < 24) return 15;
    if (hoursSinceActive < 168) return 10; // 1 week
    return 5;
  }

  private updatePreferredTopics(activity: UserActivity): void {
    const threadCounts = new Map<number, number>();

    // Count messages per thread for this user
    for (const msg of this.messageLog) {
      if (msg.userId === activity.totalMessages - 1) { // This is approximate
        const threadId = msg.threadId;
        threadCounts.set(threadId, (threadCounts.get(threadId) || 0) + 1);
      }
    }

    // Sort by message count and take top 3
    activity.preferredTopics = Array.from(threadCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([threadId]) => threadId);
  }

  getTopicEngagement(threadId: number, timePeriod: TopicEngagement['timePeriod'] = '24h'): TopicEngagement {
    const cacheKey = `${threadId}-${timePeriod}`;

    if (this.engagementCache.has(cacheKey)) {
      return this.engagementCache.get(cacheKey)!;
    }

    const cutoff = this.getTimeCutoff(timePeriod);
    const messages = this.messageLog.filter(m =>
      m.threadId === threadId && m.timestamp >= cutoff
    );

    if (messages.length === 0) {
      const engagement: TopicEngagement = {
        threadId,
        messageCount: 0,
        uniqueParticipants: 0,
        avgMessageLength: 0,
        avgResponseTimeSeconds: 0,
        engagementScore: 0,
        timePeriod
      };
      this.engagementCache.set(cacheKey, engagement);
      return engagement;
    }

    const uniqueUsers = new Set(messages.map(m => m.userId)).size;
    const avgMessageLength = messages.reduce((sum, m) => sum + m.textLength, 0) / messages.length;

    // Calculate response times
    const responseTimes = this.calculateResponseTimes(messages);
    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const engagementScore = this.calculateEngagementScore(messages.length, uniqueUsers, avgResponseTime);

    const engagement: TopicEngagement = {
      threadId,
      messageCount: messages.length,
      uniqueParticipants: uniqueUsers,
      avgMessageLength,
      avgResponseTimeSeconds: avgResponseTime,
      engagementScore,
      timePeriod
    };

    this.engagementCache.set(cacheKey, engagement);
    return engagement;
  }

  private getTimeCutoff(timePeriod: TopicEngagement['timePeriod']): Date {
    const now = new Date();
    switch (timePeriod) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateResponseTimes(messages: MessageAnalytics[]): number[] {
    const sortedMessages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const responseTimes: number[] = [];

    for (let i = 1; i < sortedMessages.length; i++) {
      const timeDiff = (sortedMessages[i].timestamp.getTime() - sortedMessages[i-1].timestamp.getTime()) / 1000;
      if (timeDiff < 3600) { // Only count responses within 1 hour
        responseTimes.push(timeDiff);
      }
    }

    return responseTimes;
  }

  private calculateEngagementScore(messageCount: number, uniqueUsers: number, avgResponseTime: number): number {
    // Weighted formula (0-100 scale)
    const messageScore = Math.min(messageCount / 10, 10); // Max 10 points for messages
    const userScore = Math.min(uniqueUsers / 5, 10); // Max 10 points for users
    const responseScore = Math.max(0, 10 - (avgResponseTime / 3600)); // Faster responses = higher score

    return Math.min(messageScore + userScore + responseScore, 30) * 3.33; // Scale to 0-100
  }

  getUserActivity(userId: number): UserActivity | null {
    return this.userActivity.get(userId) || null;
  }

  getTrendingTopics(limit: number = 5, timePeriod: TopicEngagement['timePeriod'] = '24h'): Array<{
    threadId: number;
    title: string;
    messageCount: number;
    velocity: number; // messages per hour
    trendScore: number;
  }> {
    const cutoff = this.getTimeCutoff(timePeriod);
    const hoursInPeriod = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60);

    const topicCounts = new Map<number, number>();

    // Count messages per topic in time period
    for (const message of this.messageLog) {
      if (message.timestamp >= cutoff) {
        topicCounts.set(message.threadId, (topicCounts.get(message.threadId) || 0) + 1);
      }
    }

    // Calculate trending scores
    const trending = Array.from(topicCounts.entries()).map(([threadId, count]) => {
      const topic = this.manager.getTopic(threadId);
      const velocity = count / hoursInPeriod;
      const trendScore = velocity * 10; // Base score on velocity

      return {
        threadId,
        title: topic?.title || `Topic ${threadId}`,
        messageCount: count,
        velocity,
        trendScore
      };
    });

    return trending
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }

  getUserLeaderboard(limit: number = 10): Array<{
    userId: number;
    totalMessages: number;
    threadsParticipated: number;
    activityScore: number;
    lastActive: Date;
  }> {
    return Array.from(this.userActivity.values())
      .filter(activity => activity.totalMessages >= 5) // Only active users
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit)
      .map(activity => ({
        userId: Array.from(this.userActivity.entries()).find(([_, a]) => a === activity)![0],
        totalMessages: activity.totalMessages,
        threadsParticipated: activity.threadsParticipated.size,
        activityScore: activity.activityScore,
        lastActive: activity.lastActive
      }));
  }

  getMessageVelocity(threadId: number, hours: number = 24): {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const now = new Date();
    const periodStart = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const recentMessages = this.messageLog.filter(m =>
      m.threadId === threadId && m.timestamp >= periodStart
    );

    const currentVelocity = recentMessages.length / hours;

    // Calculate average velocity over longer period
    const longerPeriodStart = new Date(now.getTime() - (hours * 2) * 60 * 60 * 1000);
    const longerPeriodMessages = this.messageLog.filter(m =>
      m.threadId === threadId && m.timestamp >= longerPeriodStart
    );

    const avgVelocity = longerPeriodMessages.length / (hours * 2);

    // Determine trend
    const ratio = currentVelocity / (avgVelocity || 1);
    let trend: 'up' | 'down' | 'stable';
    if (ratio > 1.2) trend = 'up';
    else if (ratio < 0.8) trend = 'down';
    else trend = 'stable';

    return {
      current: currentVelocity,
      average: avgVelocity,
      trend
    };
  }

  getEngagementReport(timePeriod: TopicEngagement['timePeriod'] = '24h'): {
    totalMessages: number;
    activeTopics: number;
    activeUsers: number;
    avgEngagementScore: number;
    topTopics: Array<{ threadId: number; title: string; score: number }>;
    engagementDistribution: { low: number; medium: number; high: number };
  } {
    const cutoff = this.getTimeCutoff(timePeriod);
    const periodMessages = this.messageLog.filter(m => m.timestamp >= cutoff);

    const activeTopics = new Set(periodMessages.map(m => m.threadId)).size;
    const activeUsers = new Set(periodMessages.map(m => m.userId)).size;

    const topicEngagements = Array.from(new Set(periodMessages.map(m => m.threadId)))
      .map(threadId => this.getTopicEngagement(threadId, timePeriod));

    const avgEngagementScore = topicEngagements.length > 0 ?
      topicEngagements.reduce((sum, e) => sum + e.engagementScore, 0) / topicEngagements.length : 0;

    const topTopics = topicEngagements
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5)
      .map(e => {
        const topic = this.manager.getTopic(e.threadId);
        return {
          threadId: e.threadId,
          title: topic?.title || `Topic ${e.threadId}`,
          score: e.engagementScore
        };
      });

    const distribution = {
      low: topicEngagements.filter(e => e.engagementScore < 40).length,
      medium: topicEngagements.filter(e => e.engagementScore >= 40 && e.engagementScore < 70).length,
      high: topicEngagements.filter(e => e.engagementScore >= 70).length
    };

    return {
      totalMessages: periodMessages.length,
      activeTopics,
      activeUsers,
      avgEngagementScore,
      topTopics,
      engagementDistribution: distribution
    };
  }

  private clearTopicEngagementCache(threadId: number): void {
    // Clear all cached engagement data for this topic
    const keysToDelete = Array.from(this.engagementCache.keys())
      .filter(key => key.startsWith(`${threadId}-`));

    for (const key of keysToDelete) {
      this.engagementCache.delete(key);
    }
  }

  clearCache(): void {
    this.engagementCache.clear();
  }

  getAnalyticsSummary(): {
    totalMessagesLogged: number;
    activeUsers: number;
    totalTopics: number;
    avgMessagesPerUser: number;
    mostActiveTime: string;
  } {
    const activeUsers = this.userActivity.size;
    const totalTopics = new Set(this.messageLog.map(m => m.threadId)).size;
    const avgMessagesPerUser = activeUsers > 0 ? this.messageLog.length / activeUsers : 0;

    // Find most active hour
    const hourCounts = new Map<number, number>();
    for (const msg of this.messageLog) {
      const hour = msg.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    return {
      totalMessagesLogged: this.messageLog.length,
      activeUsers,
      totalTopics,
      avgMessagesPerUser,
      mostActiveTime: `${mostActiveHour}:00`
    };
  }
}
