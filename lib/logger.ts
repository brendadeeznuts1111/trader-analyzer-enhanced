/**
 * Elite Logging System for Bun
 * [#REF:LOGGER-HEX:0x4C4F4747]
 *
 * Zero dependencies. 100% Bun-native.
 * - Colored output with ANSI codes
 * - console.table for arrays/objects
 * - Auto [#REF] tagging for errors/signals
 * - Timestamp formatting
 *
 * @see https://bun.com/docs/runtime/debugger
 */

import { Ref } from './ref-tagger';

// =============================================================================
// TYPES
// =============================================================================

export type LogLevel =
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'SIGNAL'
  | 'GOLDEN'
  | 'DEBUG'
  | 'SUCCESS'
  | 'TEST';

export interface LogOptions {
  /** Skip console.table even for arrays/objects */
  noTable?: boolean;
  /** Custom tag override */
  tag?: string;
  /** Additional context for structured logging */
  context?: Record<string, unknown>;
  /** Telegram topic ID to post to (for ERROR/GOLDEN) */
  telegramTopicId?: number;
}

export interface TableOptions {
  /** Maximum rows to display */
  maxRows?: number;
  /** Columns to display (default: all) */
  columns?: string[];
  /** Title for the table */
  title?: string;
}

// =============================================================================
// ANSI COLORS
// =============================================================================

