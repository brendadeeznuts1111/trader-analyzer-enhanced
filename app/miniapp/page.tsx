'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION, APP_NAME } from '@/lib/constants';

// Telegram Mini App SDK types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'light' | 'dark';
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          chat?: {
            id: number;
            type: string;
            title?: string;
          };
          start_param?: string;
        };
        sendData: (data: string) => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        showPopup: (
          params: {
            title?: string;
            message: string;
            buttons?: Array<{ id?: string; type?: string; text?: string }>;
          },
          callback?: (id: string) => void
        ) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

interface Stats {
  totalTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
}

interface SystemStatus {
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  version: string;
}

// Bot status interface
interface BotStatus {
  running: boolean;
  uptime: number;
}

export default function MiniAppPage() {
  const [tg, setTg] = useState<Window['Telegram']>();
  const [user, setUser] = useState<{ id: number; first_name: string; username?: string } | null>(
    null
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'settings' | 'bot'>(
    'dashboard'
  );
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botLoading, setBotLoading] = useState(false);

  useEffect(() => {
    // Initialize Telegram Mini App
    const telegram = window.Telegram;
    if (telegram) {
      setTg(telegram);
      telegram.WebApp.ready();
      telegram.WebApp.expand();

      // Get user info
      if (telegram.WebApp.initDataUnsafe.user) {
        setUser(telegram.WebApp.initDataUnsafe.user);
      }

      // Set up main button
      telegram.WebApp.MainButton.setParams({
        text: 'REFRESH DATA',
        color: '#3b82f6',
        is_visible: true,
      });
      telegram.WebApp.MainButton.onClick(() => {
        telegram.WebApp.HapticFeedback.impactOccurred('medium');
        loadData();
      });
      telegram.WebApp.MainButton.show();
    }

    loadData();
    fetchBotStatus();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/trades?type=stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalTrades: data.stats?.totalTrades || 0,
          winRate: data.stats?.winRate || 0,
          netPnl: data.stats?.netPnl || 0,
          profitFactor: data.stats?.profitFactor || 0,
        });
      }

      // Fetch system status
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const data = await healthRes.json();
        setSystemStatus({
          status: data.status === 'ok' ? 'online' : 'degraded',
          uptime: data.uptime || 0,
          version: data.version || '0.0.0',
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }

  async function fetchBotStatus() {
    try {
      const res = await fetch('/api/bot');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch bot status:', error);
    }
  }

  async function handleBotAction(action: 'start' | 'stop') {
    if (!tg) return;
    setBotLoading(true);
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
        tg.WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        const err = await res.json();
        tg.WebApp.showAlert(`Error: ${err.error}`);
        tg.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } catch (error) {
      console.error('Bot action failed:', error);
      tg.WebApp.showAlert('Network error');
      tg.WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setBotLoading(false);
    }
  }

  const themeParams = tg?.WebApp.themeParams || {};
  const isDark = tg?.WebApp.colorScheme === 'dark';

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundColor: themeParams.bg_color || (isDark ? '#1a1a1a' : '#ffffff'),
        color: themeParams.text_color || (isDark ? '#ffffff' : '#000000'),
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        {user && (
          <p className="text-sm opacity-70">
            Welcome, {user.first_name}
            {user.username && ` (@${user.username})`}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['dashboard', 'trades', 'bot', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              tg?.WebApp.HapticFeedback.selectionChanged();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            style={{
              backgroundColor: activeTab === tab ? themeParams.button_color : undefined,
              color: activeTab === tab ? themeParams.button_text_color : undefined,
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'bot' ? ( // Only show loading for non-bot tabs? We'll adjust.
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* System Status Card */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">System Status</h2>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      systemStatus?.status === 'online'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}
                  >
                    {systemStatus?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="text-sm opacity-70">
                  <p>Version: {systemStatus?.version || 'N/A'}</p>
                  <p>
                    Uptime:{' '}
                    {systemStatus?.uptime ? `${Math.floor(systemStatus.uptime / 60)}m` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Total Trades"
                  value={stats?.totalTrades?.toLocaleString() || '0'}
                  bgColor={themeParams.secondary_bg_color}
                  isDark={isDark}
                />
                <StatCard
                  label="Win Rate"
                  value={`${((stats?.winRate || 0) * 100).toFixed(1)}%`}
                  bgColor={themeParams.secondary_bg_color}
                  isDark={isDark}
                />
                <StatCard
                  label="Net P&L"
                  value={`$${(stats?.netPnl || 0).toLocaleString()}`}
                  valueColor={(stats?.netPnl || 0) >= 0 ? '#22c55e' : '#ef4444'}
                  bgColor={themeParams.secondary_bg_color}
                  isDark={isDark}
                />
                <StatCard
                  label="Profit Factor"
                  value={(stats?.profitFactor || 0).toFixed(2)}
                  bgColor={themeParams.secondary_bg_color}
                  isDark={isDark}
                />
              </div>
            </div>
          )}

          {/* Trades Tab */}
          {activeTab === 'trades' && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
              }}
            >
              <h2 className="font-semibold mb-4">Recent Trades</h2>
              <p className="text-sm opacity-70">Trade history coming soon...</p>
            </div>
          )}

          {/* Bot Tab */}
          {activeTab === 'bot' && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h2 className="font-semibold mb-4">Trading Bot Control</h2>
                {botStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          botStatus.running
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {botStatus.running ? 'RUNNING' : 'STOPPED'}
                      </span>
                    </div>
                    {botStatus.running && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Uptime:</span>
                        <span className="text-sm">{formatUptime(botStatus.uptime)}</span>
                      </div>
                    )}
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={() => handleBotAction('start')}
                        disabled={botLoading || botStatus.running}
                        className="flex-1 py-2 rounded-lg bg-green-500 text-white disabled:opacity-50"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleBotAction('stop')}
                        disabled={botLoading || !botStatus.running}
                        className="flex-1 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm opacity-70">Loading bot status...</p>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h2 className="font-semibold mb-4">Settings</h2>
                <div className="space-y-3">
                  <SettingRow label="Notifications" value="Enabled" />
                  <SettingRow label="Theme" value={isDark ? 'Dark' : 'Light'} />
                  <SettingRow label="User ID" value={user?.id?.toString() || 'N/A'} />
                </div>
              </div>

              <button
                onClick={() => {
                  tg?.WebApp.showConfirm('Close the app?', confirmed => {
                    if (confirmed) tg?.WebApp.close();
                  });
                }}
                className="w-full py-3 rounded-xl bg-red-500/20 text-red-500 font-medium"
              >
                Close App
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs opacity-50">
        <p>
          {APP_NAME} Mini App v{systemStatus?.version || APP_VERSION}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor,
  bgColor,
  isDark,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bgColor?: string;
  isDark?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: bgColor || (isDark ? '#2a2a2a' : '#f5f5f5') }}
    >
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm opacity-70">{value}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
