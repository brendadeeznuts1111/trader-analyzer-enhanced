'use client';

import { useState, useEffect } from 'react';
import { EquityCurve } from './EquityCurve';
import { MonthlyPnLChart } from './MonthlyPnLChart';
import { TVChart } from './TVChart';
import { StatsOverview } from './StatsOverview';
import { useBatchFetch } from '@/lib/hooks/useDataFetch';
import { BACKEND_URLS } from '@/lib/constants';
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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || BACKEND_URLS.development;

  // Use useBatchFetch for stats and equity data
  const { data: overviewData, loading: overviewLoading } = useBatchFetch<{
    stats: StatsData;
    equity: EquityData;
  }>({
    stats: `${apiUrl}/api/trades?type=stats`,
    equity: `${apiUrl}/api/trades?type=equity&days=30`,
  });

  // Load chart data separately since it depends on selectedSymbol and timeframe
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
          `${apiUrl}/api/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=100`
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
  }, [selectedSymbol, timeframe, apiUrl]);

  if (overviewLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {overviewData?.stats && (
        <StatsOverview stats={overviewData.stats.stats} account={overviewData.stats.account} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 hover-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            Equity Curve
          </h3>
          {overviewData?.equity && <EquityCurve data={overviewData.equity.equityCurve || []} />}
        </div>
        <div className="glass rounded-xl p-6 hover-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            Monthly PnL
          </h3>
          {overviewData?.stats && (
            <MonthlyPnLChart data={overviewData.stats.stats?.monthlyPnl || []} />
          )}
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
