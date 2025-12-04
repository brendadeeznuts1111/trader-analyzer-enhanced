#!/usr/bin/env bun
/**
 * Enhanced Market Canonicalizer CLI
 * [#REF:ENHANCED-CLI-HEX:0x45434C49]
 *
 * Production CLI for the Enhanced Market Canonicalizer with:
 * - HTTP server with full API
 * - Batch processing with concurrency control
 * - Cache management and statistics
 * - Metrics collection and reporting
 * - Export/import capabilities
 * - Configuration management
 */

import { parseArgs } from 'util';
import { Database } from 'bun:sqlite';
import { APP_VERSION, APP_NAME } from '../lib/constants';
import { DebugInspector, formatNs, formatBytes, inspector } from '../lib/debug-inspector';
import { EnhancedMarketCanonicalizer, CanonicalizerConfig } from '../lib/canonical/enhanced';

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

async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const start = Bun.nanoseconds();
  const result = await fn();
  const elapsed = Bun.nanoseconds() - start;
  console.log(colorize(`  ${label}:`, 'dim'), formatNs(elapsed));
  return result;
}

// =============================================================================
// CONFIGURATION MANAGEMENT
// =============================================================================

function loadConfigFromEnv(): Partial<CanonicalizerConfig> {
  return {
    server: {
      port: parseInt(Bun.env.CANONICALIZER_PORT || '3000'),
      host: Bun.env.CANONICALIZER_HOST || 'localhost',
      cors: {
        enabled: Bun.env.CANONICALIZER_CORS_ENABLED !== 'false',
        origin: (Bun.env.CANONICALIZER_CORS_ORIGIN || '*').split(','),
      },
      compression: Bun.env.CANONICALIZER_COMPRESSION !== 'false',
      timeout: parseInt(Bun.env.CANONICALIZER_TIMEOUT || '30000'),
    },
    cache: {
      memory: {
        maxSize: parseInt(Bun.env.CANONICALIZER_CACHE_MEMORY_MAX_SIZE || '10000'),
        ttl: parseInt(Bun.env.CANONICALIZER_CACHE_MEMORY_TTL || '3600000'),
      },
      sqlite: {
        enabled: Bun.env.CANONICALIZER_CACHE_SQLITE_ENABLED !== 'false',
        path: Bun.env.CANONICALIZER_CACHE_SQLITE_PATH || './data/canonicalizer-cache.db',
        vacuumOnStart: Bun.env.CANONICALIZER_CACHE_SQLITE_VACUUM === 'true',
      },
      filesystem: {
        enabled: Bun.env.CANONICALIZER_CACHE_FILESYSTEM_ENABLED === 'true',
        path: Bun.env.CANONICALIZER_CACHE_FILESYSTEM_PATH || './data/canonicalizer-cache.json',
        maxSize: parseInt(Bun.env.CANONICALIZER_CACHE_FILESYSTEM_MAX_SIZE || '104857600'), // 100MB
      },
    },
    performance: {
      maxConcurrent: parseInt(Bun.env.CANONICALIZER_MAX_CONCURRENT || '100'),
      batchSize: parseInt(Bun.env.CANONICALIZER_BATCH_SIZE || '1000'),
      retryAttempts: parseInt(Bun.env.CANONICALIZER_RETRY_ATTEMPTS || '3'),
      timeout: parseInt(Bun.env.CANONICALIZER_TIMEOUT || '30000'),
    },
    logging: {
      level: (Bun.env.CANONICALIZER_LOG_LEVEL || 'info') as any,
      format: (Bun.env.CANONICALIZER_LOG_FORMAT || 'text') as any,
      file: {
        enabled: Bun.env.CANONICALIZER_LOG_FILE_ENABLED === 'true',
        path: Bun.env.CANONICALIZER_LOG_FILE_PATH || './logs/canonicalizer.log',
        maxSize: Bun.env.CANONICALIZER_LOG_FILE_MAX_SIZE || '10MB',
        maxFiles: parseInt(Bun.env.CANONICALIZER_LOG_FILE_MAX_FILES || '5'),
      },
      console: Bun.env.CANONICALIZER_LOG_CONSOLE !== 'false',
    },
    metrics: {
      enabled: Bun.env.CANONICALIZER_METRICS_ENABLED !== 'false',
      port: parseInt(Bun.env.CANONICALIZER_METRICS_PORT || '9090'),
      path: Bun.env.CANONICALIZER_METRICS_PATH || '/metrics',
      collectDefault: Bun.env.CANONICALIZER_METRICS_COLLECT_DEFAULT !== 'false',
    },
    export: {
      defaultFormat: (Bun.env.CANONICALIZER_EXPORT_FORMAT || 'json') as any,
      compression: Bun.env.CANONICALIZER_EXPORT_COMPRESSION !== 'false',
      chunkSize: parseInt(Bun.env.CANONICALIZER_EXPORT_CHUNK_SIZE || '1000'),
    },
  };
}

