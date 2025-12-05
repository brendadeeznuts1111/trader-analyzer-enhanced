'use client';

import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Eye,
  EyeOff,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Brain,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { PositionSession } from '@/lib/types';

interface TraderRolePlayProps {
  sessions: PositionSession[];
  currentPrice?: number;
  onSelectSession?: (session: PositionSession) => void;
}

interface RolePlayState {
  isPlaying: boolean;
  currentSessionIndex: number;
  currentTradeIndex: number;
  showAnswer: boolean;
  userGuess: 'buy' | 'sell' | 'hold' | null;
  score: {
    correct: number;
    total: number;
  };
  playbackSpeed: number;
  isDemoMode: boolean;
}

// Demo data for showcase
const DEMO_SESSIONS: PositionSession[] = [
  {
    id: 'demo-session-1',
    symbol: 'XBTUSD',
    side: 'long',
    openTime: '2024-10-15T09:30:00Z',
    closeTime: '2024-10-15T14:45:00Z',
    maxSize: 50000,
    realizedPnl: 0.0256,
    tradeCount: 4,
    trades: [
      {
        id: 't1',
        datetime: '2024-10-15T09:30:00Z',
        side: 'buy',
        price: 62500,
        amount: 20000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.32,
        orderID: 'ord-1',
        execType: 'Trade',
      },
      {
        id: 't2',
        datetime: '2024-10-15T10:15:00Z',
        side: 'buy',
        price: 62200,
        amount: 15000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.24,
        orderID: 'ord-2',
        execType: 'Trade',
      },
      {
        id: 't3',
        datetime: '2024-10-15T11:00:00Z',
        side: 'buy',
        price: 62100,
        amount: 15000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.24,
        orderID: 'ord-3',
        execType: 'Trade',
      },
      {
        id: 't4',
        datetime: '2024-10-15T14:45:00Z',
        side: 'sell',
        price: 63200,
        amount: 50000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.79,
        orderID: 'ord-4',
        execType: 'Trade',
      },
    ],
    displaySymbol: 'XBT/USD',
    durationMs: 18900000,
    totalBought: 50000,
    totalSold: 50000,
    avgEntryPrice: 62300,
    avgExitPrice: 63200,
    totalFees: 0.0004,
    netPnl: 0.0252,
    status: 'closed',
  },
  {
    id: 'demo-session-2',
    symbol: 'XBTUSD',
    side: 'short',
    openTime: '2024-10-16T08:00:00Z',
    closeTime: '2024-10-16T16:30:00Z',
    maxSize: 30000,
    realizedPnl: 0.0189,
    tradeCount: 3,
    trades: [
      {
        id: 't5',
        datetime: '2024-10-16T08:00:00Z',
        side: 'sell',
        price: 64500,
        amount: 30000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.46,
        orderID: 'ord-5',
        execType: 'Trade',
      },
      {
        id: 't6',
        datetime: '2024-10-16T12:00:00Z',
        side: 'buy',
        price: 63800,
        amount: 15000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.23,
        orderID: 'ord-6',
        execType: 'Trade',
      },
      {
        id: 't7',
        datetime: '2024-10-16T16:30:00Z',
        side: 'buy',
        price: 63200,
        amount: 15000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.23,
        orderID: 'ord-7',
        execType: 'Trade',
      },
    ],
    displaySymbol: 'XBT/USD',
    durationMs: 30600000,
    totalBought: 30000,
    totalSold: 30000,
    avgEntryPrice: 64500,
    avgExitPrice: 63500,
    totalFees: 0.0003,
    netPnl: 0.0186,
    status: 'closed',
  },
  {
    id: 'demo-session-3',
    symbol: 'XBTUSD',
    side: 'long',
    openTime: '2024-10-17T10:00:00Z',
    closeTime: '2024-10-17T15:00:00Z',
    maxSize: 25000,
    realizedPnl: -0.0085,
    tradeCount: 3,
    trades: [
      {
        id: 't8',
        datetime: '2024-10-17T10:00:00Z',
        side: 'buy',
        price: 63000,
        amount: 25000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.39,
        orderID: 'ord-8',
        execType: 'Trade',
      },
      {
        id: 't9',
        datetime: '2024-10-17T13:30:00Z',
        side: 'sell',
        price: 62500,
        amount: 10000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.16,
        orderID: 'ord-9',
        execType: 'Trade',
      },
      {
        id: 't10',
        datetime: '2024-10-17T15:00:00Z',
        side: 'sell',
        price: 62200,
        amount: 15000,
        fee: { cost: 0.0001, currency: 'XBt' },
        symbol: 'XBTUSD',
        displaySymbol: 'XBT/USD',
        cost: 0.24,
        orderID: 'ord-10',
        execType: 'Trade',
      },
    ],
    displaySymbol: 'XBT/USD',
    durationMs: 18000000,
    totalBought: 25000,
    totalSold: 25000,
    avgEntryPrice: 63000,
    avgExitPrice: 62320,
    totalFees: 0.0003,
    netPnl: -0.0088,
    status: 'closed',
  },
];

