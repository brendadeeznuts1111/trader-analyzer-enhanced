/**
 * Data Pipeline Visualization Component
 * Visual representation of the data flow and market mapping system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { marketMapper, MarketIdentifier, NormalizedMarketData } from '@/lib/market_mapping';
import { exchangeManager } from '@/lib/exchanges/exchange_manager';
import { ExchangeType } from '@/lib/types';
import {
    LayoutGrid,
    Database,
    Network,
    ArrowRight,
    ArrowDown,
    Server,
    Globe,
    Map,
    Code,
    Cpu,
    BarChart,
    PieChart,
    LineChart,
    Activity,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Info,
    Sparkles
} from 'lucide-react';

interface PipelineStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    status: 'active' | 'completed' | 'error' | 'pending';
    details?: string[];
}

interface MarketMappingVisualization {
    marketId: string;
    exchange: string;
    symbol: string;
    displaySymbol: string;
    marketType: ExchangeType;
    status: 'mapped' | 'pending' | 'error';
}

export function DataPipelineVisualization() {
    const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
    const [marketMappings, setMarketMappings] = useState<MarketMappingVisualization[]>([]);
    const [exchangeStats, setExchangeStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pipeline' | 'mapping' | 'stats'>('pipeline');

    // Initialize pipeline visualization
    useEffect(() => {
        initializePipeline();
        loadMarketMappings();
        loadExchangeStatistics();
    }, []);

    const initializePipeline = () => {
        const steps: PipelineStep[] = [
            {
                id: 'data-collection',
                title: 'Data Collection',
                description: 'Collect raw market data from exchanges',
                icon: <Database className="w-6 h-6" />,
                status: 'completed',
                details: [
                    'Fetch OHLCV data from exchange APIs',
                    'Collect order book snapshots',
                    'Gather trade execution history',
                    'Retrieve account balance information'
                ]
            },
            {
                id: 'data-validation',
                title: 'Data Validation',
                description: 'Validate and clean incoming data',
                icon: <CheckCircle className="w-6 h-6" />,
                status: 'completed',
                details: [
                    'Check data structure and types',
                    'Validate required fields',
                    'Handle missing or invalid data',
                    'Apply data quality checks'
                ]
            },
            {
                id: 'market-mapping',
                title: 'Market Mapping',
                description: 'Map markets to UUID-based identifiers',
                icon: <Map className="w-6 h-6" />,
                status: 'active',
                details: [
                    'Generate UUIDv5 market identifiers',
                    'Normalize market symbols',
                    'Create consistent market references',
                    'Cache market mappings for performance'
                ]
            },
            {
                id: 'data-normalization',
                title: 'Data Normalization',
                description: 'Standardize data across exchanges',
                icon: <Code className="w-6 h-6" />,
                status: 'pending',
                details: [
                    'Convert to common data formats',
                    'Handle exchange-specific variations',
                    'Apply consistent naming conventions',
                    'Extract exchange-specific metadata'
                ]
            },
            {
                id: 'ui-integration',
                title: 'UI Integration',
                description: 'Display processed data in UI components',
                icon: <LayoutGrid className="w-6 h-6" />,
                status: 'pending',
                details: [
                    'Render charts and visualizations',
                    'Update real-time data displays',
                    'Handle user interactions',
                    'Manage component state'
                ]
            },
            {
                id: 'real-time-updates',
                title: 'Real-time Updates',
                description: 'Stream live market data',
                icon: <RefreshCw className="w-6 h-6" />,
                status: 'pending',
                details: [
                    'WebSocket connections to exchanges',
                    'Publish/subscribe data distribution',
                    'Real-time data processing',
                    'Live UI updates'
                ]
            }
        ];

        setPipelineSteps(steps);
        setLoading(false);
    };

    const loadMarketMappings = () => {
        try {
            // Get all cached market identifiers
            const identifiers = marketMapper.getAllMarketIdentifiers();

            const mappings: MarketMappingVisualization[] = identifiers.map(id => ({
                marketId: id.marketId,
                exchange: id.exchange,
                symbol: id.symbol,
                displaySymbol: id.displaySymbol,
                marketType: id.marketType,
                status: 'mapped' as const
            }));

            // Add some example mappings if none exist
            if (mappings.length === 0) {
                const exampleMarkets: MarketIdentifier[] = [
                    {
                        marketId: 'b6a7e8f0-1a2b-5c6d-8e9f-0a1b2c3d4e5f',
                        exchange: 'bitmex',
                        symbol: 'XBTUSD',
                        displaySymbol: 'BTCUSD',
                        marketType: 'crypto'
                    },
                    {
                        marketId: 'c7b8d9e0-2a3b-6c7d-9e0f-1a2b3c4d5e6f',
                        exchange: 'polymarket',
                        symbol: 'BTC-50K-DEC-2024',
                        displaySymbol: 'BTC > $50K by Dec 2024',
                        marketType: 'prediction'
                    },
                    {
                        marketId: 'd8c9e0f1-3a4b-7c8d-0e1f-2a3b4c5d6e7f',
                        exchange: 'kalishi',
                        symbol: 'BTC/USDT',
                        displaySymbol: 'BTC/USDT',
                        marketType: 'p2p'
                    },
                    {
                        marketId: 'e9d0f1a2-4b5c-8d9e-1f2a-3b4c5d6e7f8a',
                        exchange: 'sports',
                        symbol: 'NFL-SUPERBOWL-2025',
                        displaySymbol: 'NFL Super Bowl 2025',
                        marketType: 'sports'
                    }
                ];

                exampleMarkets.forEach(market => {
                    marketMapper.getMarketIdentifier(market);
                });

                setMarketMappings(exampleMarkets.map(m => ({
                    marketId: m.marketId,
                    exchange: m.exchange,
                    symbol: m.symbol,
                    displaySymbol: m.displaySymbol,
                    marketType: m.marketType,
                    status: 'mapped' as const
                })));
            } else {
                setMarketMappings(mappings);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load market mappings');
        }
    };

    const loadExchangeStatistics = async () => {
        try {
            // Initialize exchange manager if not already done
            if (!exchangeManager.isInitialized()) {
                exchangeManager.initialize();
            }

            // Get statistics for all exchanges
            const stats = await exchangeManager.getAllExchangeStatistics();
            const exchangeStatsArray = Array.from(stats.entries()).map(([name, stat]) => ({
                name,
                ...stat
            }));

            setExchangeStats(exchangeStatsArray);
        } catch (err) {
            console.error('Failed to load exchange statistics:', err);
            setExchangeStats([]);
        }
    };

    const refreshData = () => {
        setLoading(true);
        loadMarketMappings();
        loadExchangeStatistics();
        setTimeout(() => setLoading(false), 1000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'pending': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getMarketTypeColor = (marketType: ExchangeType) => {
        switch (marketType) {
            case 'crypto': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'sports': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'p2p': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'prediction': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            case 'trading_desk': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-4 text-muted-foreground">Loading data pipeline visualization...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Error: {error}
            </div>
        );
    }

    return (
        <div className="glass rounded-xl p-6 border border-primary/20 hover-card">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <Network className="w-6 h-6 text-primary" />
                    Data Pipeline & Market Mapping
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshData}
                        className="p-2 rounded-lg border border-white/10 hover:bg-secondary/50 transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-secondary/30 backdrop-blur-sm rounded-xl p-1 border border-white/5 overflow-x-auto mb-6">
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'pipeline'
                        ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)] ring-1 ring-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <ArrowRight className="w-4 h-4 mr-2" /> Data Pipeline
                </button>
                <button
                    onClick={() => setActiveTab('mapping')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'mapping'
                        ? 'bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <Map className="w-4 h-4 mr-2" /> Market Mapping
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'stats'
                        ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                >
                    <BarChart className="w-4 h-4 mr-2" /> Exchange Stats
                </button>
            </div>

            {/* Data Pipeline Visualization */}
            {activeTab === 'pipeline' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pipelineSteps.map((step, index) => (
                            <div key={step.id} className={`rounded-xl p-4 border ${getStatusColor(step.status)} transition-all`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {step.icon}
                                        <h4 className="font-semibold text-sm">{step.title}</h4>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                                        {step.status.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                                {step.details && (
                                    <div className="space-y-1 text-xs">
                                        {step.details.map((detail, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-primary/50"></span>
                                                <span className="text-muted-foreground">{detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {index < pipelineSteps.length - 1 && (
                                    <div className="flex justify-center mt-4">
                                        <ArrowDown className="w-4 h-4 text-primary/50" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pipeline Flow Diagram */}
                    <div className="mt-8 bg-secondary/30 rounded-xl p-6 border border-white/5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Network className="w-5 h-5 text-primary" />
                            Data Flow Architecture
                        </h4>
                        <div className="flex flex-wrap items-center justify-center gap-6">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                                    <Server className="w-8 h-8 text-blue-400" />
                                </div>
                                <span className="text-xs mt-2 text-center">Exchange APIs</span>
                            </div>
                            <ArrowRight className="w-6 h-6 text-primary/50" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                                <span className="text-xs mt-2 text-center">Validation</span>
                            </div>
                            <ArrowRight className="w-6 h-6 text-primary/50" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                                    <Map className="w-8 h-8 text-purple-400" />
                                </div>
                                <span className="text-xs mt-2 text-center">Market Mapping</span>
                            </div>
                            <ArrowRight className="w-6 h-6 text-primary/50" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30">
                                    <Code className="w-8 h-8 text-cyan-400" />
                                </div>
                                <span className="text-xs mt-2 text-center">Normalization</span>
                            </div>
                            <ArrowRight className="w-6 h-6 text-primary/50" />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                                    <LayoutGrid className="w-8 h-8 text-yellow-400" />
                                </div>
                                <span className="text-xs mt-2 text-center">UI Components</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Market Mapping Visualization */}
            {activeTab === 'mapping' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-secondary/30 rounded-xl p-4 border border-white/5">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Map className="w-5 h-5 text-primary" />
                            Market Identifier Mappings
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            UUIDv5-based market identification system for consistent cross-exchange references
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-3 py-2 text-left font-medium">Market ID</th>
                                        <th className="px-3 py-2 text-left font-medium">Exchange</th>
                                        <th className="px-3 py-2 text-left font-medium">Symbol</th>
                                        <th className="px-3 py-2 text-left font-medium">Display</th>
                                        <th className="px-3 py-2 text-left font-medium">Type</th>
                                        <th className="px-3 py-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marketMappings.map((mapping, index) => (
                                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-3 py-2">
                                                <code className="text-xs bg-white/10 px-2 py-1 rounded">
                                                    {mapping.marketId.substring(0, 8)}...
                                                </code>
                                            </td>
                                            <td className="px-3 py-2">{mapping.exchange}</td>
                                            <td className="px-3 py-2 font-mono">{mapping.symbol}</td>
                                            <td className="px-3 py-2">{mapping.displaySymbol}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${getMarketTypeColor(mapping.marketType)}`}>
                                                    {mapping.marketType}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${mapping.status === 'mapped'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {mapping.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {marketMappings.length > 0 && (
                            <div className="mt-4 p-3 bg-secondary/30 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 text-sm">
                                    <Info className="w-4 h-4 text-primary" />
                                    <span>Total markets mapped: <strong>{marketMappings.length}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* UUIDv5 Explanation */}
                    <div className="bg-secondary/30 rounded-xl p-4 border border-white/5">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            UUIDv5 Market Identification
                        </h4>
                        <div className="space-y-3 text-sm">
                            <p className="text-muted-foreground">
                                The system uses <code className="bg-white/10 px-1 rounded">UUIDv5</code> for deterministic market identification,
                                ensuring consistent references across different exchanges and market types.
                            </p>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-2 bg-primary rounded-full"></div>
                                <div>
                                    <strong>Benefits:</strong>
                                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                                        <li>Consistent market references across exchanges</li>
                                        <li>Deterministic generation from market attributes</li>
                                        <li>Collision-resistant unique identifiers</li>
                                        <li>Standardized data integration</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-2 bg-primary rounded-full"></div>
                                <div>
                                    <strong>Implementation:</strong>
                                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                                        <li>Market key: <code className="bg-white/10 px-1 rounded">exchange-symbol-type</code></li>
                                        <li>Namespace: <code className="bg-white/10 px-1 rounded">00000000-0000-0000-0000-000000000000</code></li>
                                        <li>Algorithm: SHA-1 based UUIDv5</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exchange Statistics */}
            {activeTab === 'stats' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exchangeStats.map((stat, index) => (
                            <div key={index} className="bg-secondary/30 rounded-xl p-4 border border-white/5">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-semibold capitalize">{stat.name}</h4>
                                    <span className={`text-xs px-2 py-1 rounded-full ${stat.status === 'online'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'}`}>
                                        {stat.status || 'unknown'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-muted-foreground text-xs">Requests</div>
                                        <div className="font-medium">{stat.totalRequests?.toLocaleString() || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs">Success Rate</div>
                                        <div className="font-medium">
                                            {stat.successRate ? `${(stat.successRate * 100).toFixed(1)}%` : 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs">Avg Response</div>
                                        <div className="font-medium">
                                            {stat.averageResponseTimeMs ? `${stat.averageResponseTimeMs}ms` : 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs">Uptime</div>
                                        <div className="font-medium">
                                            {stat.uptimePercentage ? `${stat.uptimePercentage.toFixed(2)}%` : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {stat.exchangeSpecific && (
                                    <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                                        <div className="font-medium mb-1">Exchange Specific</div>
                                        {Object.entries(stat.exchangeSpecific).slice(0, 3).map(([key, value]) => (
                                            <div key={key} className="flex justify-between text-muted-foreground">
                                                <span>{key}:</span>
                                                <span>{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Performance Trends */}
                    <div className="bg-secondary/30 rounded-xl p-4 border border-white/5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <LineChart className="w-5 h-5 text-primary" />
                            Performance Trends
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h5 className="font-medium mb-2">Response Time Trends</h5>
                                <div className="space-y-2">
                                    {exchangeStats.map((stat, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-sm capitalize text-muted-foreground">{stat.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                stat.performanceTrends?.responseTimeTrend === 'improving'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : stat.performanceTrends?.responseTimeTrend === 'degrading'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {stat.performanceTrends?.responseTimeTrend || 'stable'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h5 className="font-medium mb-2">Success Rate Trends</h5>
                                <div className="space-y-2">
                                    {exchangeStats.map((stat, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-sm capitalize text-muted-foreground">{stat.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                stat.performanceTrends?.successRateTrend === 'improving'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : stat.performanceTrends?.successRateTrend === 'degrading'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {stat.performanceTrends?.successRateTrend || 'stable'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
