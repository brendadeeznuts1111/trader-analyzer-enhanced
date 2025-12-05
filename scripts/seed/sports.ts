/**
 * Sports Event Seed Data Generator
 * Generates realistic sports betting market data with proper UUIDv5
 */

import { createHash } from 'crypto';
import { MARKET_NAMESPACES } from './markets';

/**
 * Parse UUID string to bytes
 */
function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
}

/**
 * RFC 4122 compliant UUIDv5 generator for sports markets
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
 * Sport to namespace mapping
 */
const SPORT_NAMESPACE_MAP: Record<Sport, string> = {
  basketball: MARKET_NAMESPACES.SPORTS_NBA,
  football: MARKET_NAMESPACES.SPORTS_NFL,
  baseball: MARKET_NAMESPACES.SPORTS_MLB,
  hockey: MARKET_NAMESPACES.SPORTS_NHL,
  soccer: MARKET_NAMESPACES.SPORTS_SOCCER,
  tennis: MARKET_NAMESPACES.SPORTS_TENNIS,
  mma: MARKET_NAMESPACES.SPORTS_MMA,
  golf: MARKET_NAMESPACES.SPORTS_GOLF,
  boxing: MARKET_NAMESPACES.SPORTS_BOXING,
  esports: MARKET_NAMESPACES.SPORTS_ESPORTS,
  cricket: MARKET_NAMESPACES.SPORTS_CRICKET,
  f1: MARKET_NAMESPACES.SPORTS_F1,
};

type Sport = 'basketball' | 'football' | 'baseball' | 'hockey' | 'soccer' | 'tennis' | 'mma' | 'golf' | 'boxing' | 'esports' | 'cricket' | 'f1';

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
}

interface SportsEvent {
  id: string;
  canonicalId: string;
  sport: Sport;
  league: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  status: 'scheduled' | 'live' | 'final' | 'postponed';
  venue: string;
  markets: SportsMarket[];
  createdAt: string;
  updatedAt: string;
}

interface SportsMarket {
  id: string;
  type: 'moneyline' | 'spread' | 'total' | 'prop';
  name: string;
  homeOdds: number;
  awayOdds: number;
  line?: number;
  overOdds?: number;
  underOdds?: number;
  volume: number;
  liquidityScore: number;
}

