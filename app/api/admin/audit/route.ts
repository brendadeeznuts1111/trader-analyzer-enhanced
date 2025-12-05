/**
 * Admin Audit Logs API Route
 * Audit log querying endpoints
 *
 * [#REF:ADMIN-AUDIT-API-HEX:0x41554454]
 */

import { NextResponse } from 'next/server';
import { Database } from 'bun:sqlite';
import { createPreflightResponse, buildSecurityHeaders } from '@/lib/security/profiles';
import { getRBACService } from '@/lib/admin/rbac-service';
import { getAuditService } from '@/lib/admin/audit-service';
import { AUDIT_CHANNELS, type AuditStatus, type AuditChannel, type Resource } from '@/lib/admin/types';

// Database path
const DB_PATH = process.env.ADMIN_DB_PATH || './data/admin.db';

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * GET - Query audit logs with filters
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
    const permCheck = rbacService.hasPermission(session.user_id, 'audit.view');
    if (!permCheck.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403, headers });
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resourceType');
    const status = url.searchParams.get('status');
    const channel = url.searchParams.get('channel');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    // Build query
    const query: {
      userId?: number;
      action?: string;
      resourceType?: Resource;
      status?: AuditStatus;
      channel?: AuditChannel;
      fromTimestamp?: number;
      toTimestamp?: number;
      limit: number;
      offset: number;
    } = {
      limit,
      offset: page * limit,
    };

    if (userId) query.userId = parseInt(userId, 10);
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType as Resource;
    if (status) query.status = status as AuditStatus;
    if (channel) query.channel = channel as AuditChannel;
    if (fromDate) query.fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    if (toDate) query.toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);

    // Get logs
    const logs = auditService.queryLogs(query);

    // Get total count
    const totalCount = auditService.countLogs({
      userId: query.userId,
      action: query.action,
      resourceType: query.resourceType,
      status: query.status,
      fromTimestamp: query.fromTimestamp,
      toTimestamp: query.toTimestamp,
    });

    // Format logs for response
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      category: log.category,
      status: log.status,
      channel: log.channel,
      errorMessage: log.errorMessage,
      durationMs: log.durationMs,
      metadata: log.metadata,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        userId: userId ? parseInt(userId, 10) : null,
        action,
        resourceType,
        status,
        channel,
        from: fromDate,
        to: toDate,
      },
    }, { headers });

  } catch (error) {
    console.error('Audit query error:', error);
    return NextResponse.json({ error: 'Failed to query audit logs' }, { status: 500, headers });
  }
}
