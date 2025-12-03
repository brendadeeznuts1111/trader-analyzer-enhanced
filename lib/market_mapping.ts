/**
 * Market Data Mapping System
 * Provides UUID-based market identification and data normalization
 * Similar to the ORCA system reference
 */

import { v5 as uuidv5 } from 'uuid';
import { ExchangeType, SportsMarket, P2PMarket, PredictionMarket } from './types';

// Namespace for UUIDv5 hashing - fixed for market identification
const MARKET_NAMESPACE = '00000000-0000-0000-0000-000000000000';

/**
 * Market Identifier - Unique identifier for markets across exchanges
 */
export interface MarketIdentifier {
    marketId: string;          // UUIDv5 identifier
    exchange: string;         // Source exchange
    symbol: string;           // Exchange-specific symbol
    displaySymbol: string;    // Standardized display symbol
    marketType: ExchangeType; // Type of market (crypto, sports, p2p, prediction)
}

/**
 * Normalized Market Data - Standardized format for all market types
 */
export interface NormalizedMarketData {
    marketId: string;
    exchange: string;
    symbol: string;
    displaySymbol: string;
    marketType: ExchangeType;
    lastPrice: number;
    bid: number;
    ask: number;
    volume: number;
    timestamp: string;
    exchangeSpecific?: Record<string, any>;
}

/**
 * Market Mapper Class
 * Handles market identification and data normalization
 */
export class MarketMapper {
    private marketCache: Map<string, MarketIdentifier>;

    constructor() {
        this.marketCache = new Map();
    }

    /**
     * Generate UUIDv5 market identifier from market key
     * @param marketKey - Deterministic market key string
     * @returns UUIDv5 market identifier
     */
    private generateMarketId(marketKey: string): string {
        return uuidv5(marketKey, MARKET_NAMESPACE);
    }

    /**
     * Create market key from market components
     * @param components - Market identifying components
     * @returns Deterministic market key string
     */
    private createMarketKey(components: {
        exchange: string;
        symbol: string;
        marketType: ExchangeType;
    }): string {
        return `${components.exchange}-${components.symbol}-${components.marketType}`;
    }

    /**
     * Get or create market identifier
     * @param params - Market identification parameters
     * @returns MarketIdentifier with UUIDv5
     */
    public getMarketIdentifier(params: {
        exchange: string;
        symbol: string;
        displaySymbol: string;
        marketType: ExchangeType;
    }): MarketIdentifier {
        const marketKey = this.createMarketKey({
            exchange: params.exchange,
            symbol: params.symbol,
            marketType: params.marketType
        });

        // Check cache first
        if (this.marketCache.has(marketKey)) {
            return this.marketCache.get(marketKey)!;
        }

        // Create new identifier
        const marketId = this.generateMarketId(marketKey);
        const identifier: MarketIdentifier = {
            marketId,
            exchange: params.exchange,
            symbol: params.symbol,
            displaySymbol: params.displaySymbol,
            marketType: params.marketType
        };

        // Cache and return
        this.marketCache.set(marketKey, identifier);
        return identifier;
    }

    /**
     * Normalize market data to standardized format
     * @param rawData - Raw market data from exchange
     * @param exchange - Source exchange name
     * @param marketType - Type of market
     * @returns Normalized market data
     */
    public normalizeMarketData(
        rawData: any,
        exchange: string,
        marketType: ExchangeType
    ): NormalizedMarketData {
        // Get market identifier
        const symbol = rawData.symbol || rawData.displaySymbol || rawData.marketId;
        const displaySymbol = this.formatDisplaySymbol(symbol, marketType);

        const identifier = this.getMarketIdentifier({
            exchange,
            symbol,
            displaySymbol,
            marketType
        });

        // Base normalized data
        const normalized: NormalizedMarketData = {
            marketId: identifier.marketId,
            exchange,
            symbol: identifier.symbol,
            displaySymbol: identifier.displaySymbol,
            marketType,
            lastPrice: this.extractPrice(rawData, 'lastPrice', 'price', 'last'),
            bid: this.extractPrice(rawData, 'bid', 'bidPrice'),
            ask: this.extractPrice(rawData, 'ask', 'askPrice'),
            volume: this.extractVolume(rawData),
            timestamp: this.extractTimestamp(rawData),
            exchangeSpecific: this.extractExchangeSpecific(rawData, exchange, marketType)
        };

        return normalized;
    }

