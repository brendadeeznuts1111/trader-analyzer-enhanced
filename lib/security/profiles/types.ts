/**
 * Security Profile Type Definitions
 * Environment-aware CORS and CSP configuration
 */

export type SecurityProfileName = 'development' | 'staging' | 'production' | 'custom';

/**
 * CORS Policy Configuration
 */
export interface CORSPolicy {
  /** Allowed origins - string for single, array for multiple, '*' for any */
  allowedOrigins: string | string[] | '*';
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed headers in requests */
  allowedHeaders: string[];
  /** Headers exposed to client */
  exposedHeaders: string[];
  /** Allow credentials (cookies, auth headers) */
  credentials: boolean;
  /** Preflight cache duration in seconds */
  maxAge: number;
}

/**
 * CSP Directive Configuration
 */
export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'object-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'report-uri'?: string[];
}

/**
 * CSP Policy Configuration
 */
export interface CSPPolicy {
  /** CSP directives */
  directives: CSPDirectives;
  /** Report-only mode (Content-Security-Policy-Report-Only) */
  reportOnly: boolean;
}

/**
 * Complete Security Profile
 */
export interface SecurityProfile {
  /** Profile name */
  name: SecurityProfileName;
  /** Description */
  description: string;
  /** CORS configuration */
  cors: CORSPolicy;
  /** CSP configuration */
  csp: CSPPolicy;
  /** Additional security headers */
  additionalHeaders: Record<string, string>;
}

/**
 * Runtime configuration for profile resolution
 */
export interface SecurityProfileConfig {
  /** Active profile (overrides environment detection) */
  activeProfile?: SecurityProfileName;
  /** Custom profile definition (when activeProfile is 'custom') */
  customProfile?: Partial<SecurityProfile>;
  /** Allowed origins override (can be set via env) */
  allowedOrigins?: string[];
}
