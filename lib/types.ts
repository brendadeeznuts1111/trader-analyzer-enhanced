// ============ Symbol Mapping ============
/**
 * Maps exchange symbols to standardized format
 * XBT -> BTC conversion for BitMEX compatibility
 */
const SYMBOL_MAP: Record<string, string> = {
    'XBTUSD': 'BTCUSD',
    'XBTUSDT': 'BTCUSDT',
    'ETHUSD': 'ETHUSD',
    'ETHUSDT': 'ETHUSDT',
};

// ============ Exchange Types ============

/**
 * Exchange Type enum
 */
export type ExchangeType = 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk';

/**
 * Exchange Configuration Interface
 */
export interface ExchangeConfiguration {
    name: string;
    type: ExchangeType;
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
 * Sports Market Interface
 */
export interface SportsMarket {
    symbol: string;
    displayName: string;
    sport: string;
    event: string;
    year: string;
    region: string;
    marketType: string;
    odds: number;
    volume: number;
    tradingDesk: string;
}

/**
 * P2P Market Interface
 */
export interface P2PMarket {
    symbol: string;
    baseCurrency: string;
    quoteCurrency: string;
    paymentMethods: string[];
    escrowEnabled: boolean;
    traderRating: number;
    minAmount: number;
    maxAmount: number;
}

/**
 * Prediction Market Interface
 */
export interface PredictionMarket {
    symbol: string;
    displayName: string;
    resolutionDate: string;
    marketType: 'binary' | 'scalar';
    creator: string;
    resolutionSource: string;
    currentProbability: number;
    volume: number;
}

/**
 * Converts exchange symbols to display format (XBT -> BTC)
 * @param symbol - Exchange symbol (e.g., XBTUSD)
 * @returns Display symbol (e.g., BTCUSD)
 */
export function formatSymbol(symbol: string): string {
    return SYMBOL_MAP[symbol] || symbol.replace('XBT', 'BTC');
}

/**
 * Converts display symbols to exchange format (BTC -> XBT)
 * @param displaySymbol - Display symbol (e.g., BTCUSD)
 * @returns Exchange symbol (e.g., XBTUSD)
 */
export function toInternalSymbol(displaySymbol: string): string {
    return displaySymbol.replace('BTC', 'XBT');
}

// ============ Core Data Types ============

/**
 * Execution record from exchange
 */
export interface Execution {
    execID: string;
    orderID: string;
    symbol: string;
    displaySymbol: string;
    side: 'Buy' | 'Sell';
    lastQty: number;
    lastPx: number;
    execType: 'Trade' | 'Funding' | 'Settlement' | 'Canceled' | 'New' | 'Replaced';
    ordType: string;
    ordStatus: string;
    execCost: number;
    execComm: number;
    timestamp: string;
    text: string;
}

/**
 * Trade record with fee information
 */
export interface Trade {
    id: string;
    datetime: string;
    symbol: string;
    displaySymbol: string;
    side: 'buy' | 'sell';
    price: number;
    amount: number;
    cost: number;
    fee: {
        cost: number;
        currency: string;
    };
    orderID: string;
    execType: string;
    executionCount?: number; // Number of partial fills for this order
}

/**
 * Order record with status and pricing
 */
export interface Order {
    orderID: string;
    symbol: string;
    displaySymbol: string;
    side: 'Buy' | 'Sell';
    ordType: 'Limit' | 'Market' | 'Stop' | 'StopLimit';
    orderQty: number;
    price: number | null;
    stopPx: number | null;
    avgPx: number | null;
    cumQty: number;
    ordStatus: 'Filled' | 'Canceled' | 'Rejected' | 'New' | 'PartiallyFilled';
    timestamp: string;
    text: string;
}

/**
 * Wallet transaction including PnL, funding, deposits, withdrawals
 */
export interface WalletTransaction {
    transactID: string;
    account: number;
    currency: string;
    transactType: 'RealisedPNL' | 'Funding' | 'Deposit' | 'Withdrawal' | 'UnrealisedPNL' | 'AffiliatePayout' | 'Transfer';
    amount: number;
    fee: number;
    transactStatus: string;
    address: string;
    tx: string;
    text: string;
    timestamp: string;
    walletBalance: number;
    marginBalance: number | null;
}

/**
 * Account summary with wallet and position information
 */
export interface AccountSummary {
    exportDate: string;
    user: {
        id: number;
        username: string;
        email: string;
    };
    wallet: {
        walletBalance: number | null;
        marginBalance: number;
        availableMargin: number;
        unrealisedPnl: number;
        realisedPnl: number;
    };
    positions: Array<{
        symbol: string;
        displaySymbol: string;
        currentQty: number;
        avgEntryPrice: number;
        unrealisedPnl: number;
        liquidationPrice: number;
    }>;
}

/**
 * Comprehensive trading statistics
 */
export interface TradingStats {
    totalTrades: number;
    totalOrders: number;
    filledOrders: number;
    canceledOrders: number;
    rejectedOrders: number;
    fillRate: number;
    cancelRate: number;
    limitOrders: number;
    marketOrders: number;
    stopOrders: number;
    limitOrderPercent: number;
    totalRealizedPnl: number;
    totalFunding: number;
    totalFees: number;
    netPnl: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    fundingPaid: number;
    fundingReceived: number;
    tradingDays: number;
    avgTradesPerDay: number;
    monthlyPnl: Array<{
        month: string;
        pnl: number;
        funding: number;
        trades: number;
    }>;
}

// ============ Position Session Types ============

/**
 * Position session representing a complete trading position
 */
export interface PositionSession {
    id: string;
    symbol: string;
    displaySymbol: string;
    side: 'long' | 'short';
    openTime: string;
    closeTime: string | null;
    durationMs: number;
    maxSize: number;
    totalBought: number;
    totalSold: number;
    avgEntryPrice: number;
    avgExitPrice: number;
    realizedPnl: number;
    totalFees: number;
    netPnl: number;
    tradeCount: number;
    trades: Trade[];
    status: 'open' | 'closed';
}

// ============ AI Prediction Types ============

/**
 * AI Prediction result structure
 */
export interface AIPredictionResult {
    action: 'buy' | 'sell' | 'hold';
    confidence: string;
    reasoning: string[];
    similar_situations?: Array<{
        timestamp: string;
        action: 'buy' | 'sell' | 'hold';
        price: number;
        pnl: number;
        similarity: string;
        market_context: {
            rsi: string;
            price_change_24h: string;
        };
    }>;
    pattern_stats?: {
        total_patterns: number;
        action_distribution: Record<string, number>;
        avg_pnl_by_action: Record<string, number>;
        date_range: {
            start: string;
            end: string;
        };
    };
}

// ============ Utility Functions ============

/**
 * Formats duration in milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2d 3h", "45m", "30s")
 */
export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${seconds}s`;
}

// ============ Data Validation ============

/**
 * Validates trade data structure
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTradeData(data: any): data is Trade {
    return data &&
           typeof data.id === 'string' &&
           typeof data.datetime === 'string' &&
           typeof data.symbol === 'string' &&
           (data.side === 'buy' || data.side === 'sell') &&
           typeof data.price === 'number' &&
           typeof data.amount === 'number';
}

/**
 * Validates order data structure
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateOrderData(data: any): data is Order {
    return data &&
           typeof data.orderID === 'string' &&
           typeof data.symbol === 'string' &&
           ['Buy', 'Sell'].includes(data.side) &&
           ['Limit', 'Market', 'Stop', 'StopLimit'].includes(data.ordType);
}
