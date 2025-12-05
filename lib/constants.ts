/**
 * Application Constants
 * Centralized location for URLs and references to prevent forgetfulness
 * [#REF:CONSTANTS-HEX:0x434F4E53]
 */

// =============================================================================
// BUN DOCUMENTATION [#REF:BUN-DOCS]
// =============================================================================

/** Base URL for all Bun documentation */
export const BUN_DOCS_BASE = 'https://bun.com' as const;

/** Bun documentation URLs */
export const BUN_DOCS = {
  /** Main docs site */
  base: BUN_DOCS_BASE,
  /** Runtime configuration */
  bunfig: `${BUN_DOCS_BASE}/docs/runtime/bunfig`,
  /** Blog/RSS feed */
  blog: `${BUN_DOCS_BASE}/blog`,
  rss: `${BUN_DOCS_BASE}/blog/rss.xml`,
  /** Debugging */
  debugger: `${BUN_DOCS_BASE}/docs/runtime/debugger`,
  /** HTTP error handling */
  httpErrorHandling: `${BUN_DOCS_BASE}/docs/runtime/http/error-handling`,
  /** License & polyfills */
  license: `${BUN_DOCS_BASE}/docs/project/license`,
  polyfills: `${BUN_DOCS_BASE}/docs/project/license#polyfills`,
  linkedLibraries: `${BUN_DOCS_BASE}/docs/project/license#linked-libraries`,
  /** Build & Bundler */
  buildTimeConstants: `${BUN_DOCS_BASE}/docs/guides/runtime/build-time-constants`,
  runtimeDefine: `${BUN_DOCS_BASE}/docs/guides/runtime/define-constant`,
  bundler: `${BUN_DOCS_BASE}/docs/bundler`,
  executables: `${BUN_DOCS_BASE}/docs/bundler/executables`,
  /** TypeScript */
  typescript: `${BUN_DOCS_BASE}/docs/runtime/typescript`,
  importPaths: `${BUN_DOCS_BASE}/docs/guides/runtime/import-paths`,
  /** CI/CD */
  githubAction: 'https://github.com/oven-sh/setup-bun',
  /** LLM-friendly docs index */
  llmsTxt: `${BUN_DOCS_BASE}/docs/llms.txt`,
} as const;

// =============================================================================
// BUN BUILT-IN POLYFILLS [#REF:BUN-POLYFILLS]
// =============================================================================

/**
 * Packages embedded into Bun's binary and auto-injected if imported.
 * All MIT licensed. No need to install - just import!
 *
 * @see https://bun.com/docs/project/license#polyfills
 */
export const BUN_POLYFILLS = [
  'assert',
  'browserify-zlib',
  'buffer',
  'constants-browserify',
  'crypto-browserify',
  'domain-browser',
  'events',
  'https-browserify',
  'os-browserify',
  'path-browserify',
  'process',
  'punycode',
  'querystring-es3',
  'stream-browserify',
  'stream-http',
  'string_decoder',
  'timers-browserify',
  'tty-browserify',
  'url',
  'util',
  'vm-browserify',
] as const;

/** Check if a package is a Bun built-in polyfill */
export function isBunPolyfill(pkg: string): boolean {
  return BUN_POLYFILLS.includes(pkg as (typeof BUN_POLYFILLS)[number]);
}

// =============================================================================
// BUN LINKED LIBRARIES [#REF:BUN-LINKED-LIBS]
// =============================================================================

/**
 * Libraries statically linked into Bun's binary
 * @see https://bun.com/docs/project/license#linked-libraries
 */
export const BUN_LINKED_LIBRARIES = {
  boringssl: { license: 'several licenses', url: 'https://boringssl.googlesource.com/boringssl/' },
  brotli: { license: 'MIT', url: 'https://github.com/google/brotli' },
  libarchive: { license: 'several licenses', url: 'https://github.com/libarchive/libarchive' },
  'lol-html': {
    license: 'BSD 3-Clause',
    url: 'https://github.com/cloudflare/lol-html/tree/master/c-api',
  },
  mimalloc: { license: 'MIT', url: 'https://github.com/microsoft/mimalloc' },
  picohttp: { license: 'MIT or Perl', url: 'https://github.com/h2o/picohttpparser' },
  zstd: { license: 'BSD or GPLv2', url: 'https://github.com/facebook/zstd' },
  simdutf: { license: 'Apache 2.0', url: 'https://github.com/simdutf/simdutf' },
  tinycc: { license: 'LGPL v2.1', url: 'https://github.com/tinycc/tinycc' },
  uSockets: { license: 'Apache 2.0', url: 'https://github.com/uNetworking/uSockets' },
  'zlib-cloudflare': { license: 'zlib', url: 'https://github.com/cloudflare/zlib' },
  'c-ares': { license: 'MIT', url: 'https://github.com/c-ares/c-ares' },
  libicu: { license: 'ICU', url: 'https://github.com/unicode-org/icu' },
  libbase64: { license: 'BSD 2-Clause', url: 'https://github.com/aklomp/base64' },
  libuv: { license: 'MIT', url: 'https://github.com/libuv/libuv', note: 'Windows only' },
  libdeflate: { license: 'MIT', url: 'https://github.com/ebiggers/libdeflate' },
  uWebsockets: { license: 'Apache 2.0', url: 'https://github.com/jarred-sumner/uwebsockets' },
} as const;

