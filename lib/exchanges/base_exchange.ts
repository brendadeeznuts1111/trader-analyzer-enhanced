/**
 * Base Exchange Interface
 * Defines the common interface for all exchange adapters
 */

import { Order, Trade } from '../types';

export interface BaseExchange {
    /**
     * Exchange name identifier
     */
    name: string;

    /**
     * Exchange type (crypto, sports, p2p, etc.)
     */
    type: 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk';

    /**
     * Supported markets/currencies
     */
    supportedMarkets: string[];

    /**
     * Initialize exchange connection
     * @param credentials Exchange API credentials
     */
    initialize(credentials: ExchangeCredentials): Promise<void>;

    /**
     * Fetch market data for a symbol
     * @param symbol Market symbol
     * @returns Market data
     */
    fetchMarketData(symbol: string): Promise<MarketData>;

    /**
     * Fetch account balance
     * @returns Account balance information
     */
    fetchBalance(): Promise<AccountBalance>;

    /**
     * Place an order
     * @param params Order parameters
     * @returns Order result
     */
    placeOrder(params: OrderParams): Promise<OrderResult>;

    /**
     * Fetch order history
     * @param params Optional filters
     * @returns Order history
     */
    fetchOrderHistory(params?: OrderHistoryParams): Promise<Order[]>;

    /**
     * Fetch trade history
     * @param params Optional filters
     * @returns Trade history
     */
    fetchTradeHistory(params?: TradeHistoryParams): Promise<Trade[]>;

    /**
     * Get exchange configuration
     */
    getConfig(): ExchangeConfig;

    /**
     * Check exchange health status
     * @returns Exchange health status
     */
    checkHealth(): Promise<ExchangeHealthStatus>;

    /**
     * Get exchange statistics
     * @returns Exchange performance statistics
     */
    getStatistics(): Promise<ExchangeStatistics>;
}

/**
 * Exchange Credentials
 */
export interface ExchangeCredentials {
    apiKey?: string;
    apiSecret?: string;
    username?: string;
    password?: string;
    exchangeSpecific?: Record<string, any>;
}

/**
 * Market Data Interface
 */
export interface MarketData {
    symbol: string;
    lastPrice: number;
    bid: number;
    ask: number;
    volume: number;
    timestamp: string;
    exchangeSpecific?: Record<string, any>;
}

/**
 * Account Balance Interface
 */
export interface AccountBalance {
    total: number;
    available: number;
    currencies: Record<string, {
        total: number;
        available: number;
        reserved: number;
    }>;
    timestamp: string;
}

/**
 * Order Parameters
 */
export interface OrderParams {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    amount: number;
    price?: number;
    stopPrice?: number;
    leverage?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    exchangeSpecific?: Record<string, any>;
}

/**
 * Order Result
 */
export interface OrderResult {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    amount: number;
    price: number;
    status: 'open' | 'filled' | 'canceled' | 'rejected';
    timestamp: string;
    exchangeSpecific?: Record<string, any>;
}

/**
 * Order History Parameters
 */
export interface OrderHistoryParams {
    symbol?: string;
    limit?: number;
    startTime?: string;
    endTime?: string;
    status?: 'open' | 'filled' | 'canceled' | 'rejected';
}

/**
 * Trade History Parameters
 */
export interface TradeHistoryParams {
    symbol?: string;
    limit?: number;
    startTime?: string;
    endTime?: string;
}

/**
 * Exchange Configuration
 */
export interface ExchangeConfig {
    name: string;
    type: string;
    supportsTestnet: boolean;
    rateLimits: {
        requestsPerSecond: number;
        ordersPerMinute: number;
    };
    precision: {
        price: number;
        amount: number;
    };
    features: {
        marginTrading: boolean;
        futuresTrading: boolean;
        spotTrading: boolean;
        optionsTrading: boolean;
        sportsTrading: boolean;
        p2pTrading: boolean;
    };
}

/**
 * Exchange Health Status
 */
export interface ExchangeHealthStatus {
    status: 'online' | 'degraded' | 'offline' | 'maintenance';
    responseTimeMs: number;
    lastChecked: string;
    errorRate: number;
    uptimePercentage: number;
    maintenanceMode: boolean;
    apiStatus: {
        marketData: 'operational' | 'degraded' | 'down';
        trading: 'operational' | 'degraded' | 'down';
        account: 'operational' | 'degraded' | 'down';
    };
}

/**
 * Exchange Statistics
 */
export interface ExchangeStatistics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTimeMs: number;
    peakResponseTimeMs: number;
    requestsByType: {
        marketData: number;
        trading: number;
        account: number;
        other: number;
    };
    performanceTrends: {
        responseTimeTrend: 'improving' | 'stable' | 'degrading';
        successRateTrend: 'improving' | 'stable' | 'degrading';
    };
    lastReset: string;
    sessionDuration: string;
}
