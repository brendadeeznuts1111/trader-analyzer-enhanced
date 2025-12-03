/**
 * Cloudflare Worker - Trader Analyzer API
 * Simple, reliable deployment with global edge network
 */

interface Env {
  // Add bindings here as needed
  // DB: D1Database;
  // KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/health' && request.method === 'GET') {
        return Response.json(
          {
            status: 'ok',
            version: '1.0.0-cf',
            timestamp: new Date().toISOString(),
            platform: 'cloudflare-workers',
            region: request.cf?.colo || 'unknown',
            features: {
              polymarket: true,
              kalshi: true,
              websocket: false, // Not yet implemented
              database: false, // Not yet implemented
            },
            deployment: 'cloudflare-edge',
          },
          {
            headers: {
              ...corsHeaders,
              'Cache-Control': 'no-cache',
            },
          }
        );
      }

      // Placeholder for future endpoints
      if (url.pathname === '/markets' && request.method === 'GET') {
        return Response.json(
          {
            message: 'Markets endpoint - coming soon',
            status: 'not-implemented',
            timestamp: new Date().toISOString(),
          },
          { headers: corsHeaders }
        );
      }

      // 404 for unknown routes
      return Response.json(
        {
          error: 'Not found',
          availableEndpoints: ['/health', '/markets (coming soon)'],
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return Response.json(
        {
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  },
};
