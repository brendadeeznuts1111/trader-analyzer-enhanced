import { NextResponse } from 'next/server';

// Adapter layer: Next.js dashboard ↔ Bun unified pipeline
const BUN_BACKEND_URL = process.env.BUN_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${BUN_BACKEND_URL}/markets`);
    if (!response.ok) throw new Error('Failed to fetch markets');

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}