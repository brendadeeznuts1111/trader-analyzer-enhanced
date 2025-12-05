/**
 * Secrets Status API Route
 * Provides secrets configuration status for dashboard display
 * [#REF:SECRETS-API-HEX:0x53454341]
 */

import { NextResponse } from 'next/server';

const SERVICE_NAME = 'trader-analyzer';

interface SecretsHealthStatus {
  healthy: boolean;
  service: string;
  secretsFound: number;
  issues: string[];
  runtime: 'bun' | 'node';
}

async function checkSecretsHealth(): Promise<SecretsHealthStatus> {
  const isBun = typeof globalThis.Bun !== 'undefined';

  const status: SecretsHealthStatus = {
    healthy: true,
    service: SERVICE_NAME,
    secretsFound: 0,
    issues: [],
    runtime: isBun ? 'bun' : 'node',
  };

  // Only check Bun secrets if running in Bun
  if (!isBun) {
    status.issues.push('Not running in Bun runtime - secrets service unavailable');
    return status;
  }

  try {
    // Use eval to prevent bundler from seeing the import
    const bunModule = await (0, eval)('import("bun")');
    const secrets = bunModule.secrets;

    // Try to access a test secret to verify service is working
    const testSecret = await secrets.get({ service: SERVICE_NAME, name: 'test-connection' });
    if (testSecret) {
      status.secretsFound++;
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
  } catch (error) {
    // Service might not exist yet, which is OK for development
    status.issues.push('Secrets service not initialized (this is normal for first run)');
  }

  return status;
}

export async function GET() {
  try {
    const status = await checkSecretsHealth();

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Secrets status check failed:', error);

    // Return a safe fallback response
    return NextResponse.json(
      {
        healthy: false,
        service: SERVICE_NAME,
        secretsFound: 0,
        issues: ['Unable to check secrets status'],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
