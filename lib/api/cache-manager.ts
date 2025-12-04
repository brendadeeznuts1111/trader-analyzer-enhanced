/**
 * API Cache Manager
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-CACHE-001;version=0.1.16;root=ROOT-SQLITE-WAL}]
 * [PROPERTIES:{cache={value:{ttl:300s;hitTrack:true};@root:"ROOT-SQLITE-WAL";@db:"/data/api-cache.db"}}]
 * [CLASS:APICacheManager][#REF:v-0.1.16.CACHE.MANAGER.1.0.A.1.1][@ROOT:ROOT-SQLITE-WAL][@BLUEPRINT:BP-CANONICAL-UUID@^0.1.16]]
 *
 * Multi-environment caching system:
 * - Bun runtime: SQLite with WAL mode
 * - Next.js/Node: In-memory Map with TTL
 */

import type { CanonicalMarket } from '../canonical';

// Bun-native SHA-1 implementation
const encoder = new TextEncoder();
function sha1(str: string): string {
  const hash = new Bun.CryptoHasher('sha1').update(encoder.encode(str)).digest('hex');
  return hash.substring(0, 16);
}

// Check if running in Bun
const isBun = typeof globalThis.Bun !== 'undefined';

// Environment detection
const IS_DEV = process.env.DEV === 'true' || process.env.NODE_ENV === 'development';

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
  kalshi: { ttl: 60000, maxSize: 2000, strategy: 'ttl', compress: true }, // 1 minute
  manifold: { ttl: 1800000, maxSize: 5000, strategy: 'lru', compress: false }, // 30 minutes
  bitmex: { ttl: 30000, maxSize: 500, strategy: 'ttl', compress: true }, // 30 seconds
  sports: { ttl: 120000, maxSize: 3000, strategy: 'lru', compress: true }, // 2 minutes
  default: { ttl: 300000, maxSize: 1000, strategy: 'lru', compress: false },
};

/**
 * Hash helper using crypto
 */
function hashString(data: string): string {
  return sha1(data).substring(0, 16);
}

/**
 * In-memory cache storage for non-Bun environments
 */
interface MemoryCacheEntry extends CacheEntry {
  data: unknown;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const memoryCacheMetrics = { hits: 0, misses: 0 };

/**
 * API Cache Manager - Works in both Bun (SQLite) and Node/Next.js (Memory)
 */
export class APICacheManager {
  private db: any = null;
  private configs: Record<string, CacheConfig>;
  private usingSQLite = false;

  constructor(dbPath?: string, configs?: Record<string, CacheConfig>) {
    this.configs = { ...DEFAULT_CONFIGS, ...configs };

    if (isBun) {
      try {
        // Dynamic require for Bun's SQLite
        const { Database } = require('bun:sqlite');
        const path = dbPath || (IS_DEV ? ':memory:' : './data/api-cache.db');
        this.db = new Database(path);
        this.initSchema();
        this.usingSQLite = true;
        if (IS_DEV) console.log(`Cache Manager initialized (${IS_DEV ? 'memory' : 'WAL'} mode)`);
      } catch (e) {
        console.warn('SQLite not available, using in-memory cache');
        this.usingSQLite = false;
      }
    } else {
      if (IS_DEV) console.log('Cache Manager initialized (in-memory mode for Next.js)');
      this.usingSQLite = false;
    }
  }

  /**
   * Initialize SQLite schema (Bun only)
   */
  private initSchema(): void {
    if (!this.db) return;

    // Enable WAL mode for production
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
  }

  /**
   * Get config for exchange
   */
  private getConfig(exchange: string): CacheConfig {
    return this.configs[exchange] || this.configs.default;
  }

  /**
   * Generate hash for headers
   */
  private hashHeaders(headers: Record<string, string>): string {
    const sorted = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return hashString(sorted);
  }

  /**
   * Cache API response
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

    if (this.usingSQLite && this.db) {
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
    } else {
      // In-memory cache
      memoryCache.set(canonical.uuid, {
        canonicalUUID: canonical.uuid,
        exchange: canonical.exchange,
        endpoint,
        method,
        headersHash,
        response: JSON.stringify(response),
        status,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        tags: JSON.stringify(canonical.tags),
        hitCount: 0,
        lastAccessed: now.toISOString(),
        data: response,
      });

      // Enforce max size (simple LRU)
      if (memoryCache.size > config.maxSize) {
        const oldest = memoryCache.keys().next().value;
        if (oldest) memoryCache.delete(oldest);
      }
    }
  }

  /**
   * Get cached response
   */
  async get(
    canonicalUUID: string,
    endpoint?: string,
    method: string = 'GET'
  ): Promise<{ data: unknown; cachedAt: string; hitCount: number } | null> {
    const now = new Date();

    if (this.usingSQLite && this.db) {
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

      if (!cached) {
        memoryCacheMetrics.misses++;
        return null;
      }

      // Update hit count
      const updateStmt = this.db.prepare(
        `UPDATE api_cache SET hit_count = hit_count + 1, last_accessed = datetime('now') WHERE canonical_uuid = ?`
      );
      updateStmt.run(canonicalUUID);

      memoryCacheMetrics.hits++;

      // SQLite uses snake_case column names
      const row = cached as any;
      return {
        data: JSON.parse(row.response),
        cachedAt: row.cached_at,
        hitCount: (row.hit_count || 0) + 1,
      };
    } else {
      // In-memory cache
      const cached = memoryCache.get(canonicalUUID);

      if (!cached || new Date(cached.expiresAt) < now) {
        if (cached) memoryCache.delete(canonicalUUID);
        memoryCacheMetrics.misses++;
        return null;
      }

      if (endpoint && cached.endpoint !== endpoint) {
        memoryCacheMetrics.misses++;
        return null;
      }

      // Update stats
      cached.hitCount++;
      cached.lastAccessed = now.toISOString();
      memoryCacheMetrics.hits++;

      return {
        data: cached.data,
        cachedAt: cached.cachedAt,
        hitCount: cached.hitCount,
      };
    }
  }

