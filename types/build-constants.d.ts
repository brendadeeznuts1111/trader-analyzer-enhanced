/**
 * Build-time constants injected via --define flag
 * @see https://bun.sh/docs/bundler#define
 * @see scripts/build/compile.ts
 * [#REF:BUILD-CONSTANTS]
 *
 * Usage in code:
 * ```ts
 * // These are replaced at build time with literal values
 * console.log(`Version: ${BUILD_VERSION}`);
 * console.log(`Debug: ${DEBUG}`);
 *
 * // Or use the unified BUILD_CONFIG object
 * console.log(`API: ${BUILD_CONFIG.api.baseUrl}`);
 * ```
 *
 * Build command:
 * ```bash
 * bun run build:prod          # Production build
 * bun run build:staging       # Staging build
 * bun run build:dev           # Development build
 * bun run build:compile       # Compile to native executable
 * ```
 */

// =============================================================================
// VERSION & BUILD INFO
// =============================================================================

/** Application version from package.json or git tag (e.g., "1.2.3" or "v1.2.3-4-gabcdef") */
declare const BUILD_VERSION: string;

/** Build variant identifier (e.g., "debug", "release", "asan") */
declare const BUILD_VARIANT: string;

/** ISO 8601 timestamp when build was created (e.g., "2025-01-15T10:30:00.000Z") */
declare const BUILD_TIME: string;

/** Git commit hash - short form (e.g., "abc1234") */
declare const GIT_COMMIT: string;

/** Git branch name (e.g., "main", "feat/new-feature") */
declare const GIT_BRANCH: string;

// =============================================================================
// ENVIRONMENT
// =============================================================================

/** Build environment: development, staging, production */
declare const NODE_ENV: 'development' | 'staging' | 'production';

/** Target platform for cross-compilation */
declare const PLATFORM: 'linux' | 'darwin' | 'win32';

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/** Enable debug mode (extra logging, dev tools, verbose errors) */
declare const DEBUG: boolean;

/** Enable analytics/telemetry tracking */
declare const ENABLE_ANALYTICS: boolean;

/** Enable experimental/unstable features */
declare const ENABLE_EXPERIMENTAL: boolean;

// =============================================================================
// API CONFIGURATION
// =============================================================================

/** Base API URL for primary backend */
declare const API_URL: string;

/** Cloudflare Workers API URL */
declare const WORKERS_API_URL: string;

// =============================================================================
// BUILD CONFIG OBJECT (unified access pattern)
// =============================================================================

/**
 * Unified build configuration object
 * Prefer this over individual constants for cleaner imports
 *
 * @example
 * ```ts
 * if (BUILD_CONFIG.debug) {
 *   console.log(`Running ${BUILD_CONFIG.version} on ${BUILD_CONFIG.env}`);
 * }
 * ```
 */
declare const BUILD_CONFIG: {
  /** Application version */
  version: string;

  /** Build variant (debug, release, etc.) */
  variant: string;

  /** ISO timestamp of build */
  buildTime: string;

  /** Git commit hash */
  gitCommit: string;

  /** Git branch name */
  gitBranch: string;

  /** Build environment */
  env: 'development' | 'staging' | 'production';

  /** Debug mode enabled */
  debug: boolean;

  /** API configuration */
  api: {
    /** Primary API base URL */
    baseUrl: string;

    /** Workers API URL */
    workersUrl: string;

    /** Request timeout in milliseconds */
    timeout: number;
  };
};

// =============================================================================
// RUNTIME ACCESS HELPER TYPE
// =============================================================================

/**
 * Type for the build info object returned by getBuildInfo()
 * Use when you need to pass build info as a value (not compile-time constant)
 */
export interface BuildInfo {
  version: string;
  variant: string;
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  env: 'development' | 'staging' | 'production';
  debug: boolean;
  api: {
    baseUrl: string;
    workersUrl: string;
    timeout: number;
  };
}

// =============================================================================
// MODULE AUGMENTATION FOR GLOBAL ACCESS
// =============================================================================

declare global {
  /** Build version - available globally */
  const BUILD_VERSION: string;
  const BUILD_VARIANT: string;
  const BUILD_TIME: string;
  const GIT_COMMIT: string;
  const GIT_BRANCH: string;
  const DEBUG: boolean;
  const ENABLE_ANALYTICS: boolean;
  const ENABLE_EXPERIMENTAL: boolean;
  const API_URL: string;
  const WORKERS_API_URL: string;
  const BUILD_CONFIG: BuildInfo;
}
