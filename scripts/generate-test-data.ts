#!/usr/bin/env bun
/**
 * Comprehensive Test Data Generator for Ultra-High Performance Vault Optimizer
 *
 * Generates diverse test data including:
 * - Market data with various properties (sports, crypto, prediction markets)
 * - User profiles with demographic data (age, gender, appearance, trading behavior)
 * - Seed data for comprehensive testing coverage
 *
 * @module test-data-generator
 */

import { NanoTimer } from '../src/core/nano-engine';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Test data configuration
const CONFIG = {
  markets: {
    sports: 10000,
    crypto: 5000,
    prediction: 8000,
    total: 23000
  },
  users: {
    traders: 50000,
    observers: 100000,
    total: 150000
  },
  timeRange: {
    start: new Date('2023-01-01').getTime(),
    end: new Date('2025-12-31').getTime()
  }
};

// Market categories with properties
const MARKET_CATEGORIES = {
  sports: {
    types: ['NBA', 'NFL', 'MLB', 'Soccer', 'Tennis', 'Golf', 'Formula1', 'UFC'],
    outcomes: ['win', 'lose', 'draw', 'over/under', 'spread'],
    properties: ['live', 'pregame', 'featured', 'high_volume', 'volatile']
  },
  crypto: {
    types: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'SUSHI', 'COMP'],
    outcomes: ['bull', 'bear', 'sideways', 'breakout', 'breakdown'],
    properties: ['defi', 'layer1', 'layer2', 'meme', 'utility', 'governance']
  },
  prediction: {
    types: ['Politics', 'Weather', 'Sports', 'Economy', 'Technology', 'Entertainment'],
    outcomes: ['yes', 'no', 'maybe', 'undecided'],
    properties: ['binary', 'multi_choice', 'scalar', 'conditional', 'long_term']
  }
};

// User demographic profiles
const USER_DEMOGRAPHICS = {
  gender: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
  age_groups: [
    { range: '18-24', weight: 0.25 },
    { range: '25-34', weight: 0.35 },
    { range: '35-44', weight: 0.25 },
    { range: '45-54', weight: 0.10 },
    { range: '55-64', weight: 0.04 },
    { range: '65+', weight: 0.01 }
  ],
  hair_styles: [
    'bald', 'short', 'medium', 'long', 'curly', 'straight', 'wavy',
    'afro', 'dreadlocks', 'braids', 'ponytail', 'bun', 'buzz_cut',
    'mohawk', 'faux_hawk', 'shag', 'layered', 'bob', 'lob', 'shag'
  ],
  eye_colors: ['brown', 'blue', 'green', 'hazel', 'gray', 'amber', 'violet'],
  skin_tones: ['fair', 'light', 'medium', 'tan', 'olive', 'brown', 'dark'],
  body_types: ['slim', 'athletic', 'average', 'curvy', 'muscular', 'stocky'],
  trading_styles: ['day_trader', 'swing_trader', 'position_trader', 'scalper', 'arbitrageur', 'market_maker'],
  risk_profiles: ['conservative', 'moderate', 'aggressive', 'high_risk'],
  education_levels: ['high_school', 'bachelors', 'masters', 'phd', 'self_taught', 'professional_certification']
};

