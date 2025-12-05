// src/reports/arbitrage-snapshot-enhanced.ts
import { getBunRuntimeInfo } from "@/lib/bun-utils-enhanced";
import { formatMoney } from "../../utils/formatters";

interface Opportunity {
  pair: string;
  spread: number;
  exchangeA: string;
  exchangeB: string;
  timestamp?: number;
  volume?: number;
  confidence?: number;
}

class ArbitrageOpportunity implements Opportunity {
  pair: string;
  spread: number;
  exchangeA: string;
  exchangeB: string;
  timestamp: number;
  volume: number;
  confidence: number;
  internalMetrics: {
    calculationTime: number;
    dataSource: string;
    riskScore: number;
    lastUpdated: Date;
  };
  private _debugFlag: string;

  constructor(data: Opportunity & {
    timestamp?: number;
    volume?: number;
    confidence?: number;
  }) {
    this.pair = data.pair;
    this.spread = data.spread;
    this.exchangeA = data.exchangeA;
    this.exchangeB = data.exchangeB;
    this.timestamp = data.timestamp || Date.now();
    this.volume = data.volume || Math.random() * 1000000;
    this.confidence = data.confidence || Math.random();
    this.internalMetrics = {
      calculationTime: Math.random() * 100,
      dataSource: 'live_api',
      riskScore: Math.random() * 10,
      lastUpdated: new Date()
    };
    this._debugFlag = `DEBUG_${Date.now()}`;
  }

  // Custom inspection using Bun.inspect.custom
  [Bun.inspect.custom](depth: number, options: any): string | object {
    const runtimeInfo = getBunRuntimeInfo();
    
    // Conditional display based on options.hex (for binary data simulation)
    const payloadData = options.hex 
      ? Buffer.from(this.pair).toString('hex')
      : `${this.pair} (${this.pair.length} chars)`;
    
    // Truncate arrays based on options.maxArrayLength
    const mockArray = Array.from({ length: 150 }, (_, i) => `item_${i}`);
    const arraySummary = mockArray.length > (options.maxArrayLength || 100)
      ? `[... (${mockArray.length} items total)]`
      : Bun.inspect(mockArray.slice(0, options.maxArrayLength), { ...options, depth: depth - 1 });

    // Conditional debug info based on showHidden and execution context
    const debugInfo = (options.showHidden && import.meta.path === Bun.main)
      ? `(Main script debug: ${this._debugFlag})`
      : '';

    // Sort properties if requested
    const baseObject = {
      id: this.pair.replace('/', '_'),
      status: this.spread > 1000 ? 'HIGH_VALUE' : this.spread > 500 ? 'MEDIUM' : 'LOW',
      spread: formatMoney(this.spread),
      exchanges: `${this.exchangeA} ↔ ${this.exchangeB}`,
      payload: payloadData,
      volume: this.volume > 100000 ? `${(this.volume / 1000000).toFixed(2)}M` : this.volume.toFixed(0),
      confidence: `${(this.confidence * 100).toFixed(1)}%`,
      timestamp: new Date(this.timestamp).toISOString(),
      details: arraySummary,
      runtime: runtimeInfo.isBun ? 'Bun-optimized' : 'Standard'
    };

    // Add debug info if conditions are met
    if (debugInfo) {
      (baseObject as any).debug = debugInfo;
    }

    // Add hidden metrics if showHidden is true
    if (options.showHidden) {
      (baseObject as any).metrics = this.internalMetrics;
      (baseObject as any).riskLevel = this.internalMetrics.riskScore > 7 ? 'HIGH' : 
                                   this.internalMetrics.riskScore > 4 ? 'MEDIUM' : 'LOW';
    }

    // Sort properties if requested
    if (options.sorted) {
      const sorted = {};
      Object.keys(baseObject).sort().forEach(key => {
        (sorted as any)[key] = (baseObject as any)[key];
      });
      return sorted;
    }

    return baseObject;
  }

  // Additional methods for enhanced functionality
  getProfitPotential(): number {
    return this.spread * this.confidence;
  }

  isHighValue(): boolean {
    return this.spread > 1000 && this.confidence > 0.7;
  }
}

