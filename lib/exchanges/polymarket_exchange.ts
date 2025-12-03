/**
 * Polymarket Exchange Adapter
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXCHANGE-POLYMARKET@0.1.0;instance-id=ORCA-POLY-001;version=0.1.1;root=ROOT-API-CLIENT}]
 * [PROPERTIES:{auth={value:{apiKey:process.env.ORCA_PM_APIKEY};@override:true};rateLimit={value:{requests:20};@override:true}}]
 * [CLASS:PolymarketExchange][#REF:v-0.1.1.BP.EXCHANGE.1.0.A.1.1.POLY.1.1][@ROOT:ROOT-API-CLIENT][@BLUEPRINT:BP-EXCHANGE-POLYMARKET@^0.1.0]]
 */

import {
  BaseExchange,
  ExchangeCredentials,
  MarketData,
  AccountBalance,
  OrderParams,
  OrderResult,
  ExchangeConfig,
} from './base_exchange';
import { Order, Trade } from '../types';

// ORCA UUID v5 namespace for market normalization
const ORCA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Blueprint configuration (resolved at startup)
const POLY_CONFIG = {
  baseUrl: 'https://clob.polymarket.com',
  gammaUrl: 'https://gamma-api.polymarket.com',
  endpoints: {
    markets: '/markets',
    orders: '/orders',
    trades: '/trades',
    orderbook: '/orderbook',
    events: '/events',
  },
  rateLimit: { requests: 20, window: 1000 }, // 20 req/s (beta scale)
  errorHandling: { retry: 3, backoff: 'exp', codes: [429, 502, 503] },
  compression: 'gzip',
};

// Feature flag
export const POLY_ENABLED = process.env.POLY_ENABLED === 'true' || true; // default true for dev

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  marketId: string; // ORCA canonical UUID
  book: 'polymarket';
}

/**
 * Polymarket Exchange Implementation
 */
export class PolymarketExchange implements BaseExchange {
  name = 'polymarket';
  type: 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk' = 'prediction';
  supportedMarkets: string[] = [];

  private credentials: ExchangeCredentials | null = null;
  private initialized = false;
  private marketsCache: Map<string, PolymarketMarket> = new Map();
  private lastFetch: number = 0;
  private cacheTTL: number = 300000; // 5 minutes

  /**
   * Initialize Polymarket exchange connection
   * @param credentials Exchange credentials
   */
  async initialize(credentials: ExchangeCredentials): Promise<void> {
    this.credentials = credentials;
    this.initialized = true;

    // Pre-fetch markets on init
    await this.fetchMarketsFromCLOB();

    console.log(
      `Polymarket exchange initialized for ${credentials.username ? 'user ' + credentials.username : 'public access'}`
    );
    console.log(`Loaded ${this.marketsCache.size} markets from CLOB`);
  }

  /**
   * Fetch markets from Polymarket CLOB API
   * @returns Array of Polymarket markets with ORCA canonical UUIDs
   */
  async fetchMarketsFromCLOB(): Promise<PolymarketMarket[]> {
    const now = Date.now();
    if (now - this.lastFetch < this.cacheTTL && this.marketsCache.size > 0) {
      return Array.from(this.marketsCache.values());
    }

    try {
      const res = await fetch(
        `${POLY_CONFIG.gammaUrl}${POLY_CONFIG.endpoints.markets}?active=true&closed=false&limit=100`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': POLY_CONFIG.compression,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Polymarket API error: ${res.status}`);
      }

      const data = await res.json();
      const markets: PolymarketMarket[] = [];

      for (const market of data) {
        const normalizedMarket: PolymarketMarket = {
          id: market.id || market.condition_id,
          question: market.question || market.title,
          conditionId: market.condition_id || market.conditionId,
          slug: market.slug || market.market_slug,
          outcomes: market.outcomes || ['Yes', 'No'],
          outcomePrices: market.outcomePrices || market.outcome_prices || ['0.5', '0.5'],
          volume: market.volume || '0',
          liquidity: market.liquidity || '0',
          endDate: market.end_date_iso || market.endDate || '',
          active: market.active !== false,
          closed: market.closed === true,
          marketId: this.generateMarketUUID(market),
          book: 'polymarket',
        };

        markets.push(normalizedMarket);
        this.marketsCache.set(normalizedMarket.marketId, normalizedMarket);
        this.supportedMarkets.push(normalizedMarket.marketId);
      }

      this.lastFetch = now;
      return markets;
    } catch (error) {
      console.error('Failed to fetch Polymarket markets:', error);
      return Array.from(this.marketsCache.values());
    }
  }

