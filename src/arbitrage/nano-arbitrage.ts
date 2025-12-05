/**
 * Regional arbitrage engine with nanosecond precision
 * Target: < 50µs per arbitrage calculation
 */

import { NanoTimer } from '../core/nano-engine';

interface NanoPrice {
  exchange: string;
  price: number;
  volume: number;
  timestamp: bigint;
  region: number; // 0:Asia, 1:Europe, 2:US, 3:Global
}

export class NanoArbitrage {
  // Circular buffer for high-frequency price updates
  private static readonly PRICE_BUFFER_SIZE = 10000;
  private priceBuffer = new Array<NanoPrice>(NanoArbitrage.PRICE_BUFFER_SIZE);
  private writeIndex = 0;
  private readIndex = 0;
  
  // Exchange latency tracking (in nanoseconds)
  private exchangeLatency = new Map<string, bigint>();
  
  // Region mapping for fast lookups
  private asiaPrices = new Map<string, NanoPrice>();
  private europePrices = new Map<string, NanoPrice>();
  private usPrices = new Map<string, NanoPrice>();
  private globalPrices = new Map<string, NanoPrice>();
  
  updatePrice(
    asset: string,
    exchange: string,
    price: number,
    volume: number,
    region: number
  ): void {
    const priceEntry: NanoPrice = {
      exchange,
      price,
      volume,
      timestamp: NanoTimer.now().ns,
      region
    };
    
    // Write to circular buffer
    this.priceBuffer[this.writeIndex % NanoArbitrage.PRICE_BUFFER_SIZE] = priceEntry;
    this.writeIndex++;
    
    // Update region-specific cache
    switch (region) {
      case 0: this.asiaPrices.set(`${asset}:${exchange}`, priceEntry); break;
      case 1: this.europePrices.set(`${asset}:${exchange}`, priceEntry); break;
      case 2: this.usPrices.set(`${asset}:${exchange}`, priceEntry); break;
      case 3: this.globalPrices.set(`${asset}:${exchange}`, priceEntry); break;
    }
  }
  
  // Find arbitrage opportunities with sub-millisecond latency
  findArbitrage(asset: string, minSpread: number = 0.001): Array<{
    buyAt: string;
    sellAt: string;
    spread: number;
    profit: number;
    latency: bigint;
    region: string;
  }> {
    const start = NanoTimer.now();
    const results = [];
    const now = start.ns;
    
    // Get all prices for this asset across regions
    const allPrices: Array<{exchange: string; price: number; region: number}> = [];
    
    // Asia
    for (const [key, price] of this.asiaPrices) {
      if (key.startsWith(`${asset}:`) && now - price.timestamp < 1_000_000_000n) { // < 1s old
        allPrices.push({ exchange: price.exchange, price: price.price, region: 0 });
      }
    }
    
    // Europe
    for (const [key, price] of this.europePrices) {
      if (key.startsWith(`${asset}:`) && now - price.timestamp < 1_000_000_000n) {
        allPrices.push({ exchange: price.exchange, price: price.price, region: 1 });
      }
    }
    
    // US
    for (const [key, price] of this.usPrices) {
      if (key.startsWith(`${asset}:`) && now - price.timestamp < 1_000_000_000n) {
        allPrices.push({ exchange: price.exchange, price: price.price, region: 2 });
      }
    }
    
    // Global
    for (const [key, price] of this.globalPrices) {
      if (key.startsWith(`${asset}:`) && now - price.timestamp < 1_000_000_000n) {
        allPrices.push({ exchange: price.exchange, price: price.price, region: 3 });
      }
    }
    
    // Compare all pairs for arbitrage (O(n^2) but n is small)
    for (let i = 0; i < allPrices.length; i++) {
      for (let j = 0; j < allPrices.length; j++) {
        if (i === j) continue;
        
        const buyPrice = allPrices[i].price;
        const sellPrice = allPrices[j].price;
        const spread = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        if (spread > minSpread) {
          const profit = sellPrice - buyPrice;
          const regionPair = this.getRegionPair(allPrices[i].region, allPrices[j].region);
          
          results.push({
            buyAt: allPrices[i].exchange,
            sellAt: allPrices[j].exchange,
            spread,
            profit,
            latency: this.exchangeLatency.get(allPrices[i].exchange) || 0n,
            region: regionPair
          });
        }
      }
    }
    
    // Sort by profit and limit results
    return results
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10); // Top 10 opportunities
  }
  
  private getRegionPair(region1: number, region2: number): string {
    const regions = ['Asia', 'Europe', 'US', 'Global'];
    return `${regions[region1]}-${regions[region2]}`;
  }
  
  // Calculate latency between exchanges (network ping simulation)
  async measureLatency(exchange1: string, exchange2: string): Promise<bigint> {
    const start = NanoTimer.now();
    
    // Simulate network latency
    await Bun.sleep(1 + Math.random() * 4); // 1-5ms
    
    const end = NanoTimer.now();
    const latency = end.ns - start.ns;
    
    this.exchangeLatency.set(`${exchange1}:${exchange2}`, latency);
    return latency;
  }
  
  // Batch processing for multiple assets
  batchFindArbitrage(
    assets: string[],
    minSpread: number = 0.001
  ): Map<string, Array<{
    buyAt: string;
    sellAt: string;
    spread: number;
    profit: number;
  }>> {
    const results = new Map();
    
    for (const asset of assets) {
      const opportunities = this.findArbitrage(asset, minSpread);
      if (opportunities.length > 0) {
        results.set(asset, opportunities);
      }
    }
    
    return results;
  }
}