// =============================================================================
// BUN --DEFINE FLAG [#REF:BUN-DEFINE]
// =============================================================================

/**
 * --define flag: Replace static globals & constants
 *
 * Works at AST level (not string replacement) enabling:
 * - Dead code elimination
 * - Constant folding
 * - Branch elimination
 *
 * Similar to gcc -D or #define in C/C++, but for JavaScript.
 *
 * ## Why --define instead of setting a variable?
 *
 * Setting `process.env.NODE_ENV = "production"` in code does NOT enable
 * dead code elimination. Why? Property accesses can have side effects:
 * - Getters/setters can be functions
 * - Prototypes can be modified
 * - Proxies can intercept access
 *
 * So even after assignment, static analysis can't safely assume the value.
 * `--define` operates at transpile time, BEFORE the code runs.
 *
 * ## Why --define instead of find-and-replace?
 *
 * `--define` operates on the AST (Abstract Syntax Tree), not text:
 * - No escaping issues
 * - Won't replace unintended matches (strings, comments, etc.)
 * - Enables optimizer passes (constant folding, branch elimination)
 *
 * ## Runtime vs Build
 *
 * | Command | When Applied | Use Case |
 * |---------|--------------|----------|
 * | `bun --define X=Y file.ts` | Every run | Dev/testing |
 * | `bun build --define X=Y` | Once at build | Production |
 *
 * ## Value Types
 *
 * ```sh
 * # Strings (must be JSON-quoted)
 * --define VERSION='"1.0.0"'
 *
 * # Numbers/booleans (JSON literals)
 * --define PORT=3000
 * --define DEBUG=true
 *
 * # Objects/arrays (wrap in single quotes)
 * --define 'CONFIG={"host":"localhost","port":3000}'
 *
 * # Property replacement
 * --define 'process.env.NODE_ENV="production"'
 * --define window=undefined
 * --define global=globalThis
 * ```
 *
 * ## Dead Code Elimination Example
 *
 * ```ts
 * // Input
 * if (process.env.NODE_ENV === "production") {
 *   console.log("Prod");
 * } else {
 *   console.log("Dev");
 * }
 *
 * // With --define 'process.env.NODE_ENV="production"'
 * // Bun transforms: "production" === "production" -> true -> eliminates else
 * // Output:
 * console.log("Prod");
 * ```
 *
 * @see https://bun.com/docs/guides/runtime/define-constant (runtime)
 * @see https://bun.com/docs/guides/runtime/build-time-constants (build)
 */
export interface BunBuildDefines {
  [key: string]: string;
}

/**
 * Helper to create build defines with proper JSON formatting
 *
 * @example
 * ```ts
 * const defines = createBuildDefines({
 *   BUILD_VERSION: '1.2.3',
 *   BUILD_TIME: new Date().toISOString(),
 *   DEBUG: false,
 *   CONFIG: { apiUrl: 'https://api.example.com', timeout: 5000 },
 * });
 * // { BUILD_VERSION: '"1.2.3"', BUILD_TIME: '"2024-..."', DEBUG: 'false', CONFIG: '{"apiUrl":...}' }
 * ```
 */
export function createBuildDefines(values: Record<string, unknown>): BunBuildDefines {
  const defines: BunBuildDefines = {};
  for (const [key, value] of Object.entries(values)) {
    defines[key] = JSON.stringify(value);
  }
  return defines;
}

/**
 * Generate shell --define flags from an object
 *
 * @example
 * ```ts
 * const flags = generateDefineFlags({
 *   BUILD_VERSION: '1.2.3',
 *   DEBUG: true,
 * });
 * // '--define BUILD_VERSION=\'"1.2.3"\' --define DEBUG=true'
 * ```
 */
