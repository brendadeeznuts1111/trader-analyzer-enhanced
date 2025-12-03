/**
 * Reference Tagger System
 *
 * Elite-style message tagging for:
 * - Signals: [#S-2025-XXXXX]
 * - Errors: [#E-2025-XXXXX]
 * - PRs: [#PR-XXX]
 * - Issues: [#I-XXX]
 * - RFCs: [#RFC-XXX]
 * - References: [#REF-XXX]
 */

// Persistence file for counters
const COUNTERS_FILE = '.ref-counters.json';

interface Counters {
  signal: number;
  error: number;
  pr: number;
  issue: number;
  rfc: number;
  year: number;
}

// Load counters from file
function loadCounters(): Counters {
  const currentYear = new Date().getFullYear();
  const defaultCounters: Counters = {
    signal: 0,
    error: 0,
    pr: 0,
    issue: 0,
    rfc: 0,
    year: currentYear,
  };

  try {
    const file = Bun.file(COUNTERS_FILE);
    if (file.size > 0) {
      const data = JSON.parse(file.toString()) as Counters;
      // Reset counters if year changed
      if (data.year !== currentYear) {
        return { ...defaultCounters, pr: data.pr, issue: data.issue, rfc: data.rfc };
      }
      return data;
    }
  } catch {
    // File doesn't exist or is invalid
  }
  return defaultCounters;
}

// Save counters to file
function saveCounters(counters: Counters): void {
  try {
    Bun.write(COUNTERS_FILE, JSON.stringify(counters, null, 2));
  } catch (err) {
    console.error('Failed to save ref counters:', err);
  }
}

// In-memory counters (loaded on first use)
let counters: Counters | null = null;

function getCounters(): Counters {
  if (!counters) {
    counters = loadCounters();
  }
  return counters;
}

/**
 * Reference Tag Generator
 */
export class Ref {
  /**
   * Generate a signal reference tag
   * @returns [#S-2025-XXXXX]
   */
  static signal(): string {
    const c = getCounters();
    c.signal++;
    saveCounters(c);
    return `[#S-${c.year}-${String(c.signal).padStart(5, '0')}]`;
  }

  /**
   * Generate an error reference tag
   * @returns [#E-2025-XXXXX]
   */
  static error(): string {
    const c = getCounters();
    c.error++;
    saveCounters(c);
    return `[#E-${c.year}-${String(c.error).padStart(5, '0')}]`;
  }

  /**
   * Generate a PR reference tag
   * @param num PR number (optional, auto-increments if not provided)
   * @param author Author name/username
   * @returns [#PR-XXX] author:@name
   */
  static pr(num?: number, author?: string): string {
    const c = getCounters();
    const prNum = num ?? ++c.pr;
    if (!num) saveCounters(c);
    const authorStr = author ? ` author:@${author}` : '';
    return `[#PR-${prNum}]${authorStr}`;
  }

  /**
   * Generate an issue reference tag
   * @param num Issue number (optional, auto-increments if not provided)
   * @returns [#I-XXX]
   */
  static issue(num?: number): string {
    const c = getCounters();
    const issueNum = num ?? ++c.issue;
    if (!num) saveCounters(c);
    return `[#I-${issueNum}]`;
  }

  /**
   * Generate an RFC reference tag
   * @param num RFC number (optional, auto-increments if not provided)
   * @param author Author name/username
   * @returns [#RFC-XXX] author:@name
   */
  static rfc(num?: number, author?: string): string {
    const c = getCounters();
    const rfcNum = num ?? ++c.rfc;
    if (!num) saveCounters(c);
    const authorStr = author ? ` author:@${author}` : '';
    return `[#RFC-${rfcNum}]${authorStr}`;
  }

