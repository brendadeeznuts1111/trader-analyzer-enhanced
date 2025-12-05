'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time } from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

interface TVChartProps {
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  markers?: {
    time: number;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
  }[];
  loading?: boolean;
  visibleRange?: {
    from: number;
    to: number;
  } | null;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
  };
}

export const TVChart = ({
  data,
  markers = [],
  loading = false,
  visibleRange = null,
  colors: { backgroundColor = 'transparent', textColor = '#9ca3af' } = {},
}: TVChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || loading) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.5)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.5)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#334155',
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      crosshair: {
        vertLine: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: 2,
        },
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Only set data if we have valid data
    if (data && data.length > 0) {
      const formattedData = data
        .filter(d => d && d.time && d.open && d.high && d.low && d.close)
        .map(d => ({
          time: d.time as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

      if (formattedData.length > 0) {
        candlestickSeries.setData(formattedData);
      }
    }

    // Set markers if available
    if (markers && markers.length > 0) {
      const formattedMarkers = markers
        .filter(m => m && m.time)
        .map(m => ({
          time: m.time as Time,
          position: m.position,
          color: m.color,
          shape: m.shape,
          text: m.text,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      if (formattedMarkers.length > 0) {
        candlestickSeries.setMarkers(formattedMarkers);
      }
    }

    // Set visible range if provided, otherwise fit all content
    if (visibleRange) {
      chart.timeScale().setVisibleRange({
        from: visibleRange.from as Time,
        to: visibleRange.to as Time,
      });
    } else {
      chart.timeScale().fitContent();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, markers, loading, visibleRange, backgroundColor, textColor]);

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-secondary/20 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-secondary/20 rounded-lg">
        <span className="text-sm text-muted-foreground">No chart data available</span>
      </div>
    );
  }

  return <div ref={chartContainerRef} className="w-full h-[500px]" />;
};