const TEAMS: Record<Sport, Team[]> = {
  basketball: [
    { id: 'lal', name: 'Lakers', abbreviation: 'LAL', city: 'Los Angeles' },
    { id: 'gsw', name: 'Warriors', abbreviation: 'GSW', city: 'Golden State' },
    { id: 'bos', name: 'Celtics', abbreviation: 'BOS', city: 'Boston' },
    { id: 'mia', name: 'Heat', abbreviation: 'MIA', city: 'Miami' },
    { id: 'den', name: 'Nuggets', abbreviation: 'DEN', city: 'Denver' },
    { id: 'phx', name: 'Suns', abbreviation: 'PHX', city: 'Phoenix' },
    { id: 'mil', name: 'Bucks', abbreviation: 'MIL', city: 'Milwaukee' },
    { id: 'phi', name: '76ers', abbreviation: 'PHI', city: 'Philadelphia' },
    { id: 'nyy', name: 'Knicks', abbreviation: 'NYK', city: 'New York' },
    { id: 'cle', name: 'Cavaliers', abbreviation: 'CLE', city: 'Cleveland' },
  ],
  football: [
    { id: 'kc', name: 'Chiefs', abbreviation: 'KC', city: 'Kansas City' },
    { id: 'sf', name: '49ers', abbreviation: 'SF', city: 'San Francisco' },
    { id: 'buf', name: 'Bills', abbreviation: 'BUF', city: 'Buffalo' },
    { id: 'dal', name: 'Cowboys', abbreviation: 'DAL', city: 'Dallas' },
    { id: 'phi', name: 'Eagles', abbreviation: 'PHI', city: 'Philadelphia' },
    { id: 'det', name: 'Lions', abbreviation: 'DET', city: 'Detroit' },
    { id: 'bal', name: 'Ravens', abbreviation: 'BAL', city: 'Baltimore' },
    { id: 'mia', name: 'Dolphins', abbreviation: 'MIA', city: 'Miami' },
    { id: 'gb', name: 'Packers', abbreviation: 'GB', city: 'Green Bay' },
    { id: 'hou', name: 'Texans', abbreviation: 'HOU', city: 'Houston' },
  ],
  baseball: [
    { id: 'nyy', name: 'Yankees', abbreviation: 'NYY', city: 'New York' },
    { id: 'lad', name: 'Dodgers', abbreviation: 'LAD', city: 'Los Angeles' },
    { id: 'hou', name: 'Astros', abbreviation: 'HOU', city: 'Houston' },
    { id: 'atl', name: 'Braves', abbreviation: 'ATL', city: 'Atlanta' },
    { id: 'tex', name: 'Rangers', abbreviation: 'TEX', city: 'Texas' },
    { id: 'phi', name: 'Phillies', abbreviation: 'PHI', city: 'Philadelphia' },
    { id: 'sd', name: 'Padres', abbreviation: 'SD', city: 'San Diego' },
    { id: 'nym', name: 'Mets', abbreviation: 'NYM', city: 'New York' },
  ],
  hockey: [
    { id: 'edm', name: 'Oilers', abbreviation: 'EDM', city: 'Edmonton' },
    { id: 'fla', name: 'Panthers', abbreviation: 'FLA', city: 'Florida' },
    { id: 'bos', name: 'Bruins', abbreviation: 'BOS', city: 'Boston' },
    { id: 'col', name: 'Avalanche', abbreviation: 'COL', city: 'Colorado' },
    { id: 'tor', name: 'Maple Leafs', abbreviation: 'TOR', city: 'Toronto' },
    { id: 'vgk', name: 'Golden Knights', abbreviation: 'VGK', city: 'Vegas' },
    { id: 'car', name: 'Hurricanes', abbreviation: 'CAR', city: 'Carolina' },
    { id: 'dal', name: 'Stars', abbreviation: 'DAL', city: 'Dallas' },
  ],
  soccer: [
    { id: 'mci', name: 'Manchester City', abbreviation: 'MCI', city: 'Manchester' },
    { id: 'ars', name: 'Arsenal', abbreviation: 'ARS', city: 'London' },
    { id: 'liv', name: 'Liverpool', abbreviation: 'LIV', city: 'Liverpool' },
    { id: 'rma', name: 'Real Madrid', abbreviation: 'RMA', city: 'Madrid' },
    { id: 'bar', name: 'Barcelona', abbreviation: 'BAR', city: 'Barcelona' },
    { id: 'bay', name: 'Bayern Munich', abbreviation: 'BAY', city: 'Munich' },
    { id: 'psg', name: 'Paris Saint-Germain', abbreviation: 'PSG', city: 'Paris' },
    { id: 'int', name: 'Inter Milan', abbreviation: 'INT', city: 'Milan' },
    { id: 'che', name: 'Chelsea', abbreviation: 'CHE', city: 'London' },
    { id: 'mun', name: 'Manchester United', abbreviation: 'MUN', city: 'Manchester' },
  ],
  tennis: [
    { id: 'djokovic', name: 'Novak Djokovic', abbreviation: 'DJO', city: 'Serbia' },
    { id: 'sinner', name: 'Jannik Sinner', abbreviation: 'SIN', city: 'Italy' },
    { id: 'alcaraz', name: 'Carlos Alcaraz', abbreviation: 'ALC', city: 'Spain' },
    { id: 'medvedev', name: 'Daniil Medvedev', abbreviation: 'MED', city: 'Russia' },
    { id: 'zverev', name: 'Alexander Zverev', abbreviation: 'ZVE', city: 'Germany' },
    { id: 'rune', name: 'Holger Rune', abbreviation: 'RUN', city: 'Denmark' },
  ],
  mma: [
    { id: 'jones', name: 'Jon Jones', abbreviation: 'JON', city: 'USA' },
    { id: 'aspinall', name: 'Tom Aspinall', abbreviation: 'ASP', city: 'UK' },
    { id: 'adesanya', name: 'Israel Adesanya', abbreviation: 'ADE', city: 'Nigeria' },
    { id: 'makhachev', name: 'Islam Makhachev', abbreviation: 'MAK', city: 'Russia' },
    { id: 'poatan', name: 'Alex Pereira', abbreviation: 'POA', city: 'Brazil' },
    { id: 'pantoja', name: 'Alexandre Pantoja', abbreviation: 'PAN', city: 'Brazil' },
  ],
  golf: [
    { id: 'scheffler', name: 'Scottie Scheffler', abbreviation: 'SCH', city: 'USA' },
    { id: 'mcilroy', name: 'Rory McIlroy', abbreviation: 'ROR', city: 'Northern Ireland' },
    { id: 'rahm', name: 'Jon Rahm', abbreviation: 'RAH', city: 'Spain' },
    { id: 'koepka', name: 'Brooks Koepka', abbreviation: 'KOE', city: 'USA' },
    { id: 'thomas', name: 'Justin Thomas', abbreviation: 'THO', city: 'USA' },
    { id: 'spieth', name: 'Jordan Spieth', abbreviation: 'SPI', city: 'USA' },
  ],
  boxing: [
    { id: 'crawford', name: 'Terence Crawford', abbreviation: 'CRA', city: 'USA' },
    { id: 'usyk', name: 'Oleksandr Usyk', abbreviation: 'USY', city: 'Ukraine' },
    { id: 'inoue', name: 'Naoya Inoue', abbreviation: 'INO', city: 'Japan' },
    { id: 'beterbiev', name: 'Artur Beterbiev', abbreviation: 'BET', city: 'Russia' },
    { id: 'canelo', name: 'Canelo Alvarez', abbreviation: 'CAN', city: 'Mexico' },
    { id: 'fury', name: 'Tyson Fury', abbreviation: 'FUR', city: 'UK' },
  ],
  esports: [
    { id: 't1', name: 'T1', abbreviation: 'T1', city: 'Seoul' },
    { id: 'geng', name: 'Gen.G', abbreviation: 'GEN', city: 'Seoul' },
    { id: 'fnc', name: 'Fnatic', abbreviation: 'FNC', city: 'London' },
    { id: 'g2', name: 'G2 Esports', abbreviation: 'G2', city: 'Berlin' },
    { id: 'navi', name: 'Natus Vincere', abbreviation: 'NAVI', city: 'Kyiv' },
    { id: 'faze', name: 'FaZe Clan', abbreviation: 'FAZE', city: 'Los Angeles' },
  ],
  cricket: [
    { id: 'ind', name: 'India', abbreviation: 'IND', city: 'Mumbai' },
    { id: 'aus', name: 'Australia', abbreviation: 'AUS', city: 'Sydney' },
    { id: 'eng', name: 'England', abbreviation: 'ENG', city: 'London' },
    { id: 'pak', name: 'Pakistan', abbreviation: 'PAK', city: 'Lahore' },
    { id: 'sa', name: 'South Africa', abbreviation: 'SA', city: 'Johannesburg' },
    { id: 'nz', name: 'New Zealand', abbreviation: 'NZ', city: 'Auckland' },
  ],
  f1: [
    { id: 'verstappen', name: 'Max Verstappen', abbreviation: 'VER', city: 'Netherlands' },
    { id: 'hamilton', name: 'Lewis Hamilton', abbreviation: 'HAM', city: 'UK' },
    { id: 'leclerc', name: 'Charles Leclerc', abbreviation: 'LEC', city: 'Monaco' },
    { id: 'norris', name: 'Lando Norris', abbreviation: 'NOR', city: 'UK' },
    { id: 'sainz', name: 'Carlos Sainz', abbreviation: 'SAI', city: 'Spain' },
    { id: 'russell', name: 'George Russell', abbreviation: 'RUS', city: 'UK' },
  ],
};

