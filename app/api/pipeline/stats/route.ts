import { NextResponse } from 'next/server';

// REST fallback endpoint for pipeline stats
export async function GET() {
  try {
    // Fetch from Bun backend
    const bunUrl = process.env.BUN_BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${bunUrl}/pipeline/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch pipeline stats from backend');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pipeline stats error:', error);

    // Return fallback mock data
    const mockStats = {
      markets: 5,
      exchanges: 4,
      messagesPerSec: 45.7,
      lastUpdate: new Date(),
      uptime: 3600, // 1 hour
      memoryUsage: 67.2,
      activeConnections: 3
    };

    return NextResponse.json(mockStats);
  }
}