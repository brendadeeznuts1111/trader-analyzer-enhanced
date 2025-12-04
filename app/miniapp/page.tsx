'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION, APP_NAME } from '@/lib/constants';

// API base URL - uses env var for Cloudflare Pages deployment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:3004' : '');

// Bot trading configuration
const tradingConfig = {
  sports: ['basketball'],
  interval: 30000,
  maxDailyBets: 10,
  stakeSizing: 'fixed',
  baseStake: 100,
  stopLoss: -500,
  takeProfit: 1000,
};

// Add development fallback for staging environments
const getApiUrl = () => {
  if (API_BASE_URL) return API_BASE_URL;
  // In browser, try to detect environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running on staging or pages.dev, use local dev server
    if (hostname.includes('pages.dev') || hostname.includes('staging')) {
      return 'http://localhost:3004';
    }
  }
  return '';
};

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
  sessionTrades?: number;
  sessionPnL?: number;
  lastTrade?: string;
}

interface UserSettings {
  notifications: boolean;
  theme: 'auto' | 'light' | 'dark';
  botStake: number;
  botRiskLevel: 'conservative' | 'moderate' | 'aggressive';
  stopLoss: number;
  takeProfit: number;
  maxDailyTrades: number;
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

  // User settings state
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    theme: 'auto',
    botStake: 100,
    botRiskLevel: 'moderate',
    stopLoss: 500,
    takeProfit: 1000,
    maxDailyTrades: 20,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

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
    const apiUrl = getApiUrl();
    try {
      // Fetch stats
      const statsRes = await fetch(`${apiUrl}/api/trades?type=stats`);
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
      const healthRes = await fetch(`${apiUrl}/api/health`);
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
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/bot`);
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
      const apiUrl = getApiUrl();
      // Include user settings in bot configuration
      const config = action === 'start' ? {
        ...tradingConfig,
        baseStake: settings.botStake,
        stopLoss: settings.stopLoss,
        takeProfit: settings.takeProfit,
        maxDailyBets: settings.maxDailyTrades,
      } : {};

      const res = await fetch(`${apiUrl}/api/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, config }),
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

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      // Simulate saving settings (in real app, you'd save to backend)
      await new Promise(resolve => setTimeout(resolve, 500));
      tg?.WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      tg?.WebApp.showAlert('Failed to save settings');
      tg?.WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setSettingsSaving(false);
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
        <h1 className="text-2xl font-bold">Factory Wager Mini App v{APP_VERSION}</h1>
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
            <div className="space-y-6">
              {/* Main Bot Control Card */}
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h2 className="text-xl font-bold mb-6">Trading Bot Control</h2>
                
                {botStatus ? (
                  <div className="space-y-6">
                    {/* Status Display */}
                    <div>
                      <div className="text-sm opacity-70 mb-2">Status:</div>
                      <div
                        className={`text-2xl font-bold ${
                          botStatus.running ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {botStatus.running ? 'RUNNING' : 'STOPPED'}
                      </div>
                    </div>

                    {/* Uptime Display */}
                    {botStatus.running && (
                      <div>
                        <div className="text-sm opacity-70 mb-1">Uptime:</div>
                        <div className="text-lg font-medium">{formatUptime(botStatus.uptime)}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleBotAction('start')}
                        disabled={botLoading || botStatus.running}
                        className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium disabled:opacity-50 transition-all hover:bg-green-600 active:scale-95"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleBotAction('stop')}
                        disabled={botLoading || !botStatus.running}
                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50 transition-all hover:bg-red-600 active:scale-95"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>

              {/* Additional Info Card */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h3 className="font-semibold mb-3">Bot Information</h3>
                <div className="space-y-2 text-sm opacity-70">
                  <p>• Automated trading system</p>
                  <p>• Real-time market analysis</p>
                  <p>• Risk management controls</p>
                  <p>• Performance monitoring</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* General Settings */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h3 className="font-semibold mb-4">General Settings</h3>
                <div className="space-y-4">
                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Notifications</span>
                    <button
                      onClick={() => {
                        setSettings(prev => ({ ...prev, notifications: !prev.notifications }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.notifications ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Theme Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Theme</span>
                    <select
                      value={settings.theme}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          theme: e.target.value as 'auto' | 'light' | 'dark'
                        }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    >
                      <option value="auto">Auto</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Trading Bot Settings */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h3 className="font-semibold mb-4">Trading Bot Settings</h3>
                <div className="space-y-4">
                  {/* Risk Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Level</span>
                    <select
                      value={settings.botRiskLevel}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          botRiskLevel: e.target.value as 'conservative' | 'moderate' | 'aggressive'
                        }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    >
                      <option value="conservative">Conservative</option>
                      <option value="moderate">Moderate</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </div>

                  {/* Bot Stake Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Base Stake ($)</span>
                    <input
                      type="number"
                      value={settings.botStake}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, botStake: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="10000"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Stop Loss */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stop Loss ($)</span>
                    <input
                      type="number"
                      value={settings.stopLoss}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, stopLoss: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="-10000"
                      max="-1"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Take Profit */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Take Profit ($)</span>
                    <input
                      type="number"
                      value={settings.takeProfit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, takeProfit: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="10000"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Max Daily Trades */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Max Daily Trades</span>
                    <input
                      type="number"
                      value={settings.maxDailyTrades}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, maxDailyTrades: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="50"
                      style={{
                        backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
              >
                <h3 className="font-semibold mb-4">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-70">User ID:</span>
                    <span>{user?.id?.toString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Username:</span>
                    <span>{user?.username ? `@${user.username}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">App Version:</span>
                    <span>{systemStatus?.version || '0.6.0'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50 transition-all hover:bg-blue-600 active:scale-95"
                  style={{
                    backgroundColor: themeParams.button_color || '#3b82f6',
                    color: themeParams.button_text_color || '#ffffff'
                  }}
                >
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>

                <button
                  onClick={() => {
                    tg?.WebApp.showConfirm('Close the app?', confirmed => {
                      if (confirmed) tg?.WebApp.close();
                    });
                  }}
                  className="w-full py-3 rounded-xl bg-red-500/20 text-red-500 font-medium hover:bg-red-500/30 transition-colors"
                >
                  Close App
                </button>
              </div>
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



function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
