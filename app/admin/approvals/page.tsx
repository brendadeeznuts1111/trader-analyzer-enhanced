'use client';

/**
 * Admin Approvals Page
 * Approval queue management
 *
 * [#REF:ADMIN-APPROVALS-PAGE-HEX:0x41505250]
 */

import { useState, useEffect } from 'react';
import { useAdmin } from '../layout';

interface Approval {
  id: string;
  createdAt: number;
  requesterId: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  status: string;
  priority: string;
  requiredApprovers: number;
  currentApprovals: number;
  expiresAt: number | null;
  resolvedAt: number | null;
  resolvedBy: number | null;
  rejectionReason: string | null;
  votes: Array<{
    voterId: number;
    vote: string;
    comment: string | null;
    votedAt: number;
  }>;
}

interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  avgResolutionHours: number;
}

export default function ApprovalsPage() {
  const { session, hasPermission } = useAdmin();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [voteComment, setVoteComment] = useState('');

  const fetchApprovals = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/approvals?status=${statusFilter}`, {
        headers: { 'x-session-id': session.id },
      });

      if (!res.ok) throw new Error('Failed to load approvals');

      const data = await res.json();
      setApprovals(data.approvals);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [session, statusFilter]);

  const handleVote = async (approvalId: string, vote: 'approve' | 'reject') => {
    if (!session) return;

    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.id,
        },
        body: JSON.stringify({
          action: 'vote',
          approvalId,
          vote,
          comment: voteComment || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to vote');
      }

      setSelectedApproval(null);
      setVoteComment('');
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handleEscalate = async (approvalId: string) => {
    if (!session) return;

    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.id,
        },
        body: JSON.stringify({
          action: 'escalate',
          approvalId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to escalate');
      }

      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Priority badge
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-600',
      high: 'bg-orange-600',
      normal: 'bg-yellow-600',
      low: 'bg-green-600',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority] || 'bg-gray-600'}`}>
        {priority}
      </span>
    );
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600',
      approved: 'bg-green-600',
      rejected: 'bg-red-600',
      expired: 'bg-gray-600',
      cancelled: 'bg-gray-600',
    };
    const icons: Record<string, string> = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      expired: '⏰',
      cancelled: '🚫',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-600'}`}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">✅ Approval Queue</h1>
          <p className="text-gray-400">Review and approve pending requests</p>
        </div>
        <button
          onClick={fetchApprovals}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-red-300 text-sm underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-yellow-200 text-sm">Pending</p>
          </div>
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
            <p className="text-green-200 text-sm">Approved</p>
          </div>
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            <p className="text-red-200 text-sm">Rejected</p>
          </div>
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.expired}</p>
            <p className="text-gray-400 text-sm">Expired</p>
          </div>
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.avgResolutionHours.toFixed(1)}h</p>
            <p className="text-gray-400 text-sm">Avg Resolution</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'expired'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded text-sm ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Approvals list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No approvals found</div>
        ) : (
          approvals.map(approval => (
            <div
              key={approval.id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <PriorityBadge priority={approval.priority} />
                    <StatusBadge status={approval.status} />
                    <code className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
                      {approval.id.slice(0, 8)}
                    </code>
                  </div>
                  <h3 className="text-white font-medium">
                    <code>{approval.action}</code>
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Requested by User {approval.requesterId} • {formatTimeAgo(approval.createdAt)}
                  </p>
                  {approval.reason && (
                    <p className="text-gray-300 text-sm mt-2 bg-gray-700 p-2 rounded">
                      "{approval.reason}"
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      Progress: {approval.currentApprovals}/{approval.requiredApprovers}
                    </span>
                    {approval.expiresAt && (
                      <span className="text-gray-400">
                        Expires: {formatTime(approval.expiresAt)}
                      </span>
                    )}
                  </div>
                  {/* Votes */}
                  {approval.votes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-gray-400 text-sm">Votes:</p>
                      {approval.votes.map((vote, idx) => (
                        <div key={idx} className="text-sm flex items-center gap-2">
                          <span>{vote.vote === 'approve' ? '✅' : vote.vote === 'reject' ? '❌' : '⏸️'}</span>
                          <span className="text-gray-300">User {vote.voterId}</span>
                          {vote.comment && (
                            <span className="text-gray-500">- "{vote.comment}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Actions */}
                {approval.status === 'pending' && hasPermission('approvals.vote') && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => setSelectedApproval(approval)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleEscalate(approval.id)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
                    >
                      Escalate
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vote Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Review Approval</h2>

            <div className="bg-gray-700 rounded p-4 mb-4">
              <p className="text-white font-medium">{selectedApproval.action}</p>
              <p className="text-gray-400 text-sm mt-1">
                Requested by User {selectedApproval.requesterId}
              </p>
              {selectedApproval.reason && (
                <p className="text-gray-300 text-sm mt-2">"{selectedApproval.reason}"</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Comment (optional)</label>
              <textarea
                value={voteComment}
                onChange={e => setVoteComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleVote(selectedApproval.id, 'approve')}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white"
              >
                ✅ Approve
              </button>
              <button
                onClick={() => handleVote(selectedApproval.id, 'reject')}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  setSelectedApproval(null);
                  setVoteComment('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
