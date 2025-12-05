'use client';

import { useState } from 'react';
import {
  Sparkles,
  Check,
  Key,
  Settings,
  X,
  LayoutList,
  BarChart3,
  Brain,
  Gamepad2,
  User,
  History as HistoryIcon,
  Network,
  MessageCircle,
} from 'lucide-react';
import SecretsStatus from './SecretsStatus';

type ViewMode =
  | 'overview'
  | 'positions'
  | 'trades'
  | 'roleplay'
  | 'prediction'
  | 'profile'
  | 'pipeline'
  | 'pipeline-flow'
  | 'enhanced'
  | 'telegram';

interface DashboardHeaderProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPageChange: (page: number) => void;
}

interface APIConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  symbol: string;
}

export function DashboardHeader({
  selectedSymbol,
  onSymbolChange,
  viewMode,
  onViewModeChange,
  onPageChange,
}: DashboardHeaderProps) {
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    exchange: 'bitmex',
    apiKey: '',
    apiSecret: '',
    symbol: 'BTC/USD',
  });
  const [isConnected, setIsConnected] = useState(false);

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
      console.error('Connection test failed', err);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
            Trader Role-Play Analyzer
          </h1>
          <p className="text-muted-foreground mt-1 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-bright-warning" />
            Learn trading strategies by role-playing top traders
          </p>
          <div className="mt-4 max-w-md">
            <SecretsStatus />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Exchange Selector Button */}
          <button
            onClick={() => setShowApiConfig(!showApiConfig)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isConnected
                ? 'bg-profit-green/20 text-profit-green border border-profit-green/30'
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
                onSymbolChange(e.target.value);
                onPageChange(1);
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
                <option value="kalshi">Kalshi (Prediction Markets)</option>
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
            onViewModeChange('overview');
            onPageChange(1);
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
            onViewModeChange('roleplay');
            onPageChange(1);
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
            onViewModeChange('prediction');
            onPageChange(1);
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
            onViewModeChange('profile');
            onPageChange(1);
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
            onViewModeChange('positions');
            onPageChange(1);
          }}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            viewMode === 'positions'
              ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <HistoryIcon size={16} className="mr-2" /> Positions
        </button>
        <button
          onClick={() => {
            onViewModeChange('trades');
            onPageChange(1);
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
            onViewModeChange('pipeline');
            onPageChange(1);
          }}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            viewMode === 'pipeline'
              ? 'bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.2)] ring-1 ring-orange-500/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <Network size={16} className="mr-2" /> Pipeline
        </button>
        <button
          onClick={() => {
            onViewModeChange('telegram');
            onPageChange(1);
          }}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            viewMode === 'telegram'
              ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          <MessageCircle size={16} className="mr-2" /> Telegram
        </button>
      </div>
    </>
  );
}
