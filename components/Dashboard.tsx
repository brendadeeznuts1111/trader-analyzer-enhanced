'use client';

import { useEffect, useState, useMemo } from 'react';
import { Trade, PositionSession } from '@/lib/types';
import { TradeList } from './TradeList';
import { PositionSessionList } from './PositionSessionList';
import { PositionDetail } from './PositionDetail';
import { StatsOverview } from './StatsOverview';
import { MonthlyPnLChart } from './MonthlyPnLChart';
import { EquityCurve } from './EquityCurve';
import { TVChart } from './TVChart';
import { TraderRolePlay } from './TraderRolePlay';
import { AIPrediction } from './AIPrediction';
import { TraderProfile } from './TraderProfile';
import { DataPipelineVisualization } from './DataPipelineVisualization';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  History,
  BarChart3,
  TrendingUp,
  Activity,
  Brain,
  Gamepad2,
  User,
  Settings,
  Key,
  X,
  Check,
  Sparkles,
  Network,
} from 'lucide-react';

type ViewMode =
  | 'overview'
  | 'positions'
  | 'trades'
  | 'roleplay'
  | 'prediction'
  | 'profile'
  | 'pipeline';

interface APIConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  symbol: string;
}

export function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sessions, setSessions] = useState<PositionSession[]>([]);
  const [chartData, setChartData] = useState<{ candles: any[]; markers: any[] }>({
    candles: [],
    markers: [],
  });
  const [chartLoading, setChartLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [selectedSession, setSelectedSession] = useState<PositionSession | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    exchange: 'bitmex',
    apiKey: '',
    apiSecret: '',
    symbol: 'BTC/USD',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [traderProfileData, setTraderProfileData] = useState<any>(null);
  const limit = 20;

  // Helper function to align time to timeframe bucket
  const alignToTimeframe = (timestamp: number, tf: string): number => {
    const date = new Date(timestamp * 1000);

    switch (tf) {
      case '1m':
        date.setSeconds(0, 0);
        break;
      case '5m':
        date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
        break;
      case '15m':
        date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
        break;
      case '30m':
        date.setMinutes(Math.floor(date.getMinutes() / 30) * 30, 0, 0);
        break;
      case '1h':
        date.setMinutes(0, 0, 0);
        break;
      case '4h':
        date.setHours(Math.floor(date.getHours() / 4) * 4, 0, 0, 0);
        break;
      case '1d':
        date.setHours(0, 0, 0, 0);
        break;
      case '1w':
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        break;
    }

    return Math.floor(date.getTime() / 1000);
  };

  // Generate chart markers from trades or selected session
  const chartMarkers = useMemo(() => {
    const tradesToMark = selectedSession ? selectedSession.trades : allTrades;

    if (!tradesToMark || tradesToMark.length === 0 || chartData.candles.length === 0) {
      return [];
    }

    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const candle of chartData.candles) {
      if (candle.time < minTime) minTime = candle.time;
      if (candle.time > maxTime) maxTime = candle.time;
    }

    const bucketMap = new Map<
      string,
      {
        buys: number;
        sells: number;
        buyQty: number;
        sellQty: number;
        avgBuyPrice: number;
        avgSellPrice: number;
      }
    >();

    tradesToMark.forEach(trade => {
      const tradeTime = Math.floor(new Date(trade.datetime).getTime() / 1000);

      if (tradeTime < minTime || tradeTime > maxTime) {
        return;
      }

      const bucketTime = alignToTimeframe(tradeTime, timeframe);
      const key = `${bucketTime}-${trade.side}`;

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          buys: 0,
          sells: 0,
          buyQty: 0,
          sellQty: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
        });
      }

      const bucket = bucketMap.get(key)!;
      if (trade.side === 'buy') {
        bucket.buyQty += trade.amount;
        bucket.avgBuyPrice = (bucket.avgBuyPrice * bucket.buys + trade.price) / (bucket.buys + 1);
        bucket.buys++;
      } else {
        bucket.sellQty += trade.amount;
        bucket.avgSellPrice =
          (bucket.avgSellPrice * bucket.sells + trade.price) / (bucket.sells + 1);
        bucket.sells++;
      }
    });

    const sortedCandleTimes = chartData.candles.map(c => c.time).sort((a, b) => a - b);
    const candleTimeSet = new Set(sortedCandleTimes);

    const findClosestCandleTime = (time: number): number | null => {
      if (candleTimeSet.has(time)) return time;
      if (sortedCandleTimes.length === 0) return null;

      let left = 0;
      let right = sortedCandleTimes.length - 1;

      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedCandleTimes[mid] < time) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      const timeframeSeconds: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '30m': 1800,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400,
        '1w': 604800,
      };
      const window = timeframeSeconds[timeframe] || 3600;

      let closest: number | null = null;
      let minDiff = Infinity;

      for (const idx of [left - 1, left, left + 1]) {
        if (idx >= 0 && idx < sortedCandleTimes.length) {
          const diff = Math.abs(sortedCandleTimes[idx] - time);
          if (diff < minDiff && diff <= window) {
            minDiff = diff;
            closest = sortedCandleTimes[idx];
          }
        }
      }

      return closest;
    };

    const markers: any[] = [];
    bucketMap.forEach((bucket, key) => {
      const [timeStr, side] = key.split('-');
      const rawTime = parseInt(timeStr);

      const time = findClosestCandleTime(rawTime);
      if (time === null) return;

      if (side === 'buy' && bucket.buys > 0) {
        markers.push({
          time,
          position: 'belowBar',
          color: '#10b981',
          shape: 'arrowUp',
          text: `BUY ${bucket.buyQty.toLocaleString()} @ $${bucket.avgBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        });
      }
      if (side === 'sell' && bucket.sells > 0) {
        markers.push({
          time,
          position: 'aboveBar',
          color: '#ef4444',
          shape: 'arrowDown',
          text: `SELL ${bucket.sellQty.toLocaleString()} @ $${bucket.avgSellPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        });
      }
    });

    return markers.sort((a, b) => a.time - b.time);
  }, [selectedSession, allTrades, timeframe, chartData.candles]);

  // Load Stats and Account Data from Worker
  useEffect(() => {
    async function loadStats() {
      try {
        // Use staging Worker endpoint
        const workerUrl =
          'https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/trades?type=stats';
        const res = await fetch(workerUrl);
        if (!res.ok) throw new Error('Failed to fetch stats from Worker');
        const data = await res.json();
        setStats(data.stats);
        setAccount(data.account);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }
    loadStats();
  }, []);

  // Load Equity Curve from Worker
  useEffect(() => {
    async function loadEquity() {
      try {
        // Use staging Worker endpoint with days parameter
        const workerUrl =
          'https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/trades?type=equity&days=30';
        const res = await fetch(workerUrl);
        if (!res.ok) throw new Error('Failed to fetch equity from Worker');
        const data = await res.json();
        setEquityCurve(data.equityCurve);
      } catch (err) {
        console.error('Error loading equity:', err);
      }
    }
    loadEquity();
  }, []);

  // Load all trades for markers
  useEffect(() => {
    async function loadAllTrades() {
      try {
        const res = await fetch(
          `/api/trades?symbol=${encodeURIComponent(selectedSymbol)}&limit=10000`
        );
        if (!res.ok) throw new Error('Failed to fetch trades');
        const data = await res.json();
        setAllTrades(data.trades || []);
      } catch (err) {
        console.error('Error loading trades for markers:', err);
      }
    }
    loadAllTrades();
  }, [selectedSymbol]);

  // Calculate visible range for chart when a session is selected
  const selectedSessionRange = useMemo(() => {
    if (!selectedSession) return null;

    const sessionStart = Math.floor(new Date(selectedSession.openTime).getTime() / 1000);
    const sessionEnd = selectedSession.closeTime
      ? Math.floor(new Date(selectedSession.closeTime).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    const sessionDuration = sessionEnd - sessionStart;

    const paddingMultiplier: Record<string, number> = {
      '1m': 0.3,
      '5m': 0.5,
      '15m': 1,
      '30m': 2,
      '1h': 3,
      '4h': 5,
      '1d': 10,
      '1w': 20,
    };
    const padding = Math.max(sessionDuration * (paddingMultiplier[timeframe] || 1), 3600 * 6);

    return {
      from: sessionStart - padding,
      to: sessionEnd + padding,
    };
  }, [selectedSession, timeframe]);

  // Load Real OHLCV Chart Data from Worker
  useEffect(() => {
    async function loadChartData() {
      setChartLoading(true);
      try {
        // Map symbol to market ID format (BTCUSD -> btc-usd-perp)
        const symbolToMarketId = {
          BTCUSD: 'btc-usd-perp',
          ETHUSD: 'eth-usd-perp',
          'BTC/USDT': 'btc-usd-perp',
          'ETH/USDT': 'eth-usd-perp',
        };
        const marketId =
          symbolToMarketId[selectedSymbol as keyof typeof symbolToMarketId] || 'btc-usd-perp';

        // Use staging Worker endpoint for now
        const workerUrl = `https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=100`;
        const res = await fetch(workerUrl);
        if (!res.ok) throw new Error('Failed to fetch OHLCV data from Worker');
        const data = await res.json();
        setChartData({ candles: data.candles || [], markers: [] });
      } catch (err) {
        console.error('Error loading OHLCV:', err);
        setChartData({ candles: [], markers: [] });
      } finally {
        setChartLoading(false);
      }
    }
    loadChartData();
  }, [selectedSymbol, timeframe]);

  // Load Table Data (Paginated)
  useEffect(() => {
    async function loadData() {
      if (
        viewMode === 'overview' ||
        viewMode === 'roleplay' ||
        viewMode === 'prediction' ||
        viewMode === 'profile'
      ) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const typeParam = viewMode === 'positions' ? '&type=sessions' : '';
        // Use staging Worker endpoint
        const workerUrl = `https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/trades?page=${page}&limit=${limit}&symbol=${encodeURIComponent(selectedSymbol)}${typeParam}`;
        const res = await fetch(workerUrl);
        if (!res.ok) throw new Error('Failed to fetch data from Worker');
        const data = await res.json();

        if (viewMode === 'positions') {
          setSessions(data.sessions);
          setTotalPages(Math.ceil(data.total / limit));
        } else {
          setTrades(data.trades);
          setTotalPages(Math.ceil(data.total / limit));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [page, selectedSymbol, viewMode]);

  // Reset selected session when switching views or symbols
  useEffect(() => {
    setSelectedSession(null);
  }, [viewMode, selectedSymbol]);

  // Handler to select a session from Worker
  const handleSelectSession = async (session: PositionSession) => {
    try {
      // Use staging Worker endpoint
      const workerUrl = `https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/trades?sessionId=${encodeURIComponent(session.id)}`;
      const res = await fetch(workerUrl);
      if (!res.ok) throw new Error('Failed to fetch session details from Worker');
      const data = await res.json();
      setSelectedSession(data.session);
    } catch (err) {
      console.error('Error fetching session:', err);
      setSelectedSession(session);
    }
  };

  // Test API connection
  const testConnection = async () => {
    try {
      const res = await fetch('/api/backend/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiConfig.apiKey,
          api_secret: apiConfig.apiSecret,
          exchange: apiConfig.exchange,
        }),
      });
      if (res.ok) {
        setIsConnected(true);
        setShowApiConfig(false);
      }
    } catch (err) {
      console.error('Connection test failed:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-destructive">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Trader Role-Play Analyzer
            </h1>
            <p className="text-muted-foreground mt-1 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Learn trading strategies by role-playing top traders
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Exchange Selector Button */}
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                isConnected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-white/5'
              }`}
            >
              {isConnected ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
              {isConnected ? 'Exchange Connected' : 'Select Exchange'}
            </button>

            {/* Symbol Selector */}
            <div className="relative">
              <select
                value={selectedSymbol}
                onChange={e => {
                  setSelectedSymbol(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-4 pr-10 py-2.5 bg-secondary/30 border border-white/5 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-secondary/50 cursor-pointer"
              >
                <option value="BTCUSD">BTCUSD</option>
                <option value="ETHUSD">ETHUSD</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* API Config Modal */}
        {showApiConfig && (
          <div className="glass rounded-xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                API Configuration
              </h3>
              <button
                onClick={() => setShowApiConfig(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Exchange</label>
                <select
                  value={apiConfig.exchange}
                  onChange={e => setApiConfig({ ...apiConfig, exchange: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary/30 border border-white/10 rounded-lg"
                >
                  <option value="bitmex">Bitmex (Crypto Futures)</option>
                  <option value="polymarket">Polymarket (Prediction Markets)</option>
                  <option value="kalishi">Kalishi (P2P Trading)</option>
                  <option value="sports">Sports Trading (NFL, NBA, Soccer)</option>
                  <option value="hyperliquid" disabled>
                    HyperLiquid (Coming Soon)
                  </option>
                  <option value="binance" disabled>
                    Binance (Coming Soon)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Symbol</label>
                <input
                  type="text"
                  value={apiConfig.symbol}
                  onChange={e => setApiConfig({ ...apiConfig, symbol: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary/30 border border-white/10 rounded-lg"
                  placeholder="BTC/USD"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  API Key (Read-Only)
                </label>
                <input
                  type="text"
                  value={apiConfig.apiKey}
                  onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary/30 border border-white/10 rounded-lg"
                  placeholder="Enter Read-Only API Key"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">API Secret</label>
                <input
                  type="password"
                  value={apiConfig.apiSecret}
                  onChange={e => setApiConfig({ ...apiConfig, apiSecret: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary/30 border border-white/10 rounded-lg"
                  placeholder="Enter API Secret"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={testConnection}
                className="px-6 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors"
              >
                Test Connection
              </button>
              <p className="text-sm text-muted-foreground flex items-center">
                Using read-only API, no trading operations allowed
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-secondary/30 backdrop-blur-sm rounded-xl p-1 border border-white/5 overflow-x-auto">
          <button
            onClick={() => {
              setViewMode('overview');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              viewMode === 'overview'
                ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <BarChart3 size={16} className="mr-2" /> Overview
          </button>
          <button
            onClick={() => {
              setViewMode('roleplay');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
              viewMode === 'roleplay'
                ? 'tab-roleplay active shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={16} className="mr-2" /> Role-Play
          </button>
          <button
            onClick={() => {
              setViewMode('prediction');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
              viewMode === 'prediction'
                ? 'tab-prediction active shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <Brain size={16} className="mr-2" /> AI Prediction
          </button>
          <button
            onClick={() => {
              setViewMode('profile');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
              viewMode === 'profile'
                ? 'tab-profile active shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <User size={16} className="mr-2" /> Trader Profile
          </button>
          <button
            onClick={() => {
              setViewMode('positions');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              viewMode === 'positions'
                ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <History size={16} className="mr-2" /> Positions
          </button>
          <button
            onClick={() => {
              setViewMode('trades');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              viewMode === 'trades'
                ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <LayoutList size={16} className="mr-2" /> Trades
          </button>
          <button
            onClick={() => {
              setViewMode('pipeline');
              setPage(1);
            }}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              viewMode === 'pipeline'
                ? 'bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.2)] ring-1 ring-orange-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <Network size={16} className="mr-2" /> Pipeline
          </button>
        </div>

        {/* Overview Mode */}
        {viewMode === 'overview' && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StatsOverview stats={stats} account={account} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-xl p-6 hover-card">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Equity Curve
                </h3>
                <EquityCurve data={equityCurve} />
              </div>
              <div className="glass rounded-xl p-6 hover-card">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Monthly PnL
                </h3>
                <MonthlyPnLChart data={stats.monthlyPnl} />
              </div>
            </div>

            {/* Price Chart */}
            <div className="glass rounded-xl p-6 hover-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5 text-primary" />
                  Price Action{' '}
                  <span className="text-muted-foreground text-sm font-normal ml-2">
                    {selectedSymbol.split(':')[0]}
                  </span>
                </h3>
                <div className="flex bg-secondary/30 rounded-lg p-1 border border-white/5 overflow-x-auto">
                  {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        timeframe === tf
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TVChart
                data={chartData.candles}
                markers={chartMarkers}
                loading={chartLoading}
                visibleRange={null}
              />
            </div>
          </div>
        )}

        {/* Role Play Mode - Exclusive Feature */}
        {viewMode === 'roleplay' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TraderRolePlay sessions={sessions} />
          </div>
        )}

        {/* AI Prediction Mode - Exclusive Feature */}
        {viewMode === 'prediction' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AIPrediction
              apiEndpoint="/api/backend/predict"
              credentials={{
                api_key: apiConfig.apiKey,
                api_secret: apiConfig.apiSecret,
                exchange: apiConfig.exchange,
              }}
              symbol={apiConfig.symbol}
            />
          </div>
        )}

        {/* Trader Profile Mode - Exclusive Feature */}
        {viewMode === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TraderProfile data={traderProfileData} />
          </div>
        )}

        {/* Data Pipeline Mode */}
        {viewMode === 'pipeline' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DataPipelineVisualization />
          </div>
        )}

        {/* Positions/Trades Mode */}
        {(viewMode === 'positions' || viewMode === 'trades') && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chart Section */}
            <section className="glass rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                {selectedSession ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-sm font-medium text-primary">
                      Viewing Position: {selectedSession.side.toUpperCase()}{' '}
                      {selectedSession.maxSize.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Activity className="w-5 h-5 text-primary" />
                    {selectedSymbol.split(':')[0]} Chart
                  </h3>
                )}
                <div className="flex bg-secondary/30 rounded-lg p-1 border border-white/5 overflow-x-auto">
                  {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        timeframe === tf
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TVChart
                data={chartData.candles}
                markers={chartMarkers}
                loading={chartLoading}
                visibleRange={selectedSessionRange}
              />
            </section>

            {/* Data Section */}
            <section>
              {selectedSession ? (
                <PositionDetail session={selectedSession} onBack={() => setSelectedSession(null)} />
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {viewMode === 'trades' ? 'Trade Log' : 'Position History'}
                    </h2>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-white/10 hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border border-white/10 hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  {viewMode === 'trades' ? (
                    <div className="glass rounded-xl overflow-hidden border border-white/5">
                      <TradeList trades={trades} />
                    </div>
                  ) : (
                    <PositionSessionList
                      sessions={sessions}
                      onSelectSession={handleSelectSession}
                    />
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
