import { NextResponse } from 'next/server';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline
const BUN_BACKEND_URL = process.env.BUN_BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${BUN_BACKEND_URL}/markets/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
      }
      throw new Error('Failed to fetch market');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json({ error: 'Failed to fetch market' }, { status: 500 });
  }
}