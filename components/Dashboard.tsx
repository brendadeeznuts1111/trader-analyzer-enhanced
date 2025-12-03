'use client';

import { useState } from 'react';
import { PositionSession } from '@/lib/types';
import { DashboardHeader } from './DashboardHeader';
import { OverviewDashboard } from './OverviewDashboard';
import { TradeDashboard } from './TradeDashboard';
import { PositionDashboard } from './PositionDashboard';
import { TraderRolePlay } from './TraderRolePlay';
import { AIPrediction } from './AIPrediction';
import { TraderProfile } from './TraderProfile';
import { DataPipelineVisualization } from './DataPipelineVisualization';
import TelegramTopics from './TelegramTopics';

type ViewMode =
  | 'overview'
  | 'positions'
  | 'trades'
  | 'roleplay'
  | 'prediction'
  | 'profile'
  | 'pipeline'
  | 'telegram';

interface APIConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  symbol: string;
}

export function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedSession, setSelectedSession] = useState<PositionSession | null>(null);
  const [page, setPage] = useState(1);
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    exchange: 'bitmex',
    apiKey: '',
    apiSecret: '',
    symbol: 'BTC/USD',
  });

  // Reset selected session when switching views or symbols
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedSession(null);
    setPage(1);
  };

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSelectedSession(null);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
  };

  const handleSelectSession = (session: PositionSession | null) => {
    setSelectedSession(session);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          selectedSymbol={selectedSymbol}
          onSymbolChange={handleSymbolChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onPageChange={handlePageChange}
        />

        {/* Overview Mode */}
        {viewMode === 'overview' && (
          <OverviewDashboard
            selectedSymbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
          />
        )}

        {/* Role Play Mode */}
        {viewMode === 'roleplay' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TraderRolePlay sessions={[]} />
          </div>
        )}

        {/* AI Prediction Mode */}
        {viewMode === 'prediction' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AIPrediction
              apiEndpoint="/api/backend/predict"
              credentials={{
                api_key: apiConfig.apiKey,
                api_secret: apiConfig.apiSecret,
                exchange: apiConfig.exchange,
              }}
              symbol={apiConfig.symbol}
            />
          </div>
        )}

        {/* Trader Profile Mode */}
        {viewMode === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TraderProfile data={undefined} />
          </div>
        )}

        {/* Data Pipeline Mode */}
        {viewMode === 'pipeline' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DataPipelineVisualization />
          </div>
        )}

        {/* Telegram Topics Mode */}
        {viewMode === 'telegram' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TelegramTopics />
          </div>
        )}

        {/* Positions Mode */}
        {viewMode === 'positions' && (
          <PositionDashboard
            selectedSymbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
          />
        )}

        {/* Trades Mode */}
        {viewMode === 'trades' && (
          <TradeDashboard
            selectedSymbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
          />
        )}
      </div>
    </div>
  );
}
