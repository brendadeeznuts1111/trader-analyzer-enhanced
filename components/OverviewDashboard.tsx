'use client';

import React, { useMemo } from 'react';
import { EquityCurve } from './EquityCurve';
import { MonthlyPnLChart } from './MonthlyPnLChart';
import { TVChart } from './TVChart';
import { StatsOverview } from './StatsOverview';
import { useBatchFetch } from '@/lib/hooks/useDataFetch';
import { Loader2, TrendingUp, BarChart3, Activity } from 'lucide-react';

interface OverviewDashboardProps {
  selectedSymbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

interface ChartData {
  candles: any[];
  markers: any[];
}

interface StatsData {
  stats: any;
  account: any;
}

interface EquityData {
  equityCurve: any[];
}

export function OverviewDashboard({
  selectedSymbol,
  timeframe,
  onTimeframeChange,
}: OverviewDashboardProps) {
  const [chartData, setChartData] = useState<ChartData>({ candles: [], markers: [] });
  const [chartLoading, setChartLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stats and equity data
  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [statsRes, equityRes] = await Promise.allSettled([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/trades?type=stats`
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/trades?type=equity&days=30`
          ),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const statsData = await statsRes.value.json();
          setStats(statsData);
        }

        if (equityRes.status === 'fulfilled' && equityRes.value.ok) {
          const equityData = await equityRes.value.json();
          setEquity(equityData);
        }
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  // Load chart data
  useEffect(() => {
    const loadChartData = async () => {
      setChartLoading(true);
      try {
        const symbolToMarketId = {
          BTCUSD: 'btc-usd-perp',
          ETHUSD: 'eth-usd-perp',
          'BTC/USDT': 'btc-usd-perp',
          'ETH/USDT': 'eth-usd-perp',
        };
        const marketId =
          symbolToMarketId[selectedSymbol as keyof typeof symbolToMarketId] || 'btc-usd-perp';

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=100`
        );

        if (response.ok) {
          const data = await response.json();
          setChartData({ candles: data.candles || [], markers: [] });
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        setChartData({ candles: [], markers: [] });
      } finally {
        setChartLoading(false);
      }
    };

    loadChartData();
  }, [selectedSymbol, timeframe]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {stats && <StatsOverview stats={stats.stats} account={stats.account} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 hover-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            Equity Curve
          </h3>
          {equity && <EquityCurve data={equity.equityCurve} />}
        </div>
        <div className="glass rounded-xl p-6 hover-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            Monthly PnL
          </h3>
          {stats && <MonthlyPnLChart data={stats.stats.monthlyPnl} />}
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
                onClick={() => onTimeframeChange(tf)}
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
          markers={chartData.markers}
          loading={chartLoading}
          visibleRange={null}
        />
      </div>
    </div>
  );
}
