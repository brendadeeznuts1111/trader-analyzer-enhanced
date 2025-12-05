/**
 * Admin Authentication API Route
 * Telegram WebApp authentication for admin dashboard
 *
 * [#REF:ADMIN-AUTH-API-HEX:0x41555448]
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { Database } from 'bun:sqlite';
import { createPreflightResponse, buildSecurityHeaders } from '@/lib/security/profiles';
import { getRBACService } from '@/lib/admin/rbac-service';
import { getAuditService } from '@/lib/admin/audit-service';
import { AUDIT_CHANNELS, AUTH_METHODS, ROLE_LEVELS } from '@/lib/admin/types';

// Database path
const DB_PATH = process.env.ADMIN_DB_PATH || './data/admin.db';

// Session duration (24 hours)
const SESSION_DURATION_SECONDS = 24 * 60 * 60;

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  auth_date: number;
  hash: string;
}

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * POST - Authenticate via Telegram WebApp init data
 */
export async function POST(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    const body = await request.json();
    const { initData } = body as { initData: string };

    if (!initData) {
      return NextResponse.json(
        { error: 'Missing initData' },
        { status: 400, headers }
      );
    }

    // Parse and verify Telegram WebApp init data
    const parsed = parseInitData(initData);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid init data format' },
        { status: 400, headers }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500, headers }
      );
    }

    // Verify the hash
    if (!verifyTelegramWebAppData(parsed, botToken)) {
      return NextResponse.json(
        { error: 'Invalid hash' },
        { status: 401, headers }
      );
    }

    // Check auth_date is not too old (1 hour)
    const now = Math.floor(Date.now() / 1000);
    if (now - parsed.auth_date > 3600) {
      return NextResponse.json(
        { error: 'Init data expired' },
        { status: 401, headers }
      );
    }

    // Get user from init data
    if (!parsed.user) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400, headers }
      );
    }

    // Initialize services
    const db = new Database(DB_PATH);
    const rbacService = getRBACService(db);
    const auditService = getAuditService(db);

    // Get or create user
    const adminUser = rbacService.getOrCreateUser(parsed.user.id, {
      username: parsed.user.username,
      firstName: parsed.user.first_name,
      lastName: parsed.user.last_name,
    });

    // Check if user has admin access
    const permCheck = rbacService.hasPermission(parsed.user.id, 'admin.access');
    if (!permCheck.allowed) {
      auditService.logDenied(
        parsed.user.id,
        'admin.login',
        'config',
        'Insufficient permissions for admin access',
        { channel: AUDIT_CHANNELS.WEB }
      );

      return NextResponse.json(
        { error: 'Access denied', reason: permCheck.reason },
        { status: 403, headers }
      );
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = now + SESSION_DURATION_SECONDS;

    db.prepare(`
      INSERT INTO admin_sessions (id, user_id, expires_at, auth_method, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      parsed.user.id,
      expiresAt,
      AUTH_METHODS.TELEGRAM_WEBAPP,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      request.headers.get('user-agent') || null
    );

    // Log successful login
    auditService.logSuccess(parsed.user.id, 'admin.login', 'config', {
      channel: AUDIT_CHANNELS.WEB,
      sessionId,
    });

    // Get user context
    const userContext = rbacService.getUserContext(parsed.user.id, parsed.user.username);

    return NextResponse.json({
      session: {
        id: sessionId,
        expiresAt,
      },
      user: {
        id: parsed.user.id,
        username: parsed.user.username,
        firstName: parsed.user.first_name,
        lastName: parsed.user.last_name,
        level: userContext.effectiveLevel,
        roles: userContext.roles,
        permissions: userContext.permissions,
      },
    }, { headers });

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500, headers }
    );
  }
}

/**
 * DELETE - Logout / invalidate session
 */
export async function DELETE(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session to invalidate' },
        { status: 400, headers }
      );
    }

    const db = new Database(DB_PATH);

    // Get session info before deleting
    const session = db.prepare(`
      SELECT user_id FROM admin_sessions WHERE id = ? AND is_active = 1
    `).get(sessionId) as { user_id: number } | undefined;

    // Invalidate session
    db.prepare(`
      UPDATE admin_sessions SET is_active = 0 WHERE id = ?
    `).run(sessionId);

    // Log logout if we found the session
    if (session) {
      const auditService = getAuditService(db);
      auditService.logSuccess(session.user_id, 'admin.logout', 'config', {
        channel: AUDIT_CHANNELS.WEB,
        sessionId,
      });
    }

    return NextResponse.json({ success: true }, { headers });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500, headers }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function parseInitData(initData: string): TelegramWebAppInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const result: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      if (key === 'user') {
        try {
          result.user = JSON.parse(value);
        } catch {
          result.user = value;
        }
      } else if (key === 'auth_date') {
        result.auth_date = parseInt(value, 10);
      } else {
        result[key] = value;
      }
    }

    if (!result.hash || !result.auth_date) {
      return null;
    }

    return result as TelegramWebAppInitData;
  } catch {
    return null;
  }
}

function verifyTelegramWebAppData(data: TelegramWebAppInitData, botToken: string): boolean {
  // Create data-check-string (all fields except hash, sorted alphabetically)
  const checkEntries: string[] = [];

  // Handle user object specially
  if (data.user) {
    checkEntries.push(`user=${JSON.stringify(data.user)}`);
  }

  // Add other fields
  checkEntries.push(`auth_date=${data.auth_date}`);
  if (data.query_id) {
    checkEntries.push(`query_id=${data.query_id}`);
  }

  // Sort alphabetically
  checkEntries.sort();
  const dataCheckString = checkEntries.join('\n');

  // Create secret key from bot token
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Calculate hash
  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === data.hash;
}
