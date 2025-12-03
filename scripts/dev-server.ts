#!/usr/bin/env bun
/**
 * Development server launcher with automatic port fallback
 * Uses PORT env variable or defaults to PORTS.nextjs, falls back to next available
 * [#REF:DEV-SERVER-HEX:0x44455653]
 */

import { spawn } from 'bun';
import { PORTS } from '../lib/constants';

const DEFAULT_PORT = PORTS.nextjs;
const MAX_PORT_ATTEMPTS = 10;

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({
      port,
      fetch() {
        return new Response('test');
      },
    });
    server.stop();
    return true;
  } catch {
    return false;
  }
}

async function findAvailablePort(startPort: number): Promise<number> {
  console.log(`🔍 Scanning for available ports starting from ${startPort}...`);

  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      console.log(`✅ Port ${port} is available`);
      return port;
    }
    console.log(`❌ Port ${port} is in use, trying next...`);
  }

  const errorMsg = `💥 No available ports found in range ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}`;
  console.error(errorMsg);
  console.error('💡 Try:');
  console.error('   - Kill other dev servers: pkill -f "next dev"');
  console.error('   - Use a different port: PORT=3003 bun run dev');
  console.error("   - Check what's using the ports: lsof -i :3000-3010");

  throw new Error(errorMsg);
}

async function main() {
  console.log('🚀 Trader Analyzer Dev Server');
  console.log('================================');

  const requestedPort = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  console.log(`📋 Requested port: ${requestedPort} (from PORT env var or default ${DEFAULT_PORT})`);

  let port: number;
  try {
    if (await isPortAvailable(requestedPort)) {
      port = requestedPort;
      console.log(`✅ Requested port ${port} is available`);
    } else {
      console.log(`⚠️  Requested port ${requestedPort} is in use`);
      port = await findAvailablePort(requestedPort + 1);
    }
  } catch (error) {
    console.error(
      '💥 Failed to find available port:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  console.log(`🎯 Starting Next.js dev server on port ${port}...`);
  console.log(`🌐 Dashboard will be available at: http://localhost:${port}`);
  console.log('================================');

  try {
    const proc = spawn({
      cmd: ['bun', 'run', 'next', 'dev', '--port', String(port)],
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    // Graceful shutdown handling
    const cleanup = () => {
      console.log('\n🛑 Shutting down dev server...');
      proc.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Handle process exit
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      console.error(`💥 Next.js dev server exited with code ${exitCode}`);
      process.exit(exitCode);
    }
  } catch (error) {
    console.error(
      '💥 Failed to start dev server:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main().catch(console.error);
