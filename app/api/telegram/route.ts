/**
 * Telegram Bot API
 * Full-featured endpoint for Telegram integration
 *
 * POST /api/telegram - Send messages, manage topics, pin messages, admin controls
 * GET /api/telegram - Get bot status and chat info
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  // Message sending
  sendMessage,
  sendToThread,
  forwardMessage,
  copyMessage,
  // Pinning
  pinMessage,
  unpinMessage,
  unpinAllMessages,
  sendAndPin,
  // Forum topics
  createForumTopic,
  editForumTopic,
  closeForumTopic,
  reopenForumTopic,
  deleteForumTopic,
  unpinAllForumTopicMessages,
  editGeneralForumTopic,
  closeGeneralForumTopic,
  reopenGeneralForumTopic,
  hideGeneralForumTopic,
  unhideGeneralForumTopic,
  // Group management
  getChat,
  getChatAdministrators,
  getChatMemberCount,
  getChatMember,
  setChatTitle,
  setChatDescription,
  // Admin controls
  banChatMember,
  unbanChatMember,
  restrictChatMember,
  promoteChatMember,
  setChatAdministratorCustomTitle,
  deleteMessage,
  deleteMessages,
  // Trading alerts
  sendTradeAlert,
  sendSystemAlert,
  sendDailySummary,
  sendHealthCheck,
  // Utilities
  getUpdates,
  TOPIC_COLORS,
  // Mini App
  sendWithMiniApp,
  answerCallbackQuery,
  setChatMenuButton,
  getChatMenuButton,
  // Channel
  sendToChannel,
  // Keyboard
  sendWithKeyboard,
} from '../../../lib/telegram';
import { ThreadManager } from '../../../lib/thread-manager';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';
import { enhancedBot } from '../../../lib/enhanced-telegram-bot';

// Semver utilities using Bun's native implementation
const semver = {
  order: (versionA: string, versionB: string): 0 | 1 | -1 => {
    // Use Bun's native semver.order if available
    if (typeof globalThis.Bun !== 'undefined' && globalThis.Bun.semver?.order) {
      return globalThis.Bun.semver.order(versionA, versionB);
    }

    // Fallback implementation for semantic version comparison
    const parseVersion = (v: string) => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/);
      if (!match) return null;
      return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4] || '',
        build: match[5] || ''
      };
    };

    const a = parseVersion(versionA);
    const b = parseVersion(versionB);

    if (!a || !b) return 0;

    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

    // Prerelease versions have lower precedence
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease !== b.prerelease) {
      return a.prerelease > b.prerelease ? 1 : a.prerelease < b.prerelease ? -1 : 0;
    }

    return 0;
  },

  satisfies: (version: string, range: string): boolean => {
    // Simple range checking for common cases
    if (range.startsWith('^')) {
      const base = range.slice(1);
      const [major] = base.split('.').map(Number);
      return version.startsWith(`${major}.`);
    }
    if (range.startsWith('~')) {
      const base = range.slice(1);
      const [major, minor] = base.split('.').map(Number);
      return version.startsWith(`${major}.${minor}.`);
    }
    return version === range;
  },

  compare: (versionA: string, versionB: string): 0 | 1 | -1 => {
    return semver.order(versionA, versionB);
  },

  gt: (versionA: string, versionB: string): boolean => {
    return semver.order(versionA, versionB) === 1;
  },

  lt: (versionA: string, versionB: string): boolean => {
    return semver.order(versionA, versionB) === -1;
  },

  eq: (versionA: string, versionB: string): boolean => {
    return semver.order(versionA, versionB) === 0;
  },

  inc: (version: string, release: 'major' | 'minor' | 'patch'): string => {
    const parts = version.split('.').map(Number);
    switch (release) {
      case 'major':
        return `${parts[0] + 1}.0.0`;
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch':
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      default:
        return version;
    }
  }
};

// Service Registry with semver capabilities
interface ServiceRegistry {
  [serviceName: string]: {
    name: string;
    status: 'online' | 'offline' | 'degraded' | 'maintenance';
    lastHeartbeat: Date;
    version: string;
    latestVersion?: string;
    updateAvailable: boolean;
    compatibility: 'compatible' | 'incompatible' | 'unknown';
    endpoints: string[];
    dependencies: string[];
    healthScore: number;
    uptime: number;
    metadata: Record<string, unknown>;
  };
}

// Global service registry
const serviceRegistry: ServiceRegistry = {
  'enhanced-telegram-bot': {
    name: 'Enhanced Telegram Bot',
    status: 'online',
    lastHeartbeat: new Date(),
    version: '4.0.0',
    latestVersion: '4.1.0',
    updateAvailable: false,
    compatibility: 'compatible',
    endpoints: ['/api/telegram', '/api/dashboard'],
    dependencies: ['telegram-api', 'enhanced-topic-manager'],
    healthScore: 100,
    uptime: 0,
    metadata: { commands: 7, topics: 0 }
  },
  'topic-analytics': {
    name: 'Topic Analytics Engine',
    status: 'online',
    lastHeartbeat: new Date(),
    version: '4.0.0',
    latestVersion: '4.0.1',
    updateAvailable: false,
    compatibility: 'compatible',
    endpoints: ['/api/telegram?action=enhanced_topics'],
    dependencies: ['enhanced-topic-manager'],
    healthScore: 100,
    uptime: 0,
    metadata: { trackedTopics: 0, messagesAnalyzed: 0 }
  },
  'polymarket-integration': {
    name: 'Polymarket Integration',
    status: 'online',
    lastHeartbeat: new Date(),
    version: '4.0.0',
    latestVersion: '4.0.0',
    updateAvailable: false,
    compatibility: 'compatible',
    endpoints: ['/api/telegram?action=polymarket_status'],
    dependencies: ['polymarket-api'],
    healthScore: 100,
    uptime: 0,
    metadata: { alertsSent: 0, marketsMonitored: 0 }
  },
  'property-hierarchy-v4': {
    name: 'Property Hierarchy v4',
    status: 'online',
    lastHeartbeat: new Date(),
    version: '4.0.0',
    latestVersion: '4.0.0',
    updateAvailable: false,
    compatibility: 'compatible',
    endpoints: ['/api/property-hierarchy'],
    dependencies: ['base-exchange', 'uuid-v5-production'],
    healthScore: 100,
    uptime: 0,
    metadata: { nodesProcessed: 0, hierarchiesCreated: 0 }
  }
};

// Version management utilities
const versionManager = {
  checkForUpdates: (): Array<{ service: string; current: string; latest: string; needsUpdate: boolean }> => {
    return Object.entries(serviceRegistry).map(([serviceName, service]) => ({
      service: serviceName,
      current: service.version,
      latest: service.latestVersion || service.version,
      needsUpdate: service.updateAvailable
    }));
  },

  getVersionInfo: (serviceName: string) => {
    const service = serviceRegistry[serviceName];
    if (!service) return null;

    return {
      service: serviceName,
      currentVersion: service.version,
      latestVersion: service.latestVersion,
      updateAvailable: service.updateAvailable,
      compatibility: service.compatibility,
      changelog: versionManager.generateChangelog(service.version, service.latestVersion || service.version),
      recommendedAction: service.updateAvailable ? 'update_available' : 'current'
    };
  },

  generateChangelog: (fromVersion: string, toVersion: string): string[] => {
    // Generate changelog based on version differences
    const changes: string[] = [];

    if (semver.gt(toVersion, fromVersion)) {
      if (semver.order(toVersion.split('.')[0], fromVersion.split('.')[0]) > 0) {
        changes.push('Major version update - breaking changes expected');
      } else if (semver.order(toVersion.split('.')[1], fromVersion.split('.')[1]) > 0) {
        changes.push('Minor version update - new features added');
      } else {
        changes.push('Patch version update - bug fixes and improvements');
      }
    }

    return changes;
  },

  validateCompatibility: (serviceVersions: Record<string, string>): boolean => {
    // Check if all service versions are compatible with each other
    const services = Object.keys(serviceRegistry);
    for (const service of services) {
      const requiredVersion = serviceVersions[service];
      const currentVersion = serviceRegistry[service]?.version;

      if (requiredVersion && currentVersion) {
        if (!semver.satisfies(currentVersion, requiredVersion)) {
          return false;
        }
      }
    }
    return true;
  }
};

// Keep-alive tracking
let lastKeepAlive = Date.now();

// CPU Profiling state
const cpuProfilingActive = false;
const profilingStartTime = 0;
const profilingData: unknown[] = [];

// Health monitoring
interface HealthMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: NodeJS.MemoryUsage;
  responseTime: number;
  activeConnections: number;
  errorRate: number;
}

const healthHistory: HealthMetrics[] = [];

// Update service registry
function updateServiceRegistry() {
  const now = Date.now();
  const uptime = now - lastKeepAlive;

  // Update enhanced bot metrics
  try {
    const manager = enhancedBot.getTopicManager();
    const stats = manager.getStats();
    serviceRegistry['enhanced-telegram-bot'].metadata = {
      commands: 7,
      topics: stats.totalTopics,
      activeTopics: stats.activeTopics,
    };
    serviceRegistry['enhanced-telegram-bot'].healthScore = stats.activeTopics > 0 ? 100 : 95;
    serviceRegistry['enhanced-telegram-bot'].uptime = uptime;

    const analytics = enhancedBot.getAnalytics();
    const engagement = analytics.getEngagementReport('24h');
    serviceRegistry['topic-analytics'].metadata = {
      trackedTopics: stats.totalTopics,
      messagesAnalyzed: engagement.totalMessages,
    };
    serviceRegistry['topic-analytics'].healthScore = engagement.totalMessages > 0 ? 100 : 90;
    serviceRegistry['topic-analytics'].uptime = uptime;
  } catch (error) {
    // Mark services as degraded if there's an error
    serviceRegistry['enhanced-telegram-bot'].status = 'degraded';
    serviceRegistry['topic-analytics'].status = 'degraded';
    serviceRegistry['enhanced-telegram-bot'].healthScore = 50;
    serviceRegistry['topic-analytics'].healthScore = 50;
  }

  // Update heartbeat
  Object.values(serviceRegistry).forEach(service => {
    service.lastHeartbeat = new Date();
  });
}

// Keep-alive function
function keepAlive() {
  lastKeepAlive = Date.now();
  updateServiceRegistry();
}

// Generate visual monitoring dashboard
function generateMonitoringDashboard(): string {
  updateServiceRegistry();
  const services = Object.values(serviceRegistry);
  const now = new Date();

  // Calculate overall health
  const healthyCount = services.filter(s => s.status === 'online').length;
  const avgHealthScore = Math.round(
    services.reduce((sum, s) => sum + s.healthScore, 0) / services.length
  );

  // System metrics
  const memUsage = process.memoryUsage();
  const uptime = Math.floor((Date.now() - lastKeepAlive) / 1000);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Monitoring Dashboard - Enhanced Telegram Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
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
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .metric-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2c3e50;
            display: block;
        }
        .metric-label {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-online { background: #d5f4e6; color: #27ae60; }
        .status-degraded { background: #fff3cd; color: #f39c12; }
        .status-offline { background: #f8d7da; color: #e74c3c; }
        .service-list {
            display: grid;
            gap: 10px;
        }
        .service-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .service-info h4 {
            margin: 0;
            color: #2c3e50;
            font-size: 1rem;
        }
        .service-meta {
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 2px;
        }
        .health-bar {
            width: 100px;
            height: 8px;
            background: #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
            margin-left: 10px;
        }
        .health-fill {
            height: 100%;
            background: linear-gradient(90deg, #e74c3c 0%, #f39c12 50%, #27ae60 100%);
            transition: width 0.3s ease;
        }
        .system-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .system-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .system-value {
            font-size: 1.2rem;
            font-weight: bold;
            color: #2c3e50;
            display: block;
        }
        .system-label {
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
        .controls {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .btn-primary { background: #3498db; color: white; }
        .btn-primary:hover { background: #2980b9; }
        .btn-secondary { background: #95a5a6; color: white; }
        .btn-secondary:hover { background: #7f8c8d; }
        .btn-success { background: #27ae60; color: white; }
        .btn-success:hover { background: #229954; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-danger:hover { background: #c0392b; }
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
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);

        // Keep-alive ping every 10 seconds
        setInterval(async () => {
            try {
                await fetch('/api/telegram?action=keepalive');
            } catch (e) {
                console.warn('Keep-alive failed:', e);
            }
        }, 10000);

        async function controlProfiling(action) {
            try {
                const response = await fetch(\`/api/telegram?action=profile&subaction=\${action}\`);
                const data = await response.json();
                alert(data.message || data.error);
                if (action === 'status') {
                    console.log('Profiling status:', data);
                }
                setTimeout(() => location.reload(), 1000);
            } catch (e) {
                alert('Profiling control failed: ' + e.message);
            }
        }

        async function refreshRegistry() {
            try {
                const response = await fetch('/api/telegram?action=registry');
                const data = await response.json();
                console.log('Registry refreshed:', data);
                location.reload();
            } catch (e) {
                alert('Registry refresh failed: ' + e.message);
            }
        }

        async function checkVersions() {
            try {
                const response = await fetch('/api/telegram?action=versions&subaction=check');
                const data = await response.json();
                let message = 'Version Check Results:\\n\\n';
                data.updates.forEach(function(update) {
                    message += update.service + ': ' + update.current;
                    if (update.needsUpdate) {
                        message += ' → ' + update.latest + ' (UPDATE AVAILABLE)';
                    } else {
                        message += ' (current)';
                    }
                    message += '\\n';
                });
                alert(message);
            } catch (e) {
                alert('Version check failed: ' + e.message);
            }
        }

        async function viewVersionDetails() {
            try {
                const services = ['enhanced-telegram-bot', 'topic-analytics', 'polymarket-integration', 'property-hierarchy-v4'];
                let details = 'Version Details:\\n\\n';

                for (let i = 0; i < services.length; i++) {
                    const service = services[i];
                    const response = await fetch('/api/telegram?action=versions&subaction=info&service=' + service);
                    const data = await response.json();
                    if (data.ok) {
                        details += data.service + ': v' + data.currentVersion;
                        if (data.updateAvailable) {
                            details += ' → v' + data.latestVersion + ' (UPDATE AVAILABLE)\\n';
                            details += '  Changes: ' + data.changelog.join(', ') + '\\n';
                        } else {
                            details += ' (current)\\n';
                        }
                    }
                }
                alert(details);
            } catch (e) {
                alert('Version details failed: ' + e.message);
            }
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 System Monitoring Dashboard</h1>
            <p>Real-time oversight of Enhanced Telegram Bot ecosystem</p>
        </div>

        <div class="dashboard">
            <!-- Overall Health -->
            <div class="card">
                <h2>🏥 Overall Health</h2>
                <div class="metric-grid">
                    <div class="metric-item">
                        <span class="metric-value">${avgHealthScore}%</span>
                        <span class="metric-label">Health Score</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${healthyCount}/${services.length}</span>
                        <span class="metric-label">Services Online</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${Math.floor(uptime / 60)}m</span>
                        <span class="metric-label">Uptime</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value ${healthyCount === services.length ? 'status-online' : 'status-degraded'}">${healthyCount === services.length ? 'HEALTHY' : 'DEGRADED'}</span>
                        <span class="metric-label">System Status</span>
                    </div>
                </div>
                <div class="controls">
                    <button class="btn btn-primary" onclick="refreshRegistry()">🔄 Refresh</button>
                    <button class="btn btn-success" onclick="controlProfiling('start')">▶️ Start Profiling</button>
                    <button class="btn btn-danger" onclick="controlProfiling('stop')">⏹️ Stop Profiling</button>
                    <button class="btn btn-secondary" onclick="controlProfiling('status')">📊 Profile Status</button>
                </div>
            </div>

            <!-- Service Registry -->
            <div class="card">
                <h2>📋 Service Registry</h2>
                <div class="service-list">
                    ${services
                      .map(
                        service => `
                        <div class="service-item">
                            <div class="service-info">
                                <h4>${service.name}</h4>
                                <div class="service-meta">
                                    v${service.version}${service.updateAvailable ? ` → ${service.latestVersion}` : ''} • ${service.endpoints.length} endpoints
                                    ${service.updateAvailable ? '<span style="color: #f39c12; font-weight: bold;">UPDATE AVAILABLE</span>' : ''}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <div class="health-bar">
                                    <div class="health-fill" style="width: ${service.healthScore}%"></div>
                                </div>
                                <span class="status-badge status-${service.status}">
                                    ${service.status}
                                </span>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>

            <!-- System Metrics -->
            <div class="card">
                <h2>💻 System Metrics</h2>
                <div class="system-grid">
                    <div class="system-item">
                        <span class="system-value">${Math.round(memUsage.rss / 1024 / 1024)}MB</span>
                        <span class="system-label">Memory (RSS)</span>
                    </div>
                    <div class="system-item">
                        <span class="system-value">${Math.round(memUsage.heapUsed / 1024 / 1024)}MB</span>
                        <span class="system-label">Heap Used</span>
                    </div>
                    <div class="system-item">
                        <span class="system-value">${process.platform}</span>
                        <span class="system-label">Platform</span>
                    </div>
                    <div class="system-item">
                        <span class="system-value">${process.version}</span>
                        <span class="system-label">Node Version</span>
                    </div>
                </div>
            </div>

            <!-- CPU Profiling Status -->
            <div class="card">
                <h2>⚡ CPU Profiling</h2>
                <div class="metric-grid">
                    <div class="metric-item">
                        <span class="metric-value">${cpuProfilingActive ? 'ACTIVE' : 'INACTIVE'}</span>
                        <span class="metric-label">Status</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${profilingData.length}</span>
                        <span class="metric-label">Data Points</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${cpuProfilingActive ? Math.floor((Date.now() - profilingStartTime) / 1000) + 's' : 'N/A'}</span>
                        <span class="metric-label">Duration</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                        <span class="metric-label">Last Update</span>
                    </div>
                </div>
            </div>

            <!-- Topic Analytics -->
            <div class="card">
                <h2>💬 Topic Analytics</h2>
                <div class="metric-grid">
                    <div class="metric-item">
                        <span class="metric-value">${services.find(s => s.name === 'Topic Analytics Engine')?.metadata?.trackedTopics || 0}</span>
                        <span class="metric-label">Tracked Topics</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${services.find(s => s.name === 'Topic Analytics Engine')?.metadata?.messagesAnalyzed || 0}</span>
                        <span class="metric-label">Messages Analyzed</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${services.find(s => s.name === 'Enhanced Telegram Bot')?.metadata?.activeTopics || 0}</span>
                        <span class="metric-label">Active Topics</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${services.find(s => s.name === 'Enhanced Telegram Bot')?.metadata?.commands || 0}</span>
                        <span class="metric-label">Available Commands</span>
                    </div>
                </div>
            </div>

            <!-- Version Management -->
            <div class="card">
                <h2>🔄 Version Management</h2>
                <div class="metric-grid">
                    ${services
                      .filter(service => service.updateAvailable)
                      .map(service => `
                        <div class="metric-item">
                            <span class="metric-value" style="color: #f39c12;">${service.version} → ${service.latestVersion}</span>
                            <span class="metric-label">${service.name}</span>
                        </div>
                      `).join('')}
                    ${services.filter(service => service.updateAvailable).length === 0 ? `
                        <div class="metric-item">
                            <span class="metric-value" style="color: #27ae60;">ALL CURRENT</span>
                            <span class="metric-label">No updates available</span>
                        </div>
                    ` : ''}
                </div>
                <div class="controls">
                    <button class="btn btn-secondary" onclick="checkVersions()">🔍 Check Versions</button>
                    <button class="btn btn-success" onclick="viewVersionDetails()">📋 Version Details</button>
                </div>
            </div>
        </div>

        <div class="refresh-info">
            Last updated: ${now.toLocaleString()} • Auto-refreshes every 30 seconds
            <br>
            Keep-alive active: Pings server every 10 seconds
        </div>
    </div>
</body>
</html>`;

  return html;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    let result: any;

    switch (action) {
      case 'chat':
        result = await getChat();
        break;
      case 'admins':
        result = await getChatAdministrators();
        break;
      case 'members':
        result = await getChatMemberCount();
        break;
      case 'updates':
        result = await getUpdates();
        break;
      case 'topics': {
        // Get thread manager topics for the configured chat
        const chatId = parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const topics = ThreadManager.getAllTopics(chatId);
        const pinned = ThreadManager.getPinnedTopics(chatId);
        const pinnedObj: Record<string, any> = {};
        Array.from(pinned.entries()).forEach(([purpose, info]) => {
          pinnedObj[purpose] = info;
        });
        result = {
          ok: true,
          chatId,
          topics,
          pinned: pinnedObj,
          alertsThread: ThreadManager.getAlertsThread(chatId),
          errorsThread: ThreadManager.getErrorsThread(chatId),
          tradesThread: ThreadManager.getTradesThread(chatId),
        };
        break;
      }
      case 'enhanced_topics': {
        const manager = enhancedBot.getTopicManager();
        const analytics = enhancedBot.getAnalytics();
        const stats = manager.getStats();
        const engagement = analytics.getEngagementReport('24h');
        const trending = analytics.getTrendingTopics(5, '24h');

        result = {
          ok: true,
          stats,
          engagement,
          trending,
          activeTopics: manager
            .getActiveTopics()
            .slice(0, 10)
            .map(t => ({
              threadId: t.threadId,
              title: t.title,
              messageCount: t.messageCount,
              participantCount: t.participantCount,
              tags: Array.from(t.tags),
              category: t.category,
              engagement: analytics.getTopicEngagement(t.threadId, '24h'),
            })),
        };
        break;
      }

      case 'dashboard': {
        const dashboard = enhancedBot.getDashboard();
        const html = await dashboard.generateDashboard();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=30',
          },
        });
      }

      case 'polymarket_status': {
        // Get Polymarket integration status
        result = {
          ok: true,
          enhancedBotInitialized: true,
          message: 'Polymarket alerts integrated with enhanced topic routing',
        };
        break;
      }

      case 'registry': {
        // Service registry overview
        updateServiceRegistry();
        result = {
          ok: true,
          registry: serviceRegistry,
          totalServices: Object.keys(serviceRegistry).length,
          healthyServices: Object.values(serviceRegistry).filter(s => s.status === 'online').length,
          averageHealthScore: Math.round(
            Object.values(serviceRegistry).reduce((sum, s) => sum + s.healthScore, 0) /
              Object.keys(serviceRegistry).length
          ),
          lastUpdated: new Date().toISOString(),
        };
        break;
      }

      case 'monitoring': {
        // Visual monitoring dashboard (HTML)
        const html = generateMonitoringDashboard();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
          },
        });
      }

      case 'health': {
        // Comprehensive health check
        updateServiceRegistry();
        const now = Date.now();
        const uptime = now - lastKeepAlive;

        // Calculate health metrics
        const services = Object.values(serviceRegistry);
        const healthyCount = services.filter(s => s.status === 'online').length;
        const avgHealthScore = Math.round(
          services.reduce((sum, s) => sum + s.healthScore, 0) / services.length
        );

        // Get system metrics
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        result = {
          ok: true,
          status: healthyCount === services.length ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime,
          services: {
            total: services.length,
            healthy: healthyCount,
            degraded: services.filter(s => s.status === 'degraded').length,
            offline: services.filter(s => s.status === 'offline').length,
          },
          healthScore: avgHealthScore,
          system: {
            memory: {
              rss: Math.round(memUsage.rss / 1024 / 1024), // MB
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
              external: Math.round(memUsage.external / 1024 / 1024), // MB
            },
            cpu: {
              user: Math.round(cpuUsage.user / 1000), // ms
              system: Math.round(cpuUsage.system / 1000), // ms
            },
            platform: process.platform,
            nodeVersion: process.version,
          },
          lastKeepAlive: new Date(lastKeepAlive).toISOString(),
        };
        break;
      }

      case 'keepalive': {
        // Keep-alive endpoint
        keepAlive();
        result = {
          ok: true,
          message: 'Keep-alive acknowledged',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - lastKeepAlive,
          services: Object.keys(serviceRegistry).length,
        };
        break;
      }

      case 'semver': {
        // Semver utilities endpoint
        const subAction = searchParams.get('subaction');
        const versionA = searchParams.get('versionA');
        const versionB = searchParams.get('versionB');
        const range = searchParams.get('range');

        switch (subAction) {
          case 'compare': {
            if (!versionA || !versionB) {
              result = { ok: false, error: 'Missing versionA or versionB parameters' };
            } else {
              const comparison = semver.order(versionA, versionB);
              result = {
                ok: true,
                versionA,
                versionB,
                comparison,
                result: comparison === 0 ? 'equal' : comparison === 1 ? 'versionA > versionB' : 'versionA < versionB'
              };
            }
            break;
          }

          case 'check-satisfies': {
            if (!versionA || !range) {
              result = { ok: false, error: 'Missing version or range parameters' };
            } else {
              const isSatisfied = semver.satisfies(versionA, range);
              result = {
                ok: true,
                version: versionA,
                range,
                satisfies: isSatisfied
              };
            }
            break;
          }

          case 'inc': {
            if (!versionA) {
              result = { ok: false, error: 'Missing version parameter' };
            } else {
              const release = (searchParams.get('release') as 'major' | 'minor' | 'patch') || 'patch';
              const incremented = semver.inc(versionA, release);
              result = {
                ok: true,
                original: versionA,
                release,
                incremented
              };
            }
            break;
          }

          default: {
            result = {
              ok: true,
              available: ['compare', 'satisfies', 'inc'],
              usage: {
                compare: '/api/telegram?action=semver&subaction=compare&versionA=1.0.0&versionB=2.0.0',
                satisfies: '/api/telegram?action=semver&subaction=satisfies&version=1.2.3&range=^1.0.0',
                inc: '/api/telegram?action=semver&subaction=inc&version=1.2.3&release=patch'
              }
            };
          }
        }
        break;
      }

      case 'versions': {
        // Version management endpoint
        const subAction = searchParams.get('subaction');
        const service = searchParams.get('service');

        switch (subAction) {
          case 'check':
            result = {
              ok: true,
              updates: versionManager.checkForUpdates(),
              timestamp: new Date().toISOString()
            };
            break;

          case 'info': {
            if (!service) {
              result = { ok: false, error: 'Missing service parameter' };
            } else {
              result = {
                ok: true,
                ...versionManager.getVersionInfo(service)
              };
            }
            break;
          }

          case 'compatibility': {
            const serviceVersions: Record<string, string> = {};
            // Parse service versions from query parameters
            for (const [key, value] of searchParams.entries()) {
              if (key.startsWith('service_')) {
                serviceVersions[key.replace('service_', '')] = value;
              }
            }
            result = {
              ok: true,
              compatible: versionManager.validateCompatibility(serviceVersions),
              requirements: serviceVersions
            };
            break;
          }

          default:
            result = {
              ok: true,
              available: ['check', 'info', 'compatibility'],
              usage: {
                check: '/api/telegram?action=versions&subaction=check',
                info: '/api/telegram?action=versions&subaction=info&service=enhanced-telegram-bot',
                compatibility: '/api/telegram?action=versions&subaction=compatibility&service_enhanced-telegram-bot=^4.0.0'
              }
            };
        }
        break;
      }

      // ═══════════════════════════════════════════════════════════════
      // TESTING ENDPOINTS
      // ═══════════════════════════════════════════════════════════════

      case 'test': {
        const subAction = searchParams.get('subaction') || 'ping';
        const topicId = searchParams.get('topic_id');
        const message = searchParams.get('message');

        switch (subAction) {
          case 'ping': {
            const start = Date.now();
            result = {
              ok: true,
              latency: Date.now() - start,
              timestamp: new Date().toISOString(),
              message: 'pong'
            };
            break;
          }

          case 'topic': {
            if (!topicId) {
              result = { ok: false, error: 'Missing topic_id parameter' };
            } else {
              const manager = enhancedBot.getTopicManager();
              const topic = manager.getTopic(parseInt(topicId));
              if (topic) {
                const analytics = enhancedBot.getAnalytics();
                result = {
                  ok: true,
                  topic: {
                    threadId: topic.threadId,
                    title: topic.title,
                    messageCount: topic.messageCount,
                    participantCount: topic.participantCount,
                    tags: Array.from(topic.tags),
                    category: topic.category,
                    engagement: analytics.getTopicEngagement(topic.threadId, '24h')
                  }
                };
              } else {
                result = { ok: false, error: `Topic not found: ${topicId}` };
              }
            }
            break;
          }

          case 'route': {
            const testMessage = message || 'test message';
            const router = enhancedBot.getRouter();
            const manager = enhancedBot.getTopicManager();
            const routedTopicId = await router.routeMessage(testMessage, 0);
            if (routedTopicId) {
              const routedTopic = manager.getTopic(routedTopicId);
              result = {
                ok: true,
                message: testMessage,
                routedTo: {
                  threadId: routedTopicId,
                  title: routedTopic?.title || 'Unknown'
                }
              };
            } else {
              result = {
                ok: true,
                message: testMessage,
                routedTo: null,
                info: 'No topic matched for this message'
              };
            }
            break;
          }

          case 'send': {
            if (!topicId || !message) {
              result = { ok: false, error: 'Missing topic_id or message parameter' };
            } else {
              try {
                const manager = enhancedBot.getTopicManager();
                await manager.sendToTopic(parseInt(topicId), `🧪 Test: ${message}`);
                result = {
                  ok: true,
                  sent: true,
                  topicId: parseInt(topicId),
                  message
                };
              } catch (error) {
                result = {
                  ok: false,
                  error: error instanceof Error ? error.message : 'Failed to send'
                };
              }
            }
            break;
          }

          case 'analytics': {
            const analytics = enhancedBot.getAnalytics();
            const engagement = analytics.getEngagementReport('24h');
            const summary = analytics.getAnalyticsSummary();
            result = {
              ok: true,
              engagement,
              summary,
              trending: analytics.getTrendingTopics(5, '24h')
            };
            break;
          }

          case 'create_topic': {
            const name = searchParams.get('name');
            const tags = searchParams.get('tags')?.split(',') || [];
            const category = searchParams.get('category') || 'general';

            if (!name) {
              result = { ok: false, error: 'Missing name parameter' };
            } else {
              try {
                const manager = enhancedBot.getTopicManager();
                const threadId = await manager.createTopic(name, tags, category);
                result = {
                  ok: true,
                  created: true,
                  topic: {
                    threadId,
                    name,
                    tags,
                    category
                  }
                };
              } catch (error) {
                result = {
                  ok: false,
                  error: error instanceof Error ? error.message : 'Failed to create topic'
                };
              }
            }
            break;
          }

          case 'list_topics': {
            const manager = enhancedBot.getTopicManager();
            const topics = manager.getActiveTopics();
            result = {
              ok: true,
              count: topics.length,
              topics: topics.map(t => ({
                threadId: t.threadId,
                title: t.title,
                messageCount: t.messageCount,
                participantCount: t.participantCount,
                tags: Array.from(t.tags),
                category: t.category
              }))
            };
            break;
          }

          default:
            result = {
              ok: true,
              available: ['ping', 'topic', 'route', 'send', 'analytics', 'create_topic', 'list_topics'],
              usage: {
                ping: '/api/telegram?action=test&subaction=ping',
                topic: '/api/telegram?action=test&subaction=topic&topic_id=1001',
                route: '/api/telegram?action=test&subaction=route&message=test%20message',
                send: '/api/telegram?action=test&subaction=send&topic_id=1001&message=Hello',
                analytics: '/api/telegram?action=test&subaction=analytics',
                create_topic: '/api/telegram?action=test&subaction=create_topic&name=Test&tags=test,demo&category=general',
                list_topics: '/api/telegram?action=test&subaction=list_topics'
              }
            };
        }
        break;
      }

      case 'channels': {
        // Get all configured channels/groups
        const chatId = parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const groupId = parseInt(process.env.TELEGRAM_GROUP_ID || '0');

        result = {
          ok: true,
          channels: {
            main: {
              id: chatId,
              configured: chatId !== 0,
              type: 'chat'
            },
            group: {
              id: groupId,
              configured: groupId !== 0,
              type: 'supergroup'
            }
          },
          timestamp: new Date().toISOString()
        };
        break;
      }

      case 'threads': {
        // Get all threads/topics in the configured group
        const chatId = parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const groupId = parseInt(process.env.TELEGRAM_GROUP_ID || '0');
        const targetId = groupId || chatId;

        const manager = enhancedBot.getTopicManager();
        const topics = manager.getActiveTopics();
        const threadManagerTopics = ThreadManager.getAllTopics(targetId);

        result = {
          ok: true,
          chatId: targetId,
          enhancedTopics: {
            count: topics.length,
            topics: topics.map(t => ({
              threadId: t.threadId,
              title: t.title,
              category: t.category,
              messageCount: t.messageCount
            }))
          },
          threadManagerTopics: {
            count: Object.keys(threadManagerTopics).length,
            topics: threadManagerTopics
          },
          pinnedTopics: {
            alerts: ThreadManager.getAlertsThread(targetId),
            errors: ThreadManager.getErrorsThread(targetId),
            trades: ThreadManager.getTradesThread(targetId)
          },
          timestamp: new Date().toISOString()
        };
        break;
      }
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: { 'X-Data-Type': 'telegram-status' },
    });

    return NextResponse.json(result, { headers: headersToObject(headers) });
  } catch (error) {
    const { body, init } = createErrorResponse(
      'Failed to get Telegram status',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

// POST handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    if (!body.action) {
      const { body: errBody, init } = createErrorResponse(
        'Missing required field: action',
        400,
        'See API documentation for available actions',
        request
      );
      return NextResponse.json(errBody, init);
    }

    let result: any;

    switch (body.action) {
      // ═══════════════════════════════════════════════════════════
      // MESSAGE SENDING
      // ═══════════════════════════════════════════════════════════
      case 'send':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendMessage({
          text: body.text,
          parse_mode: body.parse_mode || 'HTML',
          disable_notification: body.silent || false,
          message_thread_id: body.threadId,
          reply_to_message_id: body.replyTo,
        });
        break;

      case 'sendToThread':
        if (!body.threadId || !body.text) {
          return errorResponse('Missing required fields: threadId, text', request);
        }
        result = await sendToThread(body.threadId, body.text, {
          parse_mode: body.parse_mode,
          disable_notification: body.silent,
        });
        break;

      case 'forward':
        if (!body.fromChatId || !body.messageId) {
          return errorResponse('Missing required fields: fromChatId, messageId', request);
        }
        result = await forwardMessage(body.fromChatId, body.messageId, body.toChatId);
        break;

      case 'copy':
        if (!body.fromChatId || !body.messageId) {
          return errorResponse('Missing required fields: fromChatId, messageId', request);
        }
        result = await copyMessage(body.fromChatId, body.messageId, body.toChatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // MESSAGE PINNING
      // ═══════════════════════════════════════════════════════════
      case 'pin':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await pinMessage(body.messageId, body.chatId, body.silent);
        break;

      case 'unpin':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await unpinMessage(body.messageId, body.chatId);
        break;

      case 'unpinAll':
        result = await unpinAllMessages(body.chatId);
        break;

      case 'sendAndPin':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendAndPin(
          {
            text: body.text,
            parse_mode: body.parse_mode || 'HTML',
            message_thread_id: body.threadId,
          },
          body.chatId
        );
        break;

      // ═══════════════════════════════════════════════════════════
      // FORUM TOPIC MANAGEMENT
      // ═══════════════════════════════════════════════════════════
      case 'createTopic':
        if (!body.name) {
          return errorResponse('Missing required field: name', request);
        }
        result = await createForumTopic(
          body.name,
          body.chatId,
          body.iconColor || TOPIC_COLORS.BLUE,
          body.iconCustomEmojiId
        );
        break;

      case 'editTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await editForumTopic(
          body.threadId,
          body.chatId,
          body.name,
          body.iconCustomEmojiId
        );
        break;

      case 'closeTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await closeForumTopic(body.threadId, body.chatId);
        break;

      case 'reopenTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await reopenForumTopic(body.threadId, body.chatId);
        break;

      case 'deleteTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await deleteForumTopic(body.threadId, body.chatId);
        break;

      case 'unpinAllTopicMessages':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await unpinAllForumTopicMessages(body.threadId, body.chatId);
        break;

      case 'editGeneralTopic':
        if (!body.name) {
          return errorResponse('Missing required field: name', request);
        }
        result = await editGeneralForumTopic(body.name, body.chatId);
        break;

      case 'closeGeneralTopic':
        result = await closeGeneralForumTopic(body.chatId);
        break;

      case 'reopenGeneralTopic':
        result = await reopenGeneralForumTopic(body.chatId);
        break;

      case 'hideGeneralTopic':
        result = await hideGeneralForumTopic(body.chatId);
        break;

      case 'unhideGeneralTopic':
        result = await unhideGeneralForumTopic(body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // GROUP MANAGEMENT
      // ═══════════════════════════════════════════════════════════
      case 'getChat':
        result = await getChat(body.chatId);
        break;

      case 'getAdmins':
        result = await getChatAdministrators(body.chatId);
        break;

      case 'getMemberCount':
        result = await getChatMemberCount(body.chatId);
        break;

      case 'getMember':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await getChatMember(body.userId, body.chatId);
        break;

      case 'setTitle':
        if (!body.title) {
          return errorResponse('Missing required field: title', request);
        }
        result = await setChatTitle(body.title, body.chatId);
        break;

      case 'setDescription':
        if (!body.description) {
          return errorResponse('Missing required field: description', request);
        }
        result = await setChatDescription(body.description, body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // ADMIN CONTROLS
      // ═══════════════════════════════════════════════════════════
      case 'ban':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await banChatMember(body.userId, body.chatId, body.untilDate, body.revokeMessages);
        break;

      case 'unban':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await unbanChatMember(body.userId, body.chatId, body.onlyIfBanned);
        break;

      case 'restrict':
        if (!body.userId || !body.permissions) {
          return errorResponse('Missing required fields: userId, permissions', request);
        }
        result = await restrictChatMember(
          body.userId,
          body.permissions,
          body.chatId,
          body.untilDate
        );
        break;

      case 'promote':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await promoteChatMember(body.userId, body.chatId, body.permissions || {});
        break;

      case 'setAdminTitle':
        if (!body.userId || !body.customTitle) {
          return errorResponse('Missing required fields: userId, customTitle', request);
        }
        result = await setChatAdministratorCustomTitle(body.userId, body.customTitle, body.chatId);
        break;

      case 'deleteMessage':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await deleteMessage(body.messageId, body.chatId);
        break;

      case 'deleteMessages':
        if (!body.messageIds || !Array.isArray(body.messageIds)) {
          return errorResponse('Missing required field: messageIds (array)', request);
        }
        result = await deleteMessages(body.messageIds, body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // TRADING ALERTS (LEGACY SUPPORT)
      // ═══════════════════════════════════════════════════════════
      case 'trade':
        if (!body.alert) {
          return errorResponse('Missing required field: alert', request);
        }
        result = await sendTradeAlert(body.alert);
        break;

      case 'system':
        if (!body.alert) {
          return errorResponse('Missing required field: alert', request);
        }
        result = await sendSystemAlert(body.alert);
        break;

      case 'summary':
        if (!body.stats) {
          return errorResponse('Missing required field: stats', request);
        }
        result = await sendDailySummary(body.stats, body.threadId);
        break;

      case 'health':
        result = await sendHealthCheck(body.threadId);
        break;

      // ═══════════════════════════════════════════════════════════
      // MINI APP
      // ═══════════════════════════════════════════════════════════
      case 'sendMiniApp':
        if (!body.text || !body.webAppUrl) {
          return errorResponse('Missing required fields: text, webAppUrl', request);
        }
        result = await sendWithMiniApp(
          body.text,
          body.webAppUrl,
          body.buttonText || 'Open App',
          body.chatId,
          body.threadId
        );
        break;

      case 'sendKeyboard':
        if (!body.text || !body.keyboard) {
          return errorResponse('Missing required fields: text, keyboard', request);
        }
        result = await sendWithKeyboard(body.text, body.keyboard, body.chatId, {
          threadId: body.threadId,
          parseMode: body.parseMode,
        });
        break;

      case 'answerCallback':
        if (!body.callbackQueryId) {
          return errorResponse('Missing required field: callbackQueryId', request);
        }
        result = await answerCallbackQuery(body.callbackQueryId, {
          text: body.text,
          show_alert: body.showAlert,
          url: body.url,
        });
        break;

      case 'setMenuButton':
        result = await setChatMenuButton(body.chatId, body.menuButton);
        break;

      case 'getMenuButton':
        result = await getChatMenuButton(body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // CHANNEL
      // ═══════════════════════════════════════════════════════════
      case 'sendToChannel':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendToChannel(body.text, {
          parseMode: body.parseMode,
          disableNotification: body.silent,
          protectContent: body.protectContent,
          keyboard: body.keyboard,
        });
        break;

      case 'getChannel':
        // Channel info not implemented in current telegram lib
        result = { ok: false, error: 'Channel functions not implemented' };
        break;

      case 'getChannelMembers':
        // Channel member count not implemented in current telegram lib
        result = { ok: false, error: 'Channel functions not implemented' };
        break;

      // ═══════════════════════════════════════════════════════════
      // BOT COMMANDS
      // ═══════════════════════════════════════════════════════════
      case 'setCommands':
        // Bot commands not implemented in current telegram lib
        result = { ok: false, error: 'Bot command functions not implemented' };
        break;

      case 'getCommands':
        // Bot commands not implemented in current telegram lib
        result = { ok: false, error: 'Bot command functions not implemented' };
        break;

      case 'setBotDescription':
        // Bot description not implemented in current telegram lib
        result = { ok: false, error: 'Bot description functions not implemented' };
        break;

      // ═══════════════════════════════════════════════════════════
      // THREAD MANAGER (Topic Routing)
      // ═══════════════════════════════════════════════════════════
      case 'getTopics': {
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        result = {
          ok: true,
          topics: ThreadManager.getAllTopics(chatId),
          alertsThread: ThreadManager.getAlertsThread(chatId),
          errorsThread: ThreadManager.getErrorsThread(chatId),
          tradesThread: ThreadManager.getTradesThread(chatId),
        };
        break;
      }

      case 'registerTopic': {
        if (body.threadId === undefined || !body.name || !body.purpose) {
          return errorResponse('Missing required fields: threadId, name, purpose', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const info = ThreadManager.register(chatId, body.threadId, body.name, body.purpose);
        result = { ok: true, topic: info };
        break;
      }

      case 'pinTopic': {
        if (body.threadId === undefined || !body.purpose) {
          return errorResponse('Missing required fields: threadId, purpose', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        ThreadManager.setPinned(chatId, body.threadId, body.purpose);
        result = {
          ok: true,
          message: `Topic ${body.threadId ?? 'General'} pinned for ${body.purpose}`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      case 'unpinTopic': {
        if (body.threadId === undefined) {
          return errorResponse('Missing required field: threadId', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        ThreadManager.unpin(chatId, body.threadId);
        result = {
          ok: true,
          message: `Topic ${body.threadId ?? 'General'} unpinned`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      case 'testAlert': {
        // Send a test alert to the pinned alerts topic
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const alertsThread = ThreadManager.getAlertsThread(chatId);
        const testResult = await sendMessage(
          {
            text: `🧪 <b>Test Alert</b>\n\nThis is a test alert sent to the pinned alerts topic.\n\nThread ID: <code>${alertsThread ?? 'null'}</code>\nTime: ${new Date().toISOString()}`,
            parse_mode: 'HTML',
            message_thread_id: alertsThread,
          },
          chatId
        );
        result = {
          ok: testResult.ok,
          message: testResult.ok ? 'Test alert sent!' : testResult.description,
          threadId: alertsThread,
        };
        break;
      }

      case 'syncTopicsFromTelegram': {
        // Fetch actual topics from Telegram and sync them
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const updates = await getUpdates(undefined, 100);
        const seenThreads = new Set<number>();

        if (updates.ok && updates.result) {
          for (const update of updates.result as any[]) {
            const threadId = update.message?.message_thread_id;
            if (threadId && !seenThreads.has(threadId)) {
              seenThreads.add(threadId);
              ThreadManager.markUsed(chatId, threadId, `Topic ${threadId}`);
            }
          }
        }

        result = {
          ok: true,
          message: `Synced ${seenThreads.size} topics from recent messages`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      // ═══════════════════════════════════════════════════════════
      // ENHANCED TOPIC MANAGEMENT
      // ═══════════════════════════════════════════════════════════
      case 'createEnhancedTopic':
        if (!body.title) {
          return errorResponse('Missing required field: title', request);
        }
        const manager = enhancedBot.getTopicManager();
        const threadId = await manager.createTopic(
          body.title,
          body.tags || [],
          body.category,
          body.iconColor,
          body.iconEmojiId
        );
        result = {
          ok: true,
          threadId,
          message: `Topic "${body.title}" created successfully`,
        };
        break;

      case 'sendPolymarketAlert':
        if (!body.marketData) {
          return errorResponse('Missing required field: marketData', request);
        }
        await enhancedBot.sendPolymarketAlert(body.marketData, body.alertType || 'opportunity');
        result = {
          ok: true,
          message: 'Polymarket alert sent via enhanced topic routing',
        };
        break;

      case 'routeMessage':
        if (!body.text || !body.userId) {
          return errorResponse('Missing required fields: text, userId', request);
        }
        const router = enhancedBot.getRouter();
        const targetThread = await router.routeMessage(body.text, body.userId, body.context);
        result = {
          ok: true,
          targetThread,
          message: targetThread
            ? `Message routed to topic ${targetThread}`
            : 'Message routed to general chat',
        };
        break;

      case 'getTopicAnalytics':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        const analytics = enhancedBot.getAnalytics();
        const topicEngagement = analytics.getTopicEngagement(
          body.threadId,
          body.timePeriod || '24h'
        );
        result = {
          ok: true,
          threadId: body.threadId,
          engagement: topicEngagement,
        };
        break;

      case 'getDashboardMetrics':
        const dashboard = enhancedBot.getDashboard();
        const metrics = await dashboard.getMetrics();
        result = {
          ok: true,
          metrics,
        };
        break;

      // ═══════════════════════════════════════════════════════════
      // WEBAPP AUTHENTICATION
      // ═══════════════════════════════════════════════════════════
      case 'verify_webapp': {
        const { initData, user, authDate, hash } = body;
        
        if (!initData || !user) {
          return errorResponse('Missing required fields: initData, user', request);
        }

        // Verify the Telegram WebApp data
        // In production, you should verify the hash using HMAC-SHA-256
        // with your bot token as the secret key
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
          result = {
            ok: false,
            error: 'Bot token not configured',
            verified: false,
          };
          break;
        }

        try {
          // Parse initData to verify
          const params = new URLSearchParams(initData);
          const dataCheckString = Array.from(params.entries())
            .filter(([key]) => key !== 'hash')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

          // Create HMAC-SHA-256 signature
          const crypto = await import('crypto');
          const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
          
          const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

          const receivedHash = params.get('hash');
          const isValid = calculatedHash === receivedHash;

          // Check auth_date is not too old (5 minutes)
          const authTimestamp = parseInt(params.get('auth_date') || '0');
          const now = Math.floor(Date.now() / 1000);
          const isRecent = (now - authTimestamp) < 300; // 5 minutes

          if (isValid && isRecent) {
            // Store user session (in production, use a proper session store)
            result = {
              ok: true,
              verified: true,
              user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                language_code: user.language_code,
              },
              settings: {
                // Return user's saved settings if available
                notifications: true,
                theme: 'auto',
              },
              session: {
                created: new Date().toISOString(),
                expiresIn: 3600, // 1 hour
              },
            };
          } else {
            result = {
              ok: false,
              verified: false,
              error: !isValid ? 'Invalid signature' : 'Auth data expired',
            };
          }
        } catch (verifyError) {
          // eslint-disable-next-line no-console
          console.error('WebApp verification error:', verifyError);
          result = {
            ok: false,
            verified: false,
            error: 'Verification failed',
          };
        }
        break;
      }

      case 'sendKeyboard': {
        if (!body.text || !body.keyboard) {
          return errorResponse('Missing required fields: text, keyboard', request);
        }
        result = await sendWithKeyboard(
          body.text,
          body.keyboard,
          body.chatId,
          {
            threadId: body.threadId,
            parseMode: body.parseMode || 'HTML',
          }
        );
        break;
      }

      default:
        return errorResponse(`Unknown action: ${body.action}`, request);
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Telegram-Action': body.action,
        'X-Telegram-Success': String(result?.ok ?? false),
      },
    });

    return NextResponse.json(
      {
        action: body.action,
        ...result,
        timestamp: new Date().toISOString(),
      },
      { headers: headersToObject(headers) }
    );
  } catch (error) {
    console.error('Telegram API error:', error);
    const { body, init } = createErrorResponse(
      'Failed to process Telegram request',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

function errorResponse(message: string, request: Request) {
  const { body, init } = createErrorResponse(message, 400, undefined, request);
  return NextResponse.json(body, init);
}
