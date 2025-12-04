#!/usr/bin/env bun
/**
 * Development server launcher with automatic port fallback
 * Uses PORT env variable or defaults to PORTS.nextjs, falls back to next available
 * [#REF:DEV-SERVER-HEX:0x44455653]
 */

import { spawn } from 'bun';
import { PORTS } from '../lib/constants';
import { secrets } from 'bun';

const DEFAULT_PORT = PORTS.nextjs;
const MAX_PORT_ATTEMPTS = 10;

// Security configuration
const SERVICE_NAME = 'trader-analyzer';
const SECURITY_FLAGS = ['--disable-eval', '--disable-wasm', '--use-system-ca'];

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

interface SecretsHealthStatus {
  healthy: boolean;
  service: string;
  secretsFound: number;
  issues: string[];
}

async function checkSecretsHealth(): Promise<SecretsHealthStatus> {
  const status: SecretsHealthStatus = {
    healthy: true,
    service: SERVICE_NAME,
    secretsFound: 0,
    issues: [],
  };

  try {
    // Try to access a test secret to verify service is working
    const testSecret = await secrets.get({ service: SERVICE_NAME, name: 'test-connection' });
    if (testSecret) {
      status.secretsFound++;
    }
  } catch (error) {
    // Service might not exist yet, which is OK for development
    status.issues.push('Secrets service not initialized (this is normal for first run)');
  }

  // Check for common expected secrets
  const expectedSecrets = ['telegram-bot-token', 'telegram-chat-id'];
  for (const secretName of expectedSecrets) {
    try {
      const secret = await secrets.get({ service: SERVICE_NAME, name: secretName });
      if (secret) {
        status.secretsFound++;
      }
    } catch {
      // Secret doesn't exist, which is OK
    }
  }

  return status;
}

function shouldEnableSecurity(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureMode = process.env.SECURE_MODE === 'true';
  const skipSecurity = process.env.SKIP_SECURITY === 'true';

  if (skipSecurity) return false;
  if (isProduction || secureMode) return true;

  // Default to security enabled for safety
  return true;
}

async function main() {
  console.log('🚀 Trader Analyzer Dev Server');
  console.log('================================');

  // Security configuration
  const enableSecurity = shouldEnableSecurity();
  console.log(`🔒 Security Mode: ${enableSecurity ? 'Enabled' : 'Disabled'}`);

  // Check secrets health
  console.log('🔐 Checking secrets configuration...');
  const secretsStatus = await checkSecretsHealth();
  const secretsStatusText = secretsStatus.healthy ? '✅ Operational' : '⚠️  Issues Detected';
  console.log(
    `🔐 Secrets Status: ${secretsStatusText} (${secretsStatus.secretsFound} secrets found)`
  );

  if (secretsStatus.issues.length > 0) {
    console.log('📋 Secrets Notes:');
    secretsStatus.issues.forEach(issue => console.log(`   - ${issue}`));
  }

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

  try {
    // Build command with security flags if enabled
    const baseCmd = ['bun'];
    if (enableSecurity) {
      baseCmd.push(...SECURITY_FLAGS);
    }
    baseCmd.push('run', 'next', 'dev', '--port', String(port));

    console.log(`🎯 Starting Next.js dev server on port ${port}...`);
    console.log(`🌐 Dashboard will be available at: http://localhost:${port}`);
    console.log('================================');

    const proc = spawn({
      cmd: baseCmd,
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
