import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const profilePath = path.join(process.cwd(), 'trader_profile_analysis.json');

    if (!fs.existsSync(profilePath)) {
      const { body, init } = createErrorResponse(
        'Profile analysis not found',
        404,
        undefined,
        request
      );
      return NextResponse.json(body, init);
    }

    const rawData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

    // Transform to frontend expected format
    const profile = {
      basic_info: {
        trading_style: rawData.trading_frequency?.frequency_level?.includes('High')
          ? 'day_trader'
          : rawData.trading_frequency?.frequency_level?.includes('Low')
            ? 'swing_trader'
            : 'day_trader',
        risk_preference: rawData.risk_preference?.risk_level?.includes('High')
          ? 'aggressive'
          : rawData.risk_preference?.risk_level?.includes('Low')
            ? 'conservative'
            : 'moderate',
        difficulty_level:
          rawData.summary?.overall_score >= 7
            ? 'advanced'
            : rawData.summary?.overall_score >= 4
              ? 'intermediate'
              : 'beginner',
      },
      performance: {
        win_rate: rawData.pnl_analysis ? `${rawData.pnl_analysis.win_rate}%` : 'N/A',
        profit_factor: rawData.pnl_analysis ? `${rawData.pnl_analysis.profit_factor}` : 'N/A',
        sharpe_ratio: 'N/A',
        max_drawdown: 'N/A',
      },
      trading_behavior: {
        avg_holding_time: rawData.trading_frequency
          ? `${Math.round(rawData.trading_frequency.avg_trade_interval_minutes)} mins`
          : 'N/A',
        trades_per_week: rawData.trading_frequency
          ? `${Math.round(rawData.trading_frequency.daily_avg_trades * 7)}`
          : 'N/A',
        discipline_score: rawData.discipline_scores
          ? `${rawData.discipline_scores.discipline_score * 10}/100`
          : 'N/A',
        patience_score: rawData.discipline_scores
          ? `${rawData.discipline_scores.patience_score * 10}/100`
          : 'N/A',
      },
      profile: {
        summary: generateSummary(rawData),
        strengths: generateStrengths(rawData),
        weaknesses: generateWeaknesses(rawData),
        suitable_for: generateSuitableFor(rawData),
      },
      raw: {
        basic_stats: rawData.basic_stats,
        risk_preference: rawData.risk_preference,
        trading_frequency: rawData.trading_frequency,
        discipline_scores: rawData.discipline_scores,
        pnl_analysis: rawData.pnl_analysis,
        trading_patterns: rawData.trading_patterns,
        summary: rawData.summary,
      },
    };

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      etagContent: profile,
      custom: {
        'X-Data-Type': 'trader-profile',
        'X-Profile-Style': profile.basic_info.trading_style,
        'X-Risk-Level': profile.basic_info.risk_preference,
      },
    });

    return NextResponse.json(profile, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Profile API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to load profile',
      500,
      error instanceof Error ? error.message : 'Unknown',
      request
    );
    return NextResponse.json(body, init);
  }
}

function generateSummary(data: any): string {
  const style = data.summary?.trader_type || 'Trader';
  const winRate = data.pnl_analysis?.win_rate || 0;
  const pf = data.pnl_analysis?.profit_factor || 0;
  const discipline = data.discipline_scores?.discipline_score || 0;
  const totalPnl = data.pnl_analysis?.total_pnl_btc || 0;

  return (
    `${style}, Win Rate ${winRate}%, Profit Factor ${pf}, Discipline Score ${discipline * 10}/100, ` +
    `Total ${data.basic_stats?.total_orders || 0} orders, Total PnL ${totalPnl.toFixed(2)} BTC.`
  );
}

function generateStrengths(data: any): string[] {
  const strengths: string[] = [];

  if (data.discipline_scores?.limit_order_ratio > 70) {
    strengths.push(`High Limit Order Usage (${data.discipline_scores.limit_order_ratio}%)`);
  }
  if (data.pnl_analysis?.profit_factor > 1.5) {
    strengths.push(`Excellent Profit Factor (${data.pnl_analysis.profit_factor})`);
  }
  if (data.discipline_scores?.discipline_score >= 7) {
    strengths.push(
      `Highly Disciplined (Score: ${data.discipline_scores.discipline_score * 10}/100)`
    );
  }
  if (data.basic_stats?.fill_rate > 70) {
    strengths.push(`High Fill Rate (${data.basic_stats.fill_rate}%)`);
  }
  if (data.pnl_analysis?.total_pnl_btc > 0) {
    strengths.push(`Profitable (+${data.pnl_analysis.total_pnl_btc.toFixed(2)} BTC)`);
  }

  return strengths.length > 0 ? strengths : ['Analyzing...'];
}

function generateWeaknesses(data: any): string[] {
  const weaknesses: string[] = [];

  if (data.pnl_analysis?.win_rate < 50) {
    weaknesses.push(`Low Win Rate (${data.pnl_analysis.win_rate}%)`);
  }
  if (data.discipline_scores?.patience_score < 5) {
    weaknesses.push(`Lack of Patience (Score: ${data.discipline_scores.patience_score * 10}/100)`);
  }
  if (data.discipline_scores?.cancel_ratio > 25) {
    weaknesses.push(`High Cancellation Ratio (${data.discipline_scores.cancel_ratio}%)`);
  }
  if (data.risk_preference?.risk_score >= 8) {
    weaknesses.push(`High Risk Preference (Score: ${data.risk_preference.risk_score}/10)`);
  }

  return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses'];
}

function generateSuitableFor(data: any): string[] {
  const suitable: string[] = [];

  if (data.summary?.trader_type?.includes('Swing')) {
    suitable.push('Swing Trading Learners');
  }
  if (data.summary?.trader_type?.includes('Day')) {
    suitable.push('Day Trading Learners');
  }
  if (data.discipline_scores?.discipline_score >= 7) {
    suitable.push('Disciplined Traders');
  }
  if (data.pnl_analysis?.profit_factor > 2) {
    suitable.push('High Profit Factor Seekers');
  }
  if (data.risk_preference?.risk_level?.includes('High')) {
    suitable.push('High Risk Tolerance Investors');
  }
  suitable.push('Those wanting to learn real trading');

  return suitable;
}
