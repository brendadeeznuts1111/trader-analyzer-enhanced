/**
 * BitMEX Exchange Adapter
 * Implementation of BaseExchange for BitMEX using CCXT
 */

import {
  BaseExchange,
  ExchangeCredentials,
  MarketData,
  AccountBalance,
  OrderParams,
  OrderResult,
  ExchangeConfig,
  ExchangeHealthStatus,
  ExchangeStatistics,
} from './base_exchange';
import { Order, Trade } from '../types';
import { logger } from '../logger';

/**
 * BitMEX Exchange Implementation using CCXT
 */
export class BitmexExchange implements BaseExchange {
  name = 'bitmex';
  type: 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk' = 'crypto';
  supportedMarkets = ['XBTUSD', 'ETHUSD', 'BTCUSD', 'ETHUSDT', 'XBTUSDT'];

  private credentials: ExchangeCredentials | null = null;
  private initialized = false;
  private ccxtInstance: any = null;
  private statistics: ExchangeStatistics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTimeMs: 0,
    peakResponseTimeMs: 0,
    requestsByType: {
      marketData: 0,
      trading: 0,
      account: 0,
      other: 0,
    },
    performanceTrends: {
      responseTimeTrend: 'stable',
      successRateTrend: 'stable',
    },
    lastReset: new Date().toISOString(),
    sessionDuration: '0s',
  };

  /**
   * Initialize BitMEX exchange connection
   * @param credentials Exchange credentials
   */
  async initialize(credentials: ExchangeCredentials): Promise<void> {
    try {
      if (!credentials.apiKey || !credentials.apiSecret) {
        throw new Error('BitMEX requires both API key and secret');
      }

      // Dynamically import CCXT to avoid issues in environments where it might not be available
      const ccxt = await import('ccxt');
      this.ccxtInstance = new ccxt.bitmex({
        apiKey: credentials.apiKey,
        secret: credentials.apiSecret,
        enableRateLimit: true,
        timeout: 30000,
      });

      // Test connection
      await this.ccxtInstance.fetchMarkets();
      
      this.credentials = credentials;
      this.initialized = true;
      
      logger.info('BitMEX exchange initialized successfully', {
        apiKey: credentials.apiKey?.substring(0, 8) + '...',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize BitMEX exchange', { error: errorMessage });
      throw new Error(`BitMEX initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Fetch market data for a symbol
   * @param symbol Market symbol
   * @returns Market data
   */
  async fetchMarketData(symbol: string): Promise<MarketData> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.marketData++;

      const ticker = await this.ccxtInstance.fetchTicker(symbol);
      const responseTime = Date.now() - startTime;
      
      this.updateStatistics(true, responseTime);

      return {
        symbol,
        lastPrice: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        volume: ticker.baseVolume,
        timestamp: new Date().toISOString(),
        exchangeSpecific: {
          high: ticker.high,
          low: ticker.low,
          change: ticker.change,
          percentage: ticker.percentage,
          average: ticker.average,
        },
      };
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch BitMEX market data', { symbol, error: errorMessage });
      throw new Error(`Failed to fetch market data for ${symbol}: ${errorMessage}`);
    }
  }

  /**
   * Fetch account balance
   * @returns Account balance information
   */
  async fetchBalance(): Promise<AccountBalance> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.account++;

      const balance = await this.ccxtInstance.fetchBalance();
      const responseTime = Date.now() - startTime;
      
      this.updateStatistics(true, responseTime);

      const currencies: Record<string, { total: number; available: number; reserved: number }> = {};
      
      Object.keys(balance).forEach(currency => {
        if (currency !== 'info' && currency !== 'free' && currency !== 'used' && currency !== 'total') {
          currencies[currency] = {
            total: balance[currency].total || 0,
            available: balance[currency].free || 0,
            reserved: balance[currency].used || 0,
          };
        }
      });

      return {
        total: balance.total || 0,
        available: balance.free || 0,
        used: balance.used || 0,
        currencies,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch BitMEX balance', { error: errorMessage });
      throw new Error(`Failed to fetch balance: ${errorMessage}`);
    }
  }

  /**
   * Place an order
   * @param params Order parameters
   * @returns Order result
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.trading++;

      const order = await this.ccxtInstance.createOrder(
        params.symbol,
        params.type,
        params.side,
        params.amount,
        params.price,
        {
          stopPrice: params.stopPrice,
          leverage: params.leverage,
          timeInForce: params.timeInForce,
          ...params.exchangeSpecific,
        }
      );

      const responseTime = Date.now() - startTime;
      this.updateStatistics(true, responseTime);

      return {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        amount: order.amount,
        filled: order.filled || 0,
        remaining: order.remaining || order.amount,
        price: order.price,
        status: order.status,
        timestamp: new Date(order.timestamp || Date.now()).toISOString(),
        exchangeSpecific: order.info,
      };
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to place BitMEX order', { params, error: errorMessage });
      throw new Error(`Failed to place order: ${errorMessage}`);
    }
  }

  /**
   * Fetch order history
   * @param params Optional filters
   * @returns Order history
   */
  async fetchOrderHistory(params?: any): Promise<Order[]> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.trading++;

      const orders = await this.ccxtInstance.fetchOrders(
        params?.symbol,
        params?.since,
        params?.limit,
        params
      );

      const responseTime = Date.now() - startTime;
      this.updateStatistics(true, responseTime);

      return orders.map((order: any) => ({
        orderID: order.id,
        symbol: order.symbol,
        displaySymbol: order.symbol,
        side: order.side,
        ordType: order.type,
        orderQty: order.amount,
        price: order.price,
        stopPx: order.stopPrice,
        avgPx: order.average,
        cumQty: order.filled,
        ordStatus: order.status,
        timestamp: new Date(order.timestamp || Date.now()).toISOString(),
        text: order.info?.text || '',
      }));
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch BitMEX order history', { params, error: errorMessage });
      throw new Error(`Failed to fetch order history: ${errorMessage}`);
    }
  }

  /**
   * Fetch trade history
   * @param params Optional filters
   * @returns Trade history
   */
  async fetchTradeHistory(params?: any): Promise<Trade[]> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.trading++;

      const trades = await this.ccxtInstance.fetchMyTrades(
        params?.symbol,
        params?.since,
        params?.limit,
        params
      );

      const responseTime = Date.now() - startTime;
      this.updateStatistics(true, responseTime);

      return trades.map((trade: any) => ({
        id: trade.id,
        datetime: new Date(trade.timestamp || Date.now()).toISOString(),
        symbol: trade.symbol,
        displaySymbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        amount: trade.amount,
        cost: trade.cost,
        fee: trade.fee,
        orderID: trade.order,
        execType: 'Trade',
      }));
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch BitMEX trade history', { params, error: errorMessage });
      throw new Error(`Failed to fetch trade history: ${errorMessage}`);
    }
  }

  /**
   * Check exchange health status
   * @returns Exchange health status
   */
  async checkHealth(): Promise<ExchangeHealthStatus> {
    if (!this.initialized || !this.ccxtInstance) {
      throw new Error('BitMEX exchange not initialized');
    }

    const startTime = Date.now();
    try {
      this.statistics.totalRequests++;
      this.statistics.requestsByType.other++;

      // Test basic API connectivity
      await this.ccxtInstance.fetchMarkets();
      const responseTime = Date.now() - startTime;
      
      this.updateStatistics(true, responseTime);

      return {
        status: 'online',
        circuitBreaker: 'closed',
        loadStatus: 'low',
        responseTimeMs: responseTime,
        lastChecked: new Date().toISOString(),
        errorRate: this.calculateErrorRate(),
        uptimePercentage: 99.95, // This would come from monitoring in production
        maintenanceMode: false,
        apiStatus: {
          marketData: 'operational',
          trading: 'operational',
          account: 'operational',
          websocket: 'connected',
        },
      };
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('BitMEX health check failed', { error: errorMessage });
      
      return {
        status: 'offline',
        circuitBreaker: 'open',
        loadStatus: 'critical',
        responseTimeMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        errorRate: this.calculateErrorRate(),
        uptimePercentage: 0,
        maintenanceMode: false,
        apiStatus: {
          marketData: 'down',
          trading: 'down',
          account: 'down',
          websocket: 'disconnected',
        },
      };
    }
  }

  /**
   * Get exchange statistics
   * @returns Exchange performance statistics
   */
  async getStatistics(): Promise<ExchangeStatistics> {
    // Update session duration
    const startTime = new Date(this.statistics.lastReset);
    const now = new Date();
    const durationMs = now.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    this.statistics.sessionDuration = `${hours}h ${minutes}m`;

    return this.statistics;
  }

  /**
   * Get exchange configuration
   * @returns Exchange configuration
   */
  getConfig(): ExchangeConfig {
    return {
      name: 'BitMEX',
      type: 'crypto',
      version: '1.0.0',
      environment: 'production',
      supportsTestnet: true,
      rateLimits: {
        requestsPerSecond: 10,
        ordersPerMinute: 200,
      },
      precision: {
        price: 0.5,
        amount: 0.00001,
      },
      features: {
        marginTrading: true,
        futuresTrading: true,
        spotTrading: false,
        optionsTrading: false,
        sportsTrading: false,
        p2pTrading: false,
        wsBubbles: true,
        ohlcv: true,
      },
    };
  }

  /**
   * Update statistics after each request
   * @param success Whether the request was successful
   * @param responseTime Response time in milliseconds
   */
  private updateStatistics(success: boolean, responseTime: number): void {
    if (success) {
      this.statistics.successfulRequests++;
    } else {
      this.statistics.failedRequests++;
    }

    // Update average response time
    const totalTime = this.statistics.averageResponseTimeMs * (this.statistics.successfulRequests - 1) + responseTime;
    this.statistics.averageResponseTimeMs = totalTime / this.statistics.successfulRequests;

    // Update peak response time
    if (responseTime > this.statistics.peakResponseTimeMs) {
      this.statistics.peakResponseTimeMs = responseTime;
    }

    // Update performance trends (simplified)
    const successRate = this.statistics.successfulRequests / this.statistics.totalRequests;
    this.statistics.performanceTrends.successRateTrend = successRate > 0.95 ? 'improving' : successRate > 0.9 ? 'stable' : 'degrading';
  }

  /**
   * Calculate current error rate
   * @returns Error rate as a decimal (0-1)
   */
  private calculateErrorRate(): number {
    if (this.statistics.totalRequests === 0) return 0;
    return this.statistics.failedRequests / this.statistics.totalRequests;
  }
}
