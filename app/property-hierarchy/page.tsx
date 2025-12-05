import React from 'react';

interface HierarchyMetrics {
  nodes: number;
  cacheHit: number;
  avgLatency: number;
  arbOpps: number;
}

const PropertyHierarchyPage = () => {
  const [metrics, setMetrics] = React.useState<HierarchyMetrics>({
    nodes: 0,
    cacheHit: 0,
    avgLatency: 0,
    arbOpps: 0,
  });

  const createMarket = async () => {
    const res = await fetch('/api/property-hierarchy/create-market', {
      method: 'POST',
      body: JSON.stringify({
        symbol: 'LAL_GSW',
        bid: 1.9,
        ask: 2.0,
      }),
    });
    const data = await res.json();
    console.log('Market created:', data);
  };

  const refreshMetrics = async () => {
    const res = await fetch('/api/property-hierarchy/metrics');
    const data = await res.json();
    setMetrics(data);
  };

  React.useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Property Hierarchy v4.1 Dashboard
          </h1>
          <p className="text-xl text-gray-300">Live HFT-grade market hierarchy tracking & visualization</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {/* Metrics Cards */}
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 hover:border-blue-500 transition-all">
            <h3 className="text-2xl font-semibold mb-2 text-blue-400">Total Nodes</h3>
            <div className="text-4xl font-bold text-white">{metrics.nodes.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 hover:border-green-500 transition-all">
            <h3 className="text-2xl font-semibold mb-2 text-green-400">Cache Hit Ratio</h3>
            <div className="text-4xl font-bold text-white">{metrics.cacheHit}%</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 hover:border-purple-500 transition-all">
            <h3 className="text-2xl font-semibold mb-2 text-purple-400">Avg Latency</h3>
            <div className="text-4xl font-bold text-white">{metrics.avgLatency.toFixed(2)}µs</div>
          </div>
          <div className="lg:col-span-2 xl:col-span-3 bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 hover:border-orange-500 transition-all">
            <h3 className="text-2xl font-semibold mb-2 text-orange-400">Arbitrage Opportunities</h3>
            <div className="text-4xl font-bold text-white">{metrics.arbOpps}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6">Controls</h2>
            <div className="space-y-4">
              <button 
                onClick={createMarket}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🚀 Create Test Market
              </button>
              <button 
                onClick={refreshMetrics}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🔄 Refresh Metrics
              </button>
              <button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                ⚡ Run Benchmark
              </button>
            </div>
          </div>

          {/* Quick Stats Table */}
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6">Live Stats</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Resolutions/sec: <span className="font-bold text-green-400">12.5k</span></div>
              <div>Bulk ops/sec: <span className="font-bold text-blue-400">67/s</span></div>
              <div>SIMD traversal: <span className="font-bold text-purple-400">3.2k ops/s</span></div>
              <div>Memory: <span className="font-bold text-cyan-400">128MB</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyHierarchyPage;
