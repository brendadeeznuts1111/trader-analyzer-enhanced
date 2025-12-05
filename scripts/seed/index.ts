#!/usr/bin/env bun
/**
 * Seed Data Generator
 * Creates comprehensive seed data for development and testing
 */

import { generateMarkets } from './markets';
import { generateExecutions, generateWalletHistory } from './trades';
import { generateSportsEvents } from './sports';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SEED_DIR = join(import.meta.dir, '../../data/seed');

interface SeedOptions {
  markets?: number;
  executions?: number;
  walletEntries?: number;
  sportsEvents?: number;
  outputDir?: string;
}

const DEFAULT_OPTIONS: Required<SeedOptions> = {
  markets: 500,
  executions: 1000,
  walletEntries: 365,
  sportsEvents: 100,
  outputDir: SEED_DIR,
};

async function seed(options: SeedOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();

  console.log('🌱 Starting seed data generation...\n');

  // Ensure output directory exists
  await mkdir(opts.outputDir, { recursive: true });

  // Generate markets
  console.log(`📊 Generating ${opts.markets} markets...`);
  const markets = generateMarkets(opts.markets);
  await Bun.write(
    join(opts.outputDir, 'markets.json'),
    JSON.stringify(markets, null, 2)
  );
  console.log(`   ✓ ${markets.crypto.length} crypto markets`);
  console.log(`   ✓ ${markets.prediction.length} prediction markets`);
  console.log(`   ✓ ${markets.perpetual.length} perpetual markets`);

  // Generate trading executions
  console.log(`\n💹 Generating ${opts.executions} executions...`);
  const executions = generateExecutions(opts.executions);
  await Bun.write(
    join(opts.outputDir, 'bitmex_executions.csv'),
    executionsToCSV(executions)
  );
  console.log(`   ✓ ${executions.length} execution records`);

  // Generate wallet history
  console.log(`\n💰 Generating ${opts.walletEntries} wallet entries...`);
  const walletHistory = generateWalletHistory(opts.walletEntries);
  await Bun.write(
    join(opts.outputDir, 'bitmex_wallet_history.csv'),
    walletHistoryToCSV(walletHistory)
  );
  console.log(`   ✓ ${walletHistory.length} wallet transactions`);

  // Generate sports events
  console.log(`\n🏀 Generating ${opts.sportsEvents} sports events...`);
  const sportsEvents = generateSportsEvents(opts.sportsEvents);
  await Bun.write(
    join(opts.outputDir, 'sports_events.json'),
    JSON.stringify(sportsEvents, null, 2)
  );
  console.log(`   ✓ ${sportsEvents.length} sports events`);

  // Generate account summary
  const accountSummary = generateAccountSummary(walletHistory);
  await Bun.write(
    join(opts.outputDir, 'bitmex_account_summary.json'),
    JSON.stringify(accountSummary, null, 2)
  );
  console.log(`\n👤 Account summary generated`);

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Seed data generation complete in ${duration}s`);
  console.log(`📁 Output: ${opts.outputDir}`);

  return {
    markets,
    executions,
    walletHistory,
    sportsEvents,
    accountSummary,
  };
}

function executionsToCSV(executions: ReturnType<typeof generateExecutions>): string {
  const headers = 'execID,orderID,symbol,side,lastQty,lastPx,execType,ordType,ordStatus,execCost,execComm,timestamp,text';
  const rows = executions.map(e =>
    `${e.execID},${e.orderID},${e.symbol},${e.side},${e.lastQty},${e.lastPx},${e.execType},${e.ordType},${e.ordStatus},${e.execCost},${e.execComm},${e.timestamp},${e.text || ''}`
  );
  return [headers, ...rows].join('\n');
}

function walletHistoryToCSV(history: ReturnType<typeof generateWalletHistory>): string {
  const headers = 'transactID,account,currency,transactType,amount,fee,transactStatus,address,tx,text,timestamp,walletBalance,marginBalance';
  const rows = history.map(h =>
    `${h.transactID},${h.account},${h.currency},${h.transactType},${h.amount},${h.fee},${h.transactStatus},${h.address || ''},${h.tx || ''},${h.text || ''},${h.timestamp},${h.walletBalance},${h.marginBalance}`
  );
  return [headers, ...rows].join('\n');
}

function generateAccountSummary(walletHistory: ReturnType<typeof generateWalletHistory>) {
  const lastEntry = walletHistory[walletHistory.length - 1];
  const totalPnL = walletHistory
    .filter(h => h.transactType === 'RealisedPNL')
    .reduce((sum, h) => sum + h.amount, 0);

  return {
    exportDate: new Date().toISOString(),
    user: {
      id: 123456,
      username: 'demo_trader',
      email: 'demo@example.com',
    },
    wallet: {
      walletBalance: lastEntry?.walletBalance || 100000000,
      marginBalance: lastEntry?.marginBalance || 105000000,
      availableMargin: Math.floor((lastEntry?.walletBalance || 100000000) * 0.8),
      unrealisedPnl: Math.floor(Math.random() * 10000000) - 5000000,
      realisedPnl: totalPnL,
    },
    positions: [],
  };
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      if (key === 'outputDir') {
        options.outputDir = value;
      } else {
        (options as any)[key] = parseInt(value, 10);
      }
    }
  }

  seed(options).catch(console.error);
}

export { seed, DEFAULT_OPTIONS };