function createCanonicalizer(config?: Partial<CanonicalizerConfig>): EnhancedMarketCanonicalizer {
  const envConfig = loadConfigFromEnv();
  const finalConfig = { ...envConfig, ...config };

  // Deep merge for nested objects
  if (config?.server) finalConfig.server = { ...finalConfig.server, ...config.server };
  if (config?.cache) finalConfig.cache = { ...finalConfig.cache, ...config.cache };
  if (config?.performance)
    finalConfig.performance = { ...finalConfig.performance, ...config.performance };
  if (config?.logging) finalConfig.logging = { ...finalConfig.logging, ...config.logging };
  if (config?.metrics) finalConfig.metrics = { ...finalConfig.metrics, ...config.metrics };
  if (config?.export) finalConfig.export = { ...finalConfig.export, ...config.export };

  return new EnhancedMarketCanonicalizer(finalConfig);
}

// =============================================================================
// CLI COMMANDS
// =============================================================================

async function cmdServe(options: {
  port?: number;
  host?: string;
  'cors-origin'?: string;
  'max-concurrent'?: number;
  'cache-sqlite'?: boolean;
  'log-level'?: string;
}): Promise<void> {
  header(`${APP_NAME} Canonicalizer Server v${APP_VERSION}`);

  const config = {
    server: {
      port: options.port || 3000,
      host: options.host || '0.0.0.0',
      cors: {
        enabled: true,
        origin: options['cors-origin'] ? options['cors-origin'].split(',') : ['*'],
      },
      compression: true,
      timeout: 30_000,
    },
    worker: {
      maxConcurrent: options['max-concurrent'] || 10,
      batchSize: 50,
      retryAttempts: 3,
      timeout: 15_000,
    },
    sqlite: {
      enabled: options['cache-sqlite'] !== false,
      path: './data/canonical.db',
      vacuumOnStart: true,
    },
    logger: {
      level: (options['log-level'] || 'info') as 'debug' | 'info' | 'warn' | 'error',
      format: 'text' as 'json' | 'text',
      file: { enabled: true, path: './logs/app.log', maxSize: '10m', maxFiles: 5 },
      console: true,
    },
  };

  const canonicalizer = createCanonicalizer(config);

  section('Configuration');
  const finalConfig = canonicalizer.getConfig();
  table([
    { setting: 'Server', value: `${finalConfig.server.host}:${finalConfig.server.port}` },
    { setting: 'CORS Origin', value: finalConfig.server.cors.origin.join(', ') },
    { setting: 'Max Concurrent', value: finalConfig.performance.maxConcurrent },
    { setting: 'SQLite Cache', value: finalConfig.cache.sqlite.enabled ? 'Enabled' : 'Disabled' },
    { setting: 'Log Level', value: finalConfig.logging.level },
  ]);

  section('Starting Server');
  info('Initializing canonicalizer...');

  await canonicalizer.startServer();

  success(`Server started at http://${finalConfig.server.host}:${finalConfig.server.port}`);
  info(
    `WebSocket available at ws://${finalConfig.server.host}:${finalConfig.server.port}/ws/canonicalize`
  );
  info('Press Ctrl+C to stop');

  // Keep the process alive
  process.on('SIGINT', async () => {
    info('Shutting down server...');
    await canonicalizer.close();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {}); // Never resolves
}

async function cmdCanonicalize(options: {
  exchange?: string;
  'native-id'?: string;
  type?: string;
  input?: string;
  format?: string;
  output?: string;
  inspect?: boolean;
}): Promise<void> {
  header('Market Canonicalization');

  const canonicalizer = createCanonicalizer();

  if (options.input) {
    // Batch processing from file
    await cmdCanonicalizeBatch({
      input: options.input,
      format: options.format,
      output: options.output,
      inspect: options.inspect,
    });
    return;
  }

  // Single market canonicalization
  if (!options.exchange || !options['native-id']) {
    error('Exchange and native-id are required for single canonicalization');
    info('Use --input for batch processing');
    return;
  }

  const market = {
    exchange: options.exchange as any,
    nativeId: options['native-id'],
    type: (options.type || 'binary') as any,
  };

  info(`Canonicalizing ${market.exchange}:${market.nativeId}`);

  const start = Bun.nanoseconds();
  const result = await canonicalizer.canonicalizeWithMetrics(market);
  const elapsed = Bun.nanoseconds() - start;

  success(`Canonicalized in ${formatNs(elapsed)}`);

  section('Result');
  table([
    { property: 'UUID', value: result.result.uuid },
    { property: 'Exchange', value: result.result.exchange },
    { property: 'Native ID', value: result.result.nativeId },
    { property: 'Type', value: result.result.type },
    { property: 'Cache Hit', value: result.metrics.cacheHit ? 'Yes' : 'No' },
    { property: 'Processing Time', value: `${result.metrics.processingTime.toFixed(2)}ms` },
  ]);

  section('Tags');
  console.log(result.result.tags.map(t => colorize(t, 'cyan')).join('  '));

  if (options.inspect) {
    section('Deep Inspection');
    inspect(result.result, 6);
  }

  if (options.output) {
    await Bun.write(options.output, JSON.stringify(result, null, 2));
    success(`Result written to ${options.output}`);
  }
}

async function cmdCanonicalizeBatch(options: {
  input?: string;
  format?: string;
  output?: string;
  concurrency?: number;
  inspect?: boolean;
  progress?: boolean;
}): Promise<void> {
  header('Batch Market Canonicalization');

  const canonicalizer = createCanonicalizer();

  if (!options.input) {
    error('Input file is required for batch processing');
    return;
  }

  info(`Loading markets from ${options.input}...`);

  let markets: any[];
  try {
    const inputFile = Bun.file(options.input);
    const content = await inputFile.text();

    if (options.format === 'csv' || options.input.endsWith('.csv')) {
      // Parse CSV (simplified)
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      markets = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          exchange: values[0],
          nativeId: values[1],
          type: values[2] || 'binary',
        };
      });
    } else {
      // Assume JSON
      markets = JSON.parse(content);
    }
  } catch (err) {
    error(`Failed to load input file: ${(err as Error).message}`);
    return;
  }

  success(`Loaded ${markets.length} markets`);

  section('Processing');
  const progressCallback = options.progress
    ? (progress: any) => {
        const percent = progress.percentage.toFixed(1);
        const eta = progress.estimatedTimeRemaining.toFixed(1);
        info(`Progress: ${progress.processed}/${progress.total} (${percent}%) ETA: ${eta}s`);
      }
    : undefined;

  const start = Bun.nanoseconds();
  const result = await canonicalizer.batchCanonicalizeWithConcurrency(markets, {
    concurrency: options.concurrency || 10,
    progressCallback,
  });
  const elapsed = Bun.nanoseconds() - start;

  success(`Batch completed in ${formatNs(elapsed)}`);

  section('Summary');
  table([
    { metric: 'Total Markets', value: result.summary.total },
    { metric: 'Successful', value: result.summary.successful },
    { metric: 'Failed', value: result.summary.failed },
    { metric: 'Total Time', value: `${result.summary.totalTime.toFixed(2)}ms` },
    { metric: 'Average Time', value: `${result.summary.averageTime.toFixed(2)}ms` },
    { metric: 'Cache Hit Rate', value: `${(result.summary.cacheHitRate * 100).toFixed(1)}%` },
  ]);

  if (options.output) {
    const outputData = {
      summary: result.summary,
      results: Array.from(result.results.values()),
    };
    await Bun.write(options.output, JSON.stringify(outputData, null, 2));
    success(`Results written to ${options.output}`);
  }

  if (options.inspect && result.results.size > 0) {
    section('Sample Results');
    const samples = Array.from(result.results.values()).slice(0, 3);
    samples.forEach((market, i) => {
      console.log(`\n${colorize(`Market ${i + 1}:`, 'yellow')}`);
      inspect(market, 4);
    });
  }
}

