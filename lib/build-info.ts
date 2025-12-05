/**
 * Build Information Runtime Utilities
 * @see types/build-constants.d.ts
 * [#REF:BUILD-INFO]
 *
 * Provides runtime access to build-time constants with safe fallbacks
 * for development mode when constants aren't injected.
 *
 * Usage:
 * ```ts
 * import { getBuildInfo, getBuildVersion, isProduction, isDebug } from '@/lib/build-info';
 *
 * // Get full build info
 * const info = getBuildInfo();
 * console.log(`Running ${info.version} on ${info.env}`);
 *
 * // Quick checks
 * if (isDebug()) {
 *   console.log('Debug mode enabled');
 * }
 * ```
 */

import type { BuildInfo } from '../types/build-constants';

// =============================================================================
// SAFE ACCESSORS (handle undefined in dev mode)
// =============================================================================

/**
 * Safely get a build constant with fallback
 * In development without build step, constants may be undefined
 */
function safeGet<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback;
}

/**
 * Check if we're in a built environment (constants are defined)
 */
export function isBuiltEnvironment(): boolean {
  try {
    // BUILD_VERSION is only defined after running build script
    return typeof BUILD_VERSION !== 'undefined' && BUILD_VERSION !== 'undefined';
  } catch {
    return false;
  }
}

// =============================================================================
// BUILD INFO ACCESSOR
// =============================================================================

/**
 * Get complete build information object
 * Returns injected values in production, sensible defaults in development
 */
export function getBuildInfo(): BuildInfo {
  // Try to use BUILD_CONFIG if available (preferred)
  try {
    if (typeof BUILD_CONFIG !== 'undefined') {
      return BUILD_CONFIG;
    }
  } catch {
    // BUILD_CONFIG not defined
  }

  // Fall back to individual constants or defaults
  const isDev = process.env.NODE_ENV === 'development' || !isBuiltEnvironment();

  return {
    version: safeGetGlobal('BUILD_VERSION', process.env.npm_package_version || '0.0.0-dev'),
    variant: safeGetGlobal('BUILD_VARIANT', ''),
    buildTime: safeGetGlobal('BUILD_TIME', new Date().toISOString()),
    gitCommit: safeGetGlobal('GIT_COMMIT', 'dev'),
    gitBranch: safeGetGlobal('GIT_BRANCH', 'local'),
    env: (safeGetGlobal('NODE_ENV', process.env.NODE_ENV || 'development') as BuildInfo['env']),
    debug: isDev || safeGetGlobal('DEBUG', false),
    api: {
      baseUrl: safeGetGlobal('API_URL', 'http://localhost:8000'),
      workersUrl: safeGetGlobal('WORKERS_API_URL', 'http://localhost:8788'),
      timeout: isDev ? 60000 : 30000,
    },
  };
}

/**
 * Helper to safely get global constants
 */
function safeGetGlobal<T>(name: string, fallback: T): T {
  try {
    const value = (globalThis as any)[name];
    return value !== undefined ? value : fallback;
  } catch {
    return fallback;
  }
}

// =============================================================================
// INDIVIDUAL ACCESSORS
// =============================================================================

/** Get build version string */
export function getBuildVersion(): string {
  return getBuildInfo().version;
}

/** Get git commit hash */
export function getGitCommit(): string {
  return getBuildInfo().gitCommit;
}

/** Get git branch name */
export function getGitBranch(): string {
  return getBuildInfo().gitBranch;
}

/** Get build timestamp */
export function getBuildTime(): string {
  return getBuildInfo().buildTime;
}

/** Get build environment */
export function getEnvironment(): BuildInfo['env'] {
  return getBuildInfo().env;
}

/** Get API base URL */
export function getApiUrl(): string {
  return getBuildInfo().api.baseUrl;
}

/** Get Workers API URL */
export function getWorkersUrl(): string {
  return getBuildInfo().api.workersUrl;
}

// =============================================================================
// ENVIRONMENT CHECKS
// =============================================================================

/** Check if running in production */
export function isProduction(): boolean {
  return getBuildInfo().env === 'production';
}

/** Check if running in staging */
export function isStaging(): boolean {
  return getBuildInfo().env === 'staging';
}

/** Check if running in development */
export function isDevelopment(): boolean {
  return getBuildInfo().env === 'development';
}

/** Check if debug mode is enabled */
export function isDebug(): boolean {
  return getBuildInfo().debug;
}

/** Check if analytics are enabled */
export function isAnalyticsEnabled(): boolean {
  try {
    return typeof ENABLE_ANALYTICS !== 'undefined' ? ENABLE_ANALYTICS : isProduction();
  } catch {
    return isProduction();
  }
}

/** Check if experimental features are enabled */
export function isExperimentalEnabled(): boolean {
  try {
    return typeof ENABLE_EXPERIMENTAL !== 'undefined' ? ENABLE_EXPERIMENTAL : !isProduction();
  } catch {
    return !isProduction();
  }
}

// =============================================================================
// FORMATTED OUTPUT
// =============================================================================

/**
 * Get a formatted build string for logging/display
 * @example "v1.2.3 (abc1234) [production]"
 */
export function getBuildString(): string {
  const info = getBuildInfo();
  return `v${info.version} (${info.gitCommit}) [${info.env}]`;
}

/**
 * Get detailed build info for debugging
 */
export function getBuildDetails(): string {
  const info = getBuildInfo();
  return [
    `Version:  ${info.version}${info.variant ? ` (${info.variant})` : ''}`,
    `Build:    ${info.buildTime}`,
    `Commit:   ${info.gitCommit}`,
    `Branch:   ${info.gitBranch}`,
    `Env:      ${info.env}`,
    `Debug:    ${info.debug}`,
    `API:      ${info.api.baseUrl}`,
  ].join('\n');
}

/**
 * Log build info to console (for startup)
 */
export function logBuildInfo(): void {
  const info = getBuildInfo();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ${info.version.padEnd(20)} ${info.env.toUpperCase().padStart(35)}  ║
║  Commit: ${info.gitCommit.padEnd(10)} Branch: ${info.gitBranch.padEnd(20)}  ║
║  Built:  ${info.buildTime.slice(0, 19).padEnd(50)}  ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { BuildInfo };

// Default export for convenient importing
export default {
  get: getBuildInfo,
  version: getBuildVersion,
  commit: getGitCommit,
  branch: getGitBranch,
  time: getBuildTime,
  env: getEnvironment,
  api: getApiUrl,
  workers: getWorkersUrl,
  isProduction,
  isStaging,
  isDevelopment,
  isDebug,
  isAnalyticsEnabled,
  isExperimentalEnabled,
  toString: getBuildString,
  details: getBuildDetails,
  log: logBuildInfo,
};
