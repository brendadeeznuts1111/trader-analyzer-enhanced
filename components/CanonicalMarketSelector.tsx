'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  TrendingUp,
  Calendar,
  Trophy,
  DollarSign,
  Target,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// [[TECH][MODULE][INSTANCE][META:{blueprint=BP-INTEGRATION-POLY@0.1.0;instance-id=ORCA-SELECTOR-001;version=0.1.1}]
// [PROPERTIES:{selector={value:"poly-uuids";@override:true}}][CLASS:MarketSelector]
// [#REF:v-0.1.1.BP.INTEGRATION.1.0.A.1.1.POLY.1.1]]

interface CanonicalMarket {
  id: string;
  displayName: string;
  category: 'crypto' | 'prediction' | 'sports' | 'politics';
  description: string;
  icon: React.ReactNode;
  color: string;
  exchanges: string[];
  odds?: { yes: number; no: number };
  volume?: string;
  source?: 'preset' | 'polymarket' | 'kalishi';
}

interface CanonicalMarketSelectorProps {
  selectedMarket: string;
  onMarketChange: (marketId: string) => void;
  polyEnabled?: boolean;
}

const CANONICAL_PRESETS: CanonicalMarket[] = [
  {
    id: 'btc-usd-perp',
    displayName: 'BTC/USD Perpetual',
    category: 'crypto',
    description: 'Bitcoin perpetual futures contract',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'text-green-400',
    exchanges: ['Binance', 'BitMEX', 'Bybit'],
    source: 'preset',
  },
  {
    id: 'eth-usd-perp',
    displayName: 'ETH/USD Perpetual',
    category: 'crypto',
    description: 'Ethereum perpetual futures contract',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-400',
    exchanges: ['Binance', 'BitMEX'],
    source: 'preset',
  },
  {
    id: 'presidential-election-winner-2024',
    displayName: '2024 US Election Winner',
    category: 'politics',
    description: 'Who will win the 2024 US Presidential Election?',
    icon: <Target className="w-4 h-4" />,
    color: 'text-cyan-400',
    exchanges: ['Polymarket', 'Kalishi'],
    source: 'preset',
  },
  {
    id: 'superbowl-2025',
    displayName: 'Super Bowl LVIII Winner',
    category: 'sports',
    description: 'Which team will win Super Bowl LVIII?',
    icon: <Trophy className="w-4 h-4" />,
    color: 'text-yellow-400',
    exchanges: ['Polymarket'],
    source: 'preset',
  },
  {
    id: 'fed-rate-cut-2024',
    displayName: 'Fed Rate Cut in 2024?',
    category: 'prediction',
    description: 'Will the Federal Reserve cut interest rates in 2024?',
    icon: <Calendar className="w-4 h-4" />,
    color: 'text-purple-400',
    exchanges: ['Polymarket'],
    source: 'preset',
  },
];

// Polymarket market categorization
const categorizePolyMarket = (
  question: string
): 'crypto' | 'prediction' | 'sports' | 'politics' => {
  const q = question.toLowerCase();
  if (
    q.includes('bitcoin') ||
    q.includes('btc') ||
    q.includes('ethereum') ||
    q.includes('eth') ||
    q.includes('crypto')
  )
    return 'crypto';
  if (
    q.includes('election') ||
    q.includes('president') ||
    q.includes('congress') ||
    q.includes('senate') ||
    q.includes('trump') ||
    q.includes('biden')
  )
    return 'politics';
  if (
    q.includes('super bowl') ||
    q.includes('nfl') ||
    q.includes('nba') ||
    q.includes('world cup') ||
    q.includes('championship')
  )
    return 'sports';
  return 'prediction';
};

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

