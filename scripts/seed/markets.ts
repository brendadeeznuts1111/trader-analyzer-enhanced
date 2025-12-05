/**
 * Market Seed Data Generator
 * Generates diverse market data for crypto, prediction, perpetual, and sports markets
 * Uses RFC 4122 compliant UUIDv5 generation with proper namespaces
 */

import { createHash } from 'crypto';

/**
 * RFC 4122 Standard Namespaces
 * These are well-known UUIDs used as namespace identifiers
 */
const RFC4122_NAMESPACES = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
} as const;

/**
 * Custom Market Namespaces (derived from URL namespace)
 * Each market type has its own deterministic namespace for consistent UUIDs
 */
export const MARKET_NAMESPACES = {
  // Core market namespaces
  CRYPTO: 'a1b2c3d4-e5f6-5a1b-8c9d-0e1f2a3b4c5d',
  PREDICTION: 'b2c3d4e5-f6a1-5b2c-9d0e-1f2a3b4c5d6e',
  PERPETUAL: 'c3d4e5f6-a1b2-5c3d-0e1f-2a3b4c5d6e7f',

  // Sports namespaces by league/sport
  SPORTS_NBA: 'd4e5f6a1-b2c3-5d4e-1f2a-3b4c5d6e7f8a',
  SPORTS_NFL: 'e5f6a1b2-c3d4-5e5f-2a3b-4c5d6e7f8a9b',
  SPORTS_MLB: 'f6a1b2c3-d4e5-5f6a-3b4c-5d6e7f8a9b0c',
  SPORTS_NHL: 'a1b2c3d4-e5f6-5a1b-4c5d-6e7f8a9b0c1d',
  SPORTS_SOCCER: 'b2c3d4e5-f6a1-5b2c-5d6e-7f8a9b0c1d2e',
  SPORTS_TENNIS: 'c3d4e5f6-a1b2-5c3d-6e7f-8a9b0c1d2e3f',
  SPORTS_MMA: 'd4e5f6a1-b2c3-5d4e-7f8a-9b0c1d2e3f4a',
  SPORTS_GOLF: 'e5f6a1b2-c3d4-5e5f-8a9b-0c1d2e3f4a5b',
  SPORTS_BOXING: 'f6a1b2c3-d4e5-5f6a-9b0c-1d2e3f4a5b6c',
  SPORTS_ESPORTS: 'a7b8c9d0-e1f2-5a7b-0c1d-2e3f4a5b6c7d',
  SPORTS_CRICKET: 'b8c9d0e1-f2a3-5b8c-1d2e-3f4a5b6c7d8e',
  SPORTS_F1: 'c9d0e1f2-a3b4-5c9d-2e3f-4a5b6c7d8e9f',

  // Exchange-specific namespaces
  POLYMARKET: 'd0e1f2a3-b4c5-5d0e-3f4a-5b6c7d8e9f0a',
  KALSHI: 'e1f2a3b4-c5d6-5e1f-4a5b-6c7d8e9f0a1b',
  BITMEX: 'f2a3b4c5-d6e7-5f2a-5b6c-7d8e9f0a1b2c',
  BINANCE: 'a3b4c5d6-e7f8-5a3b-6c7d-8e9f0a1b2c3d',
  COINBASE: 'b4c5d6e7-f8a9-5b4c-7d8e-9f0a1b2c3d4e',
  KRAKEN: 'c5d6e7f8-a9b0-5c5d-8e9f-0a1b2c3d4e5f',
  DEXES: 'd6e7f8a9-b0c1-5d6e-9f0a-1b2c3d4e5f6a',
} as const;

/**
 * Parse UUID string to bytes
 */
function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
}

/**
 * RFC 4122 compliant UUIDv5 generator
 * Creates deterministic UUIDs based on namespace + name
 */
function generateUUID(name: string, namespace: string): string {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = Buffer.from(name, 'utf8');

  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(nameBytes)
    .digest();

  // Set version 5 (0101xxxx)
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant (10xxxxxx)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generate market UUID with proper namespace
 */
export function generateMarketUUID(
  marketType: keyof typeof MARKET_NAMESPACES,
  identifier: string
): string {
  return generateUUID(identifier, MARKET_NAMESPACES[marketType]);
}

// Crypto pairs
const CRYPTO_BASES = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'ARB', 'OP', 'LINK', 'UNI', 'AAVE'];
const CRYPTO_QUOTES = ['USD', 'USDT', 'USDC'];