async function cmdCache(options: {
  action?: string;
  stats?: boolean;
  clear?: boolean;
  warm?: boolean;
  'exchange-filter'?: string;
  limit?: number;
}): Promise<void> {
  header('Cache Management');

  const canonicalizer = createCanonicalizer();

  if (options.stats || (!options.action && !options.clear && !options.warm)) {
    section('Cache Statistics');
    const stats = canonicalizer.getCacheStats();

    table([
      {
        cache: 'Memory',
        size: stats.memory.size,
        hitRate: `${stats.memory.hitRate.toFixed(1)}%`,
        usage: formatBytes(stats.memory.memoryUsage),
      },
      {
        cache: 'SQLite',
        size: stats.sqlite.size,
        hitRate: stats.sqlite.enabled ? `${stats.sqlite.hitRate.toFixed(1)}%` : 'N/A',
        usage: formatBytes(stats.sqlite.diskUsage),
      },
    ]);

    section('Total Statistics');
    table([
      { metric: 'Total Hits', value: stats.total.hits },
      { metric: 'Total Misses', value: stats.total.misses },
      { metric: 'Hit Rate', value: `${stats.total.hitRate.toFixed(1)}%` },
      { metric: 'Estimated Savings', value: stats.total.savings },
    ]);
  }

  if (options.clear) {
    section('Clearing Cache');
    warn('Cache clearing not yet implemented');
    // TODO: Implement cache clearing
  }

  if (options.warm) {
    section('Cache Warming');
    warn('Cache warming not yet implemented');
    // TODO: Implement cache warming
  }
}

