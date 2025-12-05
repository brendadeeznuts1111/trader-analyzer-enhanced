'use client';

/**
 * 🏀 PROPERTY HIERARCHY PIPELINE - LIVE HFT VISUALIZATION
 * Nano-Sports → Arbitrage Scanner → Execution Engine → Profit Tracking
 * Real-time: SIMD scans, WebSocket updates, Live arbitrage opportunities
 * 
 * [#REF:PROPERTY-HIERARCHY-PIPELINE-V4]
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Database,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  Brain,
  Send,
  Globe,
  Shield,
  Cpu,
  RefreshCw,
  Download,
  Filter,
  X,
  Flame,
} from 'lucide-react';
import { PropertyHierarchyV4 } from '../../../lib/property-hierarchy-v4';
import { NanoSportsV4 } from '../../../exchanges/nano-sports-v4';
import type { MarketHierarchyV4, ArbitrageOpportunity } from '../../../lib/property-hierarchy-v4';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - PROPERTY HIERARCHY SPECIFIC
// ═══════════════════════════════════════════════════════════════════════════

interface HierarchyNodeData {
  label: string;
  type: 'exchange' | 'hierarchy' | 'market' | 'arbitrage' | 'execution' | 'profit';
  status: 'idle' | 'scanning' | 'arb_detected' | 'executing' | 'success' | 'error';
  icon: React.ReactNode;
  metrics: {
    marketsProcessed: number;
    arbOpportunities: number;
    avgLatencyNs: number;
    profitPotential: number;
    edge: number;
    lastScan: number;
  };
  markets?: MarketHierarchyV4[];
  opportunities?: ArbitrageOpportunity[];
  hierarchyId?: string;
}

interface HierarchyStats {
  totalMarkets: number;
  arbOpportunities: number;
  totalEdge: number;
  profitPotential: number;
  scanRate: number; // scans/sec
  activeArbs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE DATA SIMULATION (Property Hierarchy v4.0)
// ═══════════════════════════════════════════════════════════════════════════

const mockNanoSports = new NanoSportsV4();
const mockHierarchy = new PropertyHierarchyV4(mockNanoSports);

// CUSTOM HIERARCHY NODES
function HierarchyNode({ data, selected }: NodeProps<HierarchyNodeData>) {
  const statusColors = {
    idle: 'bg-slate-500',
    scanning: 'bg-blue-500 animate-pulse',
    arb_detected: 'bg-orange-500 animate-pulse',
    executing: 'bg-yellow-500 animate-pulse',
    success: 'bg-emerald-500',
    error: 'bg-red-500',
  };

  const typeColors = {
    exchange: 'border-cyan-500',
    hierarchy: 'border-blue-500',
    market: 'border-purple-500',
    arbitrage: 'border-orange-500',
    execution: 'border-yellow-500',
    profit: 'border-emerald-500',
  };

  const profitColor = data.metrics.profitPotential > 1000 ? 'text-emerald-400' : 'text-orange-400';

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 shadow-lg
        ${typeColors[data.type]} 
        ${selected ? 'ring-4 ring-white/30 scale-105' : 'hover:scale-102'}
        bg-gradient-to-r from-slate-900/95 to-slate-800/90 backdrop-blur-sm
        min-w-[200px] transition-all duration-200 cursor-pointer hover:shadow-2xl
      `}
    >
      {/* Status Ring */}
      <div
        className={`absolute -inset-1 rounded-xl opacity-75 animate-ping ${
          statusColors[data.status]
        }`}
        style={{ animationDuration: '2s' }}
      />

      {/* Status Dot */}
      <div
        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg ${statusColors[data.status]}`}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-slate-700/50 border border-slate-600">{data.icon}</div>
          <div className="text-xs font-mono bg-slate-900/50 px-2 py-1 rounded-full">
            {data.metrics.avgLatencyNs.toLocaleString()}ns
          </div>
        </div>

        {/* Label */}
        <div className="font-bold text-white text-sm mb-1 truncate">{data.label}</div>

        {/* Primary Metric */}
        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 mb-2">
          {data.metrics.marketsProcessed.toLocaleString()}
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between text-emerald-400">
            <span>Arbs:</span>
            <span>{data.metrics.arbOpportunities}</span>
          </div>
          <div className={`flex justify-between ${profitColor}`}>
            <span>Profit:</span>
            <span>${data.metrics.profitPotential.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-purple-400">
            <span>Edge:</span>
            <span>{(data.metrics.edge * 100).toFixed(2)}%</span>
          </div>
        </div>

        {/* Status */}
        <div className={`text-xs px-2 py-1 rounded-full w-fit font-mono ${
          data.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          data.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}>
          {data.status.toUpperCase().replace('_', ' ')}
        </div>
      </div>

      {/* Handles */}
      {data.type !== 'exchange' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-slate-600/50 !w-3 !h-3 !border-2 !border-slate-500/50 backdrop-blur-sm"
          style={{ left: -15 }}
        />
      )}
      {data.type !== 'profit' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-slate-600/50 !w-3 !h-3 !border-2 !border-slate-500/50 backdrop-blur-sm"
          style={{ right: -15 }}
        />
      )}
    </div>
  );
}

