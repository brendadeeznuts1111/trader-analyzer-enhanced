/**
 * Admin Dashboard Overview API Route
 * Main admin endpoint for dashboard stats
 *
 * [#REF:ADMIN-MAIN-API-HEX:0x41444D4E]
 */

import { NextResponse } from 'next/server';
import { Database } from 'bun:sqlite';
import { createPreflightResponse, buildSecurityHeaders } from '@/lib/security/profiles';
import { getRBACService } from '@/lib/admin/rbac-service';
import { getAuditService } from '@/lib/admin/audit-service';
import { getApprovalService } from '@/lib/admin/approval-service';
import { AUDIT_CHANNELS, ROLE_LEVELS } from '@/lib/admin/types';

// Database path
const DB_PATH = process.env.ADMIN_DB_PATH || './data/admin.db';

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * GET - Get admin dashboard overview
 */
export async function GET(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    // Validate session
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      );
    }

    const db = new Database(DB_PATH);

    // Get session
    const session = db.prepare(`
      SELECT s.*, u.effective_level FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.user_id
      WHERE s.id = ? AND s.is_active = 1 AND s.expires_at > unixepoch()
    `).get(sessionId) as { user_id: number; effective_level: number } | undefined;

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401, headers }
      );
    }

    // Update last activity
    db.prepare(`
      UPDATE admin_sessions SET last_activity_at = unixepoch() WHERE id = ?
    `).run(sessionId);

    const rbacService = getRBACService(db);
    const auditService = getAuditService(db);
    const approvalService = getApprovalService(db);

    // Check permission
    const permCheck = rbacService.hasPermission(session.user_id, 'admin.access');
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers }
      );
    }

    // Gather dashboard stats
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 604800;

    // User stats
    const userStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN effective_level >= 40 THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN last_active_at > ? THEN 1 ELSE 0 END) as active_24h
      FROM admin_users
    `).get(oneDayAgo) as { total: number; admins: number; active_24h: number };

    // Audit stats
    const auditStats = auditService.getStatusCounts(oneDayAgo);

    // Approval stats
    const approvalStats = approvalService.getStats();

    // Recent activity (last 10 actions)
    const recentActivity = auditService.getRecentLogs(10);

    // Most active users today
    const activeUsers = auditService.getMostActiveUsers(5, oneDayAgo);

    // Bot status (read from bot API if needed)
    const botStatus = {
      running: false, // TODO: integrate with bot state
      uptime: 0,
      trades24h: 0,
    };

    return NextResponse.json({
      users: {
        total: userStats.total,
        admins: userStats.admins,
        activeToday: userStats.active_24h,
      },
      audit: {
        total24h: auditStats.success + auditStats.failed + auditStats.denied,
        success: auditStats.success,
        failed: auditStats.failed,
        denied: auditStats.denied,
      },
      approvals: {
        pending: approvalStats.pending,
        approved24h: approvalStats.approved,
        rejected24h: approvalStats.rejected,
      },
      bot: botStatus,
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        userId: log.userId,
        action: log.action,
        status: log.status,
        resourceType: log.resourceType,
      })),
      activeUsers,
      serverTime: now,
    }, { headers });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard' },
      { status: 500, headers }
    );
  }
}
