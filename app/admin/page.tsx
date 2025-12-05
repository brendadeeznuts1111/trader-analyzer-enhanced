'use client';

/**
 * Admin Dashboard Home Page
 * System overview and quick actions
 *
 * [#REF:ADMIN-HOME-HEX:0x484F4D45]
 */

import { useState, useEffect } from 'react';
import { useAdmin } from './layout';
import Link from 'next/link';

interface DashboardStats {
  users: {
    total: number;
    admins: number;
    activeToday: number;
  };
  audit: {
    total24h: number;
    success: number;
    failed: number;
    denied: number;
  };
  approvals: {
    pending: number;
    approved24h: number;
    rejected24h: number;
  };
  bot: {
    running: boolean;
    uptime: number;
    trades24h: number;
  };
  recentActivity: Array<{
    id: string;
    timestamp: number;
    userId: number;
    action: string;
    status: string;
    resourceType: string;
  }>;
  activeUsers: Array<{
    userId: number;
    actionCount: number;
  }>;
  serverTime: number;
}

export default function AdminDashboard() {
  const { session, hasPermission } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;

      try {
        const res = await fetch('/api/admin', {
          headers: {
            'x-session-id': session.id,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load dashboard');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Stat card component
  const StatCard = ({
    title,
    value,
    subtext,
    icon,
    color = 'blue',
  }: {
    title: string;
    value: string | number;
    subtext?: string;
    icon: string;
    color?: string;
  }) => (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-2xl font-bold text-${color}-400`}>{value}</span>
      </div>
      <div className="mt-2">
        <p className="text-gray-400 text-sm">{title}</p>
        {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
      </div>
    </div>
  );

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // Status emoji
  const statusEmoji = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'denied': return '🚫';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">System overview and quick actions</p>
        </div>
        <div className="text-gray-500 text-sm">
          Last updated: {stats ? new Date(stats.serverTime * 1000).toLocaleTimeString() : '-'}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥"
          title="Total Users"
          value={stats?.users.total || 0}
          subtext={`${stats?.users.activeToday || 0} active today`}
        />
        <StatCard
          icon="🔐"
          title="Admins"
          value={stats?.users.admins || 0}
          subtext="Moderator level and above"
        />
        <StatCard
          icon="✅"
          title="Pending Approvals"
          value={stats?.approvals.pending || 0}
          subtext={`${stats?.approvals.approved24h || 0} approved today`}
          color={stats?.approvals.pending ? 'yellow' : 'green'}
        />
        <StatCard
          icon="📊"
          title="Actions (24h)"
          value={stats?.audit.total24h || 0}
          subtext={`${stats?.audit.failed || 0} failed`}
        />
      </div>

      {/* Bot status */}
      {hasPermission('bot.view_status') && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-3">🤖 Bot Status</h2>
          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full ${
                stats?.bot.running ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-white">
              {stats?.bot.running ? 'Running' : 'Stopped'}
            </span>
            {stats?.bot.running && (
              <span className="text-gray-400">
                Uptime: {Math.floor((stats?.bot.uptime || 0) / 60)}m
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent activity and quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">📜 Recent Activity</h2>
            <Link
              href="/admin/audit"
              className="text-blue-400 text-sm hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-auto">
            {stats?.recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              stats?.recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span>{statusEmoji(activity.status)}</span>
                  <span className="text-gray-400">{formatTime(activity.timestamp)}</span>
                  <span className="text-white flex-1 truncate">{activity.action}</span>
                  <span className="text-gray-500">User {activity.userId}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">⚡ Quick Actions</h2>
          </div>
          <div className="p-4 space-y-3">
            {hasPermission('users.view') && (
              <Link
                href="/admin/users"
                className="block w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-center"
              >
                👥 Manage Users
              </Link>
            )}
            {hasPermission('approvals.view') && stats?.approvals.pending ? (
              <Link
                href="/admin/approvals"
                className="block w-full p-3 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-center"
              >
                ✅ Review {stats.approvals.pending} Pending Approvals
              </Link>
            ) : null}
            {hasPermission('audit.view') && (
              <Link
                href="/admin/audit"
                className="block w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-white text-center"
              >
                📜 View Audit Logs
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Active users */}
      {stats?.activeUsers && stats.activeUsers.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">🏆 Most Active Today</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              {stats.activeUsers.map((user, idx) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded"
                >
                  <span className="text-yellow-400">{idx + 1}.</span>
                  <span className="text-white">User {user.userId}</span>
                  <span className="text-gray-400 text-sm">({user.actionCount} actions)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
