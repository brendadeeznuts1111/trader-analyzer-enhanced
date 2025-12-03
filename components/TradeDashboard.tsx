'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TradeList } from './TradeList';
import { TVChart } from './TVChart';
import { PositionDetail } from './PositionDetail';
import { Trade, PositionSession } from '@/lib/types';
import { Loader2, Activity, History, ChevronLeft, ChevronRight } from 'lucide-react';

interface TradeDashboardProps {
  selectedSymbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  selectedSession: PositionSession | null;
  onSelectSession: (session: PositionSession | null) => void;
}

interface ChartData {
  candles: any[];
  markers: any[];
}

export function TradeDashboard({
  selectedSymbol,
  timeframe,
  onTimeframeChange,
  selectedSession,
  onSelectSession,
}: TradeDashboardProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ candles: [], markers: [] });
  const [chartLoading, setChartLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);

  const limit = 20;

  // Load trades data
  useEffect(() => {
    const loadTrades = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/trades?page=${page}&limit=${limit}&symbol=${encodeURIComponent(selectedSymbol)}`
        );

        if (response.ok) {
          const data = await response.json();
          setTrades(data.trades || []);
          setTotalPages(Math.ceil(data.total / limit));
        }
      } catch (error) {
        console.error('Error loading trades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, [page, selectedSymbol]);

  // Load all trades for markers (limit to recent trades for performance)
  useEffect(() => {
    const loadAllTrades = async () => {
      try {
        const response = await fetch(
          `/api/trades?symbol=${encodeURIComponent(selectedSymbol)}&limit=1000`
        );

        if (response.ok) {
          const data = await response.json();
          setAllTrades(data.trades || []);
        }
      } catch (error) {
        console.error('Error loading all trades for markers:', error);
      }
    };

    loadAllTrades();
  }, [selectedSymbol]);

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

  // Generate chart markers from trades
  const chartMarkers = useMemo(() => {
    if (!allTrades || allTrades.length === 0 || chartData.candles.length === 0) {
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

    // Process trades in batches to avoid blocking
    const tradesToProcess = selectedSession ? selectedSession.trades : allTrades.slice(0, 500); // Limit for performance

    tradesToProcess.forEach(trade => {
      const tradeTime = Math.floor(new Date(trade.datetime).getTime() / 1000);

      if (tradeTime < minTime || tradeTime > maxTime) {
        return;
      }

      const bucketTime =
        Math.floor(tradeTime / (timeframe === '1d' ? 86400 : 3600)) *
        (timeframe === '1d' ? 86400 : 3600);
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

    const markers: any[] = [];
    bucketMap.forEach((bucket, key) => {
      const [timeStr] = key.split('-');
      const time = parseInt(timeStr);

      if (bucket.buys > 0) {
        markers.push({
          time,
          position: 'belowBar',
          color: '#10b981',
          shape: 'arrowUp',
          text: `BUY ${bucket.buyQty.toLocaleString()} @ $${bucket.avgBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
        });
      }
      if (bucket.sells > 0) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading trades...</p>
      </div>
    );
  }

  return (
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
          markers={chartMarkers}
          loading={chartLoading}
          visibleRange={selectedSessionRange}
        />
      </section>

      {/* Data Section */}
      <section>
        {selectedSession ? (
          <PositionDetail session={selectedSession} onBack={() => onSelectSession(null)} />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Trade Log</h2>

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

            <div className="glass rounded-xl overflow-hidden border border-white/5">
              <TradeList trades={trades} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
