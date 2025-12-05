/**
 * Markets API Routes
 * Provides access to available trading markets and instruments
 *
 * GET /api/markets - Returns list of all available markets from the backend
 */

import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline

/**
 * GET /api/markets
 * Returns comprehensive list of available trading markets
 *
 * Fetches market data from the Bun backend and returns it with appropriate
 * caching headers and error handling.
 *
 * @param request - The incoming HTTP request
 * @returns Response with markets data or error response
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_CONFIG.backendUrl}/markets`);
    if (!response.ok) throw new Error('Failed to fetch markets');

    const data = await response.json();

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      etagContent: data,
      preconnect: [API_CONFIG.backendUrl],
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Markets API error:', error);
    const { body, init } = createErrorResponse(
      'Failed to fetch markets',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
