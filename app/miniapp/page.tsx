'use client';

import { useEffect, useState, useCallback } from 'react';
import { APP_VERSION, APP_NAME } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

// API base URL - uses env var for Cloudflare Pages deployment
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:3004' : '');

// Bot trading strategies
const TRADING_STRATEGIES = [
  { id: 'scalping', name: 'Scalping', description: 'Quick trades, small profits', risk: 'high' },
  { id: 'momentum', name: 'Momentum', description: 'Follow market trends', risk: 'medium' },
  { id: 'arbitrage', name: 'Arbitrage', description: 'Cross-market opportunities', risk: 'low' },
  { id: 'grid', name: 'Grid Trading', description: 'Range-bound strategy', risk: 'medium' },
  { id: 'dca', name: 'DCA Bot', description: 'Dollar cost averaging', risk: 'low' },
] as const;

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
          auth_date?: number;
          hash?: string;
          query_id?: string;
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
  strategy?: string;
  activePositions?: number;
  dailyPnL?: number;
  winStreak?: number;
}

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date?: number;
  } | null;
  error?: string;
}

interface UserSettings {
  notifications: boolean;
  theme: 'auto' | 'light' | 'dark';
  botStake: number;
  botRiskLevel: 'conservative' | 'moderate' | 'aggressive';
  stopLoss: number;
  takeProfit: number;
  maxDailyTrades: number;
  selectedStrategy: string;
  autoCompound: boolean;
  trailingStop: boolean;
  trailingStopPercent: number;
}

