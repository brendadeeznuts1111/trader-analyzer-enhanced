'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  Calendar,
  Trophy,
  DollarSign,
  Target,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Hash,
  Database,
  Zap,
} from 'lucide-react';

/**
 * Canonical Market Selector with UUIDv5 Integration
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-SELECTOR-002;version=0.1.16}]
 * [PROPERTIES:{selector={value:"uuid-canonical";@chain:["BP-UUID-GEN","BP-INTEGRATION-POLY"]}}]
 * [CLASS:MarketSelectorUUID][#REF:v-0.1.16.SELECTOR.UUID.1.0.A.1.1]]
 *
 * Features:
 * - UUIDv5 canonical identifiers
 * - Cache status display
 * - Exchange namespace visualization
 * - Copy UUID to clipboard
 */

interface CanonicalMarketUUID {
  uuid: string;
  nativeId: string;
  exchange: string;
  displayName: string;
  category: 'crypto' | 'prediction' | 'sports' | 'politics';
  description: string;
  type: 'binary' | 'scalar' | 'categorical' | 'perpetual';
  tags: string[];
  salt: string;
  cacheKey: string;
  cached: boolean;
  latencyMs?: number;
  odds?: { yes: number; no: number };
  volume?: string;
}

interface CanonicalMarketSelectorUUIDProps {
  selectedUUID: string;
  onMarketChange: (uuid: string, market: CanonicalMarketUUID) => void;
  showDebug?: boolean;
  exchange?: 'polymarket' | 'kalshi' | 'manifold' | 'bitmex' | 'sports';
}

// Icon selector based on category
const getMarketIcon = (category: string) => {
  switch (category) {
    case 'crypto':
      return <DollarSign className="w-4 h-4" />;
    case 'politics':
      return <Target className="w-4 h-4" />;
    case 'sports':
      return <Trophy className="w-4 h-4" />;
    default:
      return <Calendar className="w-4 h-4" />;
  }
};

// Category color mapping
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'crypto':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'politics':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'sports':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'prediction':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

