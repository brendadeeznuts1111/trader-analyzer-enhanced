import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../../lib/api-headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/analyze/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials: {
          api_key: body.credentials?.api_key,
          api_secret: body.credentials?.api_secret,
          exchange: body.credentials?.exchange || 'bitmex',
        },
        symbol: body.symbol || 'BTC/USD',
        days: body.days || 365,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const { body: errBody, init } = createErrorResponse(
        data.detail || 'Profile analysis failed',
        response.status,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      etagContent: data,
      preconnect: [BACKEND_URL],
      custom: {
        'X-Operation': 'profile-analysis',
        'X-Symbol': body.symbol || 'BTC/USD',
        'X-Days': String(body.days || 365),
      },
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Backend Profile API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to get profile analysis from backend',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
