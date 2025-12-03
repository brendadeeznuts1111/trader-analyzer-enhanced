/**
 * Base Health Check API - Fly.io compatible
 * Simple health endpoint for infrastructure checks
 */

import { NextResponse } from 'next/server';
import { featureFlags } from '../../../deploy/feature-flags';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      features: {
        polymarket: featureFlags.polyEnabled,
        kalshi: featureFlags.kalshiEnabled,
      },
      deployment: featureFlags.deployment.current,
    },
    {
      headers: {
        'Cache-Control': 'no-cache',
      },
    }
  );
}
