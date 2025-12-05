'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  Filter,
  ChevronDown,
  Bitcoin,
  Trophy,
  LineChart,
} from 'lucide-react';

interface MarketPnL {
  symbol: string;
  displayName: string;
  type: 'crypto' | 'sports' | 'prediction' | 'perpetual';
  pnl: number;
  trades: number;
  winRate: number;
  volume: number;
}

interface MonthlyData {
  month: string;
  year: number;
  monthNum: number;
  monthName: string;
  pnl: number;
  funding: number;
  fees: number;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  roi: number;
  drawdown: number;
  byMarket: Record<string, MarketPnL>;
}

interface YearlyData {
  year: number;
  totalPnl: number;
  totalFunding: number;
  totalFees: number;
  totalTrades: number;
  avgMonthlyPnl: number;
  profitableMonths: number;
  months: MonthlyData[];
}

interface MonthlyPnLDashboardProps {
  className?: string;
}

const MARKET_TYPE_ICONS: Record<string, React.ReactNode> = {
  crypto: <Bitcoin className="w-4 h-4" />,
  perpetual: <LineChart className="w-4 h-4" />,
  sports: <Trophy className="w-4 h-4" />,
  prediction: <BarChart3 className="w-4 h-4" />,
};

const MARKET_TYPE_COLORS: Record<string, string> = {
  crypto: 'text-orange-400',
  perpetual: 'text-blue-400',
  sports: 'text-green-400',
  prediction: 'text-purple-400',
};

export function MonthlyPnLDashboard({ className = '' }: MonthlyPnLDashboardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<YearlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  const [marketFilter, setMarketFilter] = useState<string | null>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = marketFilter
          ? `/api/pnl?year=${selectedYear}&marketType=${marketFilter}`
          : `/api/pnl?year=${selectedYear}`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          setData(result.year);
        }
      } catch (error) {
        console.error('Failed to fetch P&L data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, marketFilter]);

  // Chart rendering
  useEffect(() => {
    if (!chartContainerRef.current || !data?.months.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    const histogramSeries = chart.addHistogramSeries({
      color: '#10b981',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      },
    });

    const chartData = data.months.map(d => {
      const date = new Date(d.year, d.monthNum - 1, 1);
      return {
        time: Math.floor(date.getTime() / 1000) as any,
        value: d.pnl,
        color: d.pnl >= 0 ? '#10b981' : '#ef4444',
      };
    });

    histogramSeries.setData(chartData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  if (loading) {
    return (
      <div className={`glass rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`glass rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
          No P&L data available
        </div>
      </div>
    );
  }

  const profitableMonthsPercent = data.months.length > 0
    ? (data.profitableMonths / data.months.length) * 100
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Monthly P&L Analysis
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track your trading performance across markets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Market Type Filter */}
          <div className="flex bg-secondary/30 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setMarketFilter(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !marketFilter
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {['perpetual', 'crypto', 'sports', 'prediction'].map(type => (
              <button
                key={type}
                onClick={() => setMarketFilter(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  marketFilter === type
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {MARKET_TYPE_ICONS[type]}
                <span className="hidden sm:inline capitalize">{type}</span>
              </button>
            ))}
          </div>

          {/* Year Selector */}
          <div className="relative">
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/30 border border-white/5 hover:bg-secondary/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">{selectedYear}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showYearDropdown && (
              <div className="absolute right-0 mt-2 w-32 bg-card border border-white/10 rounded-lg shadow-xl z-50">
                {years.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setShowYearDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-secondary/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      year === selectedYear ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Total P&L
          </div>
          <p className={`text-2xl font-bold ${data.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {data.totalPnl >= 0 ? '+' : ''}${data.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.months.length} months tracked
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Avg Monthly
          </div>
          <p className={`text-2xl font-bold ${data.avgMonthlyPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {data.avgMonthlyPnl >= 0 ? '+' : ''}${data.avgMonthlyPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Per month average
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <BarChart3 className="w-4 h-4" />
            Win Rate
          </div>
          <p className="text-2xl font-bold text-foreground">
            {profitableMonthsPercent.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.profitableMonths}/{data.months.length} profitable
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Filter className="w-4 h-4" />
            Total Trades
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data.totalTrades.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across all markets
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
        <div ref={chartContainerRef} className="w-full h-[280px]" />
      </div>

      {/* Monthly Breakdown Table */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-white/5">
              <tr>
                <th className="text-left py-3 px-2 font-medium">Month</th>
                <th className="text-right py-3 px-2 font-medium">P&L</th>
                <th className="text-right py-3 px-2 font-medium">ROI</th>
                <th className="text-right py-3 px-2 font-medium">Funding</th>
                <th className="text-right py-3 px-2 font-medium">Fees</th>
                <th className="text-right py-3 px-2 font-medium">Trades</th>
                <th className="text-right py-3 px-2 font-medium">Win Rate</th>
                <th className="text-center py-3 px-2 font-medium">Markets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...data.months].reverse().map(month => (
                <tr
                  key={month.month}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedMonth(selectedMonth?.month === month.month ? null : month)}
                >
                  <td className="py-3 px-2 font-medium">
                    {month.monthName} {month.year}
                  </td>
                  <td className={`py-3 px-2 text-right font-bold ${month.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {month.pnl >= 0 ? '+' : ''}${month.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className={`py-3 px-2 text-right ${month.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {month.roi >= 0 ? '+' : ''}{month.roi.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-2 text-right ${month.funding >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {month.funding >= 0 ? '+' : ''}${month.funding.toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right text-rose-400">
                    -${month.fees.toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right text-muted-foreground">
                    {month.trades.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {(month.winRate * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center gap-1">
                      {Object.values(month.byMarket).slice(0, 4).map((market, i) => (
                        <span
                          key={i}
                          className={`${MARKET_TYPE_COLORS[market.type]} opacity-70`}
                          title={market.displayName}
                        >
                          {MARKET_TYPE_ICONS[market.type]}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Month Market Breakdown */}
      {selectedMonth && (
        <div className="glass rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedMonth.monthName} {selectedMonth.year} - Market Breakdown
            </h3>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(selectedMonth.byMarket).map(market => (
              <div key={market.symbol} className="bg-secondary/30 rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={MARKET_TYPE_COLORS[market.type]}>
                    {MARKET_TYPE_ICONS[market.type]}
                  </span>
                  <span className="font-medium">{market.displayName}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-white/5 rounded capitalize">
                    {market.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">P&L</p>
                    <p className={`font-bold ${market.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {market.pnl >= 0 ? '+' : ''}${market.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Trades</p>
                    <p className="font-medium">{market.trades}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Win Rate</p>
                    <p className="font-medium">{(market.winRate * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Volume</p>
                    <p className="font-medium">${(market.volume / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
