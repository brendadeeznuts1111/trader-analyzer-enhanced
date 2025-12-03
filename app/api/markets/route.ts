import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline
const BUN_BACKEND_URL = process.env.BUN_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BUN_BACKEND_URL}/markets`);
    if (!response.ok) throw new Error('Failed to fetch markets');

    const data = await response.json();

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      etagContent: data,
      preconnect: [BUN_BACKEND_URL],
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