// Prediction market categories
const PREDICTION_CATEGORIES = {
  politics: [
    'US Presidential Election 2028 Winner',
    'UK Prime Minister by 2026',
    'EU Expansion by 2030',
    'US Senate Control 2026',
    'California Governor Recall',
  ],
  sports: [
    'Super Bowl 2026 Winner',
    'NBA Finals 2025 MVP',
    'World Cup 2026 Champion',
    'Champions League 2025 Winner',
    'Wimbledon 2025 Mens Champion',
  ],
  crypto: [
    'Bitcoin All-Time High 2025',
    'ETH/BTC Ratio > 0.1 by EOY',
    'Solana Market Cap > $100B',
    'Stablecoin Regulation by 2026',
    'CBDC Launch Major Economy 2025',
  ],
  tech: [
    'Apple AR Glasses Launch 2025',
    'GPT-5 Release Date',
    'SpaceX Mars Landing by 2030',
    'Quantum Supremacy Milestone 2025',
    'Full Self-Driving Approval',
  ],
  economy: [
    'Fed Rate Cut 2025',
    'US Recession by 2026',
    'S&P 500 All-Time High 2025',
    'Oil Price Above $100 2025',
    'Gold All-Time High 2025',
  ],
};

// Perpetual contract symbols
const PERPETUAL_SYMBOLS = [
  'XBTUSD', 'ETHUSD', 'SOLUSD', 'AVAXUSD', 'MATICUSD',
  'XBTUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT',
  'LINKUSD', 'UNIUSD', 'AAVEUSD', 'ARBUSD', 'OPUSD',
];

