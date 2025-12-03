/**
 * Debug Inspector - Bun Native Inspection Utilities
 * [#REF:DEBUG-HEX:0x44454255]
 *
 * Uses Bun's native inspect APIs:
 * - Bun.inspect() for object serialization
 * - Bun.inspect.table() for tabular data
 * - Bun.inspect.custom for custom formatting
 * - Bun.nanoseconds() for timing
 */

// =============================================================================
// CUSTOM INSPECTION SYMBOLS
// =============================================================================

/**
 * Symbols for custom inspection - use these to customize how objects print
 */
export const InspectSymbols = {
  /** Custom inspect for canonical markets */
  CANONICAL_MARKET: Bun.inspect.custom,
  /** Custom inspect for cache entries */
  CACHE_ENTRY: Bun.inspect.custom,
  /** Custom inspect for market fetcher */
  MARKET_FETCHER: Bun.inspect.custom,
  /** Custom inspect for blueprints */
  BLUEPRINT: Bun.inspect.custom,
} as const;

// =============================================================================
// TIMING STATS
// =============================================================================

interface TimingStats {
  total: number;
  count: number;
  min: number;
  max: number;
  label: string;
}

// =============================================================================
// DEBUG INSPECTOR CLASS
// =============================================================================

export class DebugInspector {
  private timings = new Map<string, TimingStats>();

  // ===========================================================================
  // STATIC FORMATTING METHODS
  // ===========================================================================

  /**
   * Format an object using Bun.inspect with sensible defaults
   */
  static format(obj: unknown, depth = 4): string {
    return Bun.inspect(obj, {
      depth,
      colors: true,
      sorted: true,
    });
  }

  /**
   * Format tabular data using Bun.inspect.table
   * Returns a string - use console.log() to print
   */
  static table(data: unknown[], columns?: string[], colors = true): string {
    if (!data || data.length === 0) {
      return Bun.inspect.table([{ '(empty)': 'no data' }], { colors });
    }
    if (columns) {
      return Bun.inspect.table(data, columns, { colors });
    }
    return Bun.inspect.table(data, { colors });
  }

  /**
   * Print a table directly to console
   */
  static printTable(data: unknown[], columns?: string[]): void {
    console.log(this.table(data, columns));
  }

  /**
   * Format a Map as a table
   */
  static formatMap<K, V>(map: Map<K, V>, depth = 2): string {
    const entries = Array.from(map.entries()).map(([key, value]) => ({
      key: Bun.inspect(key, { depth: 0, colors: false }),
      value: Bun.inspect(value, { depth: depth - 1, colors: false }),
    }));

    if (entries.length === 0) {
      return 'Map(0) {}';
    }

    return `Map(${map.size}):\n${this.table(entries)}`;
  }

  /**
   * Format a Set as a list
   */
  static formatSet<T>(set: Set<T>, depth = 2): string {
    const values = Array.from(set.values()).map((v, i) => ({
      index: i,
      value: Bun.inspect(v, { depth: depth - 1, colors: false }),
    }));

    if (values.length === 0) {
      return 'Set(0) {}';
    }

    return `Set(${set.size}):\n${this.table(values)}`;
  }

  // ===========================================================================
  // TIMING METHODS
  // ===========================================================================

  /**
   * Time a synchronous or async function
   * Returns { result, durationNs, durationMs }
   */
  static time<T>(
    label: string,
    fn: () => T
  ): T extends Promise<infer U>
    ? Promise<{ result: U; durationNs: number; durationMs: number }>
    : { result: T; durationNs: number; durationMs: number } {
    const start = Bun.nanoseconds();
    const result = fn();

    if (result instanceof Promise) {
      return result.then(resolved => {
        const durationNs = Bun.nanoseconds() - start;
        const durationMs = durationNs / 1_000_000;
        console.log(`⏱️  ${label}: ${durationMs.toFixed(2)}ms`);
        return { result: resolved, durationNs, durationMs };
      }) as any;
    }

    const durationNs = Bun.nanoseconds() - start;
    const durationMs = durationNs / 1_000_000;
    console.log(`⏱️  ${label}: ${durationMs.toFixed(2)}ms`);
    return { result, durationNs, durationMs } as any;
  }

