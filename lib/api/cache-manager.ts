/**
 * API Cache Manager
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-CACHE-001;version=0.1.16;root=ROOT-SQLITE-WAL}]
 * [PROPERTIES:{cache={value:{ttl:300s;hitTrack:true};@root:"ROOT-SQLITE-WAL";@db:"/data/api-cache.db"}}]
 * [CLASS:APICacheManager][#REF:v-0.1.16.CACHE.MANAGER.1.0.A.1.1][@ROOT:ROOT-SQLITE-WAL][@BLUEPRINT:BP-CANONICAL-UUID@^0.1.16]]
 *
 * SQLite-backed caching system with:
 * - TTL-based expiration
 * - Hit tracking and metrics
 * - WAL mode for production
 * - In-memory fallback for development
 */

import { Database } from 'bun:sqlite';
import type { CanonicalMarket } from '../canonical';

// Environment detection
const IS_DEV = process.env.DEV === 'true' || process.env.NODE_ENV === 'development';
const DB_PATH = IS_DEV ? ':memory:' : './data/api-cache.db';

export interface CacheEntry {
  canonicalUUID: string;
  exchange: string;
  endpoint: string;
  method: string;
  headersHash: string;
  response: string;
  status: number;
  cachedAt: string;
  expiresAt: string;
  tags: string;
  hitCount: number;
  lastAccessed: string;
}

export interface CacheConfig {
  ttl: number; // Time-to-live in milliseconds
  maxSize: number; // Maximum entries per exchange
  strategy: 'lru' | 'fifo' | 'ttl';
  compress: boolean;
}

export interface CacheStats {
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
  sizeBytes: number;
  byExchange: Record<string, { count: number; bytes: number }>;
}

// Default TTL configs per exchange
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  polymarket: { ttl: 300000, maxSize: 1000, strategy: 'lru', compress: true }, // 5 minutes
  kalshi: { ttl: 60000, maxSize: 2000, strategy: 'ttl', compress: true }, // 1 minute (frequent updates)
  manifold: { ttl: 1800000, maxSize: 5000, strategy: 'lru', compress: false }, // 30 minutes
  bitmex: { ttl: 30000, maxSize: 500, strategy: 'ttl', compress: true }, // 30 seconds (real-time)
  sports: { ttl: 120000, maxSize: 3000, strategy: 'lru', compress: true }, // 2 minutes
  default: { ttl: 300000, maxSize: 1000, strategy: 'lru', compress: false },
};

/**
 * API Cache Manager - SQLite-backed with TTL and metrics
 */
export class APICacheManager {
  private db: Database;
  private configs: Record<string, CacheConfig>;
  private initialized = false;

