import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    const response = await fetch(`${API_CONFIG.backendUrl}/api/test/connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: body.api_key,
        api_secret: body.api_secret,
        exchange: body.exchange || 'bitmex',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const { body: errBody, init } = createErrorResponse(
        data.detail || 'Connection test failed',
        response.status,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      preconnect: [API_CONFIG.backendUrl],
      custom: {
        'X-Operation': 'connection-test',
        'X-Exchange': body.exchange || 'bitmex',
      },
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Backend API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to connect to backend service',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
