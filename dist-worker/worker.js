// @bun
// worker.ts
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return Response.json({
          status: "ok",
          version: "1.0.0-cf",
          timestamp: new Date().toISOString(),
          platform: "cloudflare-workers",
          region: request.cf?.colo || "unknown",
          features: {
            polymarket: true,
            kalshi: true,
            websocket: false,
            database: false
          },
          deployment: "cloudflare-edge"
        }, {
          headers: {
            ...corsHeaders,
            "Cache-Control": "no-cache"
          }
        });
      }
      if (url.pathname === "/markets" && request.method === "GET") {
        return Response.json({
          message: "Markets endpoint - coming soon",
          status: "not-implemented",
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders });
      }
      return Response.json({
        error: "Not found",
        availableEndpoints: ["/health", "/markets (coming soon)"]
      }, {
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      console.error("Worker error:", error);
      return Response.json({
        error: "Internal server error",
        timestamp: new Date().toISOString()
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
export {
  worker_default as default
};
