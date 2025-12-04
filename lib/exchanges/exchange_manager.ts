/**
 * Exchange Manager
 * Handles multiple exchange connections and routing
 */

import { BaseExchange, ExchangeCredentials } from './base_exchange';
import { BitmexExchange } from './bitmex_exchange';
import { PolymarketExchange } from './polymarket_exchange';
import { KalshiExchange } from './kalshi_exchange';
import { SportsTradingExchange } from './sports_exchange';

/**
 * Exchange Manager Class
 */
export class ExchangeManager {
  private exchanges: Map<string, BaseExchange>;
  private activeExchange: string | null;
  private initialized: boolean;

  constructor() {
    this.exchanges = new Map();
    this.activeExchange = null;
    this.initialized = false;
  }

  /**
   * Initialize exchange manager with default exchanges
   */
  public initialize(): void {
    if (this.initialized) return;

    // Register default exchanges
    this.registerExchange('bitmex', new BitmexExchange());
    this.registerExchange('polymarket', new PolymarketExchange());
    this.registerExchange('kalshi', new KalshiExchange());
    this.registerExchange('sports', new SportsTradingExchange());

    this.initialized = true;
  }

  /**
   * Register a new exchange
   * @param name Exchange name
   * @param exchange Exchange instance
   */
  public registerExchange(name: string, exchange: BaseExchange): void {
    this.exchanges.set(name.toLowerCase(), exchange);
  }

  /**
   * Get available exchanges
   * @returns List of available exchange names
   */
  public getAvailableExchanges(): string[] {
    return Array.from(this.exchanges.keys());
  }

  /**
   * Set active exchange
   * @param exchangeName Exchange name
   * @param credentials Exchange credentials
   */
  public async setActiveExchange(
    exchangeName: string,
    credentials?: ExchangeCredentials
  ): Promise<void> {
    const normalizedName = exchangeName.toLowerCase();
    const exchange = this.exchanges.get(normalizedName);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not found`);
    }

    // If no credentials provided, try to get from secure storage
    let finalCredentials = credentials;
    if (!finalCredentials) {
      try {
        const { secrets } = await import('bun');
        const apiKey = await secrets.get({
          service: 'trader-analyzer',
          name: `${exchangeName.toLowerCase()}-api-key`,
        });
        if (apiKey) {
          finalCredentials = { apiKey };
        }
      } catch {
        // Fallback to environment variables
        const envApiKey =
          process.env[`${exchangeName.toUpperCase()}_API_KEY`] ||
          process.env[`ORCA_${exchangeName.toUpperCase()}_APIKEY`];
        if (envApiKey) {
          finalCredentials = { apiKey: envApiKey };
        }
      }
    }

    if (!finalCredentials) {
      throw new Error(
        `No credentials found for exchange ${exchangeName}. Please configure API key.`
      );
    }

    await exchange.initialize(finalCredentials);
    this.activeExchange = normalizedName;
  }

  /**
   * Get active exchange
   * @returns Active exchange instance
   */
  public getActiveExchange(): BaseExchange {
    if (!this.activeExchange) {
      throw new Error('No active exchange set');
    }

    const exchange = this.exchanges.get(this.activeExchange);
    if (!exchange) {
      throw new Error(`Active exchange ${this.activeExchange} not found`);
    }

    return exchange;
  }

  /**
   * Get exchange by name
   * @param exchangeName Exchange name
   * @returns Exchange instance
   */
  public getExchange(exchangeName: string): BaseExchange {
    const normalizedName = exchangeName.toLowerCase();
    const exchange = this.exchanges.get(normalizedName);

    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not found`);
    }

    return exchange;
  }

  /**
   * Fetch market data from active exchange
   * @param symbol Market symbol
   * @returns Market data
   */
  public async fetchMarketData(symbol: string): Promise<import('./base_exchange').MarketData> {
    const exchange = this.getActiveExchange();
    return exchange.fetchMarketData(symbol);
  }

  /**
   * Fetch account balance from active exchange
   * @returns Account balance
   */
  public async fetchBalance(): Promise<import('./base_exchange').AccountBalance> {
    const exchange = this.getActiveExchange();
    return exchange.fetchBalance();
  }

  /**
   * Place order on active exchange
   * @param params Order parameters
   * @returns Order result
   */
  public async placeOrder(params: import('./base_exchange').OrderParams): Promise<import('./base_exchange').OrderResult> {
    const exchange = this.getActiveExchange();
    return exchange.placeOrder(params);
  }

  /**
   * Get exchange configuration
   * @param exchangeName Exchange name
   * @returns Exchange configuration
   */
  public getExchangeConfig(exchangeName: string): import('./base_exchange').ExchangeConfig {
    const exchange = this.getExchange(exchangeName);
    return exchange.getConfig();
  }

  /**
   * Get all exchange configurations
   * @returns Map of exchange names to configurations
   */
  public getAllExchangeConfigs(): Map<string, import('./base_exchange').ExchangeConfig> {
    const configs = new Map<string, import('./base_exchange').ExchangeConfig>();
    this.exchanges.forEach((exchange, name) => {
      configs.set(name, exchange.getConfig());
    });
    return configs;
  }

  /**
   * Check if exchange manager is initialized
   * @returns True if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check health status of all exchanges
   * @returns Map of exchange names to health status
   */
  public async checkAllExchangeHealth(): Promise<Map<string, import('./base_exchange').ExchangeHealthStatus>> {
    const healthStatus = new Map<string, import('./base_exchange').ExchangeHealthStatus>();
    for (const [name, exchange] of this.exchanges) {
      try {
        const status = await exchange.checkHealth();
        healthStatus.set(name, status);
      } catch (error) {
        healthStatus.set(name, {
          status: 'offline',
          responseTimeMs: 0,
          lastChecked: new Date().toISOString(),
          errorRate: 1,
          uptimePercentage: 0,
          maintenanceMode: false,
          apiStatus: {
            marketData: 'down',
            trading: 'down',
            account: 'down'
          },
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return healthStatus;
  }

  /**
   * Get statistics for all exchanges
   * @returns Map of exchange names to statistics
   */
  public async getAllExchangeStatistics(): Promise<Map<string, any>> {
    const statistics = new Map<string, any>();
    for (const [name, exchange] of this.exchanges) {
      try {
        const stats = await exchange.getStatistics();
        statistics.set(name, stats);
      } catch (error) {
        statistics.set(name, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return statistics;
  }

  /**
   * Get exchange by name with health check
   * @param exchangeName Exchange name
   * @returns Exchange instance with health status
   */
  public async getExchangeWithHealth(
    exchangeName: string
  ): Promise<{ exchange: any; health: any }> {
    const exchange = this.getExchange(exchangeName);
    const health = await exchange.checkHealth();
    return { exchange, health };
  }
}

/**
 * Global Exchange Manager Instance
 */
export const exchangeManager = new ExchangeManager();