class ArbitrageSnapshot {
  opportunities: ArbitrageOpportunity[];
  generatedAt: Date;
  metadata: {
    totalOpportunities: number;
    highValueCount: number;
    avgSpread: number;
    processingTime: number;
  };

  constructor(opportunities: Opportunity[]) {
    this.opportunities = opportunities.map(op => new ArbitrageOpportunity(op));
    this.generatedAt = new Date();
    this.metadata = {
      totalOpportunities: opportunities.length,
      highValueCount: this.opportunities.filter(op => op.isHighValue()).length,
      avgSpread: opportunities.reduce((sum, op) => sum + op.spread, 0) / opportunities.length,
      processingTime: Math.random() * 50
    };
  }

  // Custom inspection for the entire snapshot
  [Bun.inspect.custom](depth: number, options: any): string | object {
    const runtimeInfo = getBunRuntimeInfo();
    
    // Show summary or full details based on depth
    if (depth <= 1) {
      return {
        type: 'ArbitrageSnapshot',
        count: this.opportunities.length,
        highValue: this.metadata.highValueCount,
        avgSpread: formatMoney(this.metadata.avgSpread),
        generated: this.generatedAt.toISOString(),
        runtime: runtimeInfo.isBun ? 'Bun' : 'Standard'
      };
    }

    // Show full details with depth > 1
    const baseObject = {
      snapshot: {
        metadata: {
          ...this.metadata,
          avgSpread: formatMoney(this.metadata.avgSpread),
          processingTime: `${this.metadata.processingTime.toFixed(2)}ms`
        },
        generated: this.generatedAt.toISOString(),
        runtime: {
          environment: runtimeInfo.environment,
          version: runtimeInfo.version,
          optimized: runtimeInfo.isBun
        }
      },
      opportunities: this.opportunities.slice(0, options.maxArrayLength || 10)
        .map(op => Bun.inspect(op, { ...options, depth: depth - 1 }))
    };

    // Add truncation info if needed
    if (this.opportunities.length > (options.maxArrayLength || 10)) {
      (baseObject as any).truncated = {
        shown: Math.min(this.opportunities.length, options.maxArrayLength || 10),
        total: this.opportunities.length,
        remaining: this.opportunities.length - (options.maxArrayLength || 10)
      };
    }

    // Add hidden debug info
    if (options.showHidden) {
      (baseObject as any).debug = {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      };
    }

    return options.sorted ? this.sortObject(baseObject) : baseObject;
  }

  private sortObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj).sort().forEach(key => {
        (sorted as any)[key] = this.sortObject(obj[key]);
      });
      return sorted;
    }
    return obj;
  }
}

// Runtime-aware string width calculation
function getStringWidth(text: string): number {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (runtimeInfo.isBun && typeof (Bun as any).string?.width === 'function') {
    return (Bun as any).string.width(text);
  } else if (runtimeInfo.isBun && typeof (Bun as any).stringWidth === 'function') {
    return (Bun as any).stringWidth(text);
  } else {
    return text.length + (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g)?.length || 0);
  }
}

function padEnd(text: string, width: number, fillString?: string): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth >= width) return text;
  
  const padWidth = width - currentWidth;
  const pad = fillString?.repeat(Math.ceil(padWidth / fillString.length)) || ' '.repeat(padWidth);
  return text + pad.slice(0, padWidth);
}

function padStart(text: string, width: number, fillString?: string): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth >= width) return text;
  
  const padWidth = width - currentWidth;
  const pad = fillString?.repeat(Math.ceil(padWidth / fillString.length)) || ' '.repeat(padWidth);
  return pad.slice(0, padWidth) + text;
}

// Enhanced snapshot generation with custom inspection
function generateEnhancedSnapshot(opportunities: Opportunity[]): ArbitrageSnapshot {
  return new ArbitrageSnapshot(opportunities);
}

