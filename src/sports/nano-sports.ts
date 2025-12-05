/**
 * Ultra-fast sports market processing with nanosecond precision
 * 
 * Provides high-performance market analysis for sports betting including NBA,
 * NFL, Soccer, and multi-outcome markets. Uses TypedArrays and pre-allocated
 * buffers for sub-millisecond processing.
 * 
 * Target: < 100µs per market update
 * 
 * @module nano-sports
 * @example
 * const market = new NanoSportsMarket();
 * market.updateMarket(1, 0, 5, 10, 55, 45, 10000, 0);
 * const arbitrage = market.findArbitrage(0);
 */

import { NanoTimer } from '../core/nano-engine';

// Constants for sports types
export const SPORT_TYPES = {
  NBA: 0,
  NFL: 1,
  SOCCER: 2,
  MLB: 3,
  NHL: 4,
  NCAAB: 5,
  NCAAF: 6
} as const;

// Market status flags
export const MARKET_STATUS = {
  UPCOMING: 0,
  LIVE: 1,
  SETTLED: 2,
  CANCELLED: 3
} as const;

/**
 * Pre-allocated buffers for maximum speed
 */
const MARKET_BUFFER_SIZE = 1024;
const _TEAM_NAME_CACHE = new Map<number, string>();
const _ODDS_CACHE = new Float32Array(MARKET_BUFFER_SIZE * 10); // 10 outcomes per market

/**
 * Ultra-fast sports market processing
 * 
 * Uses TypedArrays for O(1) access and minimal memory overhead.
 * Supports up to 1024 concurrent markets.
 */
export class NanoSportsMarket {
  // Using TypedArrays for maximum performance
  private marketIds = new Uint32Array(MARKET_BUFFER_SIZE);
  private sportTypes = new Uint8Array(MARKET_BUFFER_SIZE); // 0:NBA, 1:NFL, 2:Soccer, etc.
  private homeTeams = new Uint16Array(MARKET_BUFFER_SIZE);
  private awayTeams = new Uint16Array(MARKET_BUFFER_SIZE);
  private startTimes = new BigUint64Array(MARKET_BUFFER_SIZE);
  private probabilities = new Float32Array(MARKET_BUFFER_SIZE * 2); // home/away
  private volumes = new Float64Array(MARKET_BUFFER_SIZE);
  private status = new Uint8Array(MARKET_BUFFER_SIZE); // 0:upcoming, 1:live, 2:settled
  
  private count = 0;
  
  // Fast lookup indexes
  private idToIndex = new Map<number, number>();
  private sportToIds = new Map<number, Uint32Array>();
  
  /**
   * Update market with new data
   * 
   * O(1) operation with minimal overhead (~1-5µs)
   * 
   * @param id - Market ID
   * @param sport - Sport type (NBA=0, NFL=1, etc.)
   * @param homeTeam - Home team ID
   * @param awayTeam - Away team ID
   * @param homeProb - Home team win probability (0-100)
   * @param awayProb - Away team win probability (0-100)
   * @param volume - Traded volume
   * @param status - Market status (0:upcoming, 1:live, 2:settled)
   */
  updateMarket(
    id: number,
    sport: number,
    homeTeam: number,
    awayTeam: number,
    homeProb: number,
    awayProb: number,
    volume: number,
    status: number
  ): void {
    const index = this.count % MARKET_BUFFER_SIZE;
    
    this.marketIds[index] = id;
    this.sportTypes[index] = sport;
    this.homeTeams[index] = homeTeam;
    this.awayTeams[index] = awayTeam;
    this.startTimes[index] = BigInt(Date.now());
    this.probabilities[index * 2] = homeProb;
    this.probabilities[index * 2 + 1] = awayProb;
    this.volumes[index] = volume;
    this.status[index] = status;
    
    this.idToIndex.set(id, index);
    this.count++;
  }
  