    /**
     * Format display symbol based on market type
     * @param symbol - Raw symbol
     * @param marketType - Market type
     * @returns Formatted display symbol
     */
    private formatDisplaySymbol(symbol: string, marketType: ExchangeType): string {
        if (marketType === 'crypto') {
            return symbol.replace('XBT', 'BTC').replace('_', '/');
        }
        return symbol;
    }

    /**
     * Extract price from various possible field names
     * @param data - Raw data object
     * @param fields - Possible field names to check
     * @returns Extracted price or 0
     */
    private extractPrice(data: any, ...fields: string[]): number {
        for (const field of fields) {
            if (data[field] !== undefined) {
                return typeof data[field] === 'number' ? data[field] : parseFloat(data[field]);
            }
        }
        return 0;
    }

    /**
     * Extract volume from data
     * @param data - Raw data object
     * @returns Extracted volume or 0
     */
    private extractVolume(data: any): number {
        const volumeFields = ['volume', 'vol', 'totalVolume', '24hVolume'];
        for (const field of volumeFields) {
            if (data[field] !== undefined) {
                return typeof data[field] === 'number' ? data[field] : parseFloat(data[field]);
            }
        }
        return 0;
    }

    /**
     * Extract timestamp from data
     * @param data - Raw data object
     * @returns ISO timestamp string
     */
    private extractTimestamp(data: any): string {
        if (data.timestamp) return data.timestamp;
        if (data.time) return data.time;
        if (data.date) return data.date;
        return new Date().toISOString();
    }

    /**
     * Extract exchange-specific data
     * @param data - Raw data object
     * @param exchange - Exchange name
     * @param marketType - Market type
     * @returns Exchange-specific data object
     */
    private extractExchangeSpecific(
        data: any,
        exchange: string,
        marketType: ExchangeType
    ): Record<string, any> {
        const specific: Record<string, any> = {};

        // Crypto exchange specific data
        if (marketType === 'crypto' && exchange === 'bitmex') {
            if (data.fundingRate) specific.fundingRate = data.fundingRate;
            if (data.openInterest) specific.openInterest = data.openInterest;
        }

        // Sports market specific data
        if (marketType === 'sports') {
            if (data.odds) specific.odds = data.odds;
            if (data.sport) specific.sport = data.sport;
            if (data.event) specific.event = data.event;
        }

        // Prediction market specific data
        if (marketType === 'prediction') {
            if (data.currentProbability) specific.currentProbability = data.currentProbability;
            if (data.resolutionDate) specific.resolutionDate = data.resolutionDate;
        }

        // P2P market specific data
        if (marketType === 'p2p') {
            if (data.paymentMethods) specific.paymentMethods = data.paymentMethods;
            if (data.escrowEnabled) specific.escrowEnabled = data.escrowEnabled;
        }

        return specific;
    }

    /**
     * Get all cached market identifiers
     * @returns Array of all cached market identifiers
     */
    public getAllMarketIdentifiers(): MarketIdentifier[] {
        return Array.from(this.marketCache.values());
    }

    /**
     * Clear market cache
     */
    public clearCache(): void {
        this.marketCache.clear();
    }
}

/**
 * Global Market Mapper Instance
 */
export const marketMapper = new MarketMapper();

/**
 * Polymarket Data Pipeline
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-INTEGRATION-POLY@0.1.0;instance-id=ORCA-PIPELINE-001}]
 * [PROPERTIES:{pipeline=fetch-sign-throttle-cache;@root:ROOT-DATA-FLOW;@transform:stream-merge;@cache:sqlite-ttl=5m}]
 * [CLASS:PolymarketPipeline][#REF:v-0.1.0.BP.PIPELINE.1.0.A.1.1.POLY.1.0]]
 */
export interface PolymarketOdds {
    yes: number;
    no: number;
    timestamp: number;
}

export interface NormalizedPolymarket {
    marketId: string;           // ORCA canonical UUID
    conditionId: string;        // Polymarket condition ID
    question: string;
    outcomes: string[];
    odds: PolymarketOdds;
    volume: number;
    liquidity: number;
    endDate: string;
    book: 'polymarket';
    clv?: number;               // Closing Line Value vs Pinnacle
    lastUpdate: number;
}