export function TraderRolePlay({ sessions, currentPrice, onSelectSession }: TraderRolePlayProps) {
  const [state, setState] = useState<RolePlayState>({
    isPlaying: false,
    currentSessionIndex: 0,
    currentTradeIndex: 0,
    showAnswer: false,
    userGuess: null,
    score: { correct: 0, total: 0 },
    playbackSpeed: 1,
    isDemoMode: false,
  });

  const [showHint, setShowHint] = useState(false);

  // Use demo sessions if in demo mode or no real sessions available
  const activeSessions = state.isDemoMode || sessions.length === 0 ? DEMO_SESSIONS : sessions;
  const currentSession = activeSessions[state.currentSessionIndex];
  const currentTrade = currentSession?.trades?.[state.currentTradeIndex];

  // Start demo mode
  const startDemoMode = () => {
    setState({
      isPlaying: false,
      currentSessionIndex: 0,
      currentTradeIndex: 0,
      showAnswer: false,
      userGuess: null,
      score: { correct: 0, total: 0 },
      playbackSpeed: 1,
      isDemoMode: true,
    });
  };

  // Exit demo mode
  const exitDemoMode = () => {
    setState(prev => ({
      ...prev,
      isDemoMode: false,
      currentSessionIndex: 0,
      currentTradeIndex: 0,
      showAnswer: false,
      userGuess: null,
      score: { correct: 0, total: 0 },
    }));
  };

  // Reset current progress
  const resetProgress = () => {
    setState(prev => ({
      ...prev,
      currentSessionIndex: 0,
      currentTradeIndex: 0,
      showAnswer: false,
      userGuess: null,
      score: { correct: 0, total: 0 },
      isPlaying: false,
    }));
  };

  // Auto-play logic
  useEffect(() => {
    if (!state.isPlaying || !currentSession) return;

    const interval = setInterval(() => {
      handleNext();
    }, 3000 / state.playbackSpeed);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.currentSessionIndex, state.currentTradeIndex, state.playbackSpeed]);

  const handleGuess = (guess: 'buy' | 'sell' | 'hold') => {
    if (state.showAnswer || !currentTrade) return;

    const isCorrect = currentTrade.side === guess;
    setState(prev => ({
      ...prev,
      userGuess: guess,
      showAnswer: true,
      score: {
        correct: prev.score.correct + (isCorrect ? 1 : 0),
        total: prev.score.total + 1,
      },
    }));
  };

  const handleNext = () => {
    if (!currentSession) return;

    setState(prev => {
      const nextTradeIndex = prev.currentTradeIndex + 1;
      const trades = currentSession.trades || [];

      if (nextTradeIndex >= trades.length) {
        // Move to next session
        const nextSessionIndex = prev.currentSessionIndex + 1;
        if (nextSessionIndex >= activeSessions.length) {
          return { ...prev, isPlaying: false };
        }
        return {
          ...prev,
          currentSessionIndex: nextSessionIndex,
          currentTradeIndex: 0,
          showAnswer: false,
          userGuess: null,
        };
      }

      return {
        ...prev,
        currentTradeIndex: nextTradeIndex,
        showAnswer: false,
        userGuess: null,
      };
    });
  };

  const handlePrev = () => {
    setState(prev => {
      if (prev.currentTradeIndex > 0) {
        return {
          ...prev,
          currentTradeIndex: prev.currentTradeIndex - 1,
          showAnswer: false,
          userGuess: null,
        };
      }
      if (prev.currentSessionIndex > 0) {
        const prevSession = activeSessions[prev.currentSessionIndex - 1];
        return {
          ...prev,
          currentSessionIndex: prev.currentSessionIndex - 1,
          currentTradeIndex: (prevSession?.trades?.length || 1) - 1,
          showAnswer: false,
          userGuess: null,
        };
      }
      return prev;
    });
  };

  const togglePlay = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const getMarketContext = () => {
    if (!currentTrade || !currentSession) return null;

    const tradeTime = new Date(currentTrade.datetime);
    const sessionStart = new Date(currentSession.openTime);
    const isNewPosition = state.currentTradeIndex === 0;

    return {
      price: currentTrade.price,
      time: tradeTime.toLocaleString('en-US'),
      isNewPosition,
      positionSide: currentSession.side,
      currentSize:
        currentSession.trades
          ?.slice(0, state.currentTradeIndex)
          .reduce((acc, t) => acc + (t.side === 'buy' ? t.amount : -t.amount), 0) || 0,
    };
  };

  const context = getMarketContext();

  if (!sessions.length && !state.isDemoMode) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-10 text-center border border-slate-700/50">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-cyan flex items-center justify-center glow-cyan">
          <Brain className="w-10 h-10 text-black" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">No Trading Data Available</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Please connect API to fetch trading history, or use Demo Mode to experience trader
          role-play learning.
        </p>
        <button
          onClick={startDemoMode}
          className="inline-flex items-center gap-2 px-6 py-3 gradient-cyan text-black font-bold rounded-xl hover:scale-105 transition-transform glow-cyan"
        >
          <Sparkles className="w-5 h-5" />
          Start Demo Mode
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, #0A0E1A, #1A1F2E)' }}>
      {/* Demo Mode Banner */}
      {state.isDemoMode && (
        <div className="demo-banner backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-black" />
            <span className="text-black font-bold">Demo Mode</span>
            <span className="text-black/70 text-sm font-medium">
              Using sample data to demonstrate the trader role-play learning feature
            </span>
          </div>
          <button
            onClick={exitDemoMode}
            className="px-4 py-1.5 text-sm bg-black/20 hover:bg-black/30 text-black font-medium rounded-lg transition-colors border border-black/30"
          >
            Exit Demo
          </button>
        </div>
      )}

      {/* Top Status Bar */}
      <div className="status-bar backdrop-blur-sm rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="score-display px-4 py-2 rounded-xl">
              <Award className="w-5 h-5 text-black inline mr-2" />
              <span className="font-bold text-black">
                {state.score.correct}/{state.score.total}
              </span>
              <span className="text-black/80 font-medium ml-2">
                (
                {state.score.total > 0
                  ? Math.round((state.score.correct / state.score.total) * 100)
                  : 0}
                %)
              </span>
            </div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent to-black/20" />
            <div className="flex items-center gap-3 text-cyan-400">
              <Clock className="w-4 h-4" />
              <span className="text-white">
                Position{' '}
                <span className="font-bold text-cyan-400">
                  {state.currentSessionIndex + 1}/{activeSessions.length}
                </span>
              </span>
              <span className="text-black/40">·</span>
              <span className="text-white">
                Trade{' '}
                <span className="font-bold text-cyan-400">
                  {state.currentTradeIndex + 1}/{currentSession?.trades?.length || 0}
                </span>
              </span>
            </div>
            <button
              onClick={resetProgress}
              className="p-2 rounded-lg hover:bg-black/20 transition-colors text-cyan-400 hover:text-white border border-cyan-400/30"
              title="Reset Progress"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            {!state.isDemoMode && sessions.length > 0 && (
              <button
                onClick={startDemoMode}
                className="px-3 py-1.5 text-sm bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg transition-colors border border-purple-500/50 font-semibold"
              >
                Demo Mode
              </button>
            )}
            <select
              value={state.playbackSpeed}
              onChange={e => setState(prev => ({ ...prev, playbackSpeed: Number(e.target.value) }))}
              className="px-3 py-2 bg-slate-700/50 border border-cyan-500/30 rounded-xl text-sm text-white font-medium"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>

            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors text-cyan-400 hover:text-cyan-300 border border-cyan-500/30"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className={`p-3 rounded-xl transition-colors ${
                state.isPlaying
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
            >
              {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors text-cyan-400 hover:text-cyan-300 border border-cyan-500/30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Context */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/30 border border-cyan-400 glow-cyan">
              <Target className="w-5 h-5 text-cyan-300" />
            </div>
            Market Context
          </h3>

          {context && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="text-sm text-slate-400 mb-2">Current Price</div>
                  <div className="text-3xl font-bold text-white">
                    ${context.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="text-sm text-slate-400 mb-2">Time</div>
                  <div className="text-lg font-medium text-white">{context.time}</div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <div className="text-sm text-slate-400 mb-3">Current Status</div>
                <div className="flex items-center gap-4">
                  {context.isNewPosition ? (
                    <span className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-bold border border-cyan-400">
                      No Position
                    </span>
                  ) : (
                    <span
                      className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                        context.positionSide === 'long'
                          ? 'bg-green-500/30 text-green-300 border-green-400'
                          : 'bg-red-500/30 text-red-300 border-red-400'
                      }`}
                    >
                      {context.positionSide === 'long' ? 'LONG' : 'SHORT'}:{' '}
                      {Math.abs(context.currentSize).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Hint Area */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              </div>

              {showHint && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-400 mb-1">Trader's Thought Process</p>
                      <p className="text-slate-400">
                        {context.isNewPosition
                          ? 'This is the start of a new position. The trader is looking for an entry opportunity. Observe the current price action and market trend.'
                          : context.positionSide === 'long'
                            ? 'The trader holds a LONG position. They might consider adding, reducing, or holding.'
                            : 'The trader holds a SHORT position. They might consider adding, reducing, or holding.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/30 border border-purple-400 glow-purple">
              <Zap className="w-5 h-5 text-purple-300" />
            </div>
            Your Decision
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => handleGuess('buy')}
              disabled={state.showAnswer}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${
                state.showAnswer
                  ? state.userGuess === 'buy'
                    ? currentTrade?.side === 'buy'
                      ? 'result-correct'
                      : 'border-rose-500 bg-rose-500/20'
                    : currentTrade?.side === 'buy'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700'
                  : 'btn-buy hover:scale-105'
              }`}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-lg">BUY / LONG</span>
            </button>

            <button
              onClick={() => handleGuess('sell')}
              disabled={state.showAnswer}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${
                state.showAnswer
                  ? state.userGuess === 'sell'
                    ? currentTrade?.side === 'sell'
                      ? 'result-correct'
                      : 'border-rose-500 bg-rose-500/20'
                    : currentTrade?.side === 'sell'
                      ? 'border-rose-500/50 bg-rose-500/10'
                      : 'border-slate-700'
                  : 'btn-sell hover:scale-105'
              }`}
            >
              <TrendingDown className="w-6 h-6" />
              <span className="text-lg">SELL / SHORT</span>
            </button>

            <button
              onClick={() => handleGuess('hold')}
              disabled={state.showAnswer}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${
                state.showAnswer
                  ? state.userGuess === 'hold'
                    ? 'result-correct'
                    : 'border-slate-700'
                  : 'btn-hold hover:scale-105'
              }`}
            >
              <Clock className="w-6 h-6" />
              <span className="text-lg">HOLD / WAIT</span>
            </button>
          </div>

          {/* Result Display */}
          {state.showAnswer && currentTrade && (
            <div
              className={`mt-4 p-4 rounded-xl ${
                state.userGuess === currentTrade.side ? 'result-correct' : 'result-incorrect'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {state.userGuess === currentTrade.side ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-bold text-lg">CORRECT!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6" />
                    <span className="font-bold text-lg">INCORRECT</span>
                  </>
                )}
              </div>
              <div className="text-sm font-medium">
                Trader's Choice:{' '}
                <span
                  className={`font-bold ${
                    currentTrade.side === 'buy' ? 'text-black' : 'text-white'
                  }`}
                >
                  {currentTrade.side === 'buy' ? 'BUY' : 'SELL'}
                </span>{' '}
                {currentTrade.amount.toLocaleString()} @ ${currentTrade.price.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Position Details */}
      {currentSession && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-cyan-300 mb-5 flex items-center gap-2">
            <span className="text-xl">📊</span> Current Position Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-400 transition-colors">
              <div className="text-sm text-slate-400 mb-1">Side</div>
              <div
                className={`font-bold text-xl ${
                  currentSession.side === 'long' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {currentSession.side === 'long' ? 'LONG' : 'SHORT'}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-400 transition-colors">
              <div className="text-sm text-slate-400 mb-1">Max Size</div>
              <div className="font-bold text-xl text-cyan-300">
                {currentSession.maxSize.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-400 transition-colors">
              <div className="text-sm text-slate-400 mb-1">Realized PnL</div>
              <div
                className={`font-bold text-xl ${
                  currentSession.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {currentSession.realizedPnl >= 0 ? '+' : ''}
                {currentSession.realizedPnl.toFixed(4)} BTC
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-400 transition-colors">
              <div className="text-sm text-slate-400 mb-1">Trade Count</div>
              <div className="font-bold text-xl text-yellow-400">{currentSession.tradeCount}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
