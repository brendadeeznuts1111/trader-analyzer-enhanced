import { NextRequest } from 'next/server';
import { buildApiHeaders, headersToObject } from '@/lib/api-headers';
import { API_CONFIG } from '@/lib/constants';
import { createPreflightResponse } from '@/lib/security/profiles';

// SSE endpoint for pipeline stats - proxies to Bun backend
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Build base headers for SSE
  const baseHeaders = buildApiHeaders({
    cache: 'no-cache',
    request,
    custom: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'X-Data-Type': 'sse-stream',
      'X-Stream-Source': 'pipeline',
    },
  });

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"status": "connected"}\n\n'));

      // Connect to Bun backend SSE
      const evt = new EventSource(
        `${API_CONFIG.backendUrl}${API_CONFIG.endpoints.pipeline.events}`
      );

      evt.onmessage = e => {
        try {
          // Forward the data from Bun backend to client
          controller.enqueue(encoder.encode(`data: ${e.data}\n\n`));
        } catch (error) {
          console.error('Error forwarding SSE data:', error);
        }
      };

      evt.onerror = error => {
        console.error('Bun backend SSE error:', error);
        // Send error message to client
        controller.enqueue(encoder.encode('data: {"error": "Backend connection failed"}\n\n'));
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        evt.close();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: headersToObject(baseHeaders),
  });
}

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}