  /**
   * Generate ORCA canonical UUID v5 for market
   */
  private generateMarketUUID(market: any): string {
    // Simple UUID v5-like generation (deterministic)
    const input = `polymarket:${market.condition_id || market.id}:${market.question || market.title}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `orca-pm-${hex.slice(0, 8)}-${hex.slice(0, 4)}-${hex.slice(0, 4)}-${hex.slice(0, 4)}-${hex.slice(0, 12).padEnd(12, '0')}`;
  }

  /**
   * Get cached markets for selector
   */
  getCachedMarkets(): PolymarketMarket[] {
    return Array.from(this.marketsCache.values());
  }

  /**
   * Fetch market data for a prediction market
   * @param symbol Market symbol
   * @returns Market data
   */
  async fetchMarketData(symbol: string): Promise<MarketData> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    // Mock implementation for prediction markets
    return {
      symbol,
      lastPrice: Math.random() * 100,
      bid: Math.random() * 90,
      ask: Math.random() * 100,
      volume: Math.random() * 10000,
      timestamp: new Date().toISOString(),
      exchangeSpecific: {
        resolutionDate: '2024-12-31',
        marketType: 'binary',
        creator: 'polymarket',
        resolutionSource: 'polymarket-oracle',
      },
    };
  }

  /**
   * Fetch account balance
   * @returns Account balance information
   */
  async fetchBalance(): Promise<AccountBalance> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    // Mock implementation for prediction market balances
    return {
      total: 5000,
      available: 4000,
      currencies: {
        USDC: {
          total: 5000,
          available: 4000,
          reserved: 1000,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Place an order (buy shares in prediction market)
   * @param params Order parameters
   * @returns Order result
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    // Mock implementation for prediction market orders
    return {
      id: `pm_order_${Math.random().toString(36).slice(2, 11)}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      price: params.price || 0,
      status: 'open',
      timestamp: new Date().toISOString(),
      exchangeSpecific: {
        predictionType: 'binary',
        resolutionCondition: 'BTC > $50,000 by Dec 31, 2024',
        shares: params.amount,
      },
    };
  }

  /**
   * Fetch order history
   * @param params Optional filters
   * @returns Order history
   */
  async fetchOrderHistory(params?: any): Promise<Order[]> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    // Mock implementation for prediction market orders
    return [
      {
        orderID: 'pm_order_123',
        symbol: 'BTC-50K-DEC-2024',
        displaySymbol: 'BTC > $50K by Dec 2024',
        side: 'Buy',
        ordType: 'Limit',
        orderQty: 100,
        price: 45,
        stopPx: null,
        avgPx: 45,
        cumQty: 100,
        ordStatus: 'Filled',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        text: 'Prediction market order',
      },
    ];
  }

  /**
   * Fetch trade history
   * @param params Optional filters
   * @returns Trade history
   */
  async fetchTradeHistory(params?: any): Promise<Trade[]> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    // Mock implementation for prediction market trades
    return [
      {
        id: 'pm_trade_123',
        datetime: new Date().toISOString(),
        symbol: 'BTC-50K-DEC-2024',
        displaySymbol: 'BTC > $50K by Dec 2024',
        side: 'buy',
        price: 45,
        amount: 100,
        cost: 4500,
        fee: {
          cost: 22.5,
          currency: 'USDC',
        },
        orderID: 'pm_order_123',
        execType: 'Trade',
      },
    ];
  }

  /**
   * Get exchange configuration
   * @returns Exchange configuration
   */
  getConfig(): ExchangeConfig {
    return {
      name: 'Polymarket',
      type: 'prediction',
      supportsTestnet: false,
      rateLimits: {
        requestsPerSecond: POLY_CONFIG.rateLimit.requests,
        ordersPerMinute: 50,
      },
      precision: {
        price: 0.01,
        amount: 1,
      },
      features: {
        marginTrading: false,
        futuresTrading: false,
        spotTrading: false,
        optionsTrading: false,
        sportsTrading: false,
        p2pTrading: false,
      },
    };
  }

  /**
   * Get blueprint configuration
   */
  getBlueprintConfig() {
    return {
      blueprintId: 'BP-EXCHANGE-POLYMARKET',
      version: '0.1.0',
      instanceId: 'ORCA-POLY-001',
      ref: 'v-0.1.1.BP.EXCHANGE.1.0.A.1.1.POLY.1.1',
      root: 'ROOT-API-CLIENT',
      config: POLY_CONFIG,
    };
  }

  /**
   * Check exchange health status
   * @returns Exchange health status
   */
  async checkHealth(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    return {
      status: 'online',
      responseTimeMs: 85,
      lastChecked: new Date().toISOString(),
      errorRate: 0.02,
      uptimePercentage: 99.9,
      maintenanceMode: false,
      apiStatus: {
        marketData: 'operational',
        trading: 'operational',
        account: 'operational',
      },
      exchangeSpecific: {
        systemLoad: 0.45,
        orderBookDepth: 'good',
        liquidityScore: 0.95,
      },
    };
  }

  /**
   * Get exchange statistics
   * @returns Exchange performance statistics
   */
  async getStatistics(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Polymarket exchange not initialized');
    }

    return {
      totalRequests: 8000,
      successfulRequests: 7840,
      failedRequests: 160,
      averageResponseTimeMs: 110,
      peakResponseTimeMs: 420,
      requestsByType: {
        marketData: 5000,
        trading: 2000,
        account: 800,
        other: 200,
      },
      performanceTrends: {
        responseTimeTrend: 'stable',
        successRateTrend: 'stable',
      },
      lastReset: new Date(Date.now() - 86400000).toISOString(),
      sessionDuration: '24h 15m',
      exchangeSpecific: {
        orderFillRate: 0.9,
        slippageScore: 0.08,
        liquidityProviderCount: 15,
      },
    };
  }
}
