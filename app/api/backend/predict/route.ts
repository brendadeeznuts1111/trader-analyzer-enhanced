import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../../lib/api-headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Validate request body
    if (!request.body) {
      const { body, init } = createErrorResponse(
        'Request body is required',
        400,
        undefined,
        request
      );
      return NextResponse.json(body, init);
    }

    const body = await request.json();

    // Validate required fields
    if (!body.credentials?.api_key) {
      const { body: errBody, init } = createErrorResponse(
        'API key is required',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    if (!body.symbol) {
      const { body: errBody, init } = createErrorResponse(
        'Symbol is required',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    // Make request to backend service
    const response = await fetch(`${BACKEND_URL}/api/predict/action`, {
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
        current_price: body.current_price,
      }),
    });

    // Handle backend response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Backend API Error: ${response.status} - ${response.statusText}`);

      const { body: errBody, init } = createErrorResponse(
        errorData.detail || errorData.message || 'Prediction request failed',
        response.status,
        JSON.stringify(errorData),
        request
      );
      return NextResponse.json(errBody, init);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      const { body: errBody, init } = createErrorResponse(
        'Invalid response format from backend service',
        500,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      preconnect: [BACKEND_URL],
      custom: {
        'X-Operation': 'predict',
        'X-Symbol': body.symbol,
        'X-Exchange': body.credentials?.exchange || 'bitmex',
      },
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Backend Predict API Error:', error);

    // Handle different error types
    if (error instanceof SyntaxError) {
      const { body, init } = createErrorResponse(
        'Invalid JSON format in request or response',
        400,
        undefined,
        request
      );
      return NextResponse.json(body, init);
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const { body, init } = createErrorResponse(
        'Failed to connect to backend service',
        503,
        undefined,
        request
      );
      return NextResponse.json(body, init);
    }

    const { body, init } = createErrorResponse(
      'Failed to get prediction from backend service',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
