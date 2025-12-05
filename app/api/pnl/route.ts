import { NextRequest, NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '@/lib/api-headers';
import { createPreflightResponse } from '@/lib/security/profiles';

// CORS preflight handler
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * Monthly P&L Data Types
 */
interface MonthlyPnL {
  month: string;           // "YYYY-MM" format
  year: number;
  monthNum: number;
  monthName: string;
  pnl: number;             // Net P&L in base currency
  funding: number;         // Funding payments
  fees: number;            // Trading fees
  trades: number;          // Trade count
  winRate: number;         // Win rate percentage
  avgWin: number;          // Average winning trade
  avgLoss: number;         // Average losing trade
  profitFactor: number;    // Gross profit / gross loss
  roi: number;             // Return on investment %
  drawdown: number;        // Max drawdown during month
  byMarket: Record<string, MarketPnL>;
}

interface MarketPnL {
  symbol: string;
  displayName: string;
  type: 'crypto' | 'sports' | 'prediction' | 'perpetual';
  pnl: number;
  trades: number;
  winRate: number;
  volume: number;
}

interface YearlyPnL {
  year: number;
  totalPnl: number;
  totalFunding: number;
  totalFees: number;
  totalTrades: number;
  avgMonthlyPnl: number;
  profitableMonths: number;
  months: MonthlyPnL[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Generate realistic monthly P&L data
 */
function generateMonthlyPnL(year: number, month: number, baseBalance: number): MonthlyPnL {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  // Generate random but realistic trading metrics
  const isPositive = Math.random() > 0.35; // 65% profitable months
  const volatility = Math.random() * 0.15 + 0.05; // 5-20% monthly volatility

  const pnlPercent = isPositive
    ? Math.random() * volatility
    : -Math.random() * volatility * 0.7;

  const pnl = baseBalance * pnlPercent;
  const funding = (Math.random() - 0.5) * baseBalance * 0.01;
  const trades = Math.floor(Math.random() * 200 + 50);
  const winRate = isPositive ? 0.45 + Math.random() * 0.2 : 0.35 + Math.random() * 0.15;

  const grossProfit = isPositive ? pnl * 1.3 : Math.abs(pnl) * 0.7;
  const grossLoss = isPositive ? pnl * 0.3 : Math.abs(pnl) * 1.3;
  const winningTrades = Math.floor(trades * winRate);
  const losingTrades = trades - winningTrades;

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? -grossLoss / losingTrades : 0;
  const fees = trades * (Math.random() * 5 + 2); // $2-7 avg fee per trade

  // Generate market breakdown
  const markets: Record<string, MarketPnL> = {};
  const marketTypes = [
    { symbol: 'BTCUSD', displayName: 'Bitcoin Perpetual', type: 'perpetual' as const, weight: 0.4 },
    { symbol: 'ETHUSD', displayName: 'Ethereum Perpetual', type: 'perpetual' as const, weight: 0.25 },
    { symbol: 'SOLUSD', displayName: 'Solana Perpetual', type: 'perpetual' as const, weight: 0.15 },
    { symbol: 'NFL-SPREAD', displayName: 'NFL Spread Bets', type: 'sports' as const, weight: 0.08 },
    { symbol: 'NBA-ML', displayName: 'NBA Moneyline', type: 'sports' as const, weight: 0.07 },
    { symbol: 'PRES-2028', displayName: 'Presidential 2028', type: 'prediction' as const, weight: 0.05 },
  ];

  let remainingPnl = pnl;
  let remainingTrades = trades;

  marketTypes.forEach((market, idx) => {
    const isLast = idx === marketTypes.length - 1;
    const marketPnl = isLast ? remainingPnl : pnl * market.weight * (0.8 + Math.random() * 0.4);
    const marketTrades = isLast ? remainingTrades : Math.floor(trades * market.weight * (0.8 + Math.random() * 0.4));

    remainingPnl -= marketPnl;
    remainingTrades -= marketTrades;

    markets[market.symbol] = {
      symbol: market.symbol,
      displayName: market.displayName,
      type: market.type,
      pnl: marketPnl,
      trades: Math.max(1, marketTrades),
      winRate: winRate * (0.85 + Math.random() * 0.3),
      volume: marketTrades * (Math.random() * 10000 + 5000),
    };
  });

  return {
    month: monthStr,
    year,
    monthNum: month,
    monthName: MONTH_NAMES[month - 1],
    pnl,
    funding,
    fees,
    trades,
    winRate,
    avgWin,
    avgLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
    roi: pnlPercent * 100,
    drawdown: Math.abs(pnlPercent) * (Math.random() * 0.5 + 0.5) * 100,
    byMarket: markets,
  };
}

/**
 * Generate yearly P&L summary
 */
function generateYearlyPnL(year: number, baseBalance: number): YearlyPnL {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const maxMonth = year === currentYear ? currentMonth : 12;
  const months: MonthlyPnL[] = [];

  let balance = baseBalance;

  for (let month = 1; month <= maxMonth; month++) {
    const monthlyData = generateMonthlyPnL(year, month, balance);
    months.push(monthlyData);
    balance += monthlyData.pnl;
  }

  const totalPnl = months.reduce((sum, m) => sum + m.pnl, 0);
  const totalFunding = months.reduce((sum, m) => sum + m.funding, 0);
  const totalFees = months.reduce((sum, m) => sum + m.fees, 0);
  const totalTrades = months.reduce((sum, m) => sum + m.trades, 0);
  const profitableMonths = months.filter(m => m.pnl > 0).length;

  return {
    year,
    totalPnl,
    totalFunding,
    totalFees,
    totalTrades,
    avgMonthlyPnl: months.length > 0 ? totalPnl / months.length : 0,
    profitableMonths,
    months,
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
  const view = searchParams.get('view') || 'monthly'; // 'monthly' | 'yearly' | 'all'
  const marketType = searchParams.get('marketType'); // Filter by market type
  const baseBalance = parseFloat(searchParams.get('balance') || '100000');

  try {
    let result: any;

    if (view === 'yearly' || view === 'all') {
      // Return multiple years
      const startYear = view === 'all' ? 2023 : year;
      const endYear = new Date().getFullYear();

      const years: YearlyPnL[] = [];
      for (let y = startYear; y <= endYear; y++) {
        years.push(generateYearlyPnL(y, baseBalance));
      }

      const grandTotalPnl = years.reduce((sum, y) => sum + y.totalPnl, 0);
      const grandTotalTrades = years.reduce((sum, y) => sum + y.totalTrades, 0);

      result = {
        view,
        years,
        summary: {
          totalPnl: grandTotalPnl,
          totalTrades: grandTotalTrades,
          yearsTracked: years.length,
          avgYearlyPnl: years.length > 0 ? grandTotalPnl / years.length : 0,
          bestYear: years.reduce((best, y) => y.totalPnl > best.totalPnl ? y : best, years[0]),
          worstYear: years.reduce((worst, y) => y.totalPnl < worst.totalPnl ? y : worst, years[0]),
        },
      };
    } else if (month) {
      // Return specific month
      const monthlyData = generateMonthlyPnL(year, month, baseBalance);

      // Filter by market type if specified
      if (marketType) {
        const filteredMarkets: Record<string, MarketPnL> = {};
        Object.entries(monthlyData.byMarket).forEach(([key, market]) => {
          if (market.type === marketType) {
            filteredMarkets[key] = market;
          }
        });
        monthlyData.byMarket = filteredMarkets;
      }

      result = {
        view: 'month',
        month: monthlyData,
      };
    } else {
      // Return full year monthly breakdown
      const yearlyData = generateYearlyPnL(year, baseBalance);

      // Filter by market type if specified
      if (marketType) {
        yearlyData.months.forEach(m => {
          const filteredMarkets: Record<string, MarketPnL> = {};
          Object.entries(m.byMarket).forEach(([key, market]) => {
            if (market.type === marketType) {
              filteredMarkets[key] = market;
            }
          });
          m.byMarket = filteredMarkets;
        });
      }

      result = {
        view: 'monthly',
        year: yearlyData,
        chartData: yearlyData.months.map(m => ({
          month: m.month,
          label: m.monthName.slice(0, 3),
          pnl: m.pnl,
          funding: m.funding,
          fees: m.fees,
          trades: m.trades,
          roi: m.roi,
        })),
      };
    }

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: result,
      custom: {
        'X-Data-Type': 'pnl',
        'X-View': view,
        'X-Year': String(year),
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('P&L API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to load P&L data',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
