#!/usr/bin/env bun
/**
 * Trader Analyzer CLI
 * [#REF:CLI-HEX:0x434C4930]
 *
 * Powerful CLI with Bun's native utilities:
 * - Bun.inspect.table() for formatted tables
 * - Bun.inspect() for deep object inspection
 * - Bun.nanoseconds() for precise timing
 * - Bun.inspect.custom for custom formatting
 *
 * Usage:
 *   bun scripts/cli.ts <command> [options]
 *
 * Commands:
 *   status          - Show system status
 *   markets         - List/inspect markets
 *   cache           - Cache operations
 *   canonical       - Canonicalize markets
 *   health          - Health check
 *   test            - Run smoke tests
 */

import { parseArgs } from 'util';
import { Database } from 'bun:sqlite';
import { APP_VERSION, APP_NAME, WORKERS_URLS, PORTS } from '../lib/constants';
import { DebugInspector, formatNs, formatBytes, inspector } from '../lib/debug-inspector';

// =============================================================================
// BUN NATIVE INSPECT UTILITIES (via DebugInspector)
// =============================================================================

/**
 * Format tabular data using Bun.inspect.table
 */
function table(data: unknown[], columns?: string[]): void {
  console.log(DebugInspector.table(data, columns));
}

/**
 * Deep inspect an object using Bun.inspect
 */
function inspect(obj: unknown, depth = 4): void {
  console.log(DebugInspector.format(obj, depth));
}

// =============================================================================
// COLORS & FORMATTING
// =============================================================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
};

function colorize(text: string, color: keyof typeof c): string {
  return `${c[color]}${text}${c.reset}`;
}

function header(title: string): void {
  const width = 60;
  const padding = Math.max(0, Math.floor((width - title.length - 2) / 2));
  console.log();
  console.log(colorize('╔' + '═'.repeat(width) + '╗', 'cyan'));
  console.log(
    colorize(
      '║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length) + '║',
      'cyan'
    )
  );
  console.log(colorize('╚' + '═'.repeat(width) + '╝', 'cyan'));
  console.log();
}

function section(title: string): void {
  console.log();
  console.log(colorize(`─── ${title} ───`, 'blue'));
}

function success(msg: string): void {
  console.log(colorize('✓', 'green'), msg);
}

function error(msg: string): void {
  console.log(colorize('✗', 'red'), msg);
}

function warn(msg: string): void {
  console.log(colorize('⚠', 'yellow'), msg);
}

function info(msg: string): void {
  console.log(colorize('ℹ', 'cyan'), msg);
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

// formatNs and formatBytes are imported from debug-inspector.ts

async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const start = Bun.nanoseconds();
  const result = await fn();
  const elapsed = Bun.nanoseconds() - start;
  console.log(colorize(`  ${label}:`, 'dim'), formatNs(elapsed));
  return result;
}

// =============================================================================
// COMMANDS
// =============================================================================

async function cmdStatus(): Promise<void> {
  header(`${APP_NAME} v${APP_VERSION}`);

  section('Runtime');
  table([
    { property: 'Bun Version', value: Bun.version },
    { property: 'Bun Revision', value: Bun.revision.slice(0, 12) },
    { property: 'Platform', value: process.platform },
    { property: 'Arch', value: process.arch },
    { property: 'Node.js Compat', value: process.version },
    { property: 'PID', value: process.pid },
    { property: 'CWD', value: process.cwd() },
  ]);

  section('Memory');
  const mem = process.memoryUsage();
  table([
    { metric: 'RSS', value: formatBytes(mem.rss) },
    { metric: 'Heap Total', value: formatBytes(mem.heapTotal) },
    { metric: 'Heap Used', value: formatBytes(mem.heapUsed) },
    { metric: 'External', value: formatBytes(mem.external) },
  ]);

  section('Environment');
  table([
    { variable: 'NODE_ENV', value: Bun.env.NODE_ENV || 'development' },
    { variable: 'STAGING', value: Bun.env.STAGING || 'false' },
  ]);

  section('Configured URLs');
  table([
    { service: 'Workers Staging', url: WORKERS_URLS.staging },
    { service: 'Workers Production', url: WORKERS_URLS.production },
    { service: 'Workers Local', url: WORKERS_URLS.local },
    { service: 'Next.js', url: `http://localhost:${PORTS.nextjs}` },
    { service: 'Bun Backend', url: `http://localhost:${PORTS.bunBackend}` },
  ]);
}

