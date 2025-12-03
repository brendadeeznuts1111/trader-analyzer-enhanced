#!/usr/bin/env bun
/**
 * Production server launcher with automatic port fallback
 * Uses PORT env variable or defaults to 3002, falls back to next available
 */

import { spawn } from 'bun';

const DEFAULT_PORT = 3002;
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
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying next...`);
  }
  throw new Error(
    `No available ports found in range ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}`
  );
}

async function main() {
  const requestedPort = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

  let port: number;
  if (await isPortAvailable(requestedPort)) {
    port = requestedPort;
  } else {
    console.log(`Requested port ${requestedPort} is in use, finding available port...`);
    port = await findAvailablePort(requestedPort + 1);
  }

  console.log(`Starting production server on port ${port}...`);

  const proc = spawn({
    cmd: ['bun', 'run', 'next', 'start', '--port', String(port)],
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });

  process.on('SIGINT', () => {
    proc.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    proc.kill();
    process.exit(0);
  });

  await proc.exited;
}

main().catch(console.error);