export default function MiniAppPage() {
  const [tg, setTg] = useState<Window['Telegram']>();
  const [user, setUser] = useState<{ id: number; first_name: string; username?: string } | null>(
    null
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'settings' | 'bot' | 'admin'>(
    'dashboard'
  );
  const [adminSession, setAdminSession] = useState<{ id: string; user: Record<string, unknown> } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // User settings state
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    theme: 'auto',
    botStake: 100,
    botRiskLevel: 'moderate',
    stopLoss: 500,
    takeProfit: 1000,
    maxDailyTrades: 20,
    selectedStrategy: 'momentum',
    autoCompound: false,
    trailingStop: false,
    trailingStopPercent: 2,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  
  const authenticateWithTelegram = useCallback(async () => {
    const telegram = window.Telegram;
    if (!telegram?.WebApp) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'Telegram WebApp not available',
      });
      return;
    }

    const initData = telegram.WebApp.initData;
    const initDataUnsafe = telegram.WebApp.initDataUnsafe;

    if (!initData || !initDataUnsafe?.user) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'No Telegram user data',
      });
      return;
    }

    try {
      // Verify with backend
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/telegram?action=verify_webapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          user: initDataUnsafe.user,
          authDate: (initDataUnsafe as Record<string, unknown>).auth_date,
          hash: (initDataUnsafe as Record<string, unknown>).hash,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: initDataUnsafe.user.id,
            first_name: initDataUnsafe.user.first_name,
            last_name: initDataUnsafe.user.last_name,
            username: initDataUnsafe.user.username,
            auth_date: initDataUnsafe.auth_date,
          },
        });
        
        // Load user settings from backend
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } else {
        // Still allow access but mark as unverified
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: initDataUnsafe.user.id,
            first_name: initDataUnsafe.user.first_name,
            last_name: initDataUnsafe.user.last_name,
            username: initDataUnsafe.user.username,
          },
        });
      }
    } catch (error) {
      // Allow access even if verification fails
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: initDataUnsafe.user ? {
          id: initDataUnsafe.user.id,
          first_name: initDataUnsafe.user.first_name,
          last_name: initDataUnsafe.user.last_name,
          username: initDataUnsafe.user.username,
        } : null,
        error: 'Verification failed, running in limited mode',
      });
    }
  }, []);

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
      
      // Authenticate with Telegram
      authenticateWithTelegram();

      // Try to authenticate as admin (silently fails if not admin)
      authenticateAdmin();
    } else {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'Not running in Telegram',
      });
    }

    loadData();
    fetchBotStatus();
  }, [authenticateWithTelegram, authenticateAdmin]);

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
      const config =
        action === 'start'
          ? {
              ...tradingConfig,
              baseStake: settings.botStake,
              stopLoss: settings.stopLoss,
              takeProfit: settings.takeProfit,
              maxDailyBets: settings.maxDailyTrades,
            }
          : {};

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

  // Admin authentication - attempts to create admin session if user has permissions
  const authenticateAdmin = useCallback(async () => {
    const telegram = window.Telegram;
    if (!telegram?.WebApp?.initData) return;

    setAdminLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: telegram.WebApp.initData }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdminSession(data.session);

        // Fetch pending approvals
        const approvalsRes = await fetch(`${apiUrl}/api/admin/approvals?status=pending`, {
          headers: { 'x-session-id': data.session.id },
        });

        if (approvalsRes.ok) {
          const approvalsData = await approvalsRes.json();
          setPendingApprovals(approvalsData.stats?.pending || 0);
        }
      }
    } catch (error) {
      console.error('Admin auth failed:', error);
    } finally {
      setAdminLoading(false);
    }
  }, []);

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
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['dashboard', 'trades', 'bot', 'settings', ...(adminSession ? ['admin'] : [])] as const).map(tab => (
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
              {/* Auth Status Banner */}
              {authState.error && (
                <div className="rounded-xl p-3 bg-yellow-500/20 border border-yellow-500/30">
                  <p className="text-sm text-yellow-400 flex items-center gap-2">
                    <span>⚠️</span>
                    {authState.error}
                  </p>
                </div>
              )}

              {/* Main Bot Control Card - Enhanced */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(42,42,42,0.9) 0%, rgba(30,30,30,0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(245,245,245,0.9) 0%, rgba(235,235,235,0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {/* Animated Background */}
                {botStatus?.running && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-green-500/10 to-transparent rounded-full animate-pulse" />
                  </div>
                )}

                <div className="relative z-10">
                  {/* Status Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Trading Bot</h2>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      botStatus?.running 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${botStatus?.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                      {botStatus?.running ? 'ACTIVE' : 'STOPPED'}
                    </div>
                  </div>

                  {botStatus ? (
                    <div className="space-y-6">
                      {/* Strategy Selector */}
                      <div>
                        <label className="text-sm opacity-70 mb-2 block">Active Strategy</label>
                        <button
                          onClick={() => {
                            setShowStrategyModal(true);
                            tg?.WebApp.HapticFeedback.selectionChanged();
                          }}
                          className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">
                                {TRADING_STRATEGIES.find(s => s.id === settings.selectedStrategy)?.name || 'Select Strategy'}
                              </div>
                              <div className="text-sm opacity-60">
                                {TRADING_STRATEGIES.find(s => s.id === settings.selectedStrategy)?.description}
                              </div>
                            </div>
                            <span className="text-xl">→</span>
                          </div>
                        </button>
                      </div>

                      {/* Live Stats Grid */}
                      {botStatus.running && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                            <div className="text-xs opacity-60 mb-1">Session P&L</div>
                            <div className={`text-lg font-bold ${(botStatus.sessionPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(botStatus.sessionPnL || 0) >= 0 ? '+' : ''}${(botStatus.sessionPnL || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                            <div className="text-xs opacity-60 mb-1">Session Trades</div>
                            <div className="text-lg font-bold">{botStatus.sessionTrades || 0}</div>
                          </div>
                          <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                            <div className="text-xs opacity-60 mb-1">Active Positions</div>
                            <div className="text-lg font-bold">{botStatus.activePositions || 0}</div>
                          </div>
                          <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                            <div className="text-xs opacity-60 mb-1">Uptime</div>
                            <div className="text-lg font-bold">{formatUptime(botStatus.uptime)}</div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleBotAction('start')}
                          disabled={botLoading || botStatus.running}
                          className="flex-1 py-4 rounded-xl font-bold text-white disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                          style={{
                            background: botStatus.running 
                              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            boxShadow: !botStatus.running ? '0 4px 20px rgba(34, 197, 94, 0.4)' : 'none',
                          }}
                        >
                          {botLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Starting...
                            </span>
                          ) : (
                            '▶ START'
                          )}
                        </button>
                        <button
                          onClick={() => handleBotAction('stop')}
                          disabled={botLoading || !botStatus.running}
                          className="flex-1 py-4 rounded-xl font-bold text-white disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            boxShadow: botStatus.running ? '0 4px 20px rgba(239, 68, 68, 0.4)' : 'none',
                          }}
                        >
                          {botLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Stopping...
                            </span>
                          ) : (
                            '■ STOP'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Settings Card */}
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span>⚡</span> Quick Settings
                </h3>
                <div className="space-y-4">
                  {/* Auto Compound Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Auto Compound</span>
                      <p className="text-xs opacity-50">Reinvest profits automatically</p>
                    </div>
                    <button
                      onClick={() => {
                        setSettings(prev => ({ ...prev, autoCompound: !prev.autoCompound }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        settings.autoCompound ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings.autoCompound ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Trailing Stop Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Trailing Stop</span>
                      <p className="text-xs opacity-50">Dynamic stop-loss protection</p>
                    </div>
                    <button
                      onClick={() => {
                        setSettings(prev => ({ ...prev, trailingStop: !prev.trailingStop }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        settings.trailingStop ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings.trailingStop ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Risk Level Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Risk Level</span>
                      <span className={`text-sm font-bold ${
                        settings.botRiskLevel === 'conservative' ? 'text-green-400' :
                        settings.botRiskLevel === 'moderate' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {settings.botRiskLevel.charAt(0).toUpperCase() + settings.botRiskLevel.slice(1)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => {
                            setSettings(prev => ({ ...prev, botRiskLevel: level }));
                            tg?.WebApp.HapticFeedback.selectionChanged();
                          }}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                            settings.botRiskLevel === level
                              ? level === 'conservative' ? 'bg-green-500 text-white'
                                : level === 'moderate' ? 'bg-yellow-500 text-black'
                                : 'bg-red-500 text-white'
                              : 'bg-gray-700/50 text-gray-400'
                          }`}
                        >
                          {level === 'conservative' ? '🛡️' : level === 'moderate' ? '⚖️' : '🔥'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info Card */}
              {authState.user && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span>👤</span> Signed In
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                      {authState.user.first_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {authState.user.first_name} {authState.user.last_name || ''}
                      </div>
                      {authState.user.username && (
                        <div className="text-sm opacity-60">@{authState.user.username}</div>
                      )}
                    </div>
                    <div className="ml-auto">
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategy Selection Modal */}
          {showStrategyModal && (
            <div 
              className="fixed inset-0 z-50 flex items-end justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setShowStrategyModal(false)}
            >
              <div 
                className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
                style={{
                  backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-gray-500 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-4">Select Strategy</h3>
                <div className="space-y-3">
                  {TRADING_STRATEGIES.map((strategy) => (
                    <button
                      key={strategy.id}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, selectedStrategy: strategy.id }));
                        setShowStrategyModal(false);
                        tg?.WebApp.HapticFeedback.notificationOccurred('success');
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        settings.selectedStrategy === strategy.id
                          ? 'ring-2 ring-blue-500 bg-blue-500/20'
                          : 'hover:bg-white/5'
                      }`}
                      style={{
                        backgroundColor: settings.selectedStrategy === strategy.id 
                          ? 'rgba(59, 130, 246, 0.2)' 
                          : isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{strategy.name}</div>
                          <div className="text-sm opacity-60">{strategy.description}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          strategy.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                          strategy.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {strategy.risk.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && adminSession && (
            <div className="space-y-4">
              {/* Admin Header */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5'),
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold flex items-center gap-2">
                    <span>🔐</span> Admin Panel
                  </h2>
                  <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold">
                    Admin Access
                  </span>
                </div>
                <p className="text-sm opacity-70">Quick access to admin functions</p>
              </div>

              {/* Pending Approvals Alert */}
              {pendingApprovals > 0 && (
                <div
                  className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                  }}
                  onClick={() => {
                    tg?.WebApp.openLink(`${getApiUrl()}/admin/approvals`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="font-semibold text-yellow-400">Pending Approvals</p>
                        <p className="text-sm text-yellow-200/70">
                          {pendingApprovals} request{pendingApprovals !== 1 ? 's' : ''} waiting for review
                        </p>
                      </div>
                    </div>
                    <span className="text-yellow-400">→</span>
                  </div>
                </div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5') }}
                >
                  <p className="text-2xl font-bold text-purple-400">{pendingApprovals}</p>
                  <p className="text-xs opacity-60">Pending</p>
                </div>
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5') }}
                >
                  <p className="text-2xl font-bold text-green-400">Active</p>
                  <p className="text-xs opacity-60">Session</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5') }}
              >
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => tg?.WebApp.openLink(`${getApiUrl()}/admin`)}
                    className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all hover:bg-white/10"
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}
                  >
                    <span>📊</span>
                    <div>
                      <p className="font-medium">Full Dashboard</p>
                      <p className="text-xs opacity-60">Open admin web dashboard</p>
                    </div>
                  </button>
                  <button
                    onClick={() => tg?.WebApp.openLink(`${getApiUrl()}/admin/users`)}
                    className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all hover:bg-white/10"
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}
                  >
                    <span>👥</span>
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-xs opacity-60">View and manage users</p>
                    </div>
                  </button>
                  <button
                    onClick={() => tg?.WebApp.openLink(`${getApiUrl()}/admin/audit`)}
                    className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all hover:bg-white/10"
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}
                  >
                    <span>📜</span>
                    <div>
                      <p className="font-medium">Audit Logs</p>
                      <p className="text-xs opacity-60">View system activity</p>
                    </div>
                  </button>
                  <button
                    onClick={() => tg?.WebApp.openLink(`${getApiUrl()}/admin/approvals`)}
                    className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all hover:bg-white/10"
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}
                  >
                    <span>✅</span>
                    <div>
                      <p className="font-medium">Approval Queue</p>
                      <p className="text-xs opacity-60">Review pending requests</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Session Info */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#f5f5f5') }}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🔑</span> Admin Session
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-70">Session ID:</span>
                    <code className="bg-gray-700/50 px-2 py-0.5 rounded text-xs">{adminSession.id.slice(0, 8)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">User Level:</span>
                    <span className="text-purple-400 font-medium">
                      {(adminSession.user as { level?: number })?.level || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={async () => {
                  try {
                    await fetch(`${getApiUrl()}/api/admin/auth`, {
                      method: 'DELETE',
                      headers: { 'x-session-id': adminSession.id },
                    });
                    setAdminSession(null);
                    setPendingApprovals(0);
                    setActiveTab('dashboard');
                    tg?.WebApp.HapticFeedback.notificationOccurred('success');
                  } catch {
                    tg?.WebApp.showAlert('Failed to logout');
                  }
                }}
                className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
              >
                Logout from Admin
              </button>
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
                      onChange={e => {
                        setSettings(prev => ({
                          ...prev,
                          theme: e.target.value as 'auto' | 'light' | 'dark',
                        }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
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
                      onChange={e => {
                        setSettings(prev => ({
                          ...prev,
                          botRiskLevel: e.target.value as
                            | 'conservative'
                            | 'moderate'
                            | 'aggressive',
                        }));
                        tg?.WebApp.HapticFeedback.selectionChanged();
                      }}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
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
                      onChange={e => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, botStake: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="10000"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Stop Loss */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stop Loss ($)</span>
                    <input
                      type="number"
                      value={settings.stopLoss}
                      onChange={e => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, stopLoss: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="-10000"
                      max="-1"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Take Profit */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Take Profit ($)</span>
                    <input
                      type="number"
                      value={settings.takeProfit}
                      onChange={e => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, takeProfit: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="10000"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
                      }}
                    />
                  </div>

                  {/* Max Daily Trades */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Max Daily Trades</span>
                    <input
                      type="number"
                      value={settings.maxDailyTrades}
                      onChange={e => {
                        const value = parseInt(e.target.value) || 0;
                        setSettings(prev => ({ ...prev, maxDailyTrades: value }));
                      }}
                      className="w-20 px-3 py-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                      min="1"
                      max="50"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color || (isDark ? '#2a2a2a' : '#ffffff'),
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
                    color: themeParams.button_text_color || '#ffffff',
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