async function cmdHealth(): Promise<void> {
  header('Health Check');

  const checks: { name: string; status: string; latency: string; details?: string }[] = [];

  // Check Workers
  const workersStart = Bun.nanoseconds();
  try {
    const res = await fetch(`${WORKERS_URLS.staging}/api/markets`, {
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Bun.nanoseconds() - workersStart;
    if (res.ok) {
      const data = await res.json();
      checks.push({
        name: 'Workers API',
        status: colorize('ONLINE', 'green'),
        latency: formatNs(elapsed),
        details: `${data.total || 0} markets`,
      });
    } else {
      checks.push({
        name: 'Workers API',
        status: colorize(`HTTP ${res.status}`, 'yellow'),
        latency: formatNs(elapsed),
      });
    }
  } catch (e) {
    checks.push({
      name: 'Workers API',
      status: colorize('OFFLINE', 'red'),
      latency: '-',
      details: (e as Error).message,
    });
  }

  // Check Next.js
  const nextStart = Bun.nanoseconds();
  try {
    const res = await fetch(`http://localhost:${PORTS.nextjs}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Bun.nanoseconds() - nextStart;
    if (res.ok) {
      checks.push({
        name: 'Next.js API',
        status: colorize('ONLINE', 'green'),
        latency: formatNs(elapsed),
      });
    } else {
      checks.push({
        name: 'Next.js API',
        status: colorize(`HTTP ${res.status}`, 'yellow'),
        latency: formatNs(elapsed),
      });
    }
  } catch (e) {
    checks.push({
      name: 'Next.js API',
      status: colorize('OFFLINE', 'red'),
      latency: '-',
    });
  }

  // Check Bun Backend
  const bunStart = Bun.nanoseconds();
  try {
    const res = await fetch(`http://localhost:${PORTS.bunBackend}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Bun.nanoseconds() - bunStart;
    if (res.ok) {
      checks.push({
        name: 'Bun Backend',
        status: colorize('ONLINE', 'green'),
        latency: formatNs(elapsed),
      });
    } else {
      checks.push({
        name: 'Bun Backend',
        status: colorize(`HTTP ${res.status}`, 'yellow'),
        latency: formatNs(elapsed),
      });
    }
  } catch (e) {
    checks.push({
      name: 'Bun Backend',
      status: colorize('OFFLINE', 'red'),
      latency: '-',
    });
  }

  // Check SQLite
  try {
    const dbStart = Bun.nanoseconds();
    const db = new Database(':memory:');
    db.run('SELECT 1');
    db.close();
    const elapsed = Bun.nanoseconds() - dbStart;
    checks.push({
      name: 'SQLite',
      status: colorize('OK', 'green'),
      latency: formatNs(elapsed),
    });
  } catch (e) {
    checks.push({
      name: 'SQLite',
      status: colorize('ERROR', 'red'),
      latency: '-',
      details: (e as Error).message,
    });
  }

  table(checks);

  // Summary
  const online = checks.filter(c => c.status.includes('ONLINE') || c.status.includes('OK')).length;
  const total = checks.length;
  console.log();
  if (online === total) {
    success(`All ${total} services healthy`);
  } else {
    warn(`${online}/${total} services healthy`);
  }
}

async function cmdMarkets(args: {
  inspect?: boolean;
  limit?: number;
  exchange?: string;
}): Promise<void> {
  header('Markets');

  const limit = args.limit || 10;
  const exchange = args.exchange || 'all';

  info(`Fetching markets from Workers API...`);

  const start = Bun.nanoseconds();
  try {
    const res = await fetch(`${WORKERS_URLS.staging}/api/markets`);
    const elapsed = Bun.nanoseconds() - start;

    if (!res.ok) {
      error(`API returned ${res.status}`);
      return;
    }

    const data = await res.json();
    success(`Fetched ${data.total} markets in ${formatNs(elapsed)}`);

    section('Markets');
    let markets = data.markets || [];

    if (exchange !== 'all') {
      markets = markets.filter((m: any) =>
        m.sources?.some((s: any) => s.exchange.toLowerCase() === exchange.toLowerCase())
      );
      info(`Filtered to ${markets.length} ${exchange} markets`);
    }

    const displayMarkets = markets.slice(0, limit).map((m: any) => ({
      id: m.id,
      name: m.displayName?.substring(0, 30) + (m.displayName?.length > 30 ? '...' : ''),
      category: m.category,
      sources: m.sources?.length || 0,
    }));

    table(displayMarkets);

    if (args.inspect && markets.length > 0) {
      section('First Market (Deep Inspect)');
      inspect(markets[0], 6);
    }

    // Stats
    section('Category Distribution');
    const categories: Record<string, number> = {};
    for (const m of markets) {
      categories[m.category] = (categories[m.category] || 0) + 1;
    }
    table(
      Object.entries(categories).map(([cat, count]) => ({
        category: cat,
        count,
        percentage: `${((count / markets.length) * 100).toFixed(1)}%`,
      }))
    );
  } catch (e) {
    error(`Failed to fetch markets: ${(e as Error).message}`);
  }
}

async function cmdCanonical(args: { id?: string; exchange?: string }): Promise<void> {
  header('Market Canonicalizer');

  // Dynamic import to avoid circular deps
  const { marketCanonicalizer } = await import('../lib/canonical/uuidv5');

  if (args.id) {
    const exchange = (args.exchange || 'polymarket') as any;
    info(`Canonicalizing ${exchange}:${args.id}`);

    const start = Bun.nanoseconds();
    const canonical = marketCanonicalizer.canonicalize({
      exchange,
      nativeId: args.id,
      type: 'binary',
    });
    const elapsed = Bun.nanoseconds() - start;

    section('Canonical Market');
    table([
      { property: 'UUID', value: canonical.uuid },
      { property: 'Exchange', value: canonical.exchange },
      { property: 'Native ID', value: canonical.nativeId },
      { property: 'Type', value: canonical.type },
      { property: 'Version', value: canonical.version },
      { property: 'Salt', value: canonical.salt },
      { property: 'Canonicalized At', value: canonical.canonicalizedAt },
    ]);

    section('API Metadata');
    table([
      { property: 'Endpoint', value: canonical.apiMetadata.endpoint },
      { property: 'Cache Key', value: canonical.apiMetadata.cacheKey },
    ]);

    section('Headers');
    table(
      Object.entries(canonical.apiMetadata.headers).map(([k, v]) => ({
        header: k,
        value: v.length > 40 ? v.substring(0, 40) + '...' : v,
      }))
    );

    section('Tags');
    console.log(canonical.tags.map(t => colorize(t, 'cyan')).join('  '));

    console.log();
    info(`Canonicalized in ${formatNs(elapsed)}`);
  } else {
    // Batch test
    info('Running batch canonicalization benchmark...');

    const testMarkets = Array.from({ length: 100 }, (_, i) => ({
      exchange: 'polymarket' as const,
      nativeId: `test-market-${i}`,
      type: 'binary' as const,
    }));

    const start = Bun.nanoseconds();
    const results = marketCanonicalizer.batchCanonicalize(testMarkets);
    const elapsed = Bun.nanoseconds() - start;

    success(`Canonicalized ${results.size} markets in ${formatNs(elapsed)}`);
    info(`Average: ${formatNs(elapsed / results.size)} per market`);

    section('Sample UUIDs');
    const samples = Array.from(results.values()).slice(0, 5);
    table(
      samples.map(m => ({
        nativeId: m.nativeId,
        uuid: m.uuid,
      }))
    );
  }
}

async function cmdCache(args: { action?: string; key?: string }): Promise<void> {
  header('Cache Manager');

  // Check if cache database exists
  const cachePath = './data/api-cache.db';
  const cacheFile = Bun.file(cachePath);

  if (!(await cacheFile.exists())) {
    warn('Cache database not found. Creating...');

    // Ensure directory exists
    await Bun.write('./data/.gitkeep', '');

    const db = new Database(cachePath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.run(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        exchange TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 0
      )
    `);
    db.close();
    success('Cache database created');
  }

  const db = new Database(cachePath);

  // Ensure table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      exchange TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      hit_count INTEGER DEFAULT 0
    )
  `);

  try {
    section('Cache Statistics');

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT exchange) as exchanges,
        SUM(hit_count) as total_hits,
        SUM(LENGTH(value)) as total_size
      FROM cache_entries
      WHERE expires_at > ?
    `
      )
      .get(Date.now()) as any;

    table([
      { metric: 'Total Entries', value: stats?.total_entries || 0 },
      { metric: 'Exchanges', value: stats?.exchanges || 0 },
      { metric: 'Total Hits', value: stats?.total_hits || 0 },
      { metric: 'Total Size', value: formatBytes(stats?.total_size || 0) },
    ]);

    if (args.action === 'clear') {
      section('Clearing Cache');
      const result = db.run('DELETE FROM cache_entries');
      success(`Cleared ${result.changes} entries`);
    } else if (args.action === 'list') {
      section('Cache Entries');
      const entries = db
        .prepare(
          `
        SELECT key, exchange, hit_count, created_at, expires_at, LENGTH(value) as size
        FROM cache_entries
        ORDER BY hit_count DESC
        LIMIT 20
      `
        )
        .all() as any[];

      table(
        entries.map(e => ({
          key: e.key.substring(0, 30) + '...',
          exchange: e.exchange,
          hits: e.hit_count,
          size: formatBytes(e.size),
          expires: new Date(e.expires_at).toISOString().slice(0, 19),
        }))
      );
    } else if (args.action === 'get' && args.key) {
      section(`Cache Entry: ${args.key}`);
      const entry = db.prepare('SELECT * FROM cache_entries WHERE key = ?').get(args.key) as any;

      if (entry) {
        table([
          { property: 'Key', value: entry.key },
          { property: 'Exchange', value: entry.exchange },
          { property: 'Hits', value: entry.hit_count },
          { property: 'Size', value: formatBytes(entry.value.length) },
          { property: 'Created', value: new Date(entry.created_at).toISOString() },
          { property: 'Expires', value: new Date(entry.expires_at).toISOString() },
        ]);

        section('Value (Deep Inspect)');
        try {
          const value = JSON.parse(entry.value);
          inspect(value, 4);
        } catch {
          console.log(entry.value.substring(0, 500));
        }
      } else {
        warn('Entry not found');
      }
    }
  } finally {
    db.close();
  }
}

async function cmdTest(): Promise<void> {
  header('Smoke Tests');

  const results: { test: string; status: string; latency: string; details?: string }[] = [];

  // Test 1: Import constants
  await timed('Import constants', async () => {
    const { APP_VERSION } = await import('../lib/constants');
    results.push({
      test: 'Import constants',
      status: APP_VERSION ? colorize('PASS', 'green') : colorize('FAIL', 'red'),
      latency: '-',
      details: `v${APP_VERSION}`,
    });
  });

  // Test 2: Logger
  await timed('Import logger', async () => {
    const { Logger } = await import('../lib/logger');
    Logger.setSilent(true);
    Logger.info('Test');
    Logger.setSilent(false);
    results.push({
      test: 'Logger',
      status: colorize('PASS', 'green'),
      latency: '-',
    });
  });

  // Test 3: Canonicalizer
  await timed('Canonicalizer', async () => {
    const { marketCanonicalizer } = await import('../lib/canonical/uuidv5');
    const start = Bun.nanoseconds();
    const result = marketCanonicalizer.canonicalize({
      exchange: 'polymarket',
      nativeId: 'test-123',
      type: 'binary',
    });
    const elapsed = Bun.nanoseconds() - start;
    results.push({
      test: 'Canonicalizer',
      status: result.uuid ? colorize('PASS', 'green') : colorize('FAIL', 'red'),
      latency: formatNs(elapsed),
      details: result.uuid.substring(0, 8) + '...',
    });
  });

  // Test 4: SQLite
  await timed('SQLite', async () => {
    const start = Bun.nanoseconds();
    const db = new Database(':memory:');
    db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
    db.run('INSERT INTO test VALUES (1, ?)', ['hello']);
    const row = db.prepare('SELECT * FROM test').get() as any;
    db.close();
    const elapsed = Bun.nanoseconds() - start;
    results.push({
      test: 'SQLite',
      status: row?.value === 'hello' ? colorize('PASS', 'green') : colorize('FAIL', 'red'),
      latency: formatNs(elapsed),
    });
  });

  // Test 5: Fetch (Workers)
  await timed('Fetch Workers', async () => {
    const start = Bun.nanoseconds();
    try {
      const res = await fetch(`${WORKERS_URLS.staging}/api/markets`, {
        signal: AbortSignal.timeout(5000),
      });
      const elapsed = Bun.nanoseconds() - start;
      results.push({
        test: 'Fetch Workers',
        status: res.ok ? colorize('PASS', 'green') : colorize('WARN', 'yellow'),
        latency: formatNs(elapsed),
        details: `HTTP ${res.status}`,
      });
    } catch (e) {
      results.push({
        test: 'Fetch Workers',
        status: colorize('SKIP', 'yellow'),
        latency: '-',
        details: 'Timeout or offline',
      });
    }
  });

  // Test 6: Compression
  await timed('Gzip compression', async () => {
    const start = Bun.nanoseconds();
    const data = 'Hello World! '.repeat(1000);
    const dataBuffer = Buffer.from(data);
    const compressed = Bun.gzipSync(dataBuffer);
    const decompressed = Bun.gunzipSync(compressed);
    const elapsed = Bun.nanoseconds() - start;
    const ratio = ((compressed.length / dataBuffer.length) * 100).toFixed(1);
    // Compare buffers properly
    const match = Buffer.compare(decompressed, dataBuffer) === 0;
    results.push({
      test: 'Gzip compression',
      status: match ? colorize('PASS', 'green') : colorize('FAIL', 'red'),
      latency: formatNs(elapsed),
      details: `${ratio}% ratio`,
    });
  });

  section('Results');
  table(results);

  const passed = results.filter(r => r.status.includes('PASS')).length;
  const total = results.length;
  console.log();
  if (passed === total) {
    success(`All ${total} tests passed`);
  } else {
    warn(`${passed}/${total} tests passed`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h' },
      inspect: { type: 'boolean', short: 'i' },
      limit: { type: 'string', short: 'l' },
      exchange: { type: 'string', short: 'e' },
      action: { type: 'string', short: 'a' },
      key: { type: 'string', short: 'k' },
      id: { type: 'string' },
    },
    allowPositionals: true,
  });

  const command = positionals[0] || 'help';

  if (values.help || command === 'help') {
    header(`${APP_NAME} CLI`);
    console.log(`
${colorize('Usage:', 'bold')} bun scripts/cli.ts <command> [options]

${colorize('Commands:', 'bold')}
  status              System status and runtime info
  health              Health check all services
  markets             List markets from API
  canonical           Canonicalize market IDs
  cache               Cache operations
  test                Run smoke tests

${colorize('Options:', 'bold')}
  -h, --help          Show this help
  -i, --inspect       Deep inspect objects
  -l, --limit <n>     Limit results (default: 10)
  -e, --exchange <x>  Filter by exchange
  -a, --action <a>    Cache action: list, clear, get
  -k, --key <k>       Cache key for get action
  --id <id>           Market native ID for canonical

${colorize('Examples:', 'bold')}
  bun scripts/cli.ts status
  bun scripts/cli.ts health
  bun scripts/cli.ts markets --limit 20 --inspect
  bun scripts/cli.ts canonical --id "test-market-123" --exchange polymarket
  bun scripts/cli.ts cache --action list
  bun scripts/cli.ts test
`);
    return;
  }

  switch (command) {
    case 'status':
      await cmdStatus();
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'markets':
      await cmdMarkets({
        inspect: values.inspect,
        limit: values.limit ? parseInt(values.limit) : undefined,
        exchange: values.exchange,
      });
      break;
    case 'canonical':
      await cmdCanonical({
        id: values.id,
        exchange: values.exchange,
      });
      break;
    case 'cache':
      await cmdCache({
        action: values.action,
        key: values.key,
      });
      break;
    case 'test':
      await cmdTest();
      break;
    default:
      error(`Unknown command: ${command}`);
      info('Run with --help for usage');
  }
}

main().catch(e => {
  error(`Fatal error: ${e.message}`);
  process.exit(1);
});
