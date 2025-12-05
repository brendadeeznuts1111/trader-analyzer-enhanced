'use client';

/**
 * Admin Audit Logs Page
 * Filterable audit log viewer
 *
 * [#REF:ADMIN-AUDIT-PAGE-HEX:0x41554450]
 */

import { useState, useEffect } from 'react';
import { useAdmin } from '../layout';

interface AuditLog {
  id: string;
  timestamp: number;
  userId: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  category: string;
  status: string;
  channel: string;
  errorMessage: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
}

export default function AuditPage() {
  const { session } = useAdmin();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    status: '',
    channel: '',
    resourceType: '',
    from: '',
    to: '',
  });

  const fetchLogs = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      // Add filters
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.status) params.set('status', filters.status);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/admin/audit?${params}`, {
        headers: { 'x-session-id': session.id },
      });

      if (!res.ok) throw new Error('Failed to load audit logs');

      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session, page]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      status: '',
      channel: '',
      resourceType: '',
      from: '',
      to: '',
    });
    setPage(0);
    fetchLogs();
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      success: 'bg-green-600',
      failed: 'bg-red-600',
      denied: 'bg-orange-600',
      pending: 'bg-yellow-600',
    };
    const icons: Record<string, string> = {
      success: '✅',
      failed: '❌',
      denied: '🚫',
      pending: '⏳',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-600'}`}>
        {icons[status]} {status}
      </span>
    );
  };

  // Channel badge
  const ChannelBadge = ({ channel }: { channel: string }) => {
    const colors: Record<string, string> = {
      telegram: 'bg-blue-600',
      web: 'bg-purple-600',
      api: 'bg-green-600',
      system: 'bg-gray-600',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[channel] || 'bg-gray-600'}`}>
        {channel}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📜 Audit Logs</h1>
          <p className="text-gray-400">View system activity and changes</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-white font-medium mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="User ID"
            value={filters.userId}
            onChange={e => handleFilterChange('userId', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            placeholder="Action"
            value={filters.action}
            onChange={e => handleFilterChange('action', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          />
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="denied">Denied</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filters.channel}
            onChange={e => handleFilterChange('channel', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">All Channels</option>
            <option value="telegram">Telegram</option>
            <option value="web">Web</option>
            <option value="api">API</option>
            <option value="system">System</option>
          </select>
          <select
            value={filters.resourceType}
            onChange={e => handleFilterChange('resourceType', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">All Resources</option>
            <option value="users">Users</option>
            <option value="trades">Trades</option>
            <option value="config">Config</option>
            <option value="bot">Bot</option>
            <option value="approvals">Approvals</option>
            <option value="audit">Audit</option>
          </select>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={e => handleFilterChange('from', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="datetime-local"
            value={filters.to}
            onChange={e => handleFilterChange('to', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Resource</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Channel</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{log.userId}</td>
                    <td className="px-4 py-3 text-white text-sm">
                      <code className="bg-gray-700 px-1 rounded text-xs">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {log.resourceType}
                      {log.resourceId && <span className="text-gray-500"> ({log.resourceId})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={log.channel} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {log.durationMs ? `${log.durationMs}ms` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm"
            >
              Previous
            </button>
            <span className="text-gray-400 text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
