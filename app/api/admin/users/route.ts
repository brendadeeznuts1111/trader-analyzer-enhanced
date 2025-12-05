/**
 * Admin Users API Route
 * User management endpoints
 *
 * [#REF:ADMIN-USERS-API-HEX:0x55534552]
 */

import { NextResponse } from 'next/server';
import { Database } from 'bun:sqlite';
import { createPreflightResponse, buildSecurityHeaders } from '@/lib/security/profiles';
import { getRBACService } from '@/lib/admin/rbac-service';
import { getAuditService } from '@/lib/admin/audit-service';
import { AUDIT_CHANNELS, ROLE_LEVELS, type RoleLevel } from '@/lib/admin/types';

// Database path
const DB_PATH = process.env.ADMIN_DB_PATH || './data/admin.db';

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * GET - List users with pagination and filtering
 */
export async function GET(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const db = new Database(DB_PATH);
    const rbacService = getRBACService(db);
    const auditService = getAuditService(db);

    // Validate session
    const session = db.prepare(`
      SELECT user_id FROM admin_sessions
      WHERE id = ? AND is_active = 1 AND expires_at > unixepoch()
    `).get(sessionId) as { user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers });
    }

    // Check permission
    const permCheck = rbacService.hasPermission(session.user_id, 'users.view');
    if (!permCheck.allowed) {
      auditService.logDenied(session.user_id, 'users.view', 'users', permCheck.reason ?? 'Access denied', {
        channel: AUDIT_CHANNELS.WEB,
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403, headers });
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const minLevel = parseInt(url.searchParams.get('minLevel') || '0', 10);
    const search = url.searchParams.get('search') || '';

    // Build query
    let whereClause = 'WHERE effective_level >= ?';
    const params: (string | number)[] = [minLevel];

    if (search) {
      whereClause += ' AND (username LIKE ? OR first_name LIKE ? OR CAST(user_id AS TEXT) LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM admin_users ${whereClause}
    `).get(...params) as { count: number };

    // Get users
    const users = db.prepare(`
      SELECT
        user_id,
        username,
        first_name,
        last_name,
        effective_level,
        is_verified,
        last_active_at,
        created_at
      FROM admin_users
      ${whereClause}
      ORDER BY effective_level DESC, user_id ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, page * limit) as Array<{
      user_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      effective_level: number;
      is_verified: number;
      last_active_at: number | null;
      created_at: number;
    }>;

    // Get roles for each user
    const usersWithRoles = users.map(user => {
      const roles = rbacService.getUserRoles(user.user_id);
      return {
        id: user.user_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        level: user.effective_level,
        isVerified: !!user.is_verified,
        lastActiveAt: user.last_active_at,
        createdAt: user.created_at,
        roles: roles.map(r => ({ id: r.id, name: r.name, displayName: r.displayName })),
      };
    });

    // Log the view
    auditService.logSuccess(session.user_id, 'users.view', 'users', {
      channel: AUDIT_CHANNELS.WEB,
      metadata: { page, limit, search: search || undefined },
    });

    return NextResponse.json({
      users: usersWithRoles,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    }, { headers });

  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500, headers });
  }
}

/**
 * POST - Assign role to user
 */
export async function POST(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await request.json();
    const { userId, roleId, roleName, action } = body as {
      userId: number;
      roleId?: string;
      roleName?: string;
      action: 'assign' | 'revoke';
    };

    if (!userId || !action || (!roleId && !roleName)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    const db = new Database(DB_PATH);
    const rbacService = getRBACService(db);
    const auditService = getAuditService(db);

    // Validate session
    const session = db.prepare(`
      SELECT user_id FROM admin_sessions
      WHERE id = ? AND is_active = 1 AND expires_at > unixepoch()
    `).get(sessionId) as { user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers });
    }

    // Get role
    const role = roleName
      ? rbacService.getRoleByName(roleName)
      : rbacService.getRoleById(roleId!);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404, headers });
    }

    // Check permission based on role level
    const permission = role.level >= ROLE_LEVELS.ADMIN ? 'users.assign_admin' : 'users.assign_roles';
    const permCheck = rbacService.hasPermission(session.user_id, permission);

    if (!permCheck.allowed) {
      auditService.logDenied(session.user_id, permission, 'users', permCheck.reason ?? 'Access denied', {
        resourceId: userId.toString(),
        channel: AUDIT_CHANNELS.WEB,
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403, headers });
    }

    // Perform action
    let result;
    if (action === 'assign') {
      result = rbacService.assignRole(userId, role.id, session.user_id);
    } else {
      result = rbacService.revokeRole(userId, role.id, session.user_id);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers });
    }

    // Log action
    auditService.logSuccess(session.user_id, `users.${action}_role`, 'users', {
      resourceId: userId.toString(),
      channel: AUDIT_CHANNELS.WEB,
      afterState: { role: role.name, action },
    });

    // Return updated user info
    const updatedUser = rbacService.getOrCreateUser(userId);
    const userRoles = rbacService.getUserRoles(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        level: updatedUser.effectiveLevel,
        roles: userRoles.map(r => ({ id: r.id, name: r.name, displayName: r.displayName })),
      },
    }, { headers });

  } catch (error) {
    console.error('Role assignment error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500, headers });
  }
}
