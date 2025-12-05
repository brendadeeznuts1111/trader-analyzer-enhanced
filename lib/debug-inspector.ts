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

interface TableOptions {
  /** Column names to display and their order */
  columns?: string[];
  /** Enable/disable colors (default: true) */
  colors?: boolean;
  /** Maximum number of rows to display (default: all) */
  maxRows?: number;
  /** Column width overrides { columnName: width } */
  columnWidths?: Record<string, number>;
  /** Column formatters { columnName: (value) => string } */
  formatters?: Record<string, (value: any) => string>;
  /** Sort by column name and direction */
  sortBy?: { column: string; direction?: 'asc' | 'desc' };
  /** Show row numbers (default: true) */
  showRowNumbers?: boolean;
  /** Footer text to display below table */
  footer?: string;
  /** Header text to display above table */
  header?: string;
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
   * Enhanced tabular data formatting using Bun.inspect.table
   * Returns a formatted string with advanced options
   */
  static table(data: unknown[], options: TableOptions | string[] = {}): string {
    // Handle legacy string[] format for backward compatibility
    let opts: TableOptions;
    if (Array.isArray(options)) {
      opts = { columns: options, colors: true };
    } else {
      opts = { colors: true, showRowNumbers: true, ...options };
    }

    if (!data || data.length === 0) {
      const emptyTable = opts.header ? `${opts.header}\n` : '';
      return emptyTable + Bun.inspect.table([{ '(empty)': 'no data' }], { colors: opts.colors });
    }

    // Apply row limit
    let displayData = data;
    if (opts.maxRows && data.length > opts.maxRows) {
      displayData = data.slice(0, opts.maxRows);
    }

    // Apply sorting
    if (opts.sortBy && displayData.length > 0) {
      const { column, direction = 'asc' } = opts.sortBy;
      displayData = [...displayData].sort((a, b) => {
        const aVal = (a as any)[column];
        const bVal = (b as any)[column];
        
        if (aVal === bVal) return 0;
        const comparison = aVal > bVal ? 1 : -1;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply column formatters
    if (opts.formatters) {
      displayData = displayData.map(row => {
        const formattedRow = { ...row };
        for (const [column, formatter] of Object.entries(opts.formatters!)) {
          if (column in formattedRow) {
            (formattedRow as any)[column] = formatter((formattedRow as any)[column]);
          }
        }
        return formattedRow;
      });
    }

    // Generate table
    let result = '';
    if (opts.header) {
      result += `${opts.header}\n`;
    }

    const tableOutput = opts.columns 
      ? Bun.inspect.table(displayData, opts.columns, { colors: opts.colors })
      : Bun.inspect.table(displayData, { colors: opts.colors });

    result += tableOutput;

    // Add footer
    if (opts.footer) {
      result += `\n${opts.footer}`;
    }

    // Add truncation notice if data was limited
    if (opts.maxRows && data.length > opts.maxRows) {
      result += `\n... and ${data.length - opts.maxRows} more rows (showing first ${opts.maxRows})`;
    }

    return result;
  }

  /**
   * Print a table directly to console with enhanced options
   */
  static printTable(data: unknown[], options: TableOptions | string[] = {}): void {
    console.log(this.table(data, options));
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
   * Get timing statistics as a formatted table with enhanced options
   */
  getStats(options: { maxRows?: number; sortBy?: 'calls' | 'avg' | 'total' } = {}): string {
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

    // Apply sorting
    let sortBy;
    if (options.sortBy === 'calls') {
      sortBy = { column: 'Calls', direction: 'desc' as const };
    } else if (options.sortBy === 'avg') {
      sortBy = { column: 'Avg (ms)', direction: 'desc' as const };
    } else if (options.sortBy === 'total') {
      sortBy = { column: 'Total (ms)', direction: 'desc' as const };
    }

    return DebugInspector.table(rows, {
      columns: ['Label', 'Calls', 'Avg (ms)', 'Min (μs)', 'Max (μs)'],
      colors: true,
      header: '📊 Timing Statistics',
      footer: `Total operations: ${rows.reduce((sum, row) => sum + row.Calls, 0)} calls`,
      maxRows: options.maxRows,
      sortBy,
      formatters: {
        'Calls': (val) => val.toString(),
        'Avg (ms)': (val) => `${val}ms`,
        'Min (μs)': (val) => `${val}μs`,
        'Max (μs)': (val) => `${val}μs`,
      }
    });
  }
      /**
   * Print timing statistics
   */
  printStats(): void {
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