async function cmdMetrics(options: {
  show?: boolean;
  watch?: boolean;
  interval?: number;
  export?: string;
}): Promise<void> {
  header('Metrics & Monitoring');

  const canonicalizer = createCanonicalizer();

  if (options.watch) {
    info('Watching metrics (press Ctrl+C to stop)...');
    const interval = options.interval || 5000;

    const watch = () => {
      console.clear();
      header('Metrics & Monitoring (Live)');
      const metrics = canonicalizer.getMetrics();
      const cacheStats = canonicalizer.getCacheStats();

      section('Real-time Metrics');
      table([
        { metric: 'Total Requests', value: metrics.totalRequests },
        {
          metric: 'Cache Hits',
          value: `${metrics.cacheHits} (${((metrics.cacheHits / Math.max(metrics.totalRequests, 1)) * 100).toFixed(1)}%)`,
        },
        {
          metric: 'Cache Misses',
          value: `${metrics.cacheMisses} (${((metrics.cacheMisses / Math.max(metrics.totalRequests, 1)) * 100).toFixed(1)}%)`,
        },
        { metric: 'Uptime', value: formatNs((Date.now() - metrics.created) * 1000000) },
        { metric: 'Memory Cache Size', value: cacheStats.memory.size },
        { metric: 'Performance Samples', value: metrics.performanceSamples.length },
      ]);

      section('Recent Errors');
      if (metrics.errors.size > 0) {
        table(
          Array.from(metrics.errors.entries()).map(([error, count]) => ({
            error: error.length > 40 ? error.substring(0, 40) + '...' : error,
            count,
          }))
        );
      } else {
        info('No errors recorded');
      }
    };

    watch();
    const intervalId = setInterval(watch, interval);

    process.on('SIGINT', () => {
      clearInterval(intervalId);
      process.exit(0);
    });

    await new Promise(() => {}); // Keep alive
  } else {
    const metrics = canonicalizer.getMetrics();
    const cacheStats = canonicalizer.getCacheStats();

    section('Current Metrics');
    table([
      { metric: 'Total Requests', value: metrics.totalRequests },
      { metric: 'Cache Hits', value: metrics.cacheHits },
      { metric: 'Cache Misses', value: metrics.cacheMisses },
      { metric: 'Uptime', value: formatNs((Date.now() - metrics.created) * 1000000) },
      { metric: 'Memory Usage', value: formatBytes(process.memoryUsage().heapUsed) },
    ]);

    section('Performance');
    if (metrics.performanceSamples.length > 0) {
      const samples = metrics.performanceSamples.slice(-10); // Last 10 samples
      const avgTime = samples.reduce((sum, s) => sum + s.duration, 0) / samples.length;
      const minTime = Math.min(...samples.map(s => s.duration));
      const maxTime = Math.max(...samples.map(s => s.duration));

      table([
        { metric: 'Average Response Time', value: `${avgTime.toFixed(2)}ms` },
        { metric: 'Min Response Time', value: `${minTime.toFixed(2)}ms` },
        { metric: 'Max Response Time', value: `${maxTime.toFixed(2)}ms` },
        { metric: 'Samples', value: samples.length },
      ]);
    }

    if (options.export) {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics,
        cacheStats,
      };
      await Bun.write(options.export, JSON.stringify(exportData, null, 2));
      success(`Metrics exported to ${options.export}`);
    }
  }
}