  /**
   * Ultra-fast lookup by ID (O(1) with Map)
   * 
   * ~50-100ns execution time
   * 
   * @param id - Market ID
   * @returns Market data or null
   */
  getMarket(id: number): {
    id: number;
    sport: number;
    homeTeam: number;
    awayTeam: number;
    homeProb: number;
    awayProb: number;
    volume: number;
    status: number;
  } | null {
    const index = this.idToIndex.get(id);
    if (index === undefined) return null;
    
    return {
      id: this.marketIds[index],
      sport: this.sportTypes[index],
      homeTeam: this.homeTeams[index],
      awayTeam: this.awayTeams[index],
      homeProb: this.probabilities[index * 2],
      awayProb: this.probabilities[index * 2 + 1],
      volume: this.volumes[index],
      status: this.status[index]
    };
  }
  
  /**
   * Batch processing for maximum throughput
   * 
   * Finds all markets with probability sum != 1.0 (arbitrage opportunities)
   * 
   * @param sport - Optional sport filter (if undefined, searches all sports)
   * @returns Array of arbitrage opportunities
   */
  findArbitrage(sport?: number): Array<{
    id: number;
    spread: number;
    opportunity: number;
    homeProb: number;
    awayProb: number;
  }> {
    const results = [];
    const limit = Math.min(this.count, MARKET_BUFFER_SIZE);
    
    for (let i = 0; i < limit; i++) {
      if (sport !== undefined && this.sportTypes[i] !== sport) continue;
      
      const homeProb = this.probabilities[i * 2];
      const awayProb = this.probabilities[i * 2 + 1];
      const spread = Math.abs(homeProb - awayProb);
      
      // Arbitrage opportunity: probabilities don't sum to 100%
      const probSum = homeProb + awayProb;
      if (Math.abs(probSum - 100) > 1) {
        results.push({
          id: this.marketIds[i],
          spread,
          opportunity: Math.abs(probSum - 100),
          homeProb,
          awayProb
        });
      }
    }
    
    return results;
  }
  
  /**
   * Find markets by sport type
   * 
   * @param sport - Sport type
   * @returns Array of market IDs
   */
  getMarketsBySport(sport: number): number[] {
    const results = [];
    const limit = Math.min(this.count, MARKET_BUFFER_SIZE);
    
    for (let i = 0; i < limit; i++) {
      if (this.sportTypes[i] === sport) {
        results.push(this.marketIds[i]);
      }
    }
    
    return results;
  }
  