export function generateDefineFlags(values: Record<string, unknown>): string {
  return Object.entries(values)
    .map(([key, value]) => {
      const jsonValue = JSON.stringify(value);
      // Strings need extra quoting for shell
      if (typeof value === 'string') {
        return `--define ${key}='${jsonValue}'`;
      }
      return `--define ${key}=${jsonValue}`;
    })
    .join(' ');
}

/**
 * Common --define patterns for SSR/browser compatibility
 *
 * @example
 * ```sh
 * # SSR: Make window undefined
 * bun --define window=undefined src/server.ts
 *
 * # Browser: Map global to globalThis
 * bun --define global=globalThis src/client.ts
 * ```
 */
export const BUN_DEFINE_PATTERNS = {
  /** SSR - window/document don't exist on server */
  ssr: {
    window: 'undefined',
    document: 'undefined',
    localStorage: 'undefined',
    sessionStorage: 'undefined',
  },
  /** Browser - global doesn't exist in browsers */
  browser: {
    global: 'globalThis',
  },
  /** Production mode */
  production: {
    'process.env.NODE_ENV': '"production"',
    DEBUG: 'false',
  },
  /** Development mode */
  development: {
    'process.env.NODE_ENV': '"development"',
    DEBUG: 'true',
  },
  /**
   * Property aliasing - replace one property with another
   * @example bun --define console.write=console.log src/index.ts
   */
  aliases: {
    'console.write': 'console.log',
    'console.debug': 'console.log',
  },
} as const;

/**
 * Generate --define flags for property aliasing
 *
 * Unlike value replacement, property aliasing maps one identifier to another.
 * No JSON quoting needed - values are identifiers, not strings.
 *
 * @example
 * ```ts
 * // Replace console.write with console.log
 * const flags = generateAliasFlags({ 'console.write': 'console.log' });
 * // '--define console.write=console.log'
 *
 * // Your code:
 * console.write("Hello"); // becomes console.log("Hello")
 * ```
 */
export function generateAliasFlags(aliases: Record<string, string>): string {
  return Object.entries(aliases)
    .map(([from, to]) => `--define ${from}=${to}`)
    .join(' ');
}

// =============================================================================
// BUN DEBUG CONFIG [#REF:BUN-DEBUG-CONFIG]
// =============================================================================

/**
 * BUN_CONFIG_VERBOSE_FETCH - Debug network requests (fetch + node:http)
 *
 * | Value   | Description                        |
 * |---------|------------------------------------|
 * | `curl`  | Print requests as curl commands    |
 * | `true`  | Print request & response info      |
 * | `false` | Don't print anything (default)     |
 *
 * @example
 * // Print as curl commands (copy-paste to terminal to replicate)
 * process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";
 *
 * // Print request/response info only
 * process.env.BUN_CONFIG_VERBOSE_FETCH = "true";
 *
 * @see https://bun.com/docs/runtime/debugger
 */
export const BUN_VERBOSE_FETCH = {
  /** Print requests as curl commands (copy-paste to replicate) */
  curl: 'curl',
  /** Print request & response info */
  true: 'true',
  /** Don't print anything (default) */
  false: 'false',
} as const;

/** Helper to enable verbose fetch debugging */
export function enableVerboseFetch(mode: 'curl' | 'true' = 'curl') {
  process.env.BUN_CONFIG_VERBOSE_FETCH = mode;
}

/** Helper to disable verbose fetch debugging */
export function disableVerboseFetch() {
  process.env.BUN_CONFIG_VERBOSE_FETCH = 'false';
}

// =============================================================================
// CLOUDFLARE DOCUMENTATION [#REF:CF-DOCS]
// =============================================================================

export const CLOUDFLARE_DOCS = {
  /** Cloudflare blog RSS */
  blogRss: 'https://blog.cloudflare.com/rss/',
  /** Durable Objects */
  durableObjects: 'https://blog.cloudflare.com/tag/durable-objects',
  /** Workers documentation */
  workers: 'https://developers.cloudflare.com/workers/',
  wrangler: 'https://developers.cloudflare.com/workers/wrangler/',
} as const;

// =============================================================================
// API CONFIGURATION [#REF:API-CONFIG]
// =============================================================================

/** Default ports for various services */
export const PORTS = {
  /** Next.js frontend */
  nextjs: 3003,
  /** Bun backend API */
  bunBackend: 8000,
  /** Cloudflare Workers local */
  workersLocal: 8788,
  /** Grafana dashboard */
  grafana: 3000,
} as const;