const COLORS = {
  // Log levels
  INFO: '\x1b[36m', // cyan
  WARN: '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  SIGNAL: '\x1b[32m', // green
  GOLDEN: '\x1b[97m\x1b[41m', // white on red (standout)
  DEBUG: '\x1b[90m', // gray
  SUCCESS: '\x1b[32m', // green
  TEST: '\x1b[35m', // magenta

  // Decorations
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',

  // Additional colors
  CYAN: '\x1b[36m',
  MAGENTA: '\x1b[35m',
  WHITE: '\x1b[37m',
  BLACK: '\x1b[30m',
  BLUE: '\x1b[34m',

  // Backgrounds
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
} as const;

// =============================================================================
// LOGGER CLASS
// =============================================================================

export class Logger {
  private static minLevel: LogLevel = 'DEBUG';
  private static silent = false;

  // Level hierarchy for filtering
  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    TEST: 2,
    SUCCESS: 2,
    SIGNAL: 3,
    WARN: 4,
    ERROR: 5,
    GOLDEN: 6,
  };

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Set minimum log level (logs below this level are suppressed)
   */
  static setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Silence all logging (useful for tests)
   */
  static setSilent(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Check if a level should be logged
   */
  private static shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    return this.LEVEL_PRIORITY[level] >= this.LEVEL_PRIORITY[this.minLevel];
  }

  // ═══════════════════════════════════════════════════════════════
  // FORMATTERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format timestamp: 2025-12-03 20:45:12
   */
  private static formatTime(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  /**
   * Format duration in human readable form
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(0);
    return `${mins}m ${secs}s`;
  }

  /**
   * Format bytes in human readable form
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Core log function
   */
  private static log(
    level: LogLevel,
    tag: string,
    message: string,
    data?: unknown,
    options?: LogOptions
  ): void {
    if (!this.shouldLog(level)) return;

    const timestamp = this.formatTime();
    const color = COLORS[level] || COLORS.INFO;
    const reset = COLORS.RESET;

    const displayTag = options?.tag || tag;
    const line = `${color}[${timestamp}] ${level.padEnd(7)} ${displayTag}${reset} ${message}`;

    // Handle data display
    if (data !== undefined && !options?.noTable) {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        console.log(line);
        const rows = data.slice(0, 50);
        const columns = options?.context?.columns as string[] | undefined;
        if (columns) {
          console.table(rows, columns);
        } else {
          console.table(rows);
        }
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log(line);
        console.table([data]);
      } else {
        console.log(line, data);
      }
    } else {
      console.log(line);
    }

    // Add context if provided
    if (options?.context && Object.keys(options.context).length > 0) {
      const contextStr = Object.entries(options.context)
        .map(([k, v]) => `${COLORS.DIM}${k}=${JSON.stringify(v)}${reset}`)
        .join(' ');
      console.log(`  ${contextStr}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API - Log Levels
  // ═══════════════════════════════════════════════════════════════

  static info(message: string, data?: unknown, options?: LogOptions): void {
    this.log('INFO', '[INFO]', message, data, options);
  }

  static warn(message: string, data?: unknown, options?: LogOptions): void {
    this.log('WARN', '[WARN]', message, data, options);
  }

  static error(message: string, data?: unknown, options?: LogOptions): void {
    const tag = Ref.error();
    this.log('ERROR', tag, message, data, options);
  }

  static debug(message: string, data?: unknown, options?: LogOptions): void {
    this.log('DEBUG', '[DEBUG]', message, data, options);
  }

  static success(message: string, data?: unknown, options?: LogOptions): void {
    this.log('SUCCESS', '[OK]', message, data, options);
  }

  /**
   * Signal alert (trading signals)
   */
  static signal(message: string, data?: unknown, options?: LogOptions): void {
    const tag = Ref.signal();
    this.log('SIGNAL', tag, message, data, options);
  }

  /**
   * Golden zone alert (high-value signals) - stands out with red background
   */
  static golden(message: string, data?: unknown, options?: LogOptions): void {
    const tag = Ref.signal();
    this.log('GOLDEN', tag, message, data, options);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API - Special Formats
  // ═══════════════════════════════════════════════════════════════

  /**
   * Display data as a formatted table
   */
  static table(title: string, data: unknown[], options?: TableOptions): void {
    if (this.silent) return;

    const maxRows = options?.maxRows ?? 100;
    const reset = COLORS.RESET;

    console.log(`\n${COLORS.CYAN}═══ ${title} ═══${reset}`);

    if (!data || data.length === 0) {
      console.log(`  ${COLORS.DIM}(no data)${reset}`);
      return;
    }

    const rows = data.slice(0, maxRows);
    if (options?.columns) {
      console.table(rows, options.columns);
    } else {
      console.table(rows);
    }

    if (data.length > maxRows) {
      console.log(`  ${COLORS.DIM}... and ${data.length - maxRows} more rows${reset}`);
    }
  }

  /**
   * Display key-value pairs
   */
  static kv(title: string, data: Record<string, unknown>): void {
    if (this.silent) return;

    const reset = COLORS.RESET;
    console.log(`\n${COLORS.CYAN}─── ${title} ───${reset}`);

    for (const [key, value] of Object.entries(data)) {
      const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`  ${COLORS.DIM}${key}:${reset} ${formattedValue}`);
    }
  }

  /**
   * Display a separator line
   */
  static separator(char = '─', length = 60): void {
    if (this.silent) return;
    console.log(`${COLORS.DIM}${char.repeat(length)}${COLORS.RESET}`);
  }

  /**
   * Display a header/section title
   */
  static header(title: string): void {
    if (this.silent) return;
    const reset = COLORS.RESET;
    console.log(`\n${COLORS.BOLD}${COLORS.CYAN}╔${'═'.repeat(title.length + 2)}╗${reset}`);
    console.log(`${COLORS.BOLD}${COLORS.CYAN}║ ${title} ║${reset}`);
    console.log(`${COLORS.BOLD}${COLORS.CYAN}╚${'═'.repeat(title.length + 2)}╝${reset}\n`);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log test pass
   */
  static testPass(name: string, duration?: number): void {
    const durationStr =
      duration !== undefined
        ? ` ${COLORS.DIM}(${this.formatDuration(duration)})${COLORS.RESET}`
        : '';
    this.log('SUCCESS', '[PASS]', `${name}${durationStr}`);
  }

  /**
   * Log test fail
   */
  static testFail(name: string, error?: string): void {
    this.log('ERROR', '[FAIL]', name);
    if (error) {
      console.log(`  ${COLORS.DIM}${error}${COLORS.RESET}`);
    }
  }

  /**
   * Log test skip
   */
  static testSkip(name: string, reason?: string): void {
    const reasonStr = reason ? ` - ${reason}` : '';
    this.log('WARN', '[SKIP]', `${name}${reasonStr}`);
  }

  /**
   * Log test suite summary
   */
  static testSummary(passed: number, failed: number, skipped: number, duration: number): void {
    const reset = COLORS.RESET;
    const total = passed + failed + skipped;

    console.log(`\n${COLORS.CYAN}═══ Test Summary ═══${reset}`);
    console.log(`  ${COLORS.SUCCESS}Passed:${reset}  ${passed}/${total}`);
    if (failed > 0) {
      console.log(`  ${COLORS.ERROR}Failed:${reset}  ${failed}/${total}`);
    }
    if (skipped > 0) {
      console.log(`  ${COLORS.WARN}Skipped:${reset} ${skipped}/${total}`);
    }
    console.log(`  ${COLORS.DIM}Duration: ${this.formatDuration(duration)}${reset}\n`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE TIMING
  // ═══════════════════════════════════════════════════════════════

  private static timers = new Map<string, number>();

  /**
   * Start a timer
   */
  static time(label: string): void {
    this.timers.set(label, performance.now());
  }

  /**
   * End a timer and log the duration
   */
  static timeEnd(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      this.warn(`Timer '${label}' not found`);
      return 0;
    }

    const duration = performance.now() - start;
    this.timers.delete(label);
    this.debug(`${label}: ${this.formatDuration(duration)}`);
    return duration;
  }

  /**
   * End a timer and return duration without logging
   */
  static timeEndSilent(label: string): number {
    const start = this.timers.get(label);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.timers.delete(label);
    return duration;
  }

  // ═══════════════════════════════════════════════════════════════
  // REQUEST/RESPONSE LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log an HTTP request
   */
  static request(
    method: string,
    url: string,
    options?: { status?: number; duration?: number }
  ): void {
    const statusColor = options?.status
      ? options.status >= 400
        ? COLORS.ERROR
        : options.status >= 300
          ? COLORS.WARN
          : COLORS.SUCCESS
      : COLORS.INFO;

    const status = options?.status ? `${statusColor}${options.status}${COLORS.RESET}` : '';
    const duration = options?.duration
      ? ` ${COLORS.DIM}${this.formatDuration(options.duration)}${COLORS.RESET}`
      : '';

    this.log('INFO', '[HTTP]', `${method} ${url} ${status}${duration}`);
  }

  /**
   * Log API response with structured data
   */
  static apiResponse(
    endpoint: string,
    data: { status: number; body?: unknown; duration?: number }
  ): void {
    const statusColor =
      data.status >= 400 ? COLORS.ERROR : data.status >= 300 ? COLORS.WARN : COLORS.SUCCESS;
    const reset = COLORS.RESET;

    console.log(
      `${COLORS.INFO}[API]${reset} ${endpoint} → ${statusColor}${data.status}${reset}` +
        (data.duration ? ` ${COLORS.DIM}(${this.formatDuration(data.duration)})${reset}` : '')
    );

    if (data.body && typeof data.body === 'object') {
      console.table([data.body]);
    }
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/** Shorthand for Logger.info */
export const log = Logger.info.bind(Logger);

/** Shorthand for Logger.error */
export const logError = Logger.error.bind(Logger);

/** Shorthand for Logger.warn */
export const logWarn = Logger.warn.bind(Logger);

/** Shorthand for Logger.debug */
export const logDebug = Logger.debug.bind(Logger);

/** Shorthand for Logger.table */
export const logTable = Logger.table.bind(Logger);

// =============================================================================
// TYPE RE-EXPORTS
// =============================================================================

export { COLORS };