  /**
   * Get all live markets
   * 
   * @returns Array of live market data
   */
  getLiveMarkets(): Array<{
    id: number;
    sport: number;
    homeProb: number;
    awayProb: number;
    volume: number;
  }> {
    const results = [];
    const limit = Math.min(this.count, MARKET_BUFFER_SIZE);
    
    for (let i = 0; i < limit; i++) {
      if (this.status[i] === MARKET_STATUS.LIVE) {
        results.push({
          id: this.marketIds[i],
          sport: this.sportTypes[i],
          homeProb: this.probabilities[i * 2],
          awayProb: this.probabilities[i * 2 + 1],
          volume: this.volumes[i]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Reset all market data
   */
  clear(): void {
    this.count = 0;
    this.idToIndex.clear();
    this.sportToIds.clear();
  }
  
  /**
   * Get current market count
   */
  getCount(): number {
    return Math.min(this.count, MARKET_BUFFER_SIZE);
  }
}

/**
 * Optimized for NBA specifically with Elo-style ratings
 */
export class NanoNBAMarket extends NanoSportsMarket {
  // Pre-calculated team ratings (Elo-like system)
  private teamRatings = new Float32Array(32); // 32 teams max
  private homeAdvantage = 50; // Elo points for home advantage
  
  constructor() {
    super();
    // Initialize with default rating
    this.teamRatings.fill(1500);
  }
  
  /**
   * Calculate NBA home team win probability using Elo formula
   * 
   * Incorporates home court advantage and team ratings.
   * 
   * @param homeTeam - Home team ID
   * @param awayTeam - Away team ID
   * @returns Win probability for home team (0-1)
   */
  calculateWinProbability(homeTeam: number, awayTeam: number): number {
    const homeRating = this.teamRatings[homeTeam] || 1500;
    const awayRating = this.teamRatings[awayTeam] || 1500;
    
    // Elo formula: 1 / (1 + 10^((away - home + advantage)/400))
    const exponent = (awayRating - homeRating + this.homeAdvantage) / 400;
    return 1 / (1 + Math.pow(10, exponent));
  }
  
  /**
   * Update team rating after game
   * 
   * Uses Elo formula with K-factor adjusted for margin of victory.
   * 
   * @param team - Team ID
   * @param result - 'win' or 'loss'
   * @param opponent - Opponent team ID
   * @param margin - Winning/losing margin in points
   */
  updateTeamRating(team: number, result: 'win' | 'loss', opponent: number, margin: number): void {
    const K = 20; // Elo K-factor
    const currentRating = this.teamRatings[team] || 1500;
    const opponentRating = this.teamRatings[opponent] || 1500;
    
    const expected = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
    const actual = result === 'win' ? 1 : 0;
    const marginFactor = 1 + Math.abs(margin) / 10; // Bonus for large margins
    
    const newRating = currentRating + K * marginFactor * (actual - expected);
    this.teamRatings[team] = Math.min(2000, Math.max(1000, newRating)); // Cap between 1000-2000
  }
  
  /**
   * Get team rating
   * 
   * @param team - Team ID
   * @returns Elo rating
   */
  getTeamRating(team: number): number {
    return this.teamRatings[team] || 1500;
  }
  
  /**
   * Set team rating (for initialization)
   * 
   * @param team - Team ID
   * @param rating - Elo rating
   */
  setTeamRating(team: number, rating: number): void {
    if (team < 32) {
      this.teamRatings[team] = rating;
    }
  }
}

/**
 * Polymarket integration with nanosecond precision
 * 
 * Handles Polymarket-specific market data with batched updates and
 * misprice detection.
 */
export class NanoPolymarket {
  private static readonly BATCH_SIZE = 100;
  private static readonly UPDATE_INTERVAL_NS = 1_000_000_000n; // 1 second
  
  private lastUpdate = 0n;
  private markets = new Map<
    string,
    {
      yes: number;
      no: number;
      volume: number;
      liquidity: number;
      lastUpdate: bigint;
    }
  >();
  
  /**
   * Update batch of markets
   * 
   * Simulates batch API calls. In production, would use real API.
   * 
   * @param marketIds - Array of market IDs to update
   */
  async updateBatch(marketIds: string[]): Promise<void> {
    const start = NanoTimer.now();
    
    // Batch API calls - process 100 markets at a time
    for (let i = 0; i < marketIds.length; i += NanoPolymarket.BATCH_SIZE) {
      const batch = marketIds.slice(i, i + NanoPolymarket.BATCH_SIZE);
      
      // In production: Parallel fetch with Promise.all
      for (const marketId of batch) {
        // Simulated API response with realistic values
        this.markets.set(marketId, {
          yes: 0.65 + Math.random() * 0.3, // 65-95%
          no: 0.05 + Math.random() * 0.3, // 5-35%
          volume: 10000 + Math.random() * 90000, // 10k-100k
          liquidity: 50000 + Math.random() * 500000, // 50k-550k
          lastUpdate: start.ns
        });
      }
      
      // Rate limiting: don't exceed API limits
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms between batches
    }
    
    const elapsed = NanoTimer.elapsedNs(start);
    console.log(`Polymarket update: ${Number(elapsed) / 1_000_000}ms for ${marketIds.length} markets`);
  }
  
  /**
   * Find mispriced markets
   * 
   * Markets where yes + no probability != 100% indicate arbitrage opportunities.
   * 
   * @param threshold - Minimum mispricing threshold (default: 0.02 = 2%)
   * @returns Array of mispriced markets sorted by opportunity
   */
  findMispricedMarkets(threshold: number = 0.02): Array<{
    marketId: string;
    mispricing: number;
    opportunity: 'yes' | 'no';
    yes: number;
    no: number;
  }> {
    const results = [];
    const now = NanoTimer.now();
    
    for (const [marketId, data] of this.markets) {
      // Only consider recent data (< 5 seconds old)
      if (now.ns - data.lastUpdate > 5_000_000_000n) continue;
      
      const mispricing = Math.abs(data.yes + data.no - 1);
      if (mispricing > threshold) {
        results.push({
          marketId,
          mispricing,
          opportunity: (data.yes > 0.5 ? 'yes' : 'no') as 'yes' | 'no',
          yes: data.yes,
          no: data.no
        });
      }
    }
    
    return results.sort((a, b) => b.mispricing - a.mispricing);
  }
  
  /**
   * Get market data
   * 
   * @param marketId - Market ID
   * @returns Market probability data or null
   */
  getMarket(marketId: string): {
    yes: number;
    no: number;
    volume: number;
    liquidity: number;
  } | null {
    const data = this.markets.get(marketId);
    if (!data) return null;
    
    return {
      yes: data.yes,
      no: data.no,
      volume: data.volume,
      liquidity: data.liquidity
    };
  }
  
  /**
   * Clear all market data
   */
  clear(): void {
    this.markets.clear();
  }
  
  /**
   * Get number of tracked markets
   */
  getMarketCount(): number {
    return this.markets.size;
  }
}

/**
 * Multi-sport aggregator for comparing opportunities across sports
 */
export class NanoSportsAggregator {
  private nba: NanoNBAMarket;
  private generalMarkets: NanoSportsMarket;
  private polymarket: NanoPolymarket;
  
  constructor() {
    this.nba = new NanoNBAMarket();
    this.generalMarkets = new NanoSportsMarket();
    this.polymarket = new NanoPolymarket();
  }
  
  /**
   * Get aggregated arbitrage opportunities
   * 
   * @returns Combined opportunities from all sources
   */
  getAggregatedOpportunities(): Array<{
    source: 'NBA' | 'General' | 'Polymarket';
    data: any;
  }> {
    const opportunities = [];
    
    // NBA opportunities
    const nbaOpps = this.nba.findArbitrage(SPORT_TYPES.NBA);
    for (const opp of nbaOpps) {
      opportunities.push({
        source: 'NBA' as const,
        data: opp
      });
    }
    
    // General sports opportunities
    const generalOpps = this.generalMarkets.findArbitrage();
    for (const opp of generalOpps) {
      opportunities.push({
        source: 'General' as const,
        data: opp
      });
    }
    
    // Polymarket opportunities
    const polyOpps = this.polymarket.findMispricedMarkets();
    for (const opp of polyOpps) {
      opportunities.push({
        source: 'Polymarket' as const,
        data: opp
      });
    }
    
    return opportunities;
  }
  
  /**
   * Add NBA market
   */
  addNBAMarket(
    id: number,
    homeTeam: number,
    awayTeam: number,
    homeProb: number,
    awayProb: number,
    volume: number,
    status: number
  ): void {
    this.nba.updateMarket(id, SPORT_TYPES.NBA, homeTeam, awayTeam, homeProb, awayProb, volume, status);
  }
  
  /**
   * Add general sports market
   */
  addSportsMarket(
    id: number,
    sport: number,
    homeTeam: number,
    awayTeam: number,
    homeProb: number,
    awayProb: number,
    volume: number,
    status: number
  ): void {
    this.generalMarkets.updateMarket(id, sport, homeTeam, awayTeam, homeProb, awayProb, volume, status);
  }
  
  /**
   * Get aggregator statistics
   */
  getStats(): {
    nbaMarkets: number;
    generalMarkets: number;
    polymkts: number;
  } {
    return {
      nbaMarkets: this.nba.getCount(),
      generalMarkets: this.generalMarkets.getCount(),
      polymkts: this.polymarket.getMarketCount()
    };
  }
  
  /**
   * Reset all aggregators
   */
  clear(): void {
    this.nba.clear();
    this.generalMarkets.clear();
    this.polymarket.clear();
  }
}