  /**
   * Generate a reference tag (for linking back to previous refs)
   * @param id The original reference ID (e.g., "E-2025-00042")
   * @returns [#REF-E-2025-00042]
   */
  static ref(id: string): string {
    // Clean up the ID if it already has brackets
    const cleanId = id.replace(/^\[#/, '').replace(/\]$/, '');
    return `[#REF-${cleanId}]`;
  }

  /**
   * Generate a commit reference
   * @param hash Short commit hash
   * @param branch Branch name
   * @returns main@6d8f2a1
   */
  static commit(hash: string, branch: string = 'main'): string {
    return `${branch}@${hash.slice(0, 7)}`;
  }

  /**
   * Get current counters (for display/debugging)
   */
  static getStats(): Counters {
    return { ...getCounters() };
  }

  /**
   * Reset all counters (admin function)
   */
  static reset(): void {
    counters = {
      signal: 0,
      error: 0,
      pr: 0,
      issue: 0,
      rfc: 0,
      year: new Date().getFullYear(),
    };
    saveCounters(counters);
  }
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE FORMATTERS (Elite Style)
// ═══════════════════════════════════════════════════════════════

export interface SignalData {
  percentChange: number;
  player?: string;
  opponent?: string;
  odds?: number;
  market?: string;
  league?: string;
  isLive?: boolean;
}

export interface ErrorData {
  service: string;
  code?: number | string;
  message: string;
  action?: string;
  resolved?: boolean;
}

export interface PRData {
  num: number;
  author: string;
  title: string;
  action: 'opened' | 'merged' | 'closed';
  branch?: string;
  hash?: string;
}

/**
 * Format a signal alert in elite style
 */
export function formatSignal(data: SignalData): string {
  const ref = Ref.signal();
  const sign = data.percentChange >= 0 ? '+' : '';
  const pct = `${sign}${data.percentChange.toFixed(1)}%`;

  let msg = `${ref} ${pct}`;

  if (data.player) {
    msg += ` → ${data.player}`;
    if (data.opponent) msg += ` vs ${data.opponent}`;
  }

  if (data.odds) msg += ` • ${data.odds.toFixed(2)} odds`;
  if (data.league) msg += ` • ${data.league}`;
  if (data.isLive) msg += ` ← LIVE`;

  return msg;
}

/**
 * Format an error alert in elite style
 */
export function formatError(data: ErrorData): string {
  const ref = Ref.error();
  let msg = `${ref} ${data.service}`;

  if (data.code) msg += ` ${data.code}`;
  msg += ` → ${data.message}`;
  if (data.action) msg += ` → ${data.action}`;

  return msg;
}

/**
 * Format a follow-up/resolution to an error
 */
export function formatErrorResolution(
  originalRef: string,
  data: {
    rootCause?: string;
    fix?: string;
    prNum?: number;
    author?: string;
    deployed?: boolean;
  }
): string {
  let msg = `${Ref.ref(originalRef)}`;

  if (data.rootCause) msg += ` Root cause: ${data.rootCause}`;
  if (data.fix) msg += ` → ${data.fix}`;
  if (data.prNum) msg += ` → Fixed in ${Ref.pr(data.prNum, data.author)}`;
  if (data.deployed) msg += ` → deployed`;

  return msg;
}

/**
 * Format a PR notification in elite style
 */
export function formatPR(data: PRData): string {
  const ref = Ref.pr(data.num, data.author);
  let msg = `${ref} ${data.title}`;

  if (data.action === 'merged' && data.hash) {
    msg += ` → merged`;
    if (data.branch) msg += ` → ${Ref.commit(data.hash, data.branch)}`;
  } else {
    msg += ` → ${data.action}`;
  }

  return msg;
}

/**
 * Format an RFC proposal
 */
export function formatRFC(
  num: number | undefined,
  author: string,
  title: string,
  votes?: { up: number; down: number }
): string {
  const ref = Ref.rfc(num, author);
  let msg = `${ref} ${title}`;

  if (votes) msg += ` → vote: +${votes.up}/-${votes.down}`;

  return msg;
}