// Truncate UUID for display
const truncateUUID = (uuid: string) => {
  if (!uuid || uuid.length < 12) return uuid;
  return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`;
};

export function CanonicalMarketSelectorUUID({
  selectedUUID,
  onMarketChange,
  showDebug = false,
  exchange = 'polymarket',
}: CanonicalMarketSelectorUUIDProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [markets, setMarkets] = useState<CanonicalMarketUUID[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [copiedUUID, setCopiedUUID] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number } | null>(null);

  // Fetch markets with canonical UUIDs from API
  const fetchCanonicalMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build API URL dynamically for staging deployments
      const apiUrl =
        window.location.hostname.includes('pages.dev') ||
        window.location.hostname.includes('staging')
          ? 'http://localhost:3004'
          : window.location.origin;

      const res = await fetch(`${apiUrl}/api/markets/canonical?exchange=${exchange}&limit=50`);

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Extract canonical headers
      const cacheStatus = res.headers.get('X-Cache-Status');

      const data = await res.json();

      // Transform to component format
      const canonicalMarkets: CanonicalMarketUUID[] = data.markets.map((m: any) => ({
        uuid: m.uuid,
        nativeId: m.nativeId,
        exchange: m.exchange,
        displayName: m.displayName || m.question || m.nativeId,
        category: m.category || 'prediction',
        description: m.description || '',
        type: m.type || 'binary',
        tags: m.tags || [],
        salt: m.salt || '',
        cacheKey: m.cacheKey || m.uuid,
        cached: cacheStatus === 'HIT',
        latencyMs: m.latencyMs,
        odds: m.odds,
        volume: m.volume,
      }));

      setMarkets(canonicalMarkets);
      setLastFetch(Date.now());

      // Update cache stats if available
      if (data.cacheStats) {
        setCacheStats(data.cacheStats);
      }
    } catch (err) {
      console.error('Failed to fetch canonical markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');

      // Fallback: generate client-side UUIDs for demo
      setMarkets(generateFallbackMarkets());
    } finally {
      setLoading(false);
    }
  }, [exchange]);

  // Generate fallback markets for demo/offline
  const generateFallbackMarkets = (): CanonicalMarketUUID[] => [
    {
      uuid: 'demo-uuid-btc-100k',
      nativeId: 'btc-100k-2025',
      exchange: 'polymarket',
      displayName: 'BTC reaches $100k in 2025',
      category: 'crypto',
      description: 'Will Bitcoin hit $100,000 before end of 2025?',
      type: 'binary',
      tags: ['crypto', 'bitcoin', 'price'],
      salt: 'demo-salt',
      cacheKey: 'pm:btc-100k-2025',
      cached: false,
      odds: { yes: 65, no: 35 },
    },
    {
      uuid: 'demo-uuid-eth-10k',
      nativeId: 'eth-10k-2025',
      exchange: 'polymarket',
      displayName: 'ETH reaches $10k in 2025',
      category: 'crypto',
      description: 'Will Ethereum hit $10,000 before end of 2025?',
      type: 'binary',
      tags: ['crypto', 'ethereum', 'price'],
      salt: 'demo-salt',
      cacheKey: 'pm:eth-10k-2025',
      cached: false,
      odds: { yes: 40, no: 60 },
    },
    {
      uuid: 'demo-uuid-fed-2025',
      nativeId: 'fed-rate-cut-2025',
      exchange: 'polymarket',
      displayName: 'Fed Rate Cut by June 2025',
      category: 'prediction',
      description: 'Will the Federal Reserve cut rates before June 2025?',
      type: 'binary',
      tags: ['economics', 'fed', 'rates'],
      salt: 'demo-salt',
      cacheKey: 'pm:fed-rate-cut-2025',
      cached: false,
      odds: { yes: 72, no: 28 },
    },
  ];

  useEffect(() => {
    fetchCanonicalMarkets();
  }, [fetchCanonicalMarkets]);

  // Copy UUID to clipboard
  const copyToClipboard = useCallback(async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedUUID(uuid);
      setTimeout(() => setCopiedUUID(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const selectedMarket = useMemo(
    () => markets.find(m => m.uuid === selectedUUID) || markets[0],
    [markets, selectedUUID]
  );

  return (
    <div className="relative">
      {/* Selected Market Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-400 transition-all hover-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              {selectedMarket ? (
                getMarketIcon(selectedMarket.category)
              ) : (
                <Hash className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-lg">
                {selectedMarket?.displayName || 'Select Market'}
              </div>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                {selectedMarket?.description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedMarket?.category || '')}`}
            >
              {selectedMarket?.category?.toUpperCase()}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* UUID Display */}
        {selectedMarket && (
          <div className="flex gap-2 mt-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  copyToClipboard(selectedMarket.uuid);
                }}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded border border-slate-600/30 hover:border-cyan-500/50 transition-colors"
                title="Click to copy UUID"
              >
                <Hash className="w-3 h-3 text-cyan-400" />
                <span className="font-mono text-xs text-slate-300">
                  {truncateUUID(selectedMarket.uuid)}
                </span>
                {copiedUUID === selectedMarket.uuid ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
              {selectedMarket.cached && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                  <Database className="w-3 h-3" />
                  CACHED
                </span>
              )}
              {selectedMarket.latencyMs && (
                <span className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded border border-slate-600/30">
                  <Zap className="w-3 h-3" />
                  {selectedMarket.latencyMs.toFixed(0)}ms
                </span>
              )}
            </div>
            {/* Live Odds Display */}
            {selectedMarket.odds && (
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                  YES {selectedMarket.odds.yes.toFixed(0)}¢
                </span>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                  NO {selectedMarket.odds.no.toFixed(0)}¢
                </span>
              </div>
            )}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-cyan-500/30 shadow-2xl z-50 max-h-[28rem] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur p-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{markets.length} markets</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              {error && <span className="text-xs text-red-400">{error}</span>}
              {cacheStats && (
                <span className="text-xs text-slate-500">
                  Cache: {cacheStats.hits}/{cacheStats.hits + cacheStats.misses}
                </span>
              )}
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                fetchCanonicalMarkets();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Refresh markets"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Market List */}
          <div className="p-2">
            {markets.map(market => (
              <button
                key={market.uuid}
                onClick={() => {
                  onMarketChange(market.uuid, market);
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-lg text-left hover:bg-slate-700/50 transition-colors border border-transparent hover:border-cyan-500/30 ${
                  selectedUUID === market.uuid ? 'bg-cyan-500/10 border-cyan-500/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getCategoryColor(market.category)}`}>
                    {getMarketIcon(market.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{market.displayName}</div>
                    <div className="text-sm text-slate-400 truncate">{market.description}</div>
                    {/* UUID + Tags Row */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                        {truncateUUID(market.uuid)}
                      </span>
                      {market.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {market.cached && <Database className="w-3 h-3 text-green-400" />}
                    </div>
                  </div>
                  {selectedUUID === market.uuid && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Debug Panel */}
          {showDebug && selectedMarket && (
            <div className="border-t border-slate-700/50 p-3 bg-slate-900/50">
              <div className="text-xs font-mono space-y-1">
                <div className="text-slate-500">Debug Info:</div>
                <div className="text-cyan-400">uuid: {selectedMarket.uuid}</div>
                <div className="text-slate-400">nativeId: {selectedMarket.nativeId}</div>
                <div className="text-slate-400">exchange: {selectedMarket.exchange}</div>
                <div className="text-slate-400">type: {selectedMarket.type}</div>
                <div className="text-slate-400">salt: {selectedMarket.salt}</div>
                <div className="text-slate-400">cacheKey: {selectedMarket.cacheKey}</div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-700/50 p-3">
            <div className="text-xs text-slate-400 text-center">
              UUIDv5 Canonical System | Bun.randomUUIDv5() | ORCA Namespace
              {lastFetch > 0 && (
                <span className="ml-2 text-slate-500">
                  Updated {Math.round((Date.now() - lastFetch) / 1000)}s ago
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

export default CanonicalMarketSelectorUUID;