export class PolymarketPipeline {
    private cache: Map<string, NormalizedPolymarket> = new Map();
    private lastFetch: number = 0;
    private readonly cacheTTL = 300000; // 5 minutes
    private readonly baseUrl = 'https://gamma-api.polymarket.com';
    
    /**
     * Pipeline: fetch → normalize → cache
     */
    async fetchAndNormalize(): Promise<NormalizedPolymarket[]> {
        const now = Date.now();
        
        // Check cache
        if (now - this.lastFetch < this.cacheTTL && this.cache.size > 0) {
            return Array.from(this.cache.values());
        }

        try {
            const res = await fetch(`${this.baseUrl}/markets?active=true&closed=false&limit=100`, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip'
                }
            });

            if (!res.ok) {
                throw new Error(`Polymarket API error: ${res.status}`);
            }

            const data = await res.json();
            const normalized: NormalizedPolymarket[] = [];

            for (const market of data) {
                const prices = market.outcomePrices || market.outcome_prices || ['0.5', '0.5'];
                const yesPrice = parseFloat(prices[0]) || 0.5;
                const noPrice = parseFloat(prices[1]) || (1 - yesPrice);

                const entry: NormalizedPolymarket = {
                    marketId: this.generateMarketUUID(market),
                    conditionId: market.condition_id || market.conditionId || market.id,
                    question: market.question || market.title || 'Unknown',
                    outcomes: market.outcomes || ['Yes', 'No'],
                    odds: {
                        yes: yesPrice * 100,
                        no: noPrice * 100,
                        timestamp: now
                    },
                    volume: parseFloat(market.volume || '0'),
                    liquidity: parseFloat(market.liquidity || '0'),
                    endDate: market.end_date_iso || market.endDate || '',
                    book: 'polymarket',
                    lastUpdate: now
                };

                normalized.push(entry);
                this.cache.set(entry.marketId, entry);
            }

            this.lastFetch = now;
            return normalized;

        } catch (error) {
            console.error('Polymarket pipeline error:', error);
            return Array.from(this.cache.values());
        }
    }

    /**
     * Generate ORCA canonical UUID v5
     */
    private generateMarketUUID(market: any): string {
        const input = `polymarket:${market.condition_id || market.id}:${market.question || market.title}`;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const hex = Math.abs(hash).toString(16).padStart(12, '0');
        return `orca-pm-${hex.slice(0, 8)}-${hex.slice(0, 4)}-${hex.slice(0, 4)}-${hex.slice(0, 4)}-${hex.padEnd(12, '0').slice(0, 12)}`;
    }

    /**
     * Merge with existing market data
     */
    mergeWithExisting(existing: NormalizedMarketData[]): NormalizedMarketData[] {
        const polyMarkets = Array.from(this.cache.values());
        
        const converted: NormalizedMarketData[] = polyMarkets.map(pm => ({
            marketId: pm.marketId,
            exchange: 'polymarket',
            symbol: pm.conditionId,
            displaySymbol: pm.question.slice(0, 50),
            marketType: 'prediction' as ExchangeType,
            lastPrice: pm.odds.yes,
            bid: pm.odds.yes - 1,
            ask: pm.odds.yes + 1,
            volume: pm.volume,
            timestamp: new Date(pm.lastUpdate).toISOString(),
            exchangeSpecific: {
                outcomes: pm.outcomes,
                odds: pm.odds,
                liquidity: pm.liquidity,
                endDate: pm.endDate
            }
        }));

        return [...existing, ...converted];
    }

    /**
     * Get cached market by ID
     */
    getMarket(marketId: string): NormalizedPolymarket | undefined {
        return this.cache.get(marketId);
    }

    /**
     * Get pipeline stats
     */
    getStats(): { cacheSize: number; lastFetch: number; cacheTTL: number } {
        return {
            cacheSize: this.cache.size,
            lastFetch: this.lastFetch,
            cacheTTL: this.cacheTTL
        };
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.lastFetch = 0;
    }
}

/**
 * Global Polymarket Pipeline Instance
 */
export const polymarketPipeline = new PolymarketPipeline();
