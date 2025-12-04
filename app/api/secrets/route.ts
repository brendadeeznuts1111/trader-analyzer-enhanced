/**
 * Secrets Status API Route
 * Provides secrets configuration status for dashboard display
 * [#REF:SECRETS-API-HEX:0x53454341]
 */

import { NextResponse } from 'next/server';
import { secrets } from 'bun';

const SERVICE_NAME = 'trader-analyzer';

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
