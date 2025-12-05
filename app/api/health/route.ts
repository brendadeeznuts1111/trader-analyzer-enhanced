/**
 * Base Health Check API - Fly.io compatible
 * Simple health endpoint for infrastructure checks
 */

import { NextResponse } from 'next/server';
import { featureFlags } from '../../../deploy/feature-flags';
import { buildApiHeaders, headersToObject } from '../../../lib/api-headers';
import { createPreflightResponse } from '../../../lib/security/profiles';
import { getBuildVersion } from '../../../lib/build-info';

// CORS preflight handler
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

export async function GET(request: Request) {
  const startTime = Date.now();

  const data = {
    status: 'ok',
    version: getBuildVersion(),
    timestamp: new Date().toISOString(),
    features: {
      polymarket: featureFlags.polyEnabled,
      kalshi: featureFlags.kalshiEnabled,
    },
    deployment: featureFlags.deployment.current,
    uptime: process.uptime(),
  };

  const headers = buildApiHeaders({
    cache: 'no-cache',
    request,
    responseTime: Date.now() - startTime,
    etagContent: data,
  });

  return NextResponse.json(data, {
    headers: headersToObject(headers),
  });
}
