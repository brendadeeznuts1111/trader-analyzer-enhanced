'use client';

/**
 * Admin Dashboard Layout
 * Sidebar navigation with role-based visibility
 *
 * [#REF:ADMIN-LAYOUT-HEX:0x4C41594F]
 */

import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLE_LEVELS } from '@/lib/admin/types';

// Admin session context
interface AdminSession {
  id: string;
  user: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    level: number;
    roles: string[];
    permissions: string[];
  };
  expiresAt: number;
}

interface AdminContextType {
  session: AdminSession | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AdminContext = createContext<AdminContextType>({
  session: null,
  loading: true,
  error: null,
  logout: async () => {},
  hasPermission: () => false,
});

export const useAdmin = () => useContext(AdminContext);

// Navigation items with permission requirements
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊', permission: 'admin.access' },
  { href: '/admin/users', label: 'Users', icon: '👥', permission: 'users.view' },
  { href: '/admin/audit', label: 'Audit Logs', icon: '📜', permission: 'audit.view' },
  { href: '/admin/approvals', label: 'Approvals', icon: '✅', permission: 'approvals.view' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const storedSession = localStorage.getItem('adminSession');
      if (!storedSession) {
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(storedSession) as AdminSession;

        // Check if expired
        if (parsed.expiresAt < Date.now() / 1000) {
          localStorage.removeItem('adminSession');
          setLoading(false);
          return;
        }

        // Verify session with server
        const res = await fetch('/api/admin', {
          headers: {
            'x-session-id': parsed.id,
          },
        });

        if (res.ok) {
          setSession(parsed);
        } else {
          localStorage.removeItem('adminSession');
        }
      } catch {
        localStorage.removeItem('adminSession');
      }

      setLoading(false);
    };

    checkSession();
  }, []);

  const logout = async () => {
    if (session) {
      try {
        await fetch('/api/admin/auth', {
          method: 'DELETE',
          headers: {
            'x-session-id': session.id,
          },
        });
      } catch {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem('adminSession');
    setSession(null);
  };

  const hasPermission = (permission: string) => {
    if (!session) return false;
    return session.user.permissions.includes(permission);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login prompt if no session
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-4">🔐 Admin Access</h1>
          <p className="text-gray-400 mb-6">
            Please open this page from the Telegram bot miniapp to authenticate.
          </p>
          <div className="bg-gray-700 p-4 rounded text-sm text-gray-300">
            <p>To access the admin dashboard:</p>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>Open the bot in Telegram</li>
              <li>Use /admin command</li>
              <li>Click "Open Dashboard"</li>
            </ol>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Role badge component
  const RoleBadge = ({ level }: { level: number }) => {
    const badges: Record<number, { label: string; color: string }> = {
      [ROLE_LEVELS.OWNER]: { label: 'Owner', color: 'bg-purple-600' },
      [ROLE_LEVELS.SUPER_ADMIN]: { label: 'Super Admin', color: 'bg-red-600' },
      [ROLE_LEVELS.ADMIN]: { label: 'Admin', color: 'bg-blue-600' },
      [ROLE_LEVELS.MODERATOR]: { label: 'Moderator', color: 'bg-green-600' },
      [ROLE_LEVELS.USER]: { label: 'User', color: 'bg-gray-600' },
    };
    const badge = badges[level] || { label: 'Unknown', color: 'bg-gray-600' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <AdminContext.Provider value={{ session, loading, error, logout, hasPermission }}>
      <div className="min-h-screen bg-gray-900 flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold text-white">🔐 Admin</h1>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-gray-700 text-gray-400"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            {navItems
              .filter(item => hasPermission(item.permission))
              .map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                );
              })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-700">
            {sidebarOpen ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">
                    {session.user.firstName || session.user.username || `User ${session.user.id}`}
                  </span>
                </div>
                <RoleBadge level={session.user.level} />
                <button
                  onClick={logout}
                  className="mt-3 w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={logout}
                className="p-2 w-full flex justify-center rounded hover:bg-gray-700 text-gray-400"
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