async function cmdHealth(): Promise<void> {
  header('Health Check');

  const canonicalizer = createCanonicalizer();

  section('Services');
  const checks = [];

  // Check SQLite
  const sqliteStart = Bun.nanoseconds();
  try {
    const db = new Database(':memory:');
    db.run('SELECT 1');
    db.close();
    const elapsed = Bun.nanoseconds() - sqliteStart;
    checks.push({
      service: 'SQLite',
      status: colorize('OK', 'green'),
      latency: formatNs(elapsed),
    });
  } catch (error) {
    checks.push({
      service: 'SQLite',
      status: colorize('ERROR', 'red'),
      latency: '-',
      details: (error as Error).message,
    });
  }

  // Check canonicalizer
  const canonStart = Bun.nanoseconds();
  try {
    const result = await canonicalizer.canonicalizeWithMetrics({
      exchange: 'polymarket',
      nativeId: 'test-123',
      type: 'binary',
    });
    const elapsed = Bun.nanoseconds() - canonStart;
    checks.push({
      service: 'Canonicalizer',
      status: colorize('OK', 'green'),
      latency: formatNs(elapsed),
      details: result.result.uuid.substring(0, 8) + '...',
    });
  } catch (error) {
    checks.push({
      service: 'Canonicalizer',
      status: colorize('ERROR', 'red'),
      latency: '-',
      details: (error as Error).message,
    });
  }

  table(checks);

  const healthy = checks.filter(c => c.status.includes('OK')).length;
  const total = checks.length;

  if (healthy === total) {
    success(`All ${total} services healthy`);
  } else {
    warn(`${healthy}/${total} services healthy`);
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
      // Server options
      port: { type: 'string', short: 'p' },
      host: { type: 'string' },
      'cors-origin': { type: 'string' },
      'max-concurrent': { type: 'string' },
      'cache-sqlite': { type: 'boolean' },
      'log-level': { type: 'string' },
      // Canonicalize options
      exchange: { type: 'string', short: 'e' },
      'native-id': { type: 'string' },
      type: { type: 'string', short: 't' },
      input: { type: 'string', short: 'i' },
      format: { type: 'string', short: 'f' },
      output: { type: 'string', short: 'o' },
      inspect: { type: 'boolean' },
      // Batch options
      concurrency: { type: 'string', short: 'c' },
      progress: { type: 'boolean' },
      // Cache options
      action: { type: 'string', short: 'a' },
      stats: { type: 'boolean' },
      clear: { type: 'boolean' },
      warm: { type: 'boolean' },
      'exchange-filter': { type: 'string' },
      limit: { type: 'string', short: 'l' },
      // Metrics options
      show: { type: 'boolean' },
      watch: { type: 'boolean', short: 'w' },
      interval: { type: 'string' },
      export: { type: 'string' },
    },
    allowPositionals: true,
  });

  const command = positionals[0] || 'help';

  if (values.help || command === 'help') {
    header(`${APP_NAME} Enhanced Canonicalizer CLI`);
    console.log(`
${colorize('Usage:', 'bold')} bun scripts/canonicalizer-cli.ts <command> [options]

${colorize('Commands:', 'bold')}
  serve                    Start HTTP server with full API
  canonicalize             Canonicalize single market or batch from file
  cache                    Cache management (stats, clear, warm)
  metrics                  Show metrics and monitoring data
  health                   Run health checks

${colorize('Server Options:', 'bold')}
  -p, --port <port>        Server port (default: 3000)
  --host <host>            Server host (default: localhost)
  --cors-origin <origins>  CORS allowed origins (comma-separated)
  --max-concurrent <n>     Max concurrent requests (default: 100)
  --cache-sqlite           Enable SQLite caching
  --log-level <level>      Log level (debug, info, warn, error)

${colorize('Canonicalize Options:', 'bold')}
  -e, --exchange <ex>      Exchange name (polymarket, kalshi, etc.)
  --native-id <id>         Market native identifier
  -t, --type <type>        Market type (binary, scalar, etc.)
  -i, --input <file>       Input file for batch processing
  -f, --format <fmt>       Input format (json, csv)
  -o, --output <file>      Output file
  --inspect                Deep inspect results
  -c, --concurrency <n>    Batch processing concurrency
  --progress               Show progress for batch operations

${colorize('Cache Options:', 'bold')}
  -a, --action <action>    Cache action (stats, clear, warm)
  --stats                  Show cache statistics
  --clear                  Clear all caches
  --warm                   Warm cache with common markets
  --exchange-filter <ex>   Filter by exchange for warming
  -l, --limit <n>          Limit for cache operations

${colorize('Metrics Options:', 'bold')}
  --show                   Show current metrics
  -w, --watch              Watch metrics in real-time
  --interval <ms>          Watch interval in milliseconds
  --export <file>          Export metrics to file

${colorize('Examples:', 'bold')}
  bun scripts/canonicalizer-cli.ts serve --port 3001
  bun scripts/canonicalizer-cli.ts canonicalize --exchange polymarket --native-id "test-123"
  bun scripts/canonicalizer-cli.ts canonicalize --input markets.json --output results.json --progress
  bun scripts/canonicalizer-cli.ts cache --stats
  bun scripts/canonicalizer-cli.ts metrics --watch --interval 2000
  bun scripts/canonicalizer-cli.ts health
`);
    return;
  }

  try {
    switch (command) {
      case 'serve':
        await cmdServe(values as any);
        break;
      case 'canonicalize':
        await cmdCanonicalize(values as any);
        break;
      case 'cache':
        await cmdCache(values as any);
        break;
      case 'metrics':
        await cmdMetrics(values as any);
        break;
      case 'health':
        await cmdHealth();
        break;
      default:
        error(`Unknown command: ${command}`);
        info('Run with --help for usage');
        process.exit(1);
    }
  } catch (err) {
    console.error('Command failed:', (err as Error).message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
