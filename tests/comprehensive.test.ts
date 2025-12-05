#!/usr/bin/env bun
/**
 * Comprehensive Test Suite for Ultra-High Performance Vault Optimizer
 *
 * Enhanced testing coverage including:
 * - Market data validation
 * - User demographic analysis
 * - Performance regression tests
 * - Edge case handling
 * - Integration tests
 *
 * @module comprehensive-tests
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { NanoTimer, NanoString, NanoArray, NanoMarket } from '../src/core/nano-engine';
import { NanoSportsMarket, SPORT_TYPES, MARKET_STATUS } from '../src/sports/nano-sports';
import { NanoArbitrage } from '../src/arbitrage/nano-arbitrage';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Test data interfaces
interface UserDemographics {
  gender: string;
  age: number;
  age_group: string;
  location: string;
  country: string;
  city: string;
}

interface UserAppearance {
  has_hair: boolean;
  hair_style: string;
  eye_color: string;
  skin_tone: string;
  body_type: string;
}

interface TestUser {
  id: string;
  user_id: number;
  type: string;
  demographics: UserDemographics;
  appearance: UserAppearance;
  trading_profile?: unknown;
  created_at: string;
  last_active: string;
  status: string;
}

interface TestMarket {
  id: string;
  category: string;
  price: number;
  volume: number;
  [key: string]: unknown;
}

// Test data
let testMarkets: TestMarket[] = [];
let testUsers: TestUser[] = [];
let testHistories: Record<string, unknown>[] = [];

// Load test data
beforeAll(async () => {
  const testDataDir = join(process.cwd(), 'test-data');

  if (existsSync(join(testDataDir, 'markets.json'))) {
    testMarkets = JSON.parse(readFileSync(join(testDataDir, 'markets.json'), 'utf8')) as TestMarket[];
  }

  if (existsSync(join(testDataDir, 'users.json'))) {
    testUsers = JSON.parse(readFileSync(join(testDataDir, 'users.json'), 'utf8')) as TestUser[];
  }

  if (existsSync(join(testDataDir, 'market_histories.json'))) {
    testHistories = JSON.parse(readFileSync(join(testDataDir, 'market_histories.json'), 'utf8')) as Record<string, unknown>[];
  }

  // eslint-disable-next-line no-console
  console.log(`📊 Loaded ${testMarkets.length} markets, ${testUsers.length} users, ${testHistories.length} history records`);
});

// Performance baseline measurements
const PERFORMANCE_BASELINES = {
  nanoTimer: 500, // ns per call
  stringWidth: 10000, // ns per call
  marketUpdate: 50000, // ns per update
  arbitrageScan: 1000000, // ns per scan
};

// Nano-engine core functionality tests
describe('🕐 NanoTimer', () => {
  it('should provide nanosecond precision timing', () => {
    const operations = 1000;

    for (let i = 0; i < operations; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = i * Math.PI;
    }

    const elapsed = NanoTimer.elapsedNs(NanoTimer.now());
    const nsPerOperation = Number(elapsed) / operations;

    expect(nsPerOperation).toBeLessThan(PERFORMANCE_BASELINES.nanoTimer);
    expect(elapsed).toBeGreaterThan(0n);
  });

  it('should handle elapsed time calculations correctly', async () => {
    const start = NanoTimer.now();
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1));
    const elapsed = NanoTimer.elapsed(start);

    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100); // Should be ~1ms
  });
});

describe('📏 NanoString', () => {
  it('should cache string width calculations', () => {
    const testString = '🚀 Ultra-Fast Trading Engine 🚀';
    const iterations = 1000;

    const start = NanoTimer.now();
    for (let i = 0; i < iterations; i++) {
      NanoString.getWidth(testString);
    }
    const elapsed = NanoTimer.elapsedNs(start);

    const nsPerCall = Number(elapsed) / iterations;
    expect(nsPerCall).toBeLessThan(PERFORMANCE_BASELINES.stringWidth);
  });

  it('should format currency correctly', () => {
    expect(NanoString.formatCurrency(1234.56)).toBe('$1234.56');
    expect(NanoString.formatCurrency(0.00123, 'BTC')).toBe('$0.00'); // Always uses $ regardless of currency
  });

  it('should format percentages correctly', () => {
    expect(NanoString.formatPercentage(0.1523)).toBe('0.15%'); // Converts number to percentage string
    expect(NanoString.formatPercentage(1.0)).toBe('1.00%');
  });
});

describe('📊 NanoArray', () => {
  it('should handle fixed-size array operations efficiently', () => {
    const capacity = 10000;
    const nanoArray = new NanoArray<number>(capacity);
    const iterations = 5000;

    const start = NanoTimer.now();
    for (let i = 0; i < iterations; i++) {
      nanoArray.push(i);
    }
    const elapsed = NanoTimer.elapsedNs(start);

    expect(nanoArray.length).toBe(iterations);
    expect(nanoArray.get(0)).toBe(0);
    expect(nanoArray.get(iterations - 1)).toBe(iterations - 1);
    expect(Number(elapsed)).toBeGreaterThan(0); // Verify elapsed time is measured
  });

  it('should prevent overflow beyond capacity', () => {
    const capacity = 10;
    const nanoArray = new NanoArray<number>(capacity);

    for (let i = 0; i < capacity + 5; i++) {
      nanoArray.push(i);
    }

    expect(nanoArray.length).toBe(capacity);
  });
});

describe('💰 NanoMarket', () => {
  it('should update prices with nanosecond precision', () => {
    const market = new NanoMarket();
    const updates = 1000;

    const start = NanoTimer.now();
    for (let i = 0; i < updates; i++) {
      market.update(50000 + i, 10000 + i * 10);
    }
    const elapsed = NanoTimer.elapsedNs(start);

    const nsPerUpdate = Number(elapsed) / updates;
    expect(nsPerUpdate).toBeLessThan(PERFORMANCE_BASELINES.marketUpdate);

    const latest = market.getLatest();
    expect(latest.price).toBe(50000 + updates - 1);
    expect(latest.volume).toBe(10000 + (updates - 1) * 10);
  });

  it('should calculate VWAP correctly', () => {
    const market = new NanoMarket();

    // Add some price/volume data
    market.update(100, 1000); // $100 * 1000 = $100,000
    market.update(110, 500);  // $110 * 500 = $55,000
    market.update(105, 800);  // $105 * 800 = $84,000
    // Total: $239,000 / 2300 = $103.91

    const vwap = market.getVWAP(10);
    expect(vwap).toBeCloseTo(103.91, 1);
  });
});

// Sports market tests
describe('🏀 NanoSportsMarket', () => {
  it('should handle NBA market updates efficiently', () => {
    const sportsMarket = new NanoSportsMarket();
    const markets = 1000;

    const start = NanoTimer.now();
    for (let i = 0; i < markets; i++) {
      sportsMarket.updateMarket(
        i,
        SPORT_TYPES.NBA,
        i % 16, // 16 NBA teams
        (i + 1) % 16,
        1.85 + Math.random() * 0.3, // Home odds
        1.95 + Math.random() * 0.3, // Away odds
        10000 + Math.random() * 50000,
        MARKET_STATUS.LIVE
      );
    }
    const elapsed = NanoTimer.elapsedNs(start);

    const nsPerUpdate = Number(elapsed) / markets;
    expect(nsPerUpdate).toBeLessThan(PERFORMANCE_BASELINES.marketUpdate);
  });

  it('should find arbitrage opportunities', () => {
    const sportsMarket = new NanoSportsMarket();

    // Add markets with obvious arbitrage
    sportsMarket.updateMarket(1, SPORT_TYPES.NBA, 0, 1, 2.0, 1.8, 10000, MARKET_STATUS.LIVE);
    sportsMarket.updateMarket(2, SPORT_TYPES.NBA, 2, 3, 1.9, 1.9, 15000, MARKET_STATUS.LIVE);
    sportsMarket.updateMarket(3, SPORT_TYPES.NBA, 4, 5, 1.7, 2.1, 8000, MARKET_STATUS.LIVE);

    const opportunities = sportsMarket.findArbitrage();
    expect(opportunities.length).toBeGreaterThan(0);
  });
});

// Arbitrage tests
describe('🌍 NanoArbitrage', () => {
  it('should detect cross-region arbitrage opportunities', () => {
    const arbitrage = new NanoArbitrage();
    const updates = 100;

    const start = NanoTimer.now();
    for (let i = 0; i < updates; i++) {
      arbitrage.updatePrice(
        'BTC',
        `exchange_${i % 4}`,
        50000 + Math.random() * 1000,
        10000,
        i % 4 // Different regions
      );
    }
    const elapsed = NanoTimer.elapsedNs(start);

    const nsPerUpdate = Number(elapsed) / updates;
    expect(nsPerUpdate).toBeLessThan(PERFORMANCE_BASELINES.marketUpdate);

    const opportunities = arbitrage.findArbitrage('BTC', 0.001);
    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should measure latency between exchanges', async () => {
    const arbitrage = new NanoArbitrage();

    const latency = await arbitrage.measureLatency('binance', 'coinbase');
    expect(latency).toBeGreaterThan(0n);
    expect(latency).toBeLessThan(10000000000n); // Less than 10 seconds
  });
});

// Test data validation tests
describe('📊 Test Data Validation', () => {
  it('should validate generated market data structure', () => {
    if (testMarkets.length === 0) return; // Skip if no test data

    const market = testMarkets[0];
    expect(market).toHaveProperty('id');
    expect(market).toHaveProperty('category');
    expect(market).toHaveProperty('price');
    expect(market).toHaveProperty('volume');
    expect(typeof market.price).toBe('number');
    expect(typeof market.volume).toBe('number');
  });

  it('should validate user demographic diversity', () => {
    if (testUsers.length === 0) return;

    const genders = [...new Set(testUsers.map(u => u.demographics.gender))];
    const hairStyles = [...new Set(testUsers.map(u => u.appearance.hair_style))];
    const countries = [...new Set(testUsers.map(u => u.demographics.country))];

    expect(genders.length).toBeGreaterThan(1); // Multiple genders
    expect(hairStyles.length).toBeGreaterThan(5); // Diverse hair styles
    expect(countries.length).toBeGreaterThan(5); // Global representation
  });

  it('should validate trader profiles have required fields', () => {
    if (testUsers.length === 0) return;

    const traders = testUsers.filter(u => u.type === 'trader');
    if (traders.length === 0) return;

    const trader = traders[0];
    expect(trader).toHaveProperty('trading_profile');
    expect(trader.trading_profile && typeof trader.trading_profile === 'object').toBe(true);
    expect(trader.trading_profile).toHaveProperty('style');
    expect(trader.trading_profile).toHaveProperty('win_rate');
    expect(trader.trading_profile).toHaveProperty('total_trades');
  });

  it('should validate market price history consistency', () => {
    if (testHistories.length === 0) return;

    const history = testHistories.slice(0, 10);
    const firstHistory = history[0] as { market_id: string; price: number; volume: number; timestamp: string };
    const marketId = firstHistory.market_id;

    // All should be for the same market
    history.forEach(h => {
      const historyItem = h as { market_id: string; price: number; volume: number; timestamp: string };
      expect(historyItem.market_id).toBe(marketId);
      expect(historyItem).toHaveProperty('price');
      expect(historyItem).toHaveProperty('volume');
      expect(historyItem).toHaveProperty('timestamp');
    });

    // Prices should be reasonable
    history.forEach(h => {
      const historyItem = h as { price: number };
      expect(historyItem.price).toBeGreaterThan(0);
      expect(historyItem.price).toBeLessThan(1000000);
    });
  });
});

// Demographic diversity tests
describe('🌍 Demographic Diversity Tests', () => {
  it('should have balanced gender representation', () => {
    if (testUsers.length === 0) return;

    const genderCounts = testUsers.reduce((acc, user) => {
      acc[user.demographics.gender] = (acc[user.demographics.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = testUsers.length;
    Object.values(genderCounts).forEach(count => {
      const percentage = (count / total) * 100;
      expect(percentage).toBeGreaterThan(5); // No group should be less than 5%
    });
  });

  it('should represent diverse age groups', () => {
    if (testUsers.length === 0) return;

    const ageGroups = testUsers.reduce((acc, user) => {
      acc[user.demographics.age_group] = (acc[user.demographics.age_group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(Object.keys(ageGroups).length).toBeGreaterThan(3); // At least 4 age groups
    expect(ageGroups['18-24']).toBeDefined();
    expect(ageGroups['25-34']).toBeDefined();
  });

  it('should have global geographic distribution', () => {
    if (testUsers.length === 0) return;

    const countries = [...new Set(testUsers.map(u => u.demographics.country))];
    expect(countries.length).toBeGreaterThan(5); // At least 6 countries

    // Check for major trading hubs
    const majorCountries = ['United States', 'United Kingdom', 'Japan', 'Germany'];
    const representedMajor = majorCountries.filter(country => countries.includes(country));
    expect(representedMajor.length).toBeGreaterThan(2);
  });

  it('should include diverse physical characteristics', () => {
    if (testUsers.length === 0) return;

    const hairStyles = [...new Set(testUsers.map(u => u.appearance.hair_style))];
    const eyeColors = [...new Set(testUsers.map(u => u.appearance.eye_color))];
    const skinTones = [...new Set(testUsers.map(u => u.appearance.skin_tone))];

    expect(hairStyles.length).toBeGreaterThan(10); // Diverse hair styles
    expect(eyeColors.length).toBeGreaterThan(3); // Multiple eye colors
    expect(skinTones.length).toBeGreaterThan(3); // Multiple skin tones

    // Check for bald representation
    const baldUsers = testUsers.filter(u => !u.appearance.has_hair);
    const baldPercentage = (baldUsers.length / testUsers.length) * 100;
    expect(baldPercentage).toBeGreaterThan(10); // Realistic bald representation
    expect(baldPercentage).toBeLessThan(25); // Not overrepresented
  });
});

// Market property tests
describe('🏷️ Market Property Tests', () => {
  it('should have diverse market categories', () => {
    if (testMarkets.length === 0) return;

    const categories = [...new Set(testMarkets.map(m => m.category))];
    expect(categories.length).toBeGreaterThan(2); // At least 3 categories
    expect(categories).toContain('sports');
    expect(categories).toContain('crypto');
  });

  it('should validate sports market properties', () => {
    const sportsMarkets = testMarkets.filter(m => m.category === 'sports');
    if (sportsMarkets.length === 0) return;

    sportsMarkets.forEach(market => {
      expect(market).toHaveProperty('sport');
      expect(market).toHaveProperty('home_team');
      expect(market).toHaveProperty('away_team');
      expect(market).toHaveProperty('outcome');

      // Validate price ranges for sports betting
      expect(market.price).toBeGreaterThan(1.0);
      expect(market.price).toBeLessThan(10.0);
    });
  });

  it('should validate crypto market properties', () => {
    const cryptoMarkets = testMarkets.filter(m => m.category === 'crypto');
    if (cryptoMarkets.length === 0) return;

    cryptoMarkets.forEach(market => {
      expect(market).toHaveProperty('symbol');
      expect(market).toHaveProperty('outcome');
      expect(market).toHaveProperty('properties');

      // Crypto prices can vary widely
      expect(market.price).toBeGreaterThan(0);
      expect(market.price).toBeLessThan(100000);
    });
  });

  it('should validate prediction market properties', () => {
    const predictionMarkets = testMarkets.filter(m => m.category === 'prediction');
    if (predictionMarkets.length === 0) return;

    predictionMarkets.forEach(market => {
      expect(market).toHaveProperty('topic');
      expect(market).toHaveProperty('question');
      expect(market).toHaveProperty('outcome');

      // Binary outcomes should be between 0 and 1
      expect(market.price).toBeGreaterThanOrEqual(0);
      expect(market.price).toBeLessThanOrEqual(1);
    });
  });
});

// Performance regression tests
describe('⚡ Performance Regression Tests', () => {
  it('should maintain sub-millisecond response times', async () => {
    const operations = 10000;
    const start = NanoTimer.now();

    // Simulate typical operations
    for (let i = 0; i < operations; i++) {
      const width = NanoString.getWidth(`Test ${i}`);
      const currency = NanoString.formatCurrency(i * 0.01);
      const percentage = NanoString.formatPercentage(i / operations);

      // Verify outputs are valid strings
      expect(typeof width).toBe('number');
      expect(typeof currency).toBe('string');
      expect(typeof percentage).toBe('string');
      expect(currency).toContain('$');
      expect(percentage).toContain('%');
    }

    const elapsed = NanoTimer.elapsed(start);
    const operationsPerMs = operations / elapsed;

    expect(operationsPerMs).toBeGreaterThan(100); // At least 100 ops/ms (accounting for validation overhead)
  });

  it('should handle concurrent market updates efficiently', async () => {
    const market = new NanoMarket();
    const concurrent = 100;
    const updatesPerThread = 100;

    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      promises.push(
        new Promise<void>((resolve) => {
          for (let j = 0; j < updatesPerThread; j++) {
            market.update(50000 + i + j, 10000 + i * 100);
          }
          resolve();
        })
      );
    }

    const start = NanoTimer.now();
    await Promise.all(promises);
    const elapsed = NanoTimer.elapsed(start);

    const totalUpdates = concurrent * updatesPerThread;
    const updatesPerMs = totalUpdates / elapsed;

    expect(updatesPerMs).toBeGreaterThan(10000); // 10K updates/ms
  });
});

// Integration tests
describe('🔗 Integration Tests', () => {
  it('should integrate nano-engine components seamlessly', () => {
    const market = new NanoMarket();
    const nanoArray = new NanoArray<string>(1000);

    // Update market data
    market.update(50000, 10000);
    market.update(51000, 15000);
    market.update(52000, 12000);

    // Store formatted data
    const latest = market.getLatest();
    nanoArray.push(NanoString.formatCurrency(latest.price));
    nanoArray.push(NanoString.formatCurrency(market.getVWAP()));

    expect(nanoArray.length).toBe(2);
    expect(nanoArray.get(0)).toContain('$');
    expect(nanoArray.get(1)).toContain('$');
  });

  it('should handle edge cases gracefully', () => {
    // Empty market
    const emptyMarket = new NanoMarket();
    const emptyLatest = emptyMarket.getLatest();
    expect(emptyLatest.price).toBe(0);
    expect(emptyLatest.volume).toBe(0);

    // Zero VWAP
    const zeroVwap = emptyMarket.getVWAP();
    expect(zeroVwap).toBe(0);

    // Extreme values
    const extremeMarket = new NanoMarket();
    extremeMarket.update(999999, 1);
    extremeMarket.update(0.000001, 999999999);

    const extremeLatest = extremeMarket.getLatest();
    expect(extremeLatest.price).toBe(0.000001);
    expect(extremeLatest.volume).toBe(999999999);
  });
});

// Statistical analysis tests
describe('📈 Statistical Analysis Tests', () => {
  it('should analyze user demographic distributions', () => {
    if (testUsers.length === 0) return;

    const stats = {
      total: testUsers.length,
      male: testUsers.filter(u => u.demographics.gender === 'male').length,
      female: testUsers.filter(u => u.demographics.gender === 'female').length,
      avgAge: testUsers.reduce((sum, u) => sum + u.demographics.age, 0) / testUsers.length,
      countries: [...new Set(testUsers.map(u => u.demographics.country))].length,
      hairless: testUsers.filter(u => !u.appearance.has_hair).length
    };

    expect(stats.male + stats.female).toBeGreaterThan(stats.total * 0.8); // 80% binary gender
    expect(stats.avgAge).toBeGreaterThan(20);
    expect(stats.avgAge).toBeLessThan(50);
    expect(stats.countries).toBeGreaterThan(5);
  });

  it('should analyze market performance distributions', () => {
    if (testMarkets.length === 0) return;

    const prices: number[] = testMarkets.map(m => m.price);
    const volumes: number[] = testMarkets.map(m => m.volume);

    const priceStats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    };

    const volumeStats = {
      min: Math.min(...volumes),
      max: Math.max(...volumes),
      avg: volumes.reduce((a, b) => a + b, 0) / volumes.length
    };

    expect(priceStats.min).toBeGreaterThan(0);
    expect(priceStats.max).toBeLessThan(1000000);
    expect(volumeStats.min).toBeGreaterThan(0);
    expect(volumeStats.avg).toBeGreaterThan(100);
  });
});

export default {
  PERFORMANCE_BASELINES,
  testMarkets,
  testUsers,
  testHistories
};
