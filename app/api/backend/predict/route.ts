import { NextResponse } from 'next/server';
import { exchangeManager } from '../../../../lib/exchanges/exchange_manager';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: Request) {
    try {
        // Validate request body
        if (!request.body) {
            return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
            );
        }

        const body = await request.json();

        // Validate required fields
        if (!body.credentials?.api_key) {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        if (!body.symbol) {
            return NextResponse.json(
                { error: 'Symbol is required' },
                { status: 400 }
            );
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
                    exchange: body.credentials?.exchange || 'bitmex'
                },
                symbol: body.symbol || 'BTC/USD',
                current_price: body.current_price
            }),
        });

        // Handle backend response
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Backend API Error: ${response.status} - ${response.statusText}`);

            return NextResponse.json(
                {
                    error: errorData.detail || errorData.message || 'Prediction request failed',
                    status: response.status,
                    details: errorData
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Validate response structure
        if (!data || typeof data !== 'object') {
            return NextResponse.json(
                { error: 'Invalid response format from backend service' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Backend Predict API Error:', error);

        // Handle different error types
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid JSON format in request or response' },
                { status: 400 }
            );
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
                { error: 'Failed to connect to backend service' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to get prediction from backend service' },
            { status: 500 }
        );
    }
}
