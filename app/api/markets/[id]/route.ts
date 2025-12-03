import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../../lib/api-headers';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline
const BUN_BACKEND_URL = process.env.BUN_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    const response = await fetch(`${BUN_BACKEND_URL}/markets/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        const { body, init } = createErrorResponse(
          'Market not found',
          404,
          `Market ID: ${id}`,
          request
        );
        return NextResponse.json(body, init);
      }
      throw new Error('Failed to fetch market');
    }

    const data = await response.json();

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      etagContent: data,
      custom: {
        'X-Market-Id': id,
      },
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Market API error:', error);
    const { body, init } = createErrorResponse(
      'Failed to fetch market',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
