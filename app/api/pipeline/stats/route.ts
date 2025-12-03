import { NextResponse } from 'next/server';
import { buildApiHeaders, headersToObject } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';

// REST fallback endpoint for pipeline stats
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Fetch from Bun backend
    const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.pipeline.stats}`);

    if (!response.ok) {
      throw new Error('Failed to fetch pipeline stats from backend');
    }

    const data = await response.json();

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: data,
      preconnect: [API_CONFIG.backendUrl],
      custom: {
        'X-Data-Type': 'pipeline-stats',
        'X-Data-Source': 'backend',
      },
    });

    return NextResponse.json(data, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Pipeline stats error:', error);

    // Return fallback mock data
    const mockStats = {
      markets: 5,
      exchanges: 4,
      messagesPerSec: 45.7,
      lastUpdate: new Date().toISOString(),
      uptime: 3600,
      memoryUsage: 67.2,
      activeConnections: 3,
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: mockStats,
      custom: {
        'X-Data-Type': 'pipeline-stats',
        'X-Data-Source': 'fallback',
      },
    });

    return NextResponse.json(mockStats, {
      headers: headersToObject(headers),
    });
  }
}
