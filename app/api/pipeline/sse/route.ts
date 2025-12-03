import { NextRequest, NextResponse } from 'next/server';

// SSE endpoint for pipeline stats - proxies to Bun backend
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"status": "connected"}\n\n'));

      // Connect to Bun backend SSE
      const bunUrl = process.env.BUN_BACKEND_URL || 'http://localhost:3000';
      const evt = new EventSource(`${bunUrl}/pipeline/sse`);

      evt.onmessage = (e) => {
        try {
          // Forward the data from Bun backend to client
          controller.enqueue(encoder.encode(`data: ${e.data}\n\n`));
        } catch (error) {
          console.error('Error forwarding SSE data:', error);
        }
      };

      evt.onerror = (error) => {
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
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}