const LEAGUES: Record<Sport, string> = {
  basketball: 'NBA',
  football: 'NFL',
  baseball: 'MLB',
  hockey: 'NHL',
  soccer: 'Premier League',
  tennis: 'ATP',
  mma: 'UFC',
  golf: 'PGA',
  boxing: 'WBC/WBA',
  esports: 'LCK/LEC',
  cricket: 'ICC',
  f1: 'F1',
};

const VENUES: Record<Sport, string[]> = {
  basketball: ['Crypto.com Arena', 'Chase Center', 'TD Garden', 'Kaseya Center', 'Ball Arena', 'Madison Square Garden'],
  football: ['Arrowhead Stadium', 'Levis Stadium', 'Highmark Stadium', 'AT&T Stadium', 'SoFi Stadium', 'Lambeau Field'],
  baseball: ['Yankee Stadium', 'Dodger Stadium', 'Minute Maid Park', 'Truist Park', 'Fenway Park', 'Wrigley Field'],
  hockey: ['Rogers Place', 'Amerant Bank Arena', 'TD Garden', 'Ball Arena', 'Scotiabank Arena', 'T-Mobile Arena'],
  soccer: ['Etihad Stadium', 'Emirates Stadium', 'Anfield', 'Santiago Bernabeu', 'Camp Nou', 'Allianz Arena'],
  tennis: ['Rod Laver Arena', 'Wimbledon Centre Court', 'Arthur Ashe Stadium', 'Roland Garros', 'Indian Wells'],
  mma: ['T-Mobile Arena', 'Madison Square Garden', 'UFC Apex', 'O2 Arena', 'Abu Dhabi Arena'],
  golf: ['Augusta National', 'St Andrews', 'Pebble Beach', 'TPC Sawgrass', 'Royal Liverpool', 'Valhalla'],
  boxing: ['T-Mobile Arena', 'Madison Square Garden', 'AT&T Stadium', 'Kingdom Arena', 'Wembley Stadium'],
  esports: ['LoL Park', 'LEC Studio', 'PGL Arena', 'Riot Games Arena', 'BLAST Arena'],
  cricket: ['Melbourne Cricket Ground', 'Lords', 'Eden Gardens', 'The Oval', 'Sydney Cricket Ground'],
  f1: ['Monaco', 'Silverstone', 'Monza', 'Spa-Francorchamps', 'Suzuka', 'Circuit of the Americas'],
};

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function americanToDecimal(american: number): number {
  if (american > 0) {
    return 1 + american / 100;
  }
  return 1 - 100 / american;
}

