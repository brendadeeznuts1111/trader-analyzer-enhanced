#!/usr/bin/env bun
/**
 * Topic Dashboard - Real-time monitoring and visualization
 */

import { EnhancedTopicManager } from './enhanced-topic-manager';
import { TopicAnalytics } from './topic-analytics';

export class TopicDashboard {
  private manager: EnhancedTopicManager;
  private analytics: TopicAnalytics;
  private metricsCache: Map<string, any> = new Map();
  private updateInterval = 60; // seconds
  private lastUpdate = 0;

  constructor(manager: EnhancedTopicManager, analytics: TopicAnalytics) {
    this.manager = manager;
    this.analytics = analytics;
  }

  async generateDashboard(): Promise<string> {
    const stats = this.manager.getStats();
    const trending = this.analytics.getTrendingTopics(10, '24h');
    const leaderboard = this.analytics.getUserLeaderboard(5);
    const engagementReport = this.analytics.getEngagementReport('24h');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram Topic Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        .card:hover {
            transform: translateY(-2px);
        }
        .card h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.25rem;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-value {
            font-weight: bold;
            color: #2c3e50;
            font-size: 1.1rem;
        }
        .trend-up { color: #27ae60; }
        .trend-down { color: #e74c3c; }
        .trend-stable { color: #f39c12; }
        .topic-list {
            list-style: none;
            padding: 0;
        }
        .topic-item {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .topic-item:last-child {
            border-bottom: none;
        }
        .topic-info h4 {
            margin: 0;
            color: #2c3e50;
            font-size: 1rem;
        }
        .topic-meta {
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 2px;
        }
        .engagement-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        .engagement-high { background: #d5f4e6; color: #27ae60; }
        .engagement-medium { background: #fff3cd; color: #f39c12; }
        .engagement-low { background: #f8d7da; color: #e74c3c; }
        .trending-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .trending-card h2 {
            color: white;
            border-bottom-color: rgba(255,255,255,0.3);
        }
        .user-list {
            display: grid;
            gap: 10px;
        }
        .user-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .user-info h4 {
            margin: 0;
            font-size: 0.9rem;
        }
        .user-score {
            background: #3498db;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2c3e50;
            display: block;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .refresh-info {
            text-align: center;
            color: rgba(255,255,255,0.7);
            font-size: 0.9rem;
            margin-top: 20px;
        }
        @media (max-width: 768px) {
            .dashboard {
                grid-template-columns: 1fr;
            }
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
    <script>
        // Auto-refresh every minute
        setTimeout(() => location.reload(), 60000);

        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for topic items
            document.querySelectorAll('.topic-item').forEach(item => {
                item.addEventListener('click', function() {
                    const threadId = this.dataset.threadId;
                    if (threadId) {
                        navigator.clipboard.writeText(threadId);
                        this.style.background = '#e8f5e8';
                        setTimeout(() => this.style.background = '', 200);
                    }
                });
            });
        });
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Telegram Topic Dashboard</h1>
            <p>Real-time analytics and monitoring for your super group topics</p>
        </div>

        <div class="dashboard">
            <!-- Overview Stats -->
            <div class="card">
                <h2>📈 Overview</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${stats.totalTopics}</span>
                        <span class="stat-label">Total Topics</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.activeTopics}</span>
                        <span class="stat-label">Active Topics</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.totalMessages}</span>
                        <span class="stat-label">Total Messages</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${engagementReport.activeUsers}</span>
                        <span class="stat-label">Active Users</span>
                    </div>
                </div>
            </div>

            <!-- Trending Topics -->
            <div class="card trending-card">
                <h2>🔥 Trending Topics (24h)</h2>
                <ul class="topic-list">
                    ${trending.map((topic: any, i: number) => `
                        <li class="topic-item" data-thread-id="${topic.threadId}">
                            <div class="topic-info">
                                <h4>#${i + 1} ${topic.title}</h4>
                                <div class="topic-meta">
                                    ${topic.messageCount} messages • ${topic.velocity.toFixed(1)}/hr
                                </div>
                            </div>
                            <span class="engagement-badge ${this.getEngagementClass(engagementReport.topTopics.find((t: any) => t.threadId === topic.threadId)?.score || 0)}">
                                ${engagementReport.topTopics.find((t: any) => t.threadId === topic.threadId)?.score.toFixed(0) || 0}
                            </span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- User Leaderboard -->
            <div class="card">
                <h2>👥 Top Contributors</h2>
                <div class="user-list">
                    ${leaderboard.map((user: any, i: number) => `
                        <div class="user-item">
                            <div class="user-info">
                                <h4>#${i + 1} User ${user.userId}</h4>
                                <div class="topic-meta">
                                    ${user.totalMessages} messages • ${user.threadsParticipated} topics
                                </div>
                            </div>
                            <span class="user-score">${user.activityScore.toFixed(0)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Engagement Metrics -->
            <div class="card">
                <h2>📊 Engagement Metrics</h2>
                <div class="metric">
                    <span>Avg Engagement Score:</span>
                    <span class="metric-value">${engagementReport.avgEngagementScore.toFixed(1)}</span>
                </div>
                <div class="metric">
                    <span>High Engagement Topics:</span>
                    <span class="metric-value engagement-high">${engagementReport.engagementDistribution.high}</span>
                </div>
                <div class="metric">
                    <span>Medium Engagement Topics:</span>
                    <span class="metric-value engagement-medium">${engagementReport.engagementDistribution.medium}</span>
                </div>
                <div class="metric">
                    <span>Low Engagement Topics:</span>
                    <span class="metric-value engagement-low">${engagementReport.engagementDistribution.low}</span>
                </div>
            </div>

            <!-- Top Tags -->
            <div class="card">
                <h2>🏷️ Popular Tags</h2>
                <ul class="topic-list">
                    ${stats.topTags.slice(0, 8).map(tag => `
                        <li class="topic-item">
                            <div class="topic-info">
                                <h4>#${tag.tag}</h4>
                            </div>
                            <span class="metric-value">${tag.count} topics</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Topic Categories -->
            <div class="card">
                <h2>📁 Categories</h2>
                ${Object.entries(stats.topicsByCategory).map(([category, count]) => `
                    <div class="metric">
                        <span>${category.charAt(0).toUpperCase() + category.slice(1)}:</span>
                        <span class="metric-value">${count}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="refresh-info">
            Last updated: ${new Date().toLocaleString()} • Auto-refreshes every minute
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  private getEngagementClass(score: number): string {
    if (score >= 70) return "engagement-high";
    if (score >= 40) return "engagement-medium";
    return "engagement-low";
  }

  async generateMetricsJson(): Promise<{
    timestamp: string;
    overview: any;
    trendingTopics: any[];
    topics: any[];
    topUsers: any[];
    engagementReport: any;
    systemMetrics: any;
  }> {
    const stats = this.manager.getStats();
    const trending = this.analytics.getTrendingTopics(10, '24h');
    const leaderboard = this.analytics.getUserLeaderboard(10);
    const engagementReport = this.analytics.getEngagementReport('24h');
    const analyticsSummary = this.analytics.getAnalyticsSummary();

    // Get detailed topic data
    const topics = this.manager.getAllTopics().map(topic => {
      const engagement = this.analytics.getTopicEngagement(topic.threadId, '24h');
      const velocity = this.analytics.getMessageVelocity(topic.threadId, 24);

      return {
        threadId: topic.threadId,
        title: topic.title,
        createdAt: topic.createdAt.toISOString(),
        messageCount: topic.messageCount,
        participantCount: topic.participantCount,
        tags: Array.from(topic.tags),
        category: topic.category,
        isActive: topic.isActive,
        engagement,
        velocity,
        metadata: topic.metadata
      };
    });

    return {
      timestamp: new Date().toISOString(),
      overview: stats,
      trendingTopics: trending,
      topics,
      topUsers: leaderboard,
      engagementReport,
      systemMetrics: {
        cacheSize: this.metricsCache.size,
        updateInterval: this.updateInterval,
        lastUpdate: this.lastUpdate,
        analyticsSummary
      }
    };
  }

  // API endpoints for the dashboard
  async getMetrics(): Promise<any> {
    const now = Date.now();
    if (now - this.lastUpdate > this.updateInterval * 1000) {
      this.metricsCache.clear();
      this.lastUpdate = now;
    }

    const cacheKey = 'metrics';
    if (!this.metricsCache.has(cacheKey)) {
      this.metricsCache.set(cacheKey, await this.generateMetricsJson());
    }

    return this.metricsCache.get(cacheKey);
  }

  async getTopicDetails(threadId: number): Promise<any> {
    const topic = this.manager.getTopic(threadId);
    if (!topic) return null;

    const engagement = this.analytics.getTopicEngagement(threadId, '24h');
    const velocity = this.analytics.getMessageVelocity(threadId, 24);

    return {
      ...topic,
      engagement,
      velocity,
      createdAt: topic.createdAt.toISOString()
    };
  }

  async getHealthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    topics: number;
    messages: number;
    users: number;
  }> {
    const stats = this.manager.getStats();
    const analytics = this.analytics.getAnalyticsSummary();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      topics: stats.totalTopics,
      messages: analytics.totalMessagesLogged,
      users: analytics.activeUsers
    };
  }

  // Polymarket-specific dashboard integration
  async generatePolymarketDashboard(polymarketData?: any[]): Promise<string> {
    const baseDashboard = await this.generateDashboard();

    // Add Polymarket-specific section
    const polymarketSection = polymarketData ? `
        <!-- Polymarket Integration -->
        <div class="card">
            <h2>🎯 Polymarket Alerts</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${polymarketData.length}</span>
                    <span class="stat-label">Active Markets</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${polymarketData.reduce((sum: number, m: any) => sum + m.volume, 0).toFixed(0)}</span>
                    <span class="stat-label">Total Volume</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${polymarketData.filter((m: any) => m.odds.yes > 0.5).length}</span>
                    <span class="stat-label">Bullish Markets</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${polymarketData.filter((m: any) => m.odds.yes <= 0.5).length}</span>
                    <span class="stat-label">Bearish Markets</span>
                </div>
            </div>
        </div>` : '';

    // Insert before closing dashboard div
    return baseDashboard.replace('</div>\n\n        <div class="refresh-info">', polymarketSection + '\n        </div>\n\n        <div class="refresh-info">');
  }
}
