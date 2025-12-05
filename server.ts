#!/usr/bin/env bun
/**
 * Simple server for profiling tests
 * Used with Bun's CPU profiling: bun --cpu-prof server.ts
 */

import { serve } from 'bun';
import { NanoTimer, NanoString } from './src/core/nano-engine';

const server = serve({
  port: 3004,
  hostname: '0.0.0.0',

  fetch: async (req) => {
    const start = NanoTimer.now();

    // Simulate some nano-optimized operations
    const result = [];
    for (let i = 0; i < 1000; i++) {
      const width = NanoString.getWidth(`Test string ${i}`);
      result.push(width);
    }

    const elapsed = NanoTimer.elapsed(start);

    return new Response(JSON.stringify({
      message: 'Nano-engine test completed',
      operations: result.length,
      timeMs: elapsed,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  error: (error) => {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`🚀 Nano-optimized server running at http://localhost:${server.port}`);
console.log(`⚡ Ready for profiling with: bun --cpu-prof server.ts`);
