'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time } from 'lightweight-charts';

interface EquityData {
  time: number;
  balance: number;
}

interface EquityCurveProps {
  data: EquityData[];
}

export function EquityCurve({ data }: EquityCurveProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const safeData = data || [];

  useEffect(() => {
    if (!chartContainerRef.current || safeData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Create area series
    const areaSeries = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.4)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(4) + ' BTC',
      },
    });

    const chartData = safeData
      .filter(d => d && d.time && typeof d.time === 'number')
      .map(d => ({
        time: d.time as Time,
        value: d.balance,
      }));

    if (chartData.length === 0) {
      chart.remove();
      return;
    }
    areaSeries.setData(chartData);
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
  }, [safeData]);

  // Calculate stats
  const startBalance = safeData[0]?.balance || 0;
  const endBalance = safeData[safeData.length - 1]?.balance || 0;
  const change = endBalance - startBalance;
  const changePercent = startBalance > 0 ? (change / startBalance) * 100 : 0;

  // Find peak and drawdown
  let peak = 0;
  let maxDrawdown = 0;
  safeData.forEach(d => {
    if (d.balance > peak) peak = d.balance;
    const drawdown = (peak - d.balance) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Wallet balance over time</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-tight">{endBalance.toFixed(4)} BTC</p>
          <p
            className={`text-sm font-medium ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(4)} ({changePercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full h-[250px]" />

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
            Starting Balance
          </p>
          <p className="font-bold">{startBalance.toFixed(4)} BTC</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
            Peak Balance
          </p>
          <p className="font-bold text-emerald-500">{peak.toFixed(4)} BTC</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
            Max Drawdown
          </p>
          <p className="font-bold text-rose-500">{(maxDrawdown * 100).toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
