/**
 * URLPattern Web API Implementation
 * 
 * Declarative URL pattern matching - specify a pattern once, then test URLs
 * against it or extract parameters. Think of it like regular expressions for URLs.
 * 
 * Based on the WHATWG URLPattern specification (https://urlpattern.spec.whatwg.org/)
 * and Bun PR #25168 (https://github.com/oven-sh/bun/pull/25168).
 * 
 * @module url-pattern
 * @example
 * const pattern = new URLPattern({ pathname: '/users/:id' });
 * pattern.test('https://example.com/users/123'); // true
 * pattern.exec('https://example.com/users/123').pathname.groups.id // '123'
 */

// ============================================================================
// Global Type Augmentation for URLPattern
// ============================================================================

declare global {
  interface URLPatternGlobal {
    new (input: URLPatternInput, baseURLOrOptions?: string | URLPatternOptions): IURLPattern;
  }
  
  // eslint-disable-next-line no-var
  var URLPattern: URLPatternGlobal | undefined;
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * URLPatternInit - Dictionary for constructing URLPattern
 */
export interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

/**
 * URLPatternOptions - Options for URLPattern constructor
 */
export interface URLPatternOptions {
  /**
   * If true, pattern matching ignores case (e.g., '/Users/:id' matches '/users/:id')
   * @default false
   */
  ignoreCase?: boolean;
}

/**
 * URLPatternComponentResult - Result for a single URL component match
 */
export interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

/**
 * URLPatternResult - Full result from exec()
 */
export interface URLPatternResult {
  inputs: (string | URLPatternInit)[];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

/**
 * URLPatternInput - Valid inputs for test() and exec()
 */
export type URLPatternInput = string | URLPatternInit;

// ============================================================================
// URLPattern Class (Native or Polyfill)
// ============================================================================

/**
 * Check if native URLPattern is available (Bun 1.2+, modern browsers)
 */
export const hasNativeURLPattern = typeof globalThis.URLPattern !== 'undefined';

/**
 * URLPattern interface matching the Web API
 */
export interface IURLPattern {
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly hasRegExpGroups: boolean;
  
  test(input?: URLPatternInput, baseURL?: string): boolean;
  exec(input?: URLPatternInput, baseURL?: string): URLPatternResult | null;
}

// ============================================================================
// Polyfill Implementation (for environments without native support)
// ============================================================================

/**
 * URLPattern Polyfill - Regex-based implementation
 * 
 * Provides URLPattern functionality for environments without native support.
 * Covers common use cases with named groups and wildcard patterns.
 * 
 * @note For full WHATWG spec compliance, use the native implementation or
 * a complete polyfill library.
 * @internal
 */
class URLPatternPolyfill implements IURLPattern {
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  
  private _hasRegExpGroups: boolean = false;
  private patternRegex: RegExp | null = null;
  private groupNames: string[] = [];
  private baseURL?: string;

  get hasRegExpGroups(): boolean {
    return this._hasRegExpGroups;
  }

  constructor(input: URLPatternInput | string, baseURLOrOptions?: string | URLPatternOptions) {
    // Handle string pattern
    if (typeof input === 'string') {
      const parsed = this.parsePatternString(input);
      this.protocol = parsed.protocol || '*';
      this.username = parsed.username || '*';
      this.password = parsed.password || '*';
      this.hostname = parsed.hostname || '*';
      this.port = parsed.port || '*';
      this.pathname = parsed.pathname || '*';
      this.search = parsed.search || '*';
      this.hash = parsed.hash || '*';
      
      if (typeof baseURLOrOptions === 'string') {
        this.baseURL = baseURLOrOptions;
      }
    } else {
      // Handle URLPatternInit
      const init = input as URLPatternInit;
      this.protocol = init.protocol || '*';
      this.username = init.username || '*';
      this.password = init.password || '*';
      this.hostname = init.hostname || '*';
      this.port = init.port || '*';
      this.pathname = init.pathname || '*';
      this.search = init.search || '*';
      this.hash = init.hash || '*';
      this.baseURL = init.baseURL;
    }

    // Compile the pattern
    this.compilePattern();
  }

  /**
   * Parse a pattern string into components
   */
  private parsePatternString(pattern: string): URLPatternInit {
    // Check if it's a pathname-only pattern (starts with /)
    if (pattern.startsWith('/') && !pattern.includes('://')) {
      return { pathname: pattern };
    }
    
    try {
      // Try to parse as full URL
      const url = new URL(pattern);
      return {
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      };
    } catch {
      // Treat as pathname pattern
      return { pathname: pattern };
    }
  }

  /**
   * Convert a pattern component to regex
   */
  private patternToRegex(pattern: string): { regex: string; groups: string[] } {
    const groups: string[] = [];
    let regex = '';
    let i = 0;

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === ':') {
        // Named group :name
        let name = '';
        i++;
        while (i < pattern.length && /[a-zA-Z0-9_]/.test(pattern[i])) {
          name += pattern[i];
          i++;
        }
        if (name) {
          groups.push(name);
          regex += '([^/]+)';
        }
        continue;
      }

      if (char === '*') {
        // Wildcard - match everything
        groups.push(groups.length.toString());
        regex += '(.*)';
        i++;
        continue;
      }

      // Escape regex special chars
      if ('.+?^${}()|[]\\'.includes(char)) {
        regex += '\\' + char;
      } else {
        regex += char;
      }
      i++;
    }

    return { regex, groups };
  }

  /**
   * Compile the full pattern into a regex
   */
  private compilePattern(): void {
    const { regex: pathnameRegex, groups } = this.patternToRegex(this.pathname);
    this.groupNames = groups;
    
    // Check if pattern uses regex groups
    this._hasRegExpGroups = groups.length > 0 || this.pathname.includes('*');
    
    // Build full pattern regex focusing on pathname (most common use case)
    this.patternRegex = new RegExp(`^${pathnameRegex}$`);
  }

  /**
   * Test if a URL matches the pattern
   */
  test(input?: URLPatternInput, baseURL?: string): boolean {
    if (!input) return false;
    
    try {
      const url = this.resolveInput(input, baseURL);
      if (!url) return false;

      // Check pathname match
      if (!this.matchComponent(url.pathname, this.pathname)) {
        return false;
      }

      // Check other components if specified
      if (this.protocol !== '*' && !this.matchComponent(url.protocol.replace(':', ''), this.protocol)) {
        return false;
      }
      if (this.hostname !== '*' && !this.matchComponent(url.hostname, this.hostname)) {
        return false;
      }
      if (this.port !== '*' && !this.matchComponent(url.port, this.port)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute the pattern against a URL and extract groups
   */
  exec(input?: URLPatternInput, baseURL?: string): URLPatternResult | null {
    if (!input) return null;

    try {
      const url = this.resolveInput(input, baseURL);
      if (!url) return null;

      if (!this.test(input, baseURL)) {
        return null;
      }

      // Extract groups from pathname
      const pathnameGroups = this.extractGroups(url.pathname);

      const createComponentResult = (inputStr: string, groups: Record<string, string | undefined> = {}): URLPatternComponentResult => ({
        input: inputStr,
        groups,
      });

      return {
        inputs: [input],
        protocol: createComponentResult(url.protocol.replace(':', '')),
        username: createComponentResult(url.username),
        password: createComponentResult(url.password),
        hostname: createComponentResult(url.hostname),
        port: createComponentResult(url.port),
        pathname: createComponentResult(url.pathname, pathnameGroups),
        search: createComponentResult(url.search),
        hash: createComponentResult(url.hash),
      };
    } catch {
      return null;
    }
  }

  /**
   * Resolve input to a URL object
   */
  private resolveInput(input: URLPatternInput, baseURL?: string): URL | null {
    try {
      if (typeof input === 'string') {
        return new URL(input, baseURL || this.baseURL);
      }
      
      const init = input as URLPatternInit;
      const urlString = this.initToURLString(init);
      return new URL(urlString, baseURL || this.baseURL || init.baseURL);
    } catch {
      return null;
    }
  }

  /**
   * Convert URLPatternInit to URL string
   */
  private initToURLString(init: URLPatternInit): string {
    let url = '';
    if (init.protocol) url += `${init.protocol}://`;
    else url += 'https://';
    
    if (init.username || init.password) {
      url += init.username || '';
      if (init.password) url += `:${init.password}`;
      url += '@';
    }
    
    url += init.hostname || 'localhost';
    if (init.port) url += `:${init.port}`;
    url += init.pathname || '/';
    if (init.search) url += init.search.startsWith('?') ? init.search : `?${init.search}`;
    if (init.hash) url += init.hash.startsWith('#') ? init.hash : `#${init.hash}`;
    
    return url;
  }

  /**
   * Match a single component against its pattern
   */
  private matchComponent(value: string, pattern: string): boolean {
    if (pattern === '*') return true;
    
    const { regex } = this.patternToRegex(pattern);
    const componentRegex = new RegExp(`^${regex}$`);
    return componentRegex.test(value);
  }

  /**
   * Extract named groups from a pathname
   */
  private extractGroups(pathname: string): Record<string, string | undefined> {
    if (!this.patternRegex) return {};
    
    const match = pathname.match(this.patternRegex);
    if (!match) return {};

    const groups: Record<string, string | undefined> = {};
    
    // Named groups
    this.groupNames.forEach((name, index) => {
      groups[name] = match[index + 1];
    });

    // Positional groups (for wildcards)
    match.slice(1).forEach((value, index) => {
      if (!this.groupNames[index]) {
        groups[index.toString()] = value;
      }
    });

    return groups;
  }
}

// ============================================================================
// Export URLPattern (native or polyfill)
// ============================================================================

/**
 * URLPattern - Use native implementation if available, otherwise polyfill
 */
export const URLPattern: new (
  input: URLPatternInput,
  baseURLOrOptions?: string | URLPatternOptions
) => IURLPattern = hasNativeURLPattern 
  ? (globalThis.URLPattern as unknown as new (input: URLPatternInput, baseURLOrOptions?: string | URLPatternOptions) => IURLPattern)
  : URLPatternPolyfill;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a URLPattern from a pathname pattern string
 * 
 * @param pathname - Pathname pattern (e.g., '/users/:id', '/api/products/:id')
 * @returns URLPattern instance for pathname matching
 * @example
 * const pattern = createPathPattern('/users/:id');
 * pattern.test('https://example.com/users/123'); // true
 */
export function createPathPattern(pathname: string): IURLPattern {
  return new URLPattern({ pathname });
}

/**
 * Create a URLPattern for API routes with base URL
 * 
 * @param pathname - API pathname pattern (e.g., '/api/markets/:exchange/:symbol')
 * @param baseURL - Base URL for the API (defaults to 'http://localhost:3000')
 * @returns URLPattern instance configured for API routing
 * @example
 * const apiPattern = createAPIPattern('/api/markets/:exchange/:symbol', 'https://api.example.com');
 * apiPattern.test('https://api.example.com/api/markets/binance/BTC-USDT'); // true
 */
export function createAPIPattern(pathname: string, baseURL = 'http://localhost:3000'): IURLPattern {
  return new URLPattern({ pathname, baseURL });
}

/**
 * Match a URL against multiple patterns and return the first match
 * 
 * Useful for finding which route handler should process a URL.
 * 
 * @param url - URL to test
 * @param patterns - Array of patterns to test in order
 * @returns First matching pattern and its exec result, or null if no match
 * @example
 * const patterns = [
 *   createPathPattern('/users/:id'),
 *   createPathPattern('/products/:id'),
 * ];
 * const match = matchPatterns('/users/123', patterns);
 * if (match) console.log(match.result.pathname.groups.id); // '123'
 */
export function matchPatterns(
  url: string,
  patterns: IURLPattern[]
): { pattern: IURLPattern; result: URLPatternResult } | null {
  for (const pattern of patterns) {
    const result = pattern.exec(url);
    if (result) {
      return { pattern, result };
    }
  }
  return null;
}

/**
 * Create an Express-like router using URLPattern
 * 
 * Returns a function that routes URLs to handlers based on pattern matching.
 * 
 * @param routes - Array of route definitions with patterns and handlers
 * @returns Router function that takes a URL and returns matched handler and params
 * @example
 * const router = createPatternRouter([
 *   { pattern: createPathPattern('/users/:id'), handler: handleUser },
 *   { pattern: createPathPattern('/posts/:id'), handler: handlePost },
 * ]);
 * const route = router('/users/123');
 * if (route) route.handler(route.params);
 */
export function createPatternRouter<T>(
  routes: Array<{ pattern: IURLPattern; handler: T }>
): (url: string) => { handler: T; params: Record<string, string | undefined> } | null {
  return (url: string) => {
    for (const route of routes) {
      const result = route.pattern.exec(url);
      if (result) {
        return {
          handler: route.handler,
          params: result.pathname.groups,
        };
      }
    }
    return null;
  };
}

// ============================================================================
// API Route Pattern Helpers (for trader-analyzer)
// ============================================================================

/**
 * Common API route patterns for the trader-analyzer
 */
export const APIPatterns = {
  // Market routes
  markets: createPathPattern('/api/markets'),
  marketById: createPathPattern('/api/markets/:id'),
  marketBySymbol: createPathPattern('/api/markets/:exchange/:symbol'),
  
  // Trade routes
  trades: createPathPattern('/api/trades'),
  tradeById: createPathPattern('/api/trades/:id'),
  
  // OHLCV routes
  ohlcv: createPathPattern('/api/ohlcv/:exchange/:symbol/:timeframe'),
  
  // Exchange routes
  exchanges: createPathPattern('/api/exchanges'),
  exchangeById: createPathPattern('/api/exchanges/:id'),
  
  // Profile routes
  profile: createPathPattern('/api/profile'),
  profileById: createPathPattern('/api/profile/:id'),
  
  // Health check
  health: createPathPattern('/api/health'),
  
  // Telegram routes
  telegram: createPathPattern('/api/telegram'),
  telegramWebhook: createPathPattern('/api/telegram/webhook'),
  
  // Pipeline routes
  pipeline: createPathPattern('/api/pipeline'),
  pipelineById: createPathPattern('/api/pipeline/:id'),
  
  // Wildcard for any API route
  anyAPI: createPathPattern('/api/*'),
};

/**
 * Extract route parameters from a URL
 */
export function extractRouteParams(
  pattern: IURLPattern,
  url: string
): Record<string, string | undefined> | null {
  const result = pattern.exec(url);
  return result ? result.pathname.groups : null;
}

/**
 * Check if a URL matches any of the given patterns
 */
export function matchesAny(url: string, patterns: IURLPattern[]): boolean {
  return patterns.some(pattern => pattern.test(url));
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a URLPatternInit
 */
export function isURLPatternInit(value: unknown): value is URLPatternInit {
  if (typeof value !== 'object' || value === null) return false;
  const init = value as Record<string, unknown>;
  return (
    typeof init.protocol === 'string' ||
    typeof init.hostname === 'string' ||
    typeof init.pathname === 'string' ||
    typeof init.port === 'string' ||
    typeof init.search === 'string' ||
    typeof init.hash === 'string' ||
    typeof init.baseURL === 'string'
  );
}

/**
 * Check if a value is a URLPatternResult
 */
export function isURLPatternResult(value: unknown): value is URLPatternResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    Array.isArray(result.inputs) &&
    typeof result.protocol === 'object' &&
    typeof result.pathname === 'object'
  );
}

// Export default
export default URLPattern;