  /**
   * Time a function silently (no console output)
   */
  static timeSilent<T>(
    fn: () => T
  ): T extends Promise<infer U>
    ? Promise<{ result: U; durationNs: number; durationMs: number }>
    : { result: T; durationNs: number; durationMs: number } {
    const start = Bun.nanoseconds();
    const result = fn();

    if (result instanceof Promise) {
      return result.then(resolved => {
        const durationNs = Bun.nanoseconds() - start;
        const durationMs = durationNs / 1_000_000;
        return { result: resolved, durationNs, durationMs };
      }) as any;
    }

    const durationNs = Bun.nanoseconds() - start;
    const durationMs = durationNs / 1_000_000;
    return { result, durationNs, durationMs } as any;
  }

  // ===========================================================================
  // INSTANCE TRACKING METHODS
  // ===========================================================================

  /**
   * Track timing for multiple calls to the same operation
   */
  track(label: string, fn: () => void): void {
    const start = Bun.nanoseconds();
    fn();
    const duration = Bun.nanoseconds() - start;

    const existing = this.timings.get(label) || {
      total: 0,
      count: 0,
      min: Infinity,
      max: 0,
      label,
    };

    existing.total += duration;
    existing.count += 1;
    existing.min = Math.min(existing.min, duration);
    existing.max = Math.max(existing.max, duration);

    this.timings.set(label, existing);
  }

  /**
   * Track async operations
   */
  async trackAsync(label: string, fn: () => Promise<void>): Promise<void> {
    const start = Bun.nanoseconds();
    await fn();
    const duration = Bun.nanoseconds() - start;

    const existing = this.timings.get(label) || {
      total: 0,
      count: 0,
      min: Infinity,
      max: 0,
      label,
    };

    existing.total += duration;
    existing.count += 1;
    existing.min = Math.min(existing.min, duration);
    existing.max = Math.max(existing.max, duration);

    this.timings.set(label, existing);
  }

  /**
   * Get timing statistics as a formatted table
   */
  getStats(): string {
    const rows = Array.from(this.timings.values()).map(stats => ({
      Label: stats.label,
      Calls: stats.count,
      'Total (ms)': (stats.total / 1_000_000).toFixed(2),
      'Avg (ms)': (stats.total / stats.count / 1_000_000).toFixed(3),
      'Min (μs)': (stats.min / 1_000).toFixed(1),
      'Max (μs)': (stats.max / 1_000).toFixed(1),
    }));

    if (rows.length === 0) {
      return 'No timing data collected';
    }

    return Bun.inspect.table(rows, ['Label', 'Calls', 'Avg (ms)', 'Min (μs)', 'Max (μs)'], {
      colors: true,
    });
  }

  /**
   * Print timing statistics
   */
  printStats(): void {
    console.log('\n📊 Timing Statistics:');
    console.log(this.getStats());
  }

  /**
   * Clear all timing data
   */
  clearStats(): void {
    this.timings.clear();
  }

  /**
   * Get raw timing data
   */
  getRawStats(): Map<string, TimingStats> {
    return new Map(this.timings);
  }
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format nanoseconds to human readable string
 */
export function formatNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}μs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

// =============================================================================
// CUSTOM INSPECTABLE CLASSES
// =============================================================================

/**
 * Example of a class with custom inspect
 * Objects with [Bun.inspect.custom]() method will use it when inspected
 */
export class InspectableMarket {
  constructor(
    public uuid: string,
    public exchange: string,
    public nativeId: string,
    public type: string
  ) {}

  [Bun.inspect.custom](): string {
    const shortUuid = this.uuid.substring(0, 8);
    return `Market<${this.exchange}:${this.nativeId}> [${shortUuid}...]`;
  }
}

/**
 * Example of an inspectable cache entry
 */
export class InspectableCacheEntry {
  constructor(
    public key: string,
    public value: unknown,
    public hits: number,
    public expiresAt: Date
  ) {}

  [Bun.inspect.custom](): string {
    const expired = this.expiresAt < new Date() ? '❌ EXPIRED' : '✓';
    return `CacheEntry<${this.key.substring(0, 20)}...> hits=${this.hits} ${expired}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global inspector instance for tracking across the application */
export const inspector = new DebugInspector();

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/** Shorthand for DebugInspector.format */
export const fmt = DebugInspector.format;

/** Shorthand for DebugInspector.table */
export const tbl = DebugInspector.table;

/** Shorthand for DebugInspector.time */
export const time = DebugInspector.time;