// Ultra-fast cross-region arbitrage with fee calculation
export class CrossRegionArbitrage extends NanoArbitrage {
  // Exchange fees by region (percentage)
  private static readonly FEES = {
    asia: 0.001, // 0.1%
    europe: 0.0015, // 0.15%
    us: 0.002, // 0.2%
    global: 0.003 // 0.3%
  };
  
  // Transfer times between regions (in nanoseconds)
  private static readonly TRANSFER_TIMES = {
    'Asia-Europe': 200_000_000n, // 200ms
    'Asia-US': 300_000_000n, // 300ms
    'Europe-US': 150_000_000n, // 150ms
    'Global-Asia': 100_000_000n, // 100ms
    'Global-Europe': 100_000_000n, // 100ms
    'Global-US': 100_000_000n // 100ms
  };
  
  calculateNetProfit(
    buyPrice: number,
    sellPrice: number,
    buyRegion: string,
    sellRegion: string,
    amount: number
  ): number {
    const buyFee = (CrossRegionArbitrage.FEES as any)[buyRegion] || 0.002;
    const sellFee = (CrossRegionArbitrage.FEES as any)[sellRegion] || 0.002;
    
    const grossProfit = (sellPrice - buyPrice) * amount;
    const fees = (buyPrice * buyFee + sellPrice * sellFee) * amount;
    
    return grossProfit - fees;
  }
  
  getTransferTime(fromRegion: string, toRegion: string): bigint {
    const key = `${fromRegion}-${toRegion}`;
    const reverseKey = `${toRegion}-${fromRegion}`;
    
    return (CrossRegionArbitrage.TRANSFER_TIMES as any)[key] || 
           (CrossRegionArbitrage.TRANSFER_TIMES as any)[reverseKey] ||
           500_000_000n; // Default 500ms
  }
  
  // Find time-sensitive arbitrage (accounting for transfer times)
  findTimeSensitiveArbitrage(
    asset: string,
    executionWindow: number = 1000 // milliseconds
  ): Array<{
    buyAt: string;
    sellAt: string;
    spread: number;
    netProfit: number;
    timeToExecute: number;
    risk: 'low' | 'medium' | 'high';
  }> {
    const opportunities = this.findArbitrage(asset, 0.001);
    const results = [];
    
    for (const opp of opportunities) {
      const [buyRegion, sellRegion] = opp.region.split('-');
      const transferTime = Number(this.getTransferTime(buyRegion, sellRegion)) / 1_000_000; // Convert to ms
      
      if (transferTime <= executionWindow) {
        const netProfit = this.calculateNetProfit(
          opp.profit / (opp.spread / 100), // Estimate buy price
          opp.profit / (opp.spread / 100) * (1 + opp.spread / 100), // Estimate sell price
          buyRegion,
          sellRegion,
          1000 // Example: $1000 position
        );
        
        let risk: 'low' | 'medium' | 'high' = 'medium';
        if (opp.spread > 2) risk = 'high';
        if (opp.spread < 0.5) risk = 'low';
        
        results.push({
          ...opp,
          netProfit,
          timeToExecute: transferTime,
          risk
        });
      }
    }
    
    return results.sort((a, b) => b.netProfit - a.netProfit);
  }
}