// Location data for global coverage
const LOCATIONS = [
  { country: 'United States', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
  { country: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool'] },
  { country: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'] },
  { country: 'Japan', cities: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya'] },
  { country: 'Australia', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
  { country: 'Canada', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'] },
  { country: 'Singapore', cities: ['Singapore'] },
  { country: 'South Korea', cities: ['Seoul', 'Busan', 'Incheon'] },
  { country: 'Brazil', cities: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia'] },
  { country: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'] }
];

// Trading behavior patterns
const TRADING_PATTERNS = {
  frequency: ['daily', 'weekly', 'monthly', 'rarely'],
  session_preferences: ['morning', 'afternoon', 'evening', 'night', 'weekend'],
  market_preferences: ['crypto', 'sports', 'stocks', 'forex', 'commodities'],
  stake_sizes: ['micro', 'small', 'medium', 'large', 'whale'],
  strategies: ['momentum', 'mean_reversion', 'breakout', 'scalping', 'swing', 'position']
};

// Utility functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedRandom<T>(items: { item: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) return item;
  }

  return items[0].item;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: number, end: number): number {
  return Math.floor(randomInRange(start, end));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Market data generators
function generateSportsMarket(id: number): any {
  const category = MARKET_CATEGORIES.sports;
  const sport = randomChoice(category.types);
  const outcome = randomChoice(category.outcomes);
  const properties = category.properties.filter(() => Math.random() > 0.7);

  // Generate team names based on sport
  let homeTeam: string;
  let awayTeam: string;
  switch (sport) {
    case 'NBA': {
      const nbaTeams = ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Bulls', 'Knicks', 'Nets', 'Clippers'];
      homeTeam = randomChoice(nbaTeams);
      awayTeam = randomChoice(nbaTeams.filter(t => t !== homeTeam));
      break;
    }
    case 'NFL': {
      const nflTeams = ['Chiefs', 'Patriots', 'Packers', 'Cowboys', 'Eagles', 'Steelers', '49ers', 'Rams'];
      homeTeam = randomChoice(nflTeams);
      awayTeam = randomChoice(nflTeams.filter(t => t !== homeTeam));
      break;
    }
    default:
      homeTeam = `Team${id}A`;
      awayTeam = `Team${id}B`;
  }

  const basePrice = randomInRange(1.5, 3.5);
  const volume = Math.floor(randomInRange(1000, 100000));

  return {
    id: `sports_${id}`,
    category: 'sports',
    sport,
    type: 'match',
    home_team: homeTeam,
    away_team: awayTeam,
    outcome,
    price: parseFloat(basePrice.toFixed(2)),
    volume,
    liquidity: randomInRange(10000, 500000),
    volatility: randomInRange(0.1, 2.0),
    properties,
    start_time: randomDate(CONFIG.timeRange.start, CONFIG.timeRange.end),
    created_at: Date.now(),
    last_updated: Date.now()
  };
}

function generateCryptoMarket(id: number): any {
  const category = MARKET_CATEGORIES.crypto;
  const symbol = randomChoice(category.types);
  const outcome = randomChoice(category.outcomes);
  const properties = category.properties.filter(() => Math.random() > 0.6);

  const basePrice = randomInRange(0.01, 50000); // Wide range for crypto
  const volume = Math.floor(randomInRange(10000, 10000000));

  return {
    id: `crypto_${id}`,
    category: 'crypto',
    symbol,
    type: 'price_prediction',
    outcome,
    price: parseFloat(basePrice.toFixed(4)),
    volume,
    market_cap: randomInRange(1000000, 1000000000),
    volatility: randomInRange(0.5, 5.0),
    properties,
    timeframe: randomChoice(['1h', '4h', '1d', '1w']),
    created_at: Date.now(),
    last_updated: Date.now()
  };
}

function generatePredictionMarket(id: number): any {
  const category = MARKET_CATEGORIES.prediction;
  const topic = randomChoice(category.types);
  const outcome = randomChoice(category.outcomes);
  const properties = category.properties.filter(() => Math.random() > 0.5);

  // Generate diverse prediction questions
  const questions = {
    'Politics': [
      'Will the candidate win the election?',
      'Will the policy be implemented?',
      'Will the government change leadership?'
    ],
    'Weather': [
      'Will it rain tomorrow?',
      'Will the temperature exceed 30°C?',
      'Will there be a storm this week?'
    ],
    'Sports': [
      'Will the team win the championship?',
      'Will the player score over 20 points?',
      'Will there be an upset in the finals?'
    ],
    'Economy': [
      'Will inflation exceed 5%?',
      'Will the stock market crash?',
      'Will interest rates increase?'
    ],
    'Technology': [
      'Will the product launch succeed?',
      'Will the company go public?',
      'Will the merger be approved?'
    ],
    'Entertainment': [
      'Will the movie be a blockbuster?',
      'Will the album top the charts?',
      'Will the show get renewed?'
    ]
  };

  const question = randomChoice(questions[topic as keyof typeof questions] || ['Will the event occur?']);

  return {
    id: `prediction_${id}`,
    category: 'prediction',
    topic,
    question,
    type: randomChoice(['binary', 'multi_choice', 'scalar']),
    outcome,
    price: parseFloat(randomInRange(0.1, 0.9).toFixed(3)),
    volume: Math.floor(randomInRange(500, 50000)),
    participants: Math.floor(randomInRange(10, 1000)),
    properties,
    resolution_date: randomDate(CONFIG.timeRange.start, CONFIG.timeRange.end),
    created_at: Date.now(),
    last_updated: Date.now()
  };
}

// User profile generators
function generateUserProfile(id: number, type: 'trader' | 'observer'): any {
  const gender = randomChoice(USER_DEMOGRAPHICS.gender);
  const ageGroup = weightedRandom(USER_DEMOGRAPHICS.age_groups.map(g => ({ item: g.range, weight: g.weight })));

  // Age calculation based on group
  let age: number;
  switch (ageGroup) {
    case '18-24': age = Math.floor(randomInRange(18, 24)); break;
    case '25-34': age = Math.floor(randomInRange(25, 34)); break;
    case '35-44': age = Math.floor(randomInRange(35, 44)); break;
    case '45-54': age = Math.floor(randomInRange(45, 54)); break;
    case '55-64': age = Math.floor(randomInRange(55, 64)); break;
    default: age = Math.floor(randomInRange(65, 85));
  }

  const location = randomChoice(LOCATIONS);
  const city = randomChoice(location.cities);

  // Appearance traits (diverse representation)
  const hasHair = Math.random() > 0.15; // 15% bald/balding
  const hairStyle = hasHair ? randomChoice(USER_DEMOGRAPHICS.hair_styles.filter(h => h !== 'bald')) : 'bald';
  const eyeColor = randomChoice(USER_DEMOGRAPHICS.eye_colors);
  const skinTone = randomChoice(USER_DEMOGRAPHICS.skin_tones);
  const bodyType = randomChoice(USER_DEMOGRAPHICS.body_types);

  // Trading profile (only for traders)
  let tradingProfile = null;
  if (type === 'trader') {
    tradingProfile = {
      style: randomChoice(USER_DEMOGRAPHICS.trading_styles),
      risk_profile: randomChoice(USER_DEMOGRAPHICS.risk_profiles),
      education: randomChoice(USER_DEMOGRAPHICS.education_levels),
      experience_years: Math.floor(randomInRange(0, age - 18)), // Can't have more experience than age - 18
      frequency: randomChoice(TRADING_PATTERNS.frequency),
      session_preference: randomChoice(TRADING_PATTERNS.session_preferences),
      market_preference: randomChoice(TRADING_PATTERNS.market_preferences),
      stake_size: randomChoice(TRADING_PATTERNS.stake_sizes),
      strategy: randomChoice(TRADING_PATTERNS.strategies),
      win_rate: parseFloat(randomInRange(0.3, 0.7).toFixed(3)),
      total_trades: Math.floor(randomInRange(10, 10000)),
      profit_loss: parseFloat(randomInRange(-50000, 500000).toFixed(2)),
      favorite_assets: Array.from({ length: Math.floor(randomInRange(1, 5)) },
        () => randomChoice(['BTC', 'ETH', 'AAPL', 'TSLA', 'NFLX', 'GOOGL']))
    };
  }

  return {
    id: generateUUID(),
    user_id: id,
    type,
    demographics: {
      gender,
      age,
      age_group: ageGroup,
      location: `${city}, ${location.country}`,
      country: location.country,
      city
    },
    appearance: {
      has_hair: hasHair,
      hair_style: hairStyle,
      eye_color: eyeColor,
      skin_tone: skinTone,
      body_type: bodyType
    },
    trading_profile: tradingProfile,
    created_at: randomDate(CONFIG.timeRange.start, CONFIG.timeRange.end),
    last_active: randomDate(CONFIG.timeRange.start, CONFIG.timeRange.end),
    status: randomChoice(['active', 'inactive', 'suspended', 'premium'])
  };
}

// Market price history generator
function generateMarketHistory(marketId: string, category: string, days: number = 30): any[] {
  const history = [];
  const basePrice = randomInRange(1, 1000);
  let currentPrice = basePrice;

  for (let i = 0; i < days; i++) {
    // Price movement with some randomness
    const volatility = category === 'crypto' ? 0.05 : 0.02; // Crypto is more volatile
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice *= (1 + change);

    // Ensure price stays reasonable
    currentPrice = Math.max(0.01, Math.min(1000000, currentPrice));

    history.push({
      market_id: marketId,
      timestamp: Date.now() - (days - i) * 24 * 60 * 60 * 1000,
      price: parseFloat(currentPrice.toFixed(4)),
      volume: Math.floor(randomInRange(1000, 100000)),
      high: parseFloat((currentPrice * (1 + Math.random() * 0.05)).toFixed(4)),
      low: parseFloat((currentPrice * (1 - Math.random() * 0.05)).toFixed(4)),
      open: parseFloat((currentPrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(4))
    });
  }

  return history;
}

// Main data generation functions
function generateMarkets(): any[] {
  const markets = [];
  console.log('🏭 Generating market data...');

  // Generate sports markets
  for (let i = 0; i < CONFIG.markets.sports; i++) {
    markets.push(generateSportsMarket(i));
  }

  // Generate crypto markets
  for (let i = 0; i < CONFIG.markets.crypto; i++) {
    markets.push(generateCryptoMarket(i));
  }

  // Generate prediction markets
  for (let i = 0; i < CONFIG.markets.prediction; i++) {
    markets.push(generatePredictionMarket(i));
  }

  return markets;
}

function generateUsers(): any[] {
  const users = [];
  console.log('👥 Generating user profiles...');

  // Generate traders
  for (let i = 0; i < CONFIG.users.traders; i++) {
    users.push(generateUserProfile(i, 'trader'));
  }

  // Generate observers
  for (let i = CONFIG.users.traders; i < CONFIG.users.total; i++) {
    users.push(generateUserProfile(i, 'observer'));
  }

  return users;
}

function generateMarketHistories(markets: any[]): any[] {
  const histories = [];
  console.log('📈 Generating market price histories...');

  for (const market of markets.slice(0, 1000)) { // Generate history for first 1000 markets
    const history = generateMarketHistory(market.id, market.category);
    histories.push(...history);
  }

  return histories;
}

// Save data to files
function saveData(filename: string, data: any[]): void {
  const outputDir = join(process.cwd(), 'test-data');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filepath = join(outputDir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${data.length.toLocaleString()} records to ${filename}`);
}

// Statistics and validation
function generateStatistics(markets: any[], users: any[]): void {
  console.log('\n📊 Generated Data Statistics:');

  // Market statistics
  const marketStats = {
    total: markets.length,
    by_category: markets.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avg_price: markets.reduce((sum, m) => sum + m.price, 0) / markets.length,
    avg_volume: markets.reduce((sum, m) => sum + m.volume, 0) / markets.length
  };

  console.log('📈 Markets:', marketStats);

  // User statistics
  const userStats = {
    total: users.length,
    traders: users.filter(u => u.type === 'trader').length,
    observers: users.filter(u => u.type === 'observer').length,
    gender_distribution: users.reduce((acc, u) => {
      acc[u.demographics.gender] = (acc[u.demographics.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avg_age: users.reduce((sum, u) => sum + u.demographics.age, 0) / users.length,
    countries: [...new Set(users.map(u => u.demographics.country))].length
  };

  console.log('👥 Users:', userStats);

  // Demographic diversity
  const appearanceStats = {
    hair_distribution: users.reduce((acc, u) => {
      acc[u.appearance.hair_style] = (acc[u.appearance.hair_style] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bald_percentage: (users.filter(u => !u.appearance.has_hair).length / users.length * 100).toFixed(1) + '%'
  };

  console.log('🎨 Demographics:', appearanceStats);
}

// Main execution
async function main(): Promise<void> {
  const startTime = NanoTimer.now();
  console.log('🚀 Starting comprehensive test data generation...\n');

  try {
    // Generate all data
    const markets = generateMarkets();
    const users = generateUsers();
    const histories = generateMarketHistories(markets);

    // Save to files
    saveData('markets.json', markets);
    saveData('users.json', users);
    saveData('market_histories.json', histories);

    // Generate statistics
    generateStatistics(markets, users);

    const duration = NanoTimer.elapsed(startTime);
    console.log(`\n✅ Data generation completed in ${(duration / 1000).toFixed(2)}ms`);
    console.log(`📁 Test data saved to: ${join(process.cwd(), 'test-data')}`);

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export {
  generateMarkets,
  generateUsers,
  generateMarketHistories,
  generateUserProfile,
  generateSportsMarket,
  generateCryptoMarket,
  generatePredictionMarket
};
