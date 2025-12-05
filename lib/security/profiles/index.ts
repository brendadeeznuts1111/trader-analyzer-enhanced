/**
 * Security Profile Resolver
 * Environment-aware security header configuration
 */

import { getEnv } from '@/lib/constants';
import { SECURITY_PROFILES } from './profiles';
import { buildCORSHeaders, isOriginAllowed } from './cors';
import { buildCSPHeaders, buildCSPHeader, getCSPHeaderName } from './csp';
import type {
  SecurityProfile,
  SecurityProfileName,
  SecurityProfileConfig,
  CORSPolicy,
  CSPPolicy,
  CSPDirectives,
} from './types';

// Re-export types
export type {
  SecurityProfile,
  SecurityProfileName,
  SecurityProfileConfig,
  CORSPolicy,
  CSPPolicy,
  CSPDirectives,
};

// Re-export builders
export { buildCORSHeaders, isOriginAllowed, buildCSPHeaders, buildCSPHeader, getCSPHeaderName };

// Re-export profiles
export { SECURITY_PROFILES };

/**
 * Resolve the active security profile
 *
 * Priority:
 * 1. Explicit config.activeProfile
 * 2. SECURITY_PROFILE env var
 * 3. getEnv() auto-detection
 *
 * @param config - Optional configuration overrides
 */
export function getSecurityProfile(config?: SecurityProfileConfig): SecurityProfile {
  // 1. Check for explicit profile in config
  if (config?.activeProfile) {
    if (config.activeProfile === 'custom' && config.customProfile) {
      return buildCustomProfile(config.customProfile);
    }
    const profile = SECURITY_PROFILES[config.activeProfile];
    if (profile) {
      return applyOverrides(profile, config);
    }
  }

  // 2. Check SECURITY_PROFILE env var
  const envProfile = process.env.SECURITY_PROFILE as SecurityProfileName | undefined;
  if (envProfile && SECURITY_PROFILES[envProfile]) {
    return applyOverrides(SECURITY_PROFILES[envProfile], config);
  }

  // 3. Auto-detect from environment
  const env = getEnv();
  const profile = SECURITY_PROFILES[env] || SECURITY_PROFILES.development;
  return applyOverrides(profile, config);
}

/**
 * Build a custom profile from partial configuration
 */
function buildCustomProfile(partial: Partial<SecurityProfile>): SecurityProfile {
  const base = SECURITY_PROFILES.development;
  return {
    name: 'custom',
    description: partial.description || 'Custom security profile',
    cors: { ...base.cors, ...partial.cors },
    csp: {
      directives: { ...base.csp.directives, ...partial.csp?.directives },
      reportOnly: partial.csp?.reportOnly ?? base.csp.reportOnly,
    },
    additionalHeaders: { ...base.additionalHeaders, ...partial.additionalHeaders },
  };
}

/**
 * Apply configuration overrides to a profile
 */
function applyOverrides(
  profile: SecurityProfile,
  config?: SecurityProfileConfig
): SecurityProfile {
  if (!config?.allowedOrigins?.length) {
    return profile;
  }

  // Override CORS allowed origins
  return {
    ...profile,
    cors: {
      ...profile.cors,
      allowedOrigins: config.allowedOrigins,
    },
  };
}

/**
 * Build all security headers for a request
 *
 * @param request - Optional incoming request (for origin header)
 * @param config - Optional profile configuration
 */
export function buildSecurityHeaders(
  request?: Request | null,
  config?: SecurityProfileConfig
): Record<string, string> {
  const profile = getSecurityProfile(config);
  const requestOrigin = request?.headers.get('Origin');

  // Build CORS headers
  const corsHeaders = buildCORSHeaders(profile.cors, requestOrigin);

  // Build CSP headers
  const cspHeaders = buildCSPHeaders(profile.csp);

  // Combine all headers (filter out undefined values from CORS)
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  for (const [key, value] of Object.entries(cspHeaders)) {
    result[key] = value;
  }

  for (const [key, value] of Object.entries(profile.additionalHeaders)) {
    result[key] = value;
  }

  return result;
}

/**
 * Build security headers for an OPTIONS preflight request
 *
 * @param request - Incoming OPTIONS request
 * @param config - Optional profile configuration
 */
export function buildPreflightHeaders(
  request: Request,
  config?: SecurityProfileConfig
): Record<string, string> {
  const profile = getSecurityProfile(config);
  const requestOrigin = request.headers.get('Origin');

  // Only CORS headers needed for preflight
  const corsHeaders = buildCORSHeaders(profile.cors, requestOrigin);

  // Convert to plain Record<string, string> (filter out undefined values)
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(corsHeaders)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Check if request origin is allowed by current profile
 *
 * @param request - Incoming request
 * @param config - Optional profile configuration
 */
export function isRequestOriginAllowed(
  request: Request,
  config?: SecurityProfileConfig
): boolean {
  const profile = getSecurityProfile(config);
  const origin = request.headers.get('Origin');
  return isOriginAllowed(profile.cors, origin);
}

/**
 * Create a preflight Response for OPTIONS requests
 *
 * @param request - Incoming OPTIONS request
 * @param config - Optional profile configuration
 */
export function createPreflightResponse(
  request: Request,
  config?: SecurityProfileConfig
): Response {
  const headers = buildPreflightHeaders(request, config);
  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Get current profile name (for debugging/logging)
 */
export function getCurrentProfileName(config?: SecurityProfileConfig): SecurityProfileName {
  const profile = getSecurityProfile(config);
  return profile.name;
}
