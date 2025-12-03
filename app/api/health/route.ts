/**
 * Base Health Check API - Fly.io compatible
 * Simple health endpoint for infrastructure checks
 */

import { NextResponse } from 'next/server';
import { featureFlags } from '../../../deploy/feature-flags';
import { buildApiHeaders, headersToObject } from '../../../lib/api-headers';

export async function GET(request: Request) {
  const startTime = Date.now();

  const data = {
    status: 'ok',
    version: '0.2.0',
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