const nodeTypes = { hierarchy: HierarchyNode };

// ═══════════════════════════════════════════════════════════════════════════
// HIERARCHY DRILL-DOWN MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface HierarchyModalProps {
  node: Node<HierarchyNodeData> | null;
  onClose: () => void;
}

function HierarchyDrillDownModal({ node, onClose }: HierarchyModalProps) {
  const [tab, setTab] = useState<'metrics' | 'arbs' | 'logs'>('metrics');

  if (!node) return null;

  const topArbs = node.data.opportunities?.slice(0, 5) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-800/90 border border-slate-700/50 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-600">
                {node.data.icon}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white bg-gradient-to-r from-white to-slate-200 bg-clip-text">
                  {node.data.label}
                </h2>
                <p className="text-slate-400 text-sm mt-1">{node.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-700 transition-all border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-24 z-10 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-2">
          {(['metrics', 'arbs', 'logs'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-xl font-mono text-sm transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-white bg-slate-800/30 border border-slate-700'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {tab === 'metrics' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Markets Processed"
                value={node.data.metrics.marketsProcessed.toLocaleString()}
                icon={<Database className="w-6 h-6 text-cyan-400" />}
                trend="+2.4%"
              />
              <MetricCard
                label="Arbitrage Ops"
                value={node.data.metrics.arbOpportunities.toString()}
                icon={<Flame className="w-6 h-6 text-orange-400" />}
                trend="+15%"
                badge="LIVE"
              />
              <MetricCard
                label="Avg Latency"
                value={`${node.data.metrics.avgLatencyNs.toLocaleString()}ns`}
                icon={<Clock className="w-6 h-6 text-blue-400" />}
                trend="-12%"
              />
              <MetricCard
                label="Max Edge"
                value={(node.data.metrics.edge * 100).toFixed(2) + '%'}
                icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
                trend="+0.8%"
              />
              <MetricCard
                label="Profit Potential"
                value={`$${node.data.metrics.profitPotential.toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6 text-emerald-500" />}
                trend="+23%"
                gradient
              />
              <MetricCard
                label="Scan Rate"
                value="247/sec"
                icon={<Zap className="w-6 h-6 text-purple-400" />}
                trend="+5%"
              />
            </div>
          )}

          {tab === 'arbs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-400" />
                  Top Arbitrage Opportunities
                </h3>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-mono">
                  {topArbs.length} LIVE
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {topArbs.map((arb, i) => (
                  <ArbitrageCard key={i} opportunity={arb} rank={i + 1} />
                ))}
                {topArbs.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Flame className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                    <p>No arbitrage opportunities detected</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="space-y-2">
              {/* Recent logs simulation */}
              {[
                { level: 'info' as const, message: 'SIMD scan completed: 10,247 markets', time: '14:23:45' },
                { level: 'arb_detected' as const, message: 'HIGH EDGE: LAL_GSW_0012 (2.34%)', time: '14:23:42' },
                { level: 'success' as const, message: 'Arb executed: $23.40 profit locked', time: '14:23:40' },
              ].map((log, i) => (
                <LogRow key={i} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50 bg-slate-900/50">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
            <Zap className="w-4 h-4" />
            Execute Best Arb
          </button>
        </div>
      </div>
    </div>
  );
}

// Supporting Components
function MetricCard({ label, value, icon, trend, badge, gradient = false }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  badge?: string;
  gradient?: boolean;
}) {
  return (
    <div className="group relative p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all hover:bg-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-xl bg-slate-900/50">{icon}</div>
        {badge && (
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-2xl font-black ${gradient ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
      <div className="text-xs text-emerald-400 mt-1 font-mono">{trend}</div>
    </div>
  );
}

function ArbitrageCard({ opportunity, rank }: { opportunity: ArbitrageOpportunity; rank: number }) {
  return (
    <div className="group p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-emerald-500/10 border border-orange-500/30 hover:border-orange-400 transition-all hover:shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-lg">
            #{rank}
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-white truncate max-w-[200px]">
              {opportunity.marketId}
            </div>
            <div className="text-xs text-slate-400">NBA • Live</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold text-emerald-400`}>
            ${opportunity.profitPotential.toFixed(0)}
          </div>
          <div className="text-xs text-slate-400">{(opportunity.edge * 100).toFixed(2)}% edge</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
        <div>H: {opportunity.homeOdds.toFixed(3)}</div>
        <div>A: {opportunity.awayOdds.toFixed(3)}</div>
        <div>Vig: {opportunity.vig.toFixed(3)}</div>
      </div>
    </div>
  );
}

function LogRow({ log }: { log: { level: string; message: string; time: string } }) {
  const levelColors: Record<string, string> = {
    info: 'text-blue-400',
    success: 'text-emerald-400',
    'arb_detected': 'text-orange-400',
    error: 'text-red-400',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-700/20 transition-all">
      <div className={`px-2 py-1 rounded-full text-xs font-mono ${levelColors[log.level]} bg-slate-900/50`}>
        {log.level.toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="text-sm text-white font-mono">{log.message}</div>
        <div className="text-xs text-slate-500 mt-1 font-mono">{log.time}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PropertyHierarchyPipeline() {
  const [selectedNode, setSelectedNode] = useState<Node<HierarchyNodeData> | null>(null);
  const [stats, setStats] = useState<HierarchyStats>({
    totalMarkets: 0,
    arbOpportunities: 0,
    totalEdge: 0,
    profitPotential: 0,
    scanRate: 0,
    activeArbs: 0,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Live updating nodes (simulating Property Hierarchy v4.0)
  const nodes: Node<HierarchyNodeData>[] = useMemo(() => [
    // Exchange Layer
    {
      id: 'nano-sports',
      type: 'hierarchy',
      position: { x: 100, y: 150 },
      data: {
        label: 'NanoSports v4.0',
        type: 'exchange',
        status: 'scanning',
        icon: <Zap className="w-5 h-5 text-cyan-400" />,
        metrics: {
          marketsProcessed: 10247,
          arbOpportunities: 156,
          avgLatencyNs: 1247,
          profitPotential: 23450,
          edge: 0.0234,
          lastScan: Date.now(),
        },
      },
    },

    // Hierarchy Engine
    {
      id: 'hierarchy-engine',
      type: 'hierarchy',
      position: { x: 350, y: 100 },
      data: {
        label: 'Hierarchy v4.0',
        type: 'hierarchy',
        status: 'success',
        icon: <Brain className="w-5 h-5 text-blue-400" />,
        metrics: {
          marketsProcessed: 10247,
          arbOpportunities: 156,
          avgLatencyNs: 847,
          profitPotential: 23450,
          edge: 0.0234,
          lastScan: Date.now(),
        },
      },
    },

    // Market Processing
    {
      id: 'market-processor',
      type: 'hierarchy',
      position: { x: 350, y: 220 },
      data: {
        label: 'Market Scanner',
        type: 'market',
        status: 'scanning',
        icon: <Cpu className="w-5 h-5 text-purple-400" />,
        metrics: {
          marketsProcessed: 10247,
          arbOpportunities: 156,
          avgLatencyNs: 1247,
          profitPotential: 0,
          edge: 0,
          lastScan: Date.now(),
        },
      },
    },

    // Arbitrage Detection
    {
      id: 'arb-detector',
      type: 'hierarchy',
      position: { x: 620, y: 160 },
      data: {
        label: 'SIMD Arbitrage',
        type: 'arbitrage',
        status: 'arb_detected',
        icon: <Flame className="w-5 h-5 text-orange-400" />,
        metrics: {
          marketsProcessed: 10247,
          arbOpportunities: 156,
          avgLatencyNs: 2100,
          profitPotential: 23450,
          edge: 0.0234,
          lastScan: Date.now(),
        },
        opportunities: [
          { marketId: 'LAL_GSW_0012', homeOdds: 1.92, awayOdds: 1.98, vig: 0.047, edge: 0.0234, profitPotential: 2340 },
          { marketId: 'NYK_BKN_0456', homeOdds: 1.95, awayOdds: 1.96, vig: 0.045, edge: 0.0218, profitPotential: 2180 },
        ],
      },
    },

    // Execution Engine
    {
      id: 'execution-engine',
      type: 'hierarchy',
      position: { x: 850, y: 120 },
      data: {
        label: 'HFT Executor',
        type: 'execution',
        status: 'executing',
        icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
        metrics: {
          marketsProcessed: 12,
          arbOpportunities: 3,
          avgLatencyNs: 8500,
          profitPotential: 1560,
          edge: 0.023,
          lastScan: Date.now(),
        },
      },
    },

    // Profit Tracking
    {
      id: 'profit-tracker',
      type: 'hierarchy',
      position: { x: 850, y: 240 },
      data: {
        label: 'Profit $23,450',
        type: 'profit',
        status: 'success',
        icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
        metrics: {
          marketsProcessed: 156,
          arbOpportunities: 156,
          avgLatencyNs: 420,
          profitPotential: 23450,
          edge: 0.0234,
          lastScan: Date.now(),
        },
      },
    },
  ], []);

  const edges: Edge[] = useMemo(() => [
    { id: 'exchange-hierarchy', source: 'nano-sports', target: 'hierarchy-engine', 
      type: 'smoothstep', animated: true, style: { stroke: '#06b6d4' }, 
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#06b6d4' } },
    
    { id: 'hierarchy-market', source: 'hierarchy-engine', target: 'market-processor', 
      type: 'smoothstep', animated: true, style: { stroke: '#8b5cf6' }, 
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#8b5cf6' } },
    
    { id: 'market-arb', source: 'market-processor', target: 'arb-detector', 
      type: 'smoothstep', animated: true, style: { stroke: '#f59e0b' }, 
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#f59e0b' } },
    
    { id: 'arb-execution', source: 'arb-detector', target: 'execution-engine', 
      type: 'smoothstep', animated: true, style: { stroke: '#eab308' }, 
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#eab308' } },
    
    { id: 'execution-profit', source: 'execution-engine', target: 'profit-tracker', 
      type: 'smoothstep', animated: true, style: { stroke: '#10b981' }, 
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#10b981' } },
  ], []);

  const [nodesState, setNodesState, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(edges);

  // Live metrics updates (Property Hierarchy simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setNodesState(nds => nds.map(node => {
        const markets = (node.data as HierarchyNodeData).metrics.marketsProcessed + Math.floor(Math.random() * 50);
        const arbs = node.data.type === 'arbitrage' ? Math.floor(Math.random() * 10) + 140 : node.data.metrics.arbOpportunities;
        const latency = 500 + Math.floor(Math.random() * 1000);
        
        return {
          ...node,
          data: {
            ...node.data,
            metrics: {
              ...node.data.metrics,
              marketsProcessed: markets,
              arbOpportunities: arbs,
              avgLatencyNs: latency,
              profitPotential: markets * 0.0023, // 0.23% avg edge
              edge: 0.0234 + (Math.random() - 0.5) * 0.001,
              lastScan: Date.now(),
            } as any,
          },
        };
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Node click handler
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<HierarchyNodeData>) => {
    setSelectedNode(node);
  }, []);

  if (!isClient) {
    return (
      <div className="glass rounded-2xl p-12 text-center" style={{ height: 500 }}>
        <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
        <p className="text-xl text-slate-400 font-semibold">Loading HFT Pipeline...</p>
        <p className="text-slate-500 mt-2">Property Hierarchy v4.0 + NanoSports Live</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HFT Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass p-6 rounded-2xl col-span-2">
          <div className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            $23,450
          </div>
          <div className="text-emerald-400 text-sm font-mono">Realized P&L Today</div>
          <div className="text-xs text-slate-500 mt-1">+2.34% avg edge • 156 executions</div>
        </div>
        
        <MetricCardMini
          label="Markets/sec"
          value="10.2k"
          trend="+12%"
          icon={<Cpu className="w-6 h-6 text-blue-400" />}
        />
        <MetricCardMini
          label="Arbs Found"
          value="247"
          trend="+18%"
          icon={<Flame className="w-6 h-6 text-orange-400" />}
          badge="LIVE"
        />
        <MetricCardMini
          label="Latency"
          value="1.2μs"
          trend="-8%"
          icon={<Clock className="w-6 h-6 text-purple-400" />}
        />
        <MetricCardMini
          label="Fill Rate"
          value="98.7%"
          trend="+1.2%"
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
        />
        <MetricCardMini
          label="ROI"
          value="2.34%"
          trend="+0.8%"
          icon={<DollarSign className="w-6 h-6 text-emerald-500" />}
          gradient
        />
      </div>

      {/* Live Pipeline */}
      <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50" style={{ height: 600 }}>
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          maxZoom={1.5}
          minZoom={0.3}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          defaultViewport={{ x: 100, y: 100, zoom: 0.8 }}
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="!bg-slate-900/80 !backdrop-blur-sm !border-slate-700 !rounded-2xl" />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={node => {
              const status = (node.data as HierarchyNodeData)?.status;
              const colors = {
                scanning: '#3b82f6',
                'arb_detected': '#f59e0b',
                executing: '#eab308',
                success: '#10b981',
                error: '#ef4444',
              };
              return colors[status as keyof typeof colors] || '#64748b';
            }}
            nodeStrokeColor={node => {
              const type = (node.data as HierarchyNodeData)?.type;
              const colors = {
                exchange: '#06b6d4',
                hierarchy: '#8b5cf6',
                arbitrage: '#f59e0b',
                profit: '#10b981',
              };
              return colors[type as keyof typeof colors] || '#475569';
            }}
            className="!bg-slate-900/90 !backdrop-blur-sm !border-slate-700 !rounded-2xl"
          />
        </ReactFlow>
      </div>

      {/* Pipeline Legend */}
      <div className="flex items-center justify-center gap-8 text-sm bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
          <span className="text-slate-300">Exchange</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
          <span className="text-slate-300">Hierarchy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500" />
          <span className="text-slate-300">Arbitrage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <span className="text-slate-300">Profit</span>
        </div>
      </div>

      {/* Drill-down modal */}
      <HierarchyDrillDownModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}

// Mini metric cards for stats bar
function MetricCardMini({ label, value, trend, icon, badge, gradient = false }: {
  label: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  badge?: string;
  gradient?: boolean;
}) {
  return (
    <div className="glass p-4 rounded-2xl relative group hover:scale-105 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-600/50">{icon}</div>
        {badge && (
          <span className="px-2 py-1 bg-emerald-500/30 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/50">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-xl font-black ${gradient ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      <div className="text-xs text-emerald-400 font-mono">{trend}</div>
    </div>
  );
}

export default PropertyHierarchyPipeline;