/** Worker URLs by environment */
export const WORKERS_URLS = {
  staging: 'https://trader-analyzer-markets-staging.utahj4754.workers.dev',
  production: 'https://trader-analyzer-markets.utahj4754.workers.dev',
  local: `http://localhost:${PORTS.workersLocal}`,
} as const;

/** Backend URLs by environment */
export const BACKEND_URLS = {
  development: `http://localhost:${PORTS.bunBackend}`,
  staging: WORKERS_URLS.staging,
  production: WORKERS_URLS.production,
} as const;

/**
 * Get the current environment
 */
export function getEnv(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (process.env.STAGING === 'true') return 'staging';
  return 'development';
}

/**
 * API Configuration - centralized URLs and settings
 *
 * @example
 * ```ts
 * import { API_CONFIG } from '@/lib/constants';
 *
 * const response = await fetch(`${API_CONFIG.workersUrl}/api/markets`);
 * ```
 */
export const API_CONFIG = {
  /** Current environment */
  get env() {
    return getEnv();
  },

  /** Bun backend URL (respects BUN_BACKEND_URL env var) */
  get backendUrl() {
    return process.env.BUN_BACKEND_URL || BACKEND_URLS[this.env];
  },

  /** Workers URL (respects NEXT_PUBLIC_WORKERS_API env var) */
  get workersUrl() {
    return (
      process.env.NEXT_PUBLIC_WORKERS_API ||
      WORKERS_URLS[this.env === 'development' ? 'staging' : this.env]
    );
  },

  /** Base URL for the app (respects NEXT_PUBLIC_BASE_URL env var) */
  get baseUrl() {
    return process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${PORTS.nextjs}`;
  },

  /** Grafana dashboard URL */
  get grafanaUrl() {
    return process.env.GRAFANA_URL || `http://localhost:${PORTS.grafana}/d/blueprint`;
  },

  /** API endpoints */
  endpoints: {
    markets: '/api/markets',
    trades: '/api/trades',
    ohlcv: (marketId: string, timeframe = '1d', limit = 100) =>
      `/api/markets/${marketId}/ohlcv?timeframe=${timeframe}&limit=${limit}`,
    sessions: (page = 1, limit = 20, symbol?: string) => {
      let url = `/api/trades?type=sessions&page=${page}&limit=${limit}`;
      if (symbol) url += `&symbol=${encodeURIComponent(symbol)}`;
      return url;
    },
    sessionDetail: (sessionId: string) => `/api/trades?sessionId=${encodeURIComponent(sessionId)}`,
    stats: '/api/trades?type=stats',
    equity: (days = 30) => `/api/trades?type=equity&days=${days}`,
    health: '/api/health',
    pipeline: {
      stats: '/pipeline/stats',
      events: '/events',
    },
  },

  /** Cache TTLs in milliseconds */
  cache: {
    polymarket: 300_000, // 5 minutes
    kalshi: 60_000, // 1 minute
    bitmex: 30_000, // 30 seconds
    sports: 120_000, // 2 minutes
    default: 300_000, // 5 minutes
  },

  /** Timeouts in milliseconds */
  timeouts: {
    default: 30_000, // 30 seconds
    long: 60_000, // 1 minute
    short: 10_000, // 10 seconds
  },
} as const;

/**
 * Build full API URL
 *
 * @example
 * ```ts
 * const url = buildApiUrl('/api/markets');
 * // Returns: https://trader-analyzer-markets-staging.utahj4754.workers.dev/api/markets
 *
 * const url = buildApiUrl(API_CONFIG.endpoints.ohlcv('btc-usd', '1h', 50));
 * ```
 */
export function buildApiUrl(endpoint: string, useBackend = false): string {
  const base = useBackend ? API_CONFIG.backendUrl : API_CONFIG.workersUrl;
  return `${base}${endpoint}`;
}

// =============================================================================
// APPLICATION METADATA [#REF:APP-META]
// =============================================================================

/** Application version - sourced from build-info for consistency */
import { getBuildVersion } from './build-info';
export const APP_VERSION = getBuildVersion();

/** Application name */
export const APP_NAME = 'Trader Analyzer' as const;

/** Application metadata */
export const APP_META = {
  name: APP_NAME,
  version: APP_VERSION,
  description: 'Trading analytics and position tracking',
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BunDocsKey = keyof typeof BUN_DOCS;
export type CloudflareDocsKey = keyof typeof CLOUDFLARE_DOCS;
export type BunVerboseFetchMode = 'curl' | 'true' | 'false';
export type BunPolyfill = (typeof BUN_POLYFILLS)[number];
export type Environment = 'development' | 'staging' | 'production';
export type Port = keyof typeof PORTS;