function generateMoneylineOdds(): { homeOdds: number; awayOdds: number } {
  // Generate realistic American odds
  const favorite = randomInt(-350, -110);
  const underdog = randomInt(100, 300);

  // Randomly assign favorite
  if (Math.random() > 0.5) {
    return {
      homeOdds: americanToDecimal(favorite),
      awayOdds: americanToDecimal(underdog),
    };
  }
  return {
    homeOdds: americanToDecimal(underdog),
    awayOdds: americanToDecimal(favorite),
  };
}

function generateSportsMarkets(sport: Sport): SportsMarket[] {
  const markets: SportsMarket[] = [];
  const { homeOdds, awayOdds } = generateMoneylineOdds();

  // Moneyline
  markets.push({
    id: `ml-${Date.now()}-${randomInt(1000, 9999)}`,
    type: 'moneyline',
    name: 'Moneyline',
    homeOdds,
    awayOdds,
    volume: randomInt(50000, 2000000),
    liquidityScore: randomInt(70, 100),
  });

  // Spread
  const spreadLine = randomFloat(-14.5, 14.5, 1);
  markets.push({
    id: `sp-${Date.now()}-${randomInt(1000, 9999)}`,
    type: 'spread',
    name: `Spread ${spreadLine > 0 ? '+' : ''}${spreadLine}`,
    homeOdds: randomFloat(1.85, 2.0),
    awayOdds: randomFloat(1.85, 2.0),
    line: spreadLine,
    volume: randomInt(100000, 3000000),
    liquidityScore: randomInt(75, 100),
  });

  // Total
  const totalLines: Record<Sport, [number, number]> = {
    basketball: [200, 240],
    football: [35, 55],
    baseball: [6, 12],
    hockey: [4, 8],
    soccer: [1.5, 4.5],
    tennis: [18, 35],
    mma: [1.5, 3.5],
    golf: [265, 285],    // Tournament stroke totals
    boxing: [6.5, 12.5], // Round totals
    esports: [2.5, 4.5], // Map/game totals
    cricket: [280, 360], // Run totals
    f1: [15, 20],        // Cars to finish
  };

  const [min, max] = totalLines[sport];
  const totalLine = randomFloat(min, max, 1);
  markets.push({
    id: `tot-${Date.now()}-${randomInt(1000, 9999)}`,
    type: 'total',
    name: `Total ${totalLine}`,
    homeOdds: randomFloat(1.85, 2.0),
    awayOdds: randomFloat(1.85, 2.0),
    line: totalLine,
    overOdds: randomFloat(1.85, 2.0),
    underOdds: randomFloat(1.85, 2.0),
    volume: randomInt(80000, 2500000),
    liquidityScore: randomInt(70, 95),
  });

  return markets;
}