  constructor(dbPath: string = DB_PATH, configs?: Record<string, CacheConfig>) {
    this.db = new Database(dbPath);
    this.configs = { ...DEFAULT_CONFIGS, ...configs };
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    // Enable WAL mode for production (better concurrent performance)
    if (!IS_DEV) {
      this.db.run('PRAGMA journal_mode = WAL');
      this.db.run('PRAGMA synchronous = NORMAL');
    }

    // Main cache table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS api_cache (
        canonical_uuid TEXT PRIMARY KEY,
        exchange TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT DEFAULT 'GET',
        headers_hash TEXT NOT NULL,
        response TEXT NOT NULL,
        status INTEGER NOT NULL,
        cached_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        tags TEXT,
        hit_count INTEGER DEFAULT 0,
        last_accessed TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_cache_exchange ON api_cache(exchange)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_cache(expires_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_cache_tags ON api_cache(tags)');

    // Metrics table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT (datetime('now')),
        exchange TEXT,
        operation TEXT,
        hit INTEGER DEFAULT 0,
        miss INTEGER DEFAULT 0,
        latency_ms REAL DEFAULT 0
      )
    `);

    this.initialized = true;
    console.log(`Cache Manager initialized (${IS_DEV ? 'memory' : 'WAL'} mode)`);
  }

  /**
   * Get config for exchange
   */
  private getConfig(exchange: string): CacheConfig {
    return this.configs[exchange] || this.configs.default;
  }

  /**
   * Generate hash for headers (to detect changes)
   */
  private hashHeaders(headers: Record<string, string>): string {
    const sorted = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return new Bun.CryptoHasher('sha256').update(sorted).digest('hex').substring(0, 16);
  }

  /**
   * Cache API response with canonical UUID
   */
  async set(
    canonical: CanonicalMarket,
    endpoint: string,
    method: string,
    response: unknown,
    status: number
  ): Promise<void> {
    const config = this.getConfig(canonical.exchange);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.ttl);
    const headersHash = this.hashHeaders(canonical.apiMetadata.headers);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO api_cache 
      (canonical_uuid, exchange, endpoint, method, headers_hash, response, status, cached_at, expires_at, tags, hit_count, last_accessed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(
      canonical.uuid,
      canonical.exchange,
      endpoint,
      method,
      headersHash,
      JSON.stringify(response),
      status,
      now.toISOString(),
      expiresAt.toISOString(),
      JSON.stringify(canonical.tags),
      now.toISOString()
    );

    // Track metric
    this.trackMetric(canonical.exchange, 'cache_set', false, 0);

    // Enforce max size
    await this.enforceMaxSize(canonical.exchange, config.maxSize);
  }

  /**
   * Get cached response
   */
  async get(
    canonicalUUID: string,
    endpoint?: string,
    method: string = 'GET'
  ): Promise<{ data: unknown; cachedAt: string; hitCount: number } | null> {
    const start = performance.now();

    let cached: CacheEntry | undefined;

    if (endpoint) {
      const stmt = this.db.prepare(`
        SELECT * FROM api_cache 
        WHERE canonical_uuid = ? 
          AND expires_at > datetime('now')
          AND endpoint = ?
          AND method = ?
        LIMIT 1
      `);
      cached = stmt.get(canonicalUUID, endpoint, method) as CacheEntry | undefined;
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM api_cache 
        WHERE canonical_uuid = ? 
          AND expires_at > datetime('now')
          AND method = ?
        LIMIT 1
      `);
      cached = stmt.get(canonicalUUID, method) as CacheEntry | undefined;
    }

    const latency = performance.now() - start;

    if (!cached) {
      this.trackMetric('unknown', 'cache_miss', false, latency);
      return null;
    }

    // Update hit count and last accessed
    const updateStmt = this.db.prepare(
      `UPDATE api_cache SET hit_count = hit_count + 1, last_accessed = datetime('now') WHERE canonical_uuid = ?`
    );
    updateStmt.run(canonicalUUID);

    this.trackMetric(cached.exchange, 'cache_hit', true, latency);

    return {
      data: JSON.parse(cached.response),
      cachedAt: cached.cachedAt,
      hitCount: (cached.hitCount || 0) + 1,
    };
  }

  /**
   * Check if entry exists and is valid
   */
  has(canonicalUUID: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 as found FROM api_cache 
      WHERE canonical_uuid = ? AND expires_at > datetime('now')
      LIMIT 1
    `);
    const result = stmt.get(canonicalUUID) as { found: number } | null;
    return result !== null;
  }

  /**
   * Invalidate cache entries
   */
  invalidate(options: { uuid?: string; exchange?: string; tag?: string; all?: boolean }): number {
    let deleted = 0;

    if (options.all) {
      deleted = this.db.run('DELETE FROM api_cache').changes;
    } else if (options.uuid) {
      const stmt = this.db.prepare('DELETE FROM api_cache WHERE canonical_uuid = ?');
      deleted = stmt.run(options.uuid).changes;
    } else if (options.exchange) {
      const stmt = this.db.prepare('DELETE FROM api_cache WHERE exchange = ?');
      deleted = stmt.run(options.exchange).changes;
    } else if (options.tag) {
      const stmt = this.db.prepare('DELETE FROM api_cache WHERE tags LIKE ?');
      deleted = stmt.run(`%${options.tag}%`).changes;
    }

    if (deleted > 0) {
      this.trackMetric(options.exchange || 'all', 'cache_invalidate', false, 0);
    }

    return deleted;
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): number {
    const deleted = this.db.run(
      `DELETE FROM api_cache WHERE expires_at <= datetime('now')`
    ).changes;

    if (deleted > 0) {
      console.log(`Cache cleanup: removed ${deleted} expired entries`);
      this.trackMetric('system', 'cache_cleanup', false, 0);
    }

    return deleted;
  }

  /**
   * Enforce max size for exchange
   */
  private async enforceMaxSize(exchange: string, maxSize: number): Promise<void> {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM api_cache WHERE exchange = ?');
    const { count } = countStmt.get(exchange) as { count: number };

    if (count > maxSize) {
      const toDelete = count - maxSize;

      // Delete oldest entries (LRU)
      const deleteStmt = this.db.prepare(`
        DELETE FROM api_cache WHERE canonical_uuid IN (
          SELECT canonical_uuid FROM api_cache 
          WHERE exchange = ? 
          ORDER BY last_accessed ASC 
          LIMIT ?
        )
      `);
      deleteStmt.run(exchange, toDelete);

      console.log(`Cache eviction: removed ${toDelete} entries for ${exchange}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(exchange?: string): CacheStats {
    const where = exchange ? `WHERE exchange = '${exchange}'` : '';

    // Total entries
    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM api_cache ${where}`);
    const total = (totalStmt.get() as { count: number }).count || 0;

    // Total hits
    const hitsStmt = this.db.prepare(`SELECT SUM(hit_count) as hits FROM api_cache ${where}`);
    const hits = (hitsStmt.get() as { hits: number | null }).hits || 0;

    // Misses from metrics
    const missesStmt = this.db.prepare(`
      SELECT COUNT(*) as misses FROM cache_metrics 
      WHERE operation = 'cache_miss' ${exchange ? `AND exchange = '${exchange}'` : ''}
    `);
    const misses = (missesStmt.get() as { misses: number }).misses || 0;

    // Hit rate
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

    // Size estimate
    const sizeStmt = this.db.prepare(
      `SELECT SUM(LENGTH(response)) as bytes FROM api_cache ${where}`
    );
    const sizeBytes = (sizeStmt.get() as { bytes: number | null }).bytes || 0;

    // By exchange breakdown
    const byExchangeStmt = this.db.prepare(`
      SELECT exchange, COUNT(*) as count, SUM(LENGTH(response)) as bytes 
      FROM api_cache 
      GROUP BY exchange
    `);
    const byExchangeRows = byExchangeStmt.all() as Array<{
      exchange: string;
      count: number;
      bytes: number;
    }>;
    const byExchange: Record<string, { count: number; bytes: number }> = {};
    for (const row of byExchangeRows) {
      byExchange[row.exchange] = { count: row.count, bytes: row.bytes || 0 };
    }

    return { total, hits, misses, hitRate, sizeBytes, byExchange };
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string, exchange?: string): CacheEntry[] {
    let query = `SELECT * FROM api_cache WHERE tags LIKE ? AND expires_at > datetime('now')`;
    const params: string[] = [`%${tag}%`];

    if (exchange) {
      query += ' AND exchange = ?';
      params.push(exchange);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as CacheEntry[];
  }

  /**
   * Track cache metric
   */
  private trackMetric(exchange: string, operation: string, isHit: boolean, latency: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO cache_metrics (exchange, operation, hit, miss, latency_ms)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(exchange, operation, isHit ? 1 : 0, isHit ? 0 : 1, latency);
  }

  /**
   * Get recent metrics
   */
  getMetrics(limit: number = 100): Array<{
    timestamp: string;
    exchange: string;
    operation: string;
    hit: number;
    miss: number;
    latency_ms: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT * FROM cache_metrics ORDER BY timestamp DESC LIMIT ?
    `);
    return stmt.all(limit) as Array<{
      timestamp: string;
      exchange: string;
      operation: string;
      hit: number;
      miss: number;
      latency_ms: number;
    }>;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get raw database reference (for advanced queries)
   */
  getDatabase(): Database {
    return this.db;
  }
}

// Singleton instance
export const apiCacheManager = new APICacheManager();

// Default export
export default apiCacheManager;