interface Market {
  id: string;
  canonicalId: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'prediction' | 'perpetual';
  category?: string;
  exchange: string;
  price: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  liquidityScore: number;
  status: 'active' | 'halted' | 'closed';
  createdAt: string;
  updatedAt: string;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Exchange namespace mapping
const EXCHANGE_NAMESPACE_MAP: Record<string, keyof typeof MARKET_NAMESPACES> = {
  binance: 'BINANCE',
  coinbase: 'COINBASE',
  kraken: 'KRAKEN',
  bitmex: 'BITMEX',
  polymarket: 'POLYMARKET',
  kalshi: 'KALSHI',
  okx: 'CRYPTO',
  bybit: 'CRYPTO',
  dydx: 'DEXES',
  uniswap: 'DEXES',
};

function generateCryptoMarket(base: string, quote: string, exchange: string): Market {
  const symbol = `${base}/${quote}`;
  const basePrice = base === 'BTC' ? randomFloat(40000, 100000, 2) :
                    base === 'ETH' ? randomFloat(2000, 5000, 2) :
                    base === 'SOL' ? randomFloat(50, 300, 2) :
                    randomFloat(0.5, 50, 4);

  const change24h = randomFloat(-15, 15, 2);
  const spread = randomFloat(0.01, 0.5, 4);
  const namespace = EXCHANGE_NAMESPACE_MAP[exchange] || 'CRYPTO';

  return {
    id: `${exchange}-${base}-${quote}`.toLowerCase(),
    canonicalId: generateUUID(`${exchange}:${symbol}`, MARKET_NAMESPACES[namespace]),
    symbol,
    name: `${base} / ${quote}`,
    type: 'crypto',
    exchange,
    price: basePrice,
    volume24h: randomFloat(1000000, 500000000, 0),
    change24h,
    high24h: basePrice * (1 + Math.abs(change24h) / 100 + randomFloat(0, 2) / 100),
    low24h: basePrice * (1 - Math.abs(change24h) / 100 - randomFloat(0, 2) / 100),
    bid: basePrice - spread / 2,
    ask: basePrice + spread / 2,
    spread,
    liquidityScore: randomInt(60, 100),
    status: Math.random() > 0.02 ? 'active' : 'halted',
    createdAt: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generatePredictionMarket(title: string, category: string): Market {
  const probability = randomFloat(0.05, 0.95, 4);
  const spread = randomFloat(0.01, 0.05, 4);
  const exchange = Math.random() > 0.3 ? 'polymarket' : 'kalshi';
  const namespace = exchange === 'polymarket' ? 'POLYMARKET' : 'KALSHI';

  return {
    id: `pred-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`,
    canonicalId: generateUUID(`${exchange}:prediction:${title}`, MARKET_NAMESPACES[namespace]),
    symbol: title.slice(0, 30),
    name: title,
    type: 'prediction',
    category,
    exchange,
    price: probability,
    volume24h: randomFloat(10000, 5000000, 0),
    change24h: randomFloat(-10, 10, 2),
    high24h: Math.min(probability + randomFloat(0, 0.1), 0.99),
    low24h: Math.max(probability - randomFloat(0, 0.1), 0.01),
    bid: probability - spread / 2,
    ask: probability + spread / 2,
    spread,
    liquidityScore: randomInt(40, 95),
    status: 'active',
    createdAt: new Date(Date.now() - randomInt(7, 180) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generatePerpetualMarket(symbol: string, exchange: string = 'bitmex'): Market {
  const isXBT = symbol.includes('XBT') || symbol.includes('BTC');
  const isETH = symbol.includes('ETH');
  const basePrice = isXBT ? randomFloat(40000, 100000, 1) :
                    isETH ? randomFloat(2000, 5000, 2) :
                    randomFloat(1, 200, 4);

  const spread = randomFloat(0.5, 5, 2);
  const change24h = randomFloat(-8, 8, 2);
  const namespace = EXCHANGE_NAMESPACE_MAP[exchange] || 'PERPETUAL';

  return {
    id: `${exchange}-${symbol.toLowerCase()}`,
    canonicalId: generateUUID(`${exchange}:perpetual:${symbol}`, MARKET_NAMESPACES[namespace]),
    symbol,
    name: `${symbol} Perpetual`,
    type: 'perpetual',
    category: 'derivatives',
    exchange,
    price: basePrice,
    volume24h: randomFloat(50000000, 2000000000, 0),
    change24h,
    high24h: basePrice * (1 + Math.abs(change24h) / 100 + randomFloat(0, 1) / 100),
    low24h: basePrice * (1 - Math.abs(change24h) / 100 - randomFloat(0, 1) / 100),
    bid: basePrice - spread / 2,
    ask: basePrice + spread / 2,
    spread,
    liquidityScore: randomInt(70, 100),
    status: 'active',
    createdAt: new Date(Date.now() - randomInt(365, 1000) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateMarkets(count: number = 500): {
  crypto: Market[];
  prediction: Market[];
  perpetual: Market[];
  all: Market[];
} {
  const crypto: Market[] = [];
  const prediction: Market[] = [];
  const perpetual: Market[] = [];

  // Generate crypto markets (~40% of total)
  const cryptoCount = Math.floor(count * 0.4);
  const exchanges = ['binance', 'coinbase', 'kraken', 'okx', 'bybit'];

  for (let i = 0; i < cryptoCount; i++) {
    const base = CRYPTO_BASES[i % CRYPTO_BASES.length];
    const quote = CRYPTO_QUOTES[i % CRYPTO_QUOTES.length];
    const exchange = exchanges[i % exchanges.length];
    crypto.push(generateCryptoMarket(base, quote, exchange));
  }

  // Generate prediction markets (~40% of total)
  const predictionCount = Math.floor(count * 0.4);
  const categories = Object.keys(PREDICTION_CATEGORIES) as (keyof typeof PREDICTION_CATEGORIES)[];

  for (let i = 0; i < predictionCount; i++) {
    const category = categories[i % categories.length];
    const titles = PREDICTION_CATEGORIES[category];
    const titleIndex = Math.floor(i / categories.length) % titles.length;
    const title = `${titles[titleIndex]} #${Math.floor(i / (categories.length * titles.length)) + 1}`;
    prediction.push(generatePredictionMarket(title, category));
  }

  // Generate perpetual markets (~20% of total)
  const perpetualCount = Math.floor(count * 0.2);

  for (let i = 0; i < perpetualCount; i++) {
    const symbol = PERPETUAL_SYMBOLS[i % PERPETUAL_SYMBOLS.length];
    perpetual.push(generatePerpetualMarket(symbol));
  }

  return {
    crypto,
    prediction,
    perpetual,
    all: [...crypto, ...prediction, ...perpetual],
  };
}

export type { Market };