export function generateSportsEvents(count: number = 100): SportsEvent[] {
  const events: SportsEvent[] = [];
  const sports: Sport[] = [
    'basketball', 'football', 'baseball', 'hockey', 'soccer',
    'tennis', 'mma', 'golf', 'boxing', 'esports', 'cricket', 'f1'
  ];

  for (let i = 0; i < count; i++) {
    const sport = sports[i % sports.length];
    const teams = TEAMS[sport];
    const homeIndex = randomInt(0, teams.length - 1);
    let awayIndex = randomInt(0, teams.length - 1);
    while (awayIndex === homeIndex) {
      awayIndex = randomInt(0, teams.length - 1);
    }

    const homeTeam = teams[homeIndex];
    const awayTeam = teams[awayIndex];

    // Generate start time (past, now, or future)
    const hoursOffset = randomInt(-48, 168); // -2 days to +7 days
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + hoursOffset);

    // Determine status based on start time
    let status: SportsEvent['status'];
    const now = new Date();
    if (startTime > now) {
      status = 'scheduled';
    } else if (startTime.getTime() > now.getTime() - 3 * 60 * 60 * 1000) {
      status = Math.random() > 0.3 ? 'live' : 'final';
    } else {
      status = 'final';
    }

    const eventId = `${sport}-${homeTeam.abbreviation}-${awayTeam.abbreviation}-${startTime.toISOString().slice(0, 10)}`.toLowerCase();

    // Use sport-specific namespace for UUIDv5
    const namespace = SPORT_NAMESPACE_MAP[sport];

    events.push({
      id: eventId,
      canonicalId: generateUUID(`${LEAGUES[sport]}:${eventId}`, namespace),
      sport,
      league: LEAGUES[sport],
      homeTeam,
      awayTeam,
      startTime: startTime.toISOString(),
      status,
      venue: VENUES[sport][randomInt(0, VENUES[sport].length - 1)],
      markets: generateSportsMarkets(sport),
      createdAt: new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort by start time
  return events.sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export type { SportsEvent, SportsMarket, Team, Sport };
