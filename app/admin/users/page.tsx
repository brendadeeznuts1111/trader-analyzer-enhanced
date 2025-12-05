'use client';

/**
 * Admin Users Management Page
 * User listing and role assignment
 *
 * [#REF:ADMIN-USERS-PAGE-HEX:0x55534550]
 */

import { useState, useEffect } from 'react';
import { useAdmin } from '../layout';
import { ROLE_LEVELS } from '@/lib/admin/types';

interface User {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  level: number;
  isVerified: boolean;
  lastActiveAt: number | null;
  createdAt: number;
  roles: Array<{ id: string; name: string; displayName: string }>;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
}

const AVAILABLE_ROLES: Role[] = [
  { id: 'role-owner-001', name: 'owner', displayName: 'Owner', level: ROLE_LEVELS.OWNER },
  { id: 'role-super-admin-001', name: 'super_admin', displayName: 'Super Admin', level: ROLE_LEVELS.SUPER_ADMIN },
  { id: 'role-admin-001', name: 'admin', displayName: 'Admin', level: ROLE_LEVELS.ADMIN },
  { id: 'role-moderator-001', name: 'moderator', displayName: 'Moderator', level: ROLE_LEVELS.MODERATOR },
  { id: 'role-user-001', name: 'user', displayName: 'User', level: ROLE_LEVELS.USER },
];

export default function UsersPage() {
  const { session, hasPermission } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const fetchUsers = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'x-session-id': session.id },
      });

      if (!res.ok) throw new Error('Failed to load users');

      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session, page, search]);

  const handleAssignRole = async (userId: number, roleName: string) => {
    if (!session) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.id,
        },
        body: JSON.stringify({
          userId,
          roleName,
          action: 'assign',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign role');
      }

      // Refresh users
      await fetchUsers();
      setRoleModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    }
  };

  const handleRevokeRole = async (userId: number, roleName: string) => {
    if (!session) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session.id,
        },
        body: JSON.stringify({
          userId,
          roleName,
          action: 'revoke',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke role');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke role');
    }
  };

  // Role badge
  const RoleBadge = ({ role }: { role: { name: string; displayName: string } }) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-600',
      super_admin: 'bg-red-600',
      admin: 'bg-blue-600',
      moderator: 'bg-green-600',
      user: 'bg-gray-600',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[role.name] || 'bg-gray-600'}`}>
        {role.displayName}
      </span>
    );
  };

  // Format time
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 User Management</h1>
          <p className="text-gray-400">View and manage user roles</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-300 text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by username or ID..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Roles</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Last Active</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">
                        {user.firstName || user.username || `User ${user.id}`}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {user.username ? `@${user.username}` : ''} (ID: {user.id})
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => (
                        <RoleBadge key={role.id} role={role} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {formatTime(user.lastActiveAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasPermission('users.assign_roles') && (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setRoleModalOpen(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
                      >
                        Edit Roles
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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

      {/* Role Edit Modal */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
              Edit Roles for {selectedUser.firstName || selectedUser.username || `User ${selectedUser.id}`}
            </h2>

            <div className="space-y-3 mb-6">
              {AVAILABLE_ROLES.map(role => {
                const hasRole = selectedUser.roles.some(r => r.name === role.name);
                const canAssign = session && session.user.level > role.level;
                const isHigherRole = role.level >= ROLE_LEVELS.ADMIN;
                const canAssignAdmin = hasPermission('users.assign_admin');

                const canModify = canAssign && (!isHigherRole || canAssignAdmin);

                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between bg-gray-700 p-3 rounded"
                  >
                    <div>
                      <RoleBadge role={role} />
                      <p className="text-gray-400 text-xs mt-1">Level {role.level}</p>
                    </div>
                    {canModify ? (
                      <button
                        onClick={() => {
                          if (hasRole) {
                            handleRevokeRole(selectedUser.id, role.name);
                          } else {
                            handleAssignRole(selectedUser.id, role.name);
                          }
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                          hasRole
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                      >
                        {hasRole ? 'Remove' : 'Add'}
                      </button>
                    ) : (
                      <span className="text-gray-500 text-sm">
                        {hasRole ? '✓ Assigned' : 'Cannot assign'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRoleModalOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