// Text-based report generation (fallback)
function generateTextSnapshot(opportunities: Opportunity[]): string {
  const runtimeInfo = getBunRuntimeInfo();
  const startTime = performance.now();
  
  let report = "🚀 Enhanced Arbitrage Snapshot\n";
  report += "================================\n\n";

  const maxPairWidth = Math.max(
    getStringWidth("Pair"),
    ...opportunities.map(op => getStringWidth(op.pair))
  );
  const maxSpreadWidth = Math.max(
    getStringWidth("Spread"),
    ...opportunities.map(op => getStringWidth(formatMoney(op.spread)))
  );
  const maxExchangeAWidth = Math.max(
    getStringWidth("Exchange A"),
    ...opportunities.map(op => getStringWidth(op.exchangeA))
  );
  const maxExchangeBWidth = Math.max(
    getStringWidth("Exchange B"),
    ...opportunities.map(op => getStringWidth(op.exchangeB))
  );

  const header = ` ${padEnd("Pair", maxPairWidth)} | ${padStart("Spread", maxSpreadWidth)} | ${padEnd("Exchange A", maxExchangeAWidth)} | ${padEnd("Exchange B", maxExchangeBWidth)} `;
  report += header + "\n";
  
  const separator = ` ${padEnd("", maxPairWidth, "-")} | ${padEnd("", maxSpreadWidth, "-")} | ${padEnd("", maxExchangeAWidth, "-")} | ${padEnd("", maxExchangeBWidth, "-")} `;
  report += separator + "\n";

  for (const op of opportunities) {
    report += ` ${padEnd(op.pair, maxPairWidth)} | ${padStart(formatMoney(op.spread), maxSpreadWidth)} | ${padEnd(op.exchangeA, maxExchangeAWidth)} | ${padEnd(op.exchangeB, maxExchangeBWidth)}\n`;
  }

  const generationTime = performance.now() - startTime;
  
  report += "\n================================\n";
  report += `Generated in ${generationTime.toFixed(2)}ms using `;
  report += runtimeInfo.isBun ? `Bun ${runtimeInfo.version} (optimized)` : 'standard JavaScript';
  report += `\nCustom inspection: ${runtimeInfo.isBun && typeof Bun?.inspect?.custom === 'symbol' ? 'Available' : 'Not available'}\n`;

  return report;
}

// Export all functions and classes
export { 
  ArbitrageOpportunity,
  ArbitrageSnapshot,
  generateEnhancedSnapshot,
  generateTextSnapshot,
  getStringWidth,
  padEnd,
  padStart
};
export type { Opportunity };

// Example usage demonstrating custom inspection
if (import.meta.main) {
  const sampleOpportunities: Opportunity[] = [
    { pair: "BTC/USD", spread: 1250.50, exchangeA: "Binance", exchangeB: "Coinbase", confidence: 0.85 },
    { pair: "ETH/USD", spread: 875.25, exchangeA: "Kraken", exchangeB: "Gemini", confidence: 0.72 },
    { pair: "🚀MOON/USD", spread: 2100.00, exchangeA: "Uniswap", exchangeB: "Sushiswap", confidence: 0.91 },
    { pair: "ビットコイン/USD", spread: 1500.00, exchangeA: "Bitflyer", exchangeB: "Zaif", confidence: 0.68 }
  ];

  console.log("=== Custom Inspection Demo ===");
  
  // Create enhanced snapshot with custom inspection
  const snapshot = generateEnhancedSnapshot(sampleOpportunities);
  
  // Demonstrate different inspection options
  console.log("\n1. Basic inspection (depth=1):");
  console.log(Bun.inspect(snapshot, { depth: 1 }));
  
  console.log("\n2. Detailed inspection (depth=3):");
  console.log(Bun.inspect(snapshot, { depth: 3 }));
  
  console.log("\n3. With showHidden=true:");
  console.log(Bun.inspect(snapshot, { depth: 2, showHidden: true }));
  
  console.log("\n4. With sorted=true:");
  console.log(Bun.inspect(snapshot, { depth: 2, sorted: true }));
  
  console.log("\n5. With hex=true (simulated binary data):");
  console.log(Bun.inspect(snapshot, { depth: 2, hex: true }));
  
  console.log("\n6. With maxArrayLength=2:");
  console.log(Bun.inspect(snapshot, { depth: 2, maxArrayLength: 2 }));
  
  console.log("\n=== Text Fallback Report ===");
  console.log(generateTextSnapshot(sampleOpportunities));
}
