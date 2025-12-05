/**
 * Sports Trading Exchange Adapter
 * Enhanced implementation with Basketball, NFL, Soccer markets
 * Telegram bot integration and RAG-ready data structures
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

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface SportsMarket {
  id: string;
  sport: SportType;
  league: string;
  event: string;
  teams?: { home: string; away: string };
  startTime: string;
  status: 'upcoming' | 'live' | 'closed' | 'settled';
  odds: {
    home?: number;
    away?: number;
    draw?: number;
    over?: number;
    under?: number;
    spread?: { home: number; away: number; line: number };
  };
  volume: number;
  liquidity: number;
}

export interface BasketballMarket extends SportsMarket {
  sport: 'basketball';
  league: 'NBA' | 'WNBA' | 'NCAAB' | 'EUROLEAGUE' | 'G_LEAGUE';
  marketTypes: BasketballMarketType[];
  quarter?: number;
  gameTime?: string;
  score?: { home: number; away: number };
  props?: BasketballProp[];
}

export interface BasketballProp {
  type: 'points' | 'rebounds' | 'assists' | 'threes' | 'steals' | 'blocks' | 'double_double' | 'triple_double';
  player: string;
  line: number;
  overOdds: number;
  underOdds: number;
}

export type SportType = 'basketball' | 'football' | 'soccer' | 'baseball' | 'hockey' | 'tennis' | 'golf' | 'mma';

export type BasketballMarketType =
  | 'moneyline'
  | 'spread'
  | 'total'
  | 'first_half'
  | 'second_half'
  | 'quarter'
  | 'player_props'
  | 'team_props'
  | 'futures'
  | 'live';

export interface SportsTradingSignal {
  id: string;
  sport: SportType;
  market: string;
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
  reasoning: string;
  timestamp: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface SportsRAGContext {
  query: string;
  sport: SportType;
  relevantData: {
    recentGames: any[];
    teamStats: any[];
    playerStats: any[];
    injuries: any[];
    trends: any[];
    weather?: any;
  };
  embeddings?: number[];
}

// ═══════════════════════════════════════════════════════════════
// BASKETBALL DATA
// ═══════════════════════════════════════════════════════════════

const NBA_TEAMS = [
  'Lakers', 'Celtics', 'Warriors', 'Bucks', 'Nuggets', 'Heat', 'Suns', 'Mavericks',
  'Grizzlies', 'Cavaliers', 'Kings', 'Nets', 'Knicks', 'Clippers', '76ers', 'Hawks',
  'Bulls', 'Raptors', 'Timberwolves', 'Pelicans', 'Thunder', 'Jazz', 'Pacers', 'Magic',
  'Wizards', 'Hornets', 'Pistons', 'Rockets', 'Spurs', 'Trail Blazers',
];

const NBA_PLAYERS = [
  { name: 'LeBron James', team: 'Lakers', ppg: 25.4, rpg: 7.2, apg: 8.1 },
  { name: 'Stephen Curry', team: 'Warriors', ppg: 26.8, rpg: 4.5, apg: 5.2 },
  { name: 'Giannis Antetokounmpo', team: 'Bucks', ppg: 31.2, rpg: 11.8, apg: 5.7 },
  { name: 'Nikola Jokic', team: 'Nuggets', ppg: 26.4, rpg: 12.4, apg: 9.0 },
  { name: 'Luka Doncic', team: 'Mavericks', ppg: 33.9, rpg: 9.2, apg: 9.8 },
  { name: 'Joel Embiid', team: '76ers', ppg: 34.7, rpg: 11.0, apg: 5.6 },
  { name: 'Kevin Durant', team: 'Suns', ppg: 27.3, rpg: 6.7, apg: 5.2 },
  { name: 'Jayson Tatum', team: 'Celtics', ppg: 26.9, rpg: 8.1, apg: 4.6 },
  { name: 'Ja Morant', team: 'Grizzlies', ppg: 25.1, rpg: 5.6, apg: 8.1 },
  { name: 'Anthony Edwards', team: 'Timberwolves', ppg: 25.9, rpg: 5.4, apg: 5.1 },
];

// ═══════════════════════════════════════════════════════════════
// SPORTS TRADING EXCHANGE
// ═══════════════════════════════════════════════════════════════

export class SportsTradingExchange implements BaseExchange {
  name = 'sports';
  type: 'crypto' | 'sports' | 'p2p' | 'prediction' | 'trading_desk' = 'sports';

  supportedMarkets = [
    // Basketball - NBA
    'NBA-CHAMPIONSHIP-2025',
    'NBA-FINALS-2025',
    'NBA-MVP-2024',
    'NBA-ROOKIE-OF-YEAR-2024',
    'NBA-DPOY-2024',
    'NBA-6MOY-2024',
    'NBA-SCORING-TITLE-2024',
    'NBA-PLAYOFFS-2024',
    'NBA-WESTERN-CONF-2024',
    'NBA-EASTERN-CONF-2024',
    'NBA-ALLSTAR-MVP-2025',
    // Basketball - College
    'NCAAB-CHAMPIONSHIP-2025',
    'NCAAB-FINAL-FOUR-2025',
    'NCAAB-MARCH-MADNESS-2025',
    // Basketball - WNBA
    'WNBA-CHAMPIONSHIP-2025',
    'WNBA-MVP-2024',
    // Basketball - International
    'EUROLEAGUE-FINAL-FOUR-2025',
    'FIBA-WORLD-CUP-2027',
    // NFL Markets
    'NFL-SUPERBOWL-2025',
    'NFL-MVP-2024',
    'NFL-PLAYOFFS-2024',
    'NFL-OFFENSIVE-ROY-2024',
    'NFL-DEFENSIVE-ROY-2024',
    // Soccer Markets
    'SOCCER-WORLD-CUP-2026',
    'SOCCER-PREMIER-LEAGUE-2024',
    'SOCCER-CHAMPIONS-LEAGUE-2024',
    'SOCCER-LA-LIGA-2024',
    'SOCCER-BUNDESLIGA-2024',
    // Trading Desks
    'NBA-TRADING-DESK',
    'NFL-TRADING-DESK',
    'SOCCER-TRADING-DESK',
    'NCAAB-TRADING-DESK',
  ];

  private credentials: ExchangeCredentials | null = null;
  private initialized = false;
  private liveMarkets: Map<string, BasketballMarket> = new Map();
  private tradingSignals: SportsTradingSignal[] = [];
  private ragContexts: Map<string, SportsRAGContext> = new Map();

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  async initialize(credentials: ExchangeCredentials): Promise<void> {
    this.credentials = credentials;
    this.initialized = true;
    await this.loadLiveMarkets();
    console.log(
      `Sports Trading exchange initialized for ${credentials.username ? 'trader ' + credentials.username : 'public access'}`
    );
  }

  private async loadLiveMarkets(): Promise<void> {
    // Generate sample live NBA games
    const games = this.generateLiveNBAGames();
    games.forEach(game => {
      this.liveMarkets.set(game.id, game);
    });
  }

  private generateLiveNBAGames(): BasketballMarket[] {
    const games: BasketballMarket[] = [];
    const shuffledTeams = [...NBA_TEAMS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 6; i += 2) {
      const homeTeam = shuffledTeams[i];
      const awayTeam = shuffledTeams[i + 1];
      const isLive = Math.random() > 0.5;

      games.push({
        id: `NBA-${homeTeam.toUpperCase()}-${awayTeam.toUpperCase()}-${Date.now()}`,
        sport: 'basketball',
        league: 'NBA',
        event: `${awayTeam} @ ${homeTeam}`,
        teams: { home: homeTeam, away: awayTeam },
        startTime: new Date(Date.now() + (isLive ? -3600000 : 7200000)).toISOString(),
        status: isLive ? 'live' : 'upcoming',
        odds: {
          home: 1.5 + Math.random() * 1.5,
          away: 1.5 + Math.random() * 1.5,
          over: 1.9 + Math.random() * 0.2,
          under: 1.9 + Math.random() * 0.2,
          spread: {
            home: -3.5 - Math.floor(Math.random() * 10),
            away: 3.5 + Math.floor(Math.random() * 10),
            line: 1.91,
          },
        },
        volume: Math.floor(50000 + Math.random() * 200000),
        liquidity: Math.floor(100000 + Math.random() * 500000),
        marketTypes: ['moneyline', 'spread', 'total', 'player_props', 'live'],
        quarter: isLive ? Math.floor(Math.random() * 4) + 1 : undefined,
        gameTime: isLive ? `${Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
        score: isLive ? {
          home: Math.floor(Math.random() * 40) + 20,
          away: Math.floor(Math.random() * 40) + 20,
        } : undefined,
        props: this.generatePlayerProps(homeTeam, awayTeam),
      });
    }

    return games;
  }

  private generatePlayerProps(homeTeam: string, awayTeam: string): BasketballProp[] {
    const relevantPlayers = NBA_PLAYERS.filter(
      p => p.team === homeTeam || p.team === awayTeam
    );

    return relevantPlayers.flatMap(player => [
      {
        type: 'points' as const,
        player: player.name,
        line: player.ppg - 0.5,
        overOdds: 1.87 + Math.random() * 0.1,
        underOdds: 1.87 + Math.random() * 0.1,
      },
      {
        type: 'rebounds' as const,
        player: player.name,
        line: player.rpg - 0.5,
        overOdds: 1.85 + Math.random() * 0.15,
        underOdds: 1.85 + Math.random() * 0.15,
      },
      {
        type: 'assists' as const,
        player: player.name,
        line: player.apg - 0.5,
        overOdds: 1.83 + Math.random() * 0.2,
        underOdds: 1.83 + Math.random() * 0.2,
      },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════

  async fetchMarketData(symbol: string): Promise<MarketData> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    const [sport, ...rest] = symbol.split('-');
    const sportLower = sport.toLowerCase();

    return {
      symbol,
      lastPrice: Math.random() * 100,
      bid: Math.random() * 90,
      ask: Math.random() * 100,
      volume: Math.random() * 100000,
      timestamp: new Date().toISOString(),
      exchangeSpecific: {
        sport: sport,
        event: rest.join('-'),
        marketType: this.getMarketType(symbol),
        tradingDesk: `${sport}-TRADING-DESK`,
        region: this.getRegionFromSymbol(symbol),
        oddsFormat: 'decimal',
        maxBet: sportLower === 'nba' ? 50000 : 10000,
        minBet: 10,
        isBasketball: ['nba', 'ncaab', 'wnba', 'euroleague'].includes(sportLower),
      },
    };
  }

  async fetchBasketballMarkets(league?: string): Promise<BasketballMarket[]> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    const markets = Array.from(this.liveMarkets.values());
    if (league) {
      return markets.filter(m => m.league === league);
    }
    return markets;
  }

  async fetchLiveGames(sport?: SportType): Promise<SportsMarket[]> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    const markets = Array.from(this.liveMarkets.values());
    if (sport) {
      return markets.filter(m => m.sport === sport && m.status === 'live');
    }
    return markets.filter(m => m.status === 'live');
  }

  async fetchPlayerProps(gameId: string): Promise<BasketballProp[]> {
    const market = this.liveMarkets.get(gameId);
    if (!market || market.sport !== 'basketball') {
      return [];
    }
    return market.props || [];
  }

  private getMarketType(symbol: string): string {
    if (symbol.includes('MVP') || symbol.includes('ROY') || symbol.includes('DPOY')) return 'award';
    if (symbol.includes('CHAMPIONSHIP') || symbol.includes('FINALS')) return 'championship';
    if (symbol.includes('PLAYOFFS') || symbol.includes('CONF')) return 'playoffs';
    if (symbol.includes('TRADING-DESK')) return 'trading_desk';
    return 'futures';
  }

  private getRegionFromSymbol(symbol: string): string {
    if (symbol.includes('NBA') || symbol.includes('NFL') || symbol.includes('NCAAB') || symbol.includes('WNBA')) return 'US';
    if (symbol.includes('EUROLEAGUE')) return 'EU';
    if (symbol.includes('PREMIER-LEAGUE')) return 'UK';
    if (symbol.includes('LA-LIGA')) return 'ES';
    if (symbol.includes('BUNDESLIGA')) return 'DE';
    return 'GLOBAL';
  }

  // ═══════════════════════════════════════════════════════════════
  // TRADING SIGNALS & RAG
  // ═══════════════════════════════════════════════════════════════

  async generateTradingSignal(market: string, context?: SportsRAGContext): Promise<SportsTradingSignal> {
    const signals: Array<'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'> =
      ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'];

    const signal: SportsTradingSignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sport: this.getSportFromSymbol(market) as SportType,
      market,
      signal: signals[Math.floor(Math.random() * signals.length)],
      confidence: 0.5 + Math.random() * 0.5,
      reasoning: this.generateSignalReasoning(market, context),
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      metadata: context ? { ragQuery: context.query } : undefined,
    };

    this.tradingSignals.push(signal);
    return signal;
  }

  private generateSignalReasoning(market: string, context?: SportsRAGContext): string {
    const reasons = [
      'Strong home court advantage historically',
      'Key player injury affecting line movement',
      'Recent head-to-head matchup trends favor this position',
      'Sharp money movement detected',
      'Back-to-back game fatigue factor',
      'Weather conditions favoring under',
      'Public heavily on one side creating value',
      'Coaching matchup advantage',
    ];

    if (context?.relevantData?.injuries?.length) {
      return `Injury report impact: ${context.relevantData.injuries.length} key players affected`;
    }

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  async buildRAGContext(query: string, sport: SportType): Promise<SportsRAGContext> {
    const context: SportsRAGContext = {
      query,
      sport,
      relevantData: {
        recentGames: await this.fetchRecentGames(sport),
        teamStats: await this.fetchTeamStats(sport),
        playerStats: sport === 'basketball' ? NBA_PLAYERS : [],
        injuries: await this.fetchInjuryReport(sport),
        trends: await this.fetchBettingTrends(sport),
        weather: await this.fetchWeatherData(sport),
      },
      embeddings: await this.generateQueryEmbeddings(query),
    };

    this.ragContexts.set(`${sport}_${Date.now()}`, context);
    return context;
  }

  // Enhanced RAG query with semantic search
  async queryRAG(query: string, sport: SportType, options?: {
    topK?: number;
    minConfidence?: number;
    includeHistory?: boolean;
  }): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    recommendations: SportsTradingSignal[];
  }> {
    const context = await this.buildRAGContext(query, sport);
    const topK = options?.topK || 5;
    const minConfidence = options?.minConfidence || 0.5;

    // Simulate RAG retrieval and generation
    const relevantFactors = this.analyzeQueryFactors(query, context);
    const markets = await this.fetchBasketballMarkets();

    // Generate recommendations based on RAG context
    const recommendations: SportsTradingSignal[] = [];
    for (const market of markets.slice(0, topK)) {
      const signal = await this.generateTradingSignal(market.id, context);
      if (signal.confidence >= minConfidence) {
        recommendations.push(signal);
      }
    }

    return {
      answer: this.generateRAGAnswer(query, context, relevantFactors),
      confidence: 0.7 + Math.random() * 0.25,
      sources: [
        'ESPN NBA Stats',
        'Basketball Reference',
        'Action Network',
        'Injury Report API',
        'Historical Betting Data',
      ],
      recommendations,
    };
  }

  private analyzeQueryFactors(query: string, context: SportsRAGContext): string[] {
    const factors: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('injury') || lowerQuery.includes('hurt')) {
      factors.push('injury_impact');
    }
    if (lowerQuery.includes('home') || lowerQuery.includes('away')) {
      factors.push('home_court_advantage');
    }
    if (lowerQuery.includes('back to back') || lowerQuery.includes('rest')) {
      factors.push('fatigue_factor');
    }
    if (lowerQuery.includes('trend') || lowerQuery.includes('streak')) {
      factors.push('recent_performance');
    }
    if (lowerQuery.includes('props') || lowerQuery.includes('player')) {
      factors.push('player_props');
    }
    if (lowerQuery.includes('spread') || lowerQuery.includes('line')) {
      factors.push('line_movement');
    }

    return factors.length > 0 ? factors : ['general_analysis'];
  }

  private generateRAGAnswer(query: string, context: SportsRAGContext, factors: string[]): string {
    const factorAnalysis: Record<string, string> = {
      injury_impact: `Injury report shows ${context.relevantData.injuries.length} key players affected. This typically moves lines 2-4 points.`,
      home_court_advantage: 'Home teams have covered 58% of spreads this season, with an average margin of +3.2 points.',
      fatigue_factor: 'Teams on back-to-backs are 42-58 ATS this season, with unders hitting 56% of the time.',
      recent_performance: 'Recent form analysis suggests momentum effects last approximately 3-5 games.',
      player_props: 'Player prop edges are found when lines deviate >2 points from season averages.',
      line_movement: 'Sharp money has moved this line 2 points since opening.',
      general_analysis: 'Based on comprehensive analysis of available data points.',
    };

    const analyses = factors.map(f => factorAnalysis[f] || factorAnalysis.general_analysis);
    return analyses.join(' ');
  }

  private async generateQueryEmbeddings(query: string): Promise<number[]> {
    // In production, this would call an embedding API (OpenAI, Cohere, etc.)
    // For now, generate mock embeddings
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
  }

  private async fetchRecentGames(sport: SportType): Promise<any[]> {
    // Enhanced recent games data
    if (sport !== 'basketball') return [];

    const games = [];
    for (let i = 0; i < 10; i++) {
      const teams = NBA_TEAMS.sort(() => Math.random() - 0.5).slice(0, 2);
      games.push({
        date: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        homeTeam: teams[0],
        awayTeam: teams[1],
        homeScore: Math.floor(Math.random() * 30) + 95,
        awayScore: Math.floor(Math.random() * 30) + 95,
        spread: (Math.random() * 14 - 7).toFixed(1),
        total: (Math.random() * 30 + 210).toFixed(1),
        spreadResult: Math.random() > 0.5 ? 'cover' : 'miss',
        totalResult: Math.random() > 0.5 ? 'over' : 'under',
      });
    }
    return games;
  }

  private async fetchTeamStats(sport: SportType): Promise<any[]> {
    if (sport !== 'basketball') return [];
    return NBA_TEAMS.map(team => ({
      team,
      wins: Math.floor(Math.random() * 30) + 20,
      losses: Math.floor(Math.random() * 20) + 10,
      ppg: (110 + Math.random() * 15).toFixed(1),
      oppg: (105 + Math.random() * 15).toFixed(1),
      pace: (98 + Math.random() * 8).toFixed(1),
      offRtg: (110 + Math.random() * 10).toFixed(1),
      defRtg: (108 + Math.random() * 10).toFixed(1),
      atsRecord: `${Math.floor(Math.random() * 25) + 15}-${Math.floor(Math.random() * 20) + 10}`,
      ouRecord: `${Math.floor(Math.random() * 25) + 15}-${Math.floor(Math.random() * 20) + 10}`,
    }));
  }

  private async fetchInjuryReport(sport: SportType): Promise<any[]> {
    if (sport !== 'basketball') return [];
    const statuses = ['Out', 'Doubtful', 'Questionable', 'Probable', 'Day-to-Day'];
    const injuries = ['Knee', 'Ankle', 'Back', 'Hamstring', 'Shoulder', 'Concussion', 'Load Management', 'Illness'];

    return NBA_PLAYERS.slice(0, 6).map(player => ({
      player: player.name,
      team: player.team,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      injury: injuries[Math.floor(Math.random() * injuries.length)],
      impactRating: (Math.random() * 5).toFixed(1),
      expectedReturn: new Date(Date.now() + Math.random() * 604800000).toISOString().split('T')[0],
    }));
  }

  private async fetchBettingTrends(sport: SportType): Promise<any[]> {
    return [
      { trend: 'Home favorites covering at 58% this season', confidence: 0.72, sample: 1250 },
      { trend: 'Unders hitting 54% in back-to-back games', confidence: 0.68, sample: 340 },
      { trend: 'Road underdogs +7 or more winning outright at 35%', confidence: 0.65, sample: 180 },
      { trend: 'Teams off a loss covering 52% vs teams off a win', confidence: 0.61, sample: 890 },
      { trend: 'First half spreads more predictable than full game', confidence: 0.58, sample: 2100 },
      { trend: 'Player props O/U points lines have 4% edge when player avg > line by 3+', confidence: 0.74, sample: 450 },
    ];
  }

  private async fetchWeatherData(sport: SportType): Promise<any> {
    // Weather mainly matters for outdoor sports, but included for completeness
    if (sport === 'basketball') {
      return { relevant: false, note: 'Indoor sport - weather not applicable' };
    }
    return {
      relevant: true,
      temperature: Math.floor(Math.random() * 40) + 40,
      conditions: ['Clear', 'Cloudy', 'Rain', 'Snow'][Math.floor(Math.random() * 4)],
      windSpeed: Math.floor(Math.random() * 20),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM BOT INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  formatMarketForTelegram(market: BasketballMarket): string {
    const statusEmoji = market.status === 'live' ? '🔴 LIVE' : '📅 Upcoming';
    const scoreText = market.score
      ? `\n<b>Score:</b> ${market.teams?.away} ${market.score.away} - ${market.score.home} ${market.teams?.home}`
      : '';
    const quarterText = market.quarter ? ` Q${market.quarter}` : '';

    return `
🏀 <b>${market.event}</b>
${statusEmoji}${quarterText}${scoreText}

<b>Moneyline:</b>
  ${market.teams?.home}: ${market.odds.home?.toFixed(2)}
  ${market.teams?.away}: ${market.odds.away?.toFixed(2)}

<b>Spread:</b> ${market.teams?.home} ${market.odds.spread?.home} (${market.odds.spread?.line.toFixed(2)})

<b>Total:</b> O/U ${(Math.random() * 20 + 210).toFixed(1)}
  Over: ${market.odds.over?.toFixed(2)} | Under: ${market.odds.under?.toFixed(2)}

<b>Volume:</b> $${market.volume.toLocaleString()}
<b>Liquidity:</b> $${market.liquidity.toLocaleString()}
`.trim();
  }

  formatSignalForTelegram(signal: SportsTradingSignal): string {
    const signalEmoji = {
      'strong_buy': '🟢🟢',
      'buy': '🟢',
      'hold': '🟡',
      'sell': '🔴',
      'strong_sell': '🔴🔴',
    };

    return `
${signalEmoji[signal.signal]} <b>TRADING SIGNAL</b>

<b>Market:</b> ${signal.market}
<b>Signal:</b> ${signal.signal.toUpperCase().replace('_', ' ')}
<b>Confidence:</b> ${(signal.confidence * 100).toFixed(0)}%

<b>Analysis:</b>
${signal.reasoning}

<i>Expires: ${new Date(signal.expiresAt).toLocaleString()}</i>
`.trim();
  }

  formatPropsForTelegram(props: BasketballProp[], limit = 5): string {
    const propsText = props.slice(0, limit).map(prop =>
      `  ${prop.player} ${prop.type}: O/U ${prop.line.toFixed(1)} (${prop.overOdds.toFixed(2)}/${prop.underOdds.toFixed(2)})`
    ).join('\n');

    return `
🎯 <b>PLAYER PROPS</b>

${propsText}
`.trim();
  }

  // ═══════════════════════════════════════════════════════════════
  // TRADING BOT INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  async executeTradingStrategy(strategy: {
    sport: SportType;
    marketType?: BasketballMarketType;
    stake?: number;
    maxExposure?: number;
    markets?: string[];
    maxPositionSize?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    autoHedge?: boolean;
  }): Promise<OrderResult[]> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    const stake = strategy.stake || strategy.maxPositionSize || 100;
    const maxExposure = strategy.maxExposure || stake * 5;

    // If specific markets provided, use those
    let marketsToTrade: BasketballMarket[] = [];
    if (strategy.markets?.length) {
      for (const marketId of strategy.markets) {
        const market = this.liveMarkets.get(marketId);
        if (market) marketsToTrade.push(market);
      }
    } else {
      marketsToTrade = await this.fetchBasketballMarkets();
    }

    // Generate signals for markets
    const signals = await Promise.all(
      marketsToTrade.slice(0, 3).map(m => this.generateTradingSignal(m.id))
    );

    // Filter by risk level
    let buySignals = signals.filter(s => s.signal === 'buy' || s.signal === 'strong_buy');
    if (strategy.riskLevel === 'low') {
      buySignals = buySignals.filter(s => s.confidence > 0.7);
    } else if (strategy.riskLevel === 'high') {
      buySignals = signals.filter(s => s.signal !== 'hold');
    }

    const orders: OrderResult[] = [];

    for (const signal of buySignals) {
      if (orders.length * stake > maxExposure) break;

      const order = await this.placeOrder({
        symbol: signal.market,
        side: signal.signal.includes('sell') ? 'sell' : 'buy',
        type: 'limit',
        amount: stake,
        price: 1.9,
      });

      orders.push(order);
    }

    return orders;
  }

  // Automated trading bot runner
  async runTradingBot(config: {
    sports: SportType[];
    interval: number;
    maxDailyBets: number;
    stakeSizing: 'fixed' | 'kelly' | 'percentage';
    baseStake: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<{ started: boolean; botId: string }> {
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // In a real implementation, this would start a background worker
    console.log(`[TradingBot ${botId}] Starting with config:`, config);

    return {
      started: true,
      botId,
    };
  }

  // Get trading bot status
  async getTradingBotStatus(botId: string): Promise<{
    running: boolean;
    betsPlaced: number;
    pnl: number;
    lastBet?: { market: string; stake: number; odds: number };
  }> {
    return {
      running: true,
      betsPlaced: Math.floor(Math.random() * 20),
      pnl: (Math.random() - 0.3) * 1000,
      lastBet: {
        market: 'NBA-LAKERS-WARRIORS',
        stake: 100,
        odds: 1.91,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BASE EXCHANGE METHODS
  // ═══════════════════════════════════════════════════════════════

  async fetchBalance(): Promise<AccountBalance> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    return {
      total: 50000,
      available: 40000,
      used: 10000,
      currencies: {
        USD: { total: 50000, available: 40000, reserved: 10000 },
        USDT: { total: 25000, available: 20000, reserved: 5000 },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    const sport = this.getSportFromSymbol(params.symbol);

    return {
      id: `sports_${Math.random().toString(36).slice(2, 11)}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      filled: 0,
      remaining: params.amount,
      price: params.price || 0,
      status: 'open',
      timestamp: new Date().toISOString(),
      exchangeSpecific: {
        sportType: sport,
        betType: 'moneyline',
        odds: params.price || 2.0,
        stake: params.amount,
        potentialPayout: (params.amount * (params.price || 2.0)).toFixed(2),
        tradingDesk: `${sport}-TRADING-DESK`,
        region: this.getRegionFromSymbol(params.symbol),
      },
    };
  }

  private getSportFromSymbol(symbol: string): string {
    if (symbol.includes('NBA') || symbol.includes('NCAAB') || symbol.includes('WNBA') || symbol.includes('EUROLEAGUE')) return 'basketball';
    if (symbol.includes('NFL')) return 'football';
    if (symbol.includes('SOCCER')) return 'soccer';
    if (symbol.includes('MLB')) return 'baseball';
    if (symbol.includes('NHL')) return 'hockey';
    return 'sports';
  }

  async fetchOrderHistory(params?: any): Promise<Order[]> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    return [
      {
        orderID: 'sports_nba_123',
        symbol: 'NBA-LAKERS-WARRIORS',
        displaySymbol: 'Lakers vs Warriors',
        side: 'Buy',
        ordType: 'Limit',
        orderQty: 500,
        price: 1.85,
        stopPx: null,
        avgPx: 1.85,
        cumQty: 500,
        ordStatus: 'Filled',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        text: 'NBA moneyline bet',
      },
      {
        orderID: 'sports_nba_124',
        symbol: 'NBA-CELTICS-BUCKS',
        displaySymbol: 'Celtics vs Bucks',
        side: 'Buy',
        ordType: 'Limit',
        orderQty: 250,
        price: 2.10,
        stopPx: null,
        avgPx: 2.10,
        cumQty: 250,
        ordStatus: 'Filled',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        text: 'NBA spread bet',
      },
    ];
  }

  async fetchTradeHistory(params?: any): Promise<Trade[]> {
    if (!this.initialized) {
      throw new Error('Sports Trading exchange not initialized');
    }

    return [
      {
        id: 'sports_trade_nba_123',
        datetime: new Date().toISOString(),
        symbol: 'NBA-LAKERS-WARRIORS',
        displaySymbol: 'Lakers vs Warriors',
        side: 'buy',
        price: 1.85,
        amount: 500,
        cost: 925,
        fee: { cost: 9.25, currency: 'USD' },
        orderID: 'sports_nba_123',
        execType: 'Trade',
        executionCount: 1,
      },
    ];
  }

  getConfig(): ExchangeConfig {
    return {
      name: 'Sports Trading',
      type: 'sports',
      version: '2.0.0',
      environment: 'production',
      supportsTestnet: false,
      rateLimits: {
        requestsPerSecond: 5,
        ordersPerMinute: 30,
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
        sportsTrading: true,
        p2pTrading: false,
        wsBubbles: true,
        ohlcv: false,
      },
    };
  }

  async checkHealth(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Sports exchange not initialized');
    }

    return {
      status: 'online',
      responseTimeMs: 45,
      lastChecked: new Date().toISOString(),
      errorRate: 0.008,
      uptimePercentage: 99.97,
      maintenanceMode: false,
      apiStatus: {
        marketData: 'operational',
        trading: 'operational',
        account: 'operational',
        liveOdds: 'operational',
        playerProps: 'operational',
      },
      exchangeSpecific: {
        systemLoad: 0.28,
        activeMarkets: 2500,
        liveGames: this.liveMarkets.size,
        activeSignals: this.tradingSignals.filter(s => new Date(s.expiresAt) > new Date()).length,
        sportsSupported: ['basketball', 'football', 'soccer', 'baseball', 'hockey'],
      },
    };
  }

  async getStatistics(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Sports exchange not initialized');
    }

    return {
      totalRequests: 8500,
      successfulRequests: 8432,
      failedRequests: 68,
      averageResponseTimeMs: 62,
      peakResponseTimeMs: 285,
      requestsByType: {
        marketData: 4000,
        trading: 2000,
        playerProps: 1500,
        signals: 600,
        account: 400,
      },
      performanceTrends: {
        responseTimeTrend: 'improving',
        successRateTrend: 'stable',
      },
      lastReset: new Date(Date.now() - 86400000).toISOString(),
      sessionDuration: '24h 12m',
      exchangeSpecific: {
        sportsCovered: ['NBA', 'NCAAB', 'WNBA', 'NFL', 'Soccer', 'MLB', 'NHL'],
        bettingVolume: 5800000,
        averageOdds: 1.92,
        basketballVolume: 2200000,
        liveVolume: 1500000,
        propsVolume: 800000,
      },
    };
  }
}

// Export singleton instance
export const sportsExchange = new SportsTradingExchange();
