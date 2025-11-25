'use client';

import React, { useMemo } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, Legend } from 'recharts';
import { Trade } from '@/lib/bitmex';

interface PerformanceChartProps {
    trades: Trade[];
    ohlcv: any[];
}

export function PerformanceChart({ trades, ohlcv }: PerformanceChartProps) {
    const chartData = useMemo(() => {
        // If ohlcv is already aggregated from server, use it directly.
        // Ensure it's sorted.
        return ohlcv.sort((a, b) => a.timestamp - b.timestamp);
    }, [ohlcv]);

    return (
        <div className="h-[500px] w-full bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Price History & Trade Executions</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        minTickGap={50}
                    />
                    <YAxis
                        yAxisId="left"
                        stroke="#9ca3af"
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                    />
                    <Legend />

                    {/* Price Line */}
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="price"
                        stroke="#8884d8"
                        dot={false}
                        strokeWidth={2}
                        name="Price (Close)"
                    />

                    {/* Buy Markers (Green Up Arrow) */}
                    <Scatter
                        yAxisId="left"
                        name="Buy"
                        dataKey="buy"
                        fill="#10b981"
                        shape="triangle"
                    />

                    {/* Sell Markers (Red Down Arrow) */}
                    <Scatter
                        yAxisId="left"
                        name="Sell"
                        dataKey="sell"
                        fill="#ef4444"
                        shape="wye"
                    />

                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
