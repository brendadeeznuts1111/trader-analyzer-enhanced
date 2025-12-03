'use client';

import { useEffect, useState } from 'react';
import { Network, Activity, Zap, TrendingUp, Globe, Database } from 'lucide-react';

interface PipelineStats {
  markets: number;
  exchanges: number;
  messagesPerSec: number;
  lastUpdate: Date;
  uptime: number;
  memoryUsage: number;
  activeConnections: number;
}

export function DataPipelineVisualization() {
  const [stats, setStats] = useState<PipelineStats>({
    markets: 0,
    exchanges: 0,
    messagesPerSec: 0,
    lastUpdate: new Date(),
    uptime: 0,
    memoryUsage: 0,
    activeConnections: 0
  });

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect directly to Bun backend SSE
    const evt = new EventSource('http://localhost:8000/events');

    evt.onopen = () => {
      setIsConnected(true);
    };

    evt.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStats(data);
      } catch (error) {
        console.error('Failed to parse pipeline stats:', error);
      }
    };

    evt.onerror = () => {
      setIsConnected(false);
      // Fallback to REST API polling
      const pollStats = async () => {
        try {
          const response = await fetch('http://localhost:8000/pipeline/stats');
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch pipeline stats:', error);
        }
      };

      // Poll every 5 seconds as fallback
      const interval = setInterval(pollStats, 5000);
      pollStats(); // Initial call

      return () => clearInterval(interval);
    };

    return () => {
      evt.close();
      setIsConnected(false);
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
        <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          {isConnected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-8 text-center hover-card group">
          <div className="relative">
            <Network className="w-12 h-12 mx-auto mb-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-ping opacity-75" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">{stats.markets}</div>
          <div className="text-sm text-cyan-300 font-medium">Active Markets</div>
          <div className="text-xs text-slate-400 mt-1">Canonical unified data</div>
        </div>

        <div className="glass rounded-2xl p-8 text-center hover-card group">
          <div className="relative">
            <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
            <TrendingUp className="w-4 h-4 absolute -top-1 -right-1 text-green-400" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">{stats.exchanges}</div>
          <div className="text-sm text-yellow-300 font-medium">Connected Exchanges</div>
          <div className="text-xs text-slate-400 mt-1">Polymarket, Kalishi, Binance</div>
        </div>

        <div className="glass rounded-2xl p-8 text-center hover-card group">
          <div className="relative">
            <Activity className="w-12 h-12 mx-auto mb-4 text-green-400 group-hover:text-green-300 transition-colors animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div className="text-4xl font-bold text-white mb-1">{stats.messagesPerSec.toFixed(1)}</div>
          <div className="text-sm text-green-300 font-medium">msgs/sec</div>
          <div className="text-xs text-slate-400 mt-1">Real-time data flow</div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <Globe className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <div className="text-lg font-bold text-white">{stats.activeConnections}</div>
          <div className="text-xs text-purple-300">Active Connections</div>
        </div>

        <div className="glass rounded-xl p-4 text-center">
          <Database className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <div className="text-lg font-bold text-white">{formatMemory(stats.memoryUsage)}</div>
          <div className="text-xs text-blue-300">Memory Usage</div>
        </div>

        <div className="glass rounded-xl p-4 text-center">
          <Activity className="w-6 h-6 mx-auto mb-2 text-orange-400" />
          <div className="text-lg font-bold text-white">{formatUptime(stats.uptime)}</div>
          <div className="text-xs text-orange-300">Uptime</div>
        </div>
      </div>

      {/* Market Nodes Visualization */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          Market Data Flow
        </h3>

        <div className="space-y-3">
          {/* Presidential Election */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
              <span className="font-medium text-white">2024 US Election Winner</span>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Polymarket</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">Kalishi</span>
            </div>
          </div>

          {/* BTC Perpetual */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="font-medium text-white">BTC/USD Perpetual</span>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">Binance</span>
              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">BitMEX</span>
            </div>
          </div>

          {/* Super Bowl */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="font-medium text-white">Super Bowl LVIII</span>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Polymarket</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="text-xs text-slate-400">
            Last updated: {stats.lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}