  /**
   * Check if entry exists and is valid
   */
  has(canonicalUUID: string): boolean {
    if (this.usingSQLite && this.db) {
      const stmt = this.db.prepare(`
        SELECT 1 as found FROM api_cache 
        WHERE canonical_uuid = ? AND expires_at > datetime('now')
        LIMIT 1
      `);
      const result = stmt.get(canonicalUUID);
      return result !== null;
    } else {
      const cached = memoryCache.get(canonicalUUID);
      if (!cached) return false;
      return new Date(cached.expiresAt) > new Date();
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(options: { uuid?: string; exchange?: string; tag?: string; all?: boolean }): number {
    if (this.usingSQLite && this.db) {
      if (options.all) {
        return this.db.run('DELETE FROM api_cache').changes;
      } else if (options.uuid) {
        const stmt = this.db.prepare('DELETE FROM api_cache WHERE canonical_uuid = ?');
        return stmt.run(options.uuid).changes;
      } else if (options.exchange) {
        const stmt = this.db.prepare('DELETE FROM api_cache WHERE exchange = ?');
        return stmt.run(options.exchange).changes;
      }
      return 0;
    } else {
      // In-memory cache
      if (options.all) {
        const size = memoryCache.size;
        memoryCache.clear();
        return size;
      } else if (options.uuid) {
        return memoryCache.delete(options.uuid) ? 1 : 0;
      } else if (options.exchange) {
        let deleted = 0;
        for (const [key, entry] of memoryCache) {
          if (entry.exchange === options.exchange) {
            memoryCache.delete(key);
            deleted++;
          }
        }
        return deleted;
      }
      return 0;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    if (this.usingSQLite && this.db) {
      return this.db.run(`DELETE FROM api_cache WHERE expires_at <= datetime('now')`).changes;
    } else {
      const now = new Date();
      let deleted = 0;
      for (const [key, entry] of memoryCache) {
        if (new Date(entry.expiresAt) <= now) {
          memoryCache.delete(key);
          deleted++;
        }
      }
      return deleted;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(exchange?: string): CacheStats {
    if (this.usingSQLite && this.db) {
      const where = exchange ? `WHERE exchange = '${exchange}'` : '';

      const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM api_cache ${where}`);
      const total = (totalStmt.get() as { count: number }).count || 0;

      const hitsStmt = this.db.prepare(`SELECT SUM(hit_count) as hits FROM api_cache ${where}`);
      const hits = (hitsStmt.get() as { hits: number | null }).hits || 0;

      const misses = memoryCacheMetrics.misses;
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

      const sizeStmt = this.db.prepare(
        `SELECT SUM(LENGTH(response)) as bytes FROM api_cache ${where}`
      );
      const sizeBytes = (sizeStmt.get() as { bytes: number | null }).bytes || 0;

      const byExchangeStmt = this.db.prepare(`
        SELECT exchange, COUNT(*) as count, SUM(LENGTH(response)) as bytes 
        FROM api_cache GROUP BY exchange
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
    } else {
      // In-memory stats
      let total = 0;
      let sizeBytes = 0;
      const byExchange: Record<string, { count: number; bytes: number }> = {};

      for (const [, entry] of memoryCache) {
        if (!exchange || entry.exchange === exchange) {
          total++;
          const bytes = entry.response.length;
          sizeBytes += bytes;

          if (!byExchange[entry.exchange]) {
            byExchange[entry.exchange] = { count: 0, bytes: 0 };
          }
          byExchange[entry.exchange].count++;
          byExchange[entry.exchange].bytes += bytes;
        }
      }

      const { hits, misses } = memoryCacheMetrics;
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

      return { total, hits, misses, hitRate, sizeBytes, byExchange };
    }
  }

  /**
   * Close database connection (Bun only)
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Singleton instance
export const apiCacheManager = new APICacheManager();

// Default export
export default apiCacheManager;
