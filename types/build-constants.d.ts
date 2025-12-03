/**
 * Build-time constants injected via --define flag
 * @see https://bun.com/docs/guides/runtime/build-time-constants
 * [#REF:BUILD-CONSTANTS]
 */

// =============================================================================
// VERSION & BUILD INFO
// =============================================================================

/** Application version from package.json or git tag */
declare const BUILD_VERSION: string;

/** ISO timestamp when build was created */
declare const BUILD_TIME: string;

/** Git commit hash (short or full) */
declare const GIT_COMMIT: string;

/** Git branch name */
declare const GIT_BRANCH: string;

// =============================================================================
// ENVIRONMENT
// =============================================================================

/** Build environment: development, staging, production */
declare const NODE_ENV: 'development' | 'staging' | 'production';

/** Target platform for cross-compilation */
declare const PLATFORM: 'linux' | 'darwin' | 'windows';

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/** Enable debug mode (extra logging, dev tools) */
declare const DEBUG: boolean;

/** Enable analytics tracking */
declare const ENABLE_ANALYTICS: boolean;

/** Enable experimental features */
declare const ENABLE_EXPERIMENTAL: boolean;

// =============================================================================
// API CONFIGURATION
// =============================================================================

/** Base API URL */
declare const API_URL: string;

/** Workers API URL */
declare const WORKERS_API_URL: string;

// =============================================================================
// BUILD CONFIG OBJECT (alternative pattern)
// =============================================================================

declare const BUILD_CONFIG: {
  version: string;
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
};