export function CanonicalMarketSelector({
  selectedMarket,
  onMarketChange,
  polyEnabled = true,
}: CanonicalMarketSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [markets, setMarkets] = useState<CanonicalMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [lastETag, setLastETag] = useState<string | null>(null);

  // Fetch markets from Cloudflare Worker with ETag caching
  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use staging Worker endpoint for now
      const workerUrl = 'https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/markets';

      // Include If-None-Match header if we have a cached ETag
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      // Add ETag from previous response if available
      if (lastETag) {
        headers['If-None-Match'] = lastETag;
      }

      const res = await fetch(workerUrl, { headers });

      // Handle 304 Not Modified - no data changed
      if (res.status === 304) {
        console.log('Markets data unchanged, using cached data');
        setLastFetch(Date.now());
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Worker API error: ${res.status}`);
      }

      // Store ETag for future requests
      const etag = res.headers.get('etag');
      if (etag) {
        setLastETag(etag);
      }

      const data = await res.json();

      // Transform Worker markets to component format
      const workerMarkets: CanonicalMarket[] = data.markets.map((market: any) => {
        const category = market.category as 'crypto' | 'prediction' | 'sports' | 'politics';
        const exchanges = market.sources?.map((s: any) => s.exchange) || [];

        return {
          id: market.id,
          displayName: market.displayName,
          category,
          description: market.description,
          icon: getMarketIcon(category),
          color:
            category === 'crypto'
              ? 'text-green-400'
              : category === 'politics'
                ? 'text-cyan-400'
                : category === 'sports'
                  ? 'text-yellow-400'
                  : 'text-purple-400',
          exchanges,
          source: 'preset' as const, // Worker provides canonical presets
        };
      });

      setMarkets(workerMarkets);
      setLastFetch(Date.now());
    } catch (err) {
      console.error('Failed to fetch markets from Worker:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, [lastETag]);

  useEffect(() => {
    // Fetch markets from Worker (replaces Polymarket API call)
    fetchMarkets();
  }, [fetchMarkets]);

  const selectedMarketData = markets.find(m => m.id === selectedMarket) || markets[0];

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
              {selectedMarketData?.icon}
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-lg">
                {selectedMarketData?.displayName || 'Select Market'}
              </div>
              <div className="text-sm text-slate-400">{selectedMarketData?.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedMarketData?.category || '')}`}
            >
              {selectedMarketData?.category?.toUpperCase()}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Exchange Tags + Odds */}
        <div className="flex gap-2 mt-3 items-center justify-between">
          <div className="flex gap-2">
            {selectedMarketData?.exchanges.slice(0, 3).map((exchange, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded border border-slate-600/30"
              >
                {exchange}
              </span>
            ))}
            {selectedMarketData && selectedMarketData.exchanges.length > 3 && (
              <span className="px-2 py-1 bg-slate-700/50 text-slate-400 text-xs rounded border border-slate-600/30">
                +{selectedMarketData.exchanges.length - 3} more
              </span>
            )}
          </div>
          {/* Live Odds Display */}
          {selectedMarketData?.odds && (
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                YES {selectedMarketData.odds.yes.toFixed(0)}¢
              </span>
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                NO {selectedMarketData.odds.no.toFixed(0)}¢
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-cyan-500/30 shadow-2xl z-50 max-h-96 overflow-y-auto">
          {/* Header with refresh */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur p-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{markets.length} markets</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                fetchMarkets();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Refresh markets"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-2">
            {markets.map(market => (
              <button
                key={market.id}
                onClick={() => {
                  onMarketChange(market.id);
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-lg text-left hover:bg-slate-700/50 transition-colors border border-transparent hover:border-cyan-500/30 ${
                  selectedMarket === market.id ? 'bg-cyan-500/10 border-cyan-500/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getCategoryColor(market.category)}`}>
                    {market.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{market.displayName}</div>
                    <div className="text-sm text-slate-400">{market.description}</div>
                    <div className="flex gap-1 mt-1">
                      {market.exchanges.slice(0, 2).map((exchange, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded"
                        >
                          {exchange}
                        </span>
                      ))}
                      {market.exchanges.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">
                          +{market.exchanges.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedMarket === market.id && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700/50 p-3">
            <div className="text-xs text-slate-400 text-center">
              {polyEnabled ? (
                <>
                  Markets are canonical (ORCA UUID) | Polymarket CLOB integrated
                  {lastFetch > 0 && (
                    <span className="ml-2 text-slate-500">
                      Updated {Math.round((Date.now() - lastFetch) / 1000)}s ago
                    </span>
                  )}
                </>
              ) : (
                'Markets are canonical - same data across all exchanges'
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
