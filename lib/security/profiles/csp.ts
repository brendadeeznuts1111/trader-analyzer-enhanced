/**
 * CSP Policy Builder
 * Builds Content-Security-Policy headers from security profile configuration
 */

import type { CSPPolicy, CSPDirectives } from './types';

/**
 * Build CSP header string from policy
 */
export function buildCSPHeader(policy: CSPPolicy): string {
  const directives: string[] = [];

  for (const [directive, values] of Object.entries(policy.directives) as [
    keyof CSPDirectives,
    string[] | undefined,
  ][]) {
    if (!values || values.length === 0) continue;
    directives.push(`${directive} ${values.join(' ')}`);
  }

  return directives.join('; ');
}

/**
 * Get CSP header name based on report-only mode
 */
export function getCSPHeaderName(policy: CSPPolicy): string {
  return policy.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
}

/**
 * Build CSP headers object
 */
export function buildCSPHeaders(policy: CSPPolicy): Record<string, string> {
  const headerName = getCSPHeaderName(policy);
  const headerValue = buildCSPHeader(policy);

  if (!headerValue) return {};

  return {
    [headerName]: headerValue,
  };
}
