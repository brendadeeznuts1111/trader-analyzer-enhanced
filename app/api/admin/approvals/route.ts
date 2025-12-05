/**
 * Admin Approvals API Route
 * Approval queue management endpoints
 *
 * [#REF:ADMIN-APPROVALS-API-HEX:0x41505056]
 */

import { NextResponse } from 'next/server';
import { Database } from 'bun:sqlite';
import { createPreflightResponse, buildSecurityHeaders } from '@/lib/security/profiles';
import { getRBACService } from '@/lib/admin/rbac-service';
import { getAuditService } from '@/lib/admin/audit-service';
import { getApprovalService } from '@/lib/admin/approval-service';
import { AUDIT_CHANNELS, VOTE_TYPES, type VoteType } from '@/lib/admin/types';

// Database path
const DB_PATH = process.env.ADMIN_DB_PATH || './data/admin.db';

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  return createPreflightResponse(request);
}

/**
 * GET - List pending approvals
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
    const approvalService = getApprovalService(db);

    // Validate session
    const session = db.prepare(`
      SELECT user_id FROM admin_sessions
      WHERE id = ? AND is_active = 1 AND expires_at > unixepoch()
    `).get(sessionId) as { user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers });
    }

    // Check permission
    const permCheck = rbacService.hasPermission(session.user_id, 'approvals.view');
    if (!permCheck.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403, headers });
    }

    // Parse query params
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    let approvals;
    if (status === 'pending') {
      approvals = approvalService.getPendingApprovals(limit);
    } else {
      // Get all with filtering
      approvals = db.prepare(`
        SELECT * FROM admin_approval_queue
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(status, limit);
    }

    // Get votes for each approval
    const approvalsWithVotes = approvals.map(approval => {
      const votes = approvalService.getVotes(approval.id);
      return {
        ...formatApproval(approval),
        votes: votes.map(v => ({
          voterId: v.voterId,
          vote: v.vote,
          comment: v.comment,
          votedAt: v.votedAt,
        })),
      };
    });

    // Get stats
    const stats = approvalService.getStats();

    return NextResponse.json({
      approvals: approvalsWithVotes,
      stats,
    }, { headers });

  } catch (error) {
    console.error('Approvals list error:', error);
    return NextResponse.json({ error: 'Failed to list approvals' }, { status: 500, headers });
  }
}

/**
 * POST - Vote on approval or create new approval request
 */
export async function POST(request: Request) {
  const headers = buildSecurityHeaders(request);

  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await request.json();
    const { action, approvalId, vote, comment, reason } = body as {
      action: 'vote' | 'escalate' | 'cancel';
      approvalId: string;
      vote?: VoteType;
      comment?: string;
      reason?: string;
    };

    if (!action || !approvalId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    const db = new Database(DB_PATH);
    const rbacService = getRBACService(db);
    const auditService = getAuditService(db);
    const approvalService = getApprovalService(db);

    // Validate session
    const session = db.prepare(`
      SELECT user_id FROM admin_sessions
      WHERE id = ? AND is_active = 1 AND expires_at > unixepoch()
    `).get(sessionId) as { user_id: number } | undefined;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers });
    }

    // Handle different actions
    switch (action) {
      case 'vote': {
        if (!vote || !['approve', 'reject', 'abstain'].includes(vote)) {
          return NextResponse.json({ error: 'Invalid vote' }, { status: 400, headers });
        }

        // Check permission
        const permCheck = rbacService.hasPermission(session.user_id, 'approvals.vote');
        if (!permCheck.allowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403, headers });
        }

        const voteResult = approvalService.vote(
          approvalId,
          session.user_id,
          vote as VoteType,
          comment
        );

        if (!voteResult.success) {
          return NextResponse.json({ error: voteResult.error }, { status: 400, headers });
        }

        auditService.logSuccess(session.user_id, `approvals.${vote}`, 'approvals', {
          resourceId: approvalId,
          channel: AUDIT_CHANNELS.WEB,
        });

        // Return updated approval
        const updated = approvalService.getApproval(approvalId);
        const votes = approvalService.getVotes(approvalId);

        return NextResponse.json({
          success: true,
          resolved: voteResult.resolved,
          newStatus: voteResult.newStatus,
          approval: updated ? {
            ...formatApproval(updated),
            votes: votes.map(v => ({
              voterId: v.voterId,
              vote: v.vote,
              comment: v.comment,
              votedAt: v.votedAt,
            })),
          } : null,
        }, { headers });
      }

      case 'escalate': {
        const escalateResult = approvalService.escalateApproval(approvalId, session.user_id);

        if (!escalateResult.success) {
          return NextResponse.json({ error: escalateResult.error }, { status: 400, headers });
        }

        return NextResponse.json({ success: true }, { headers });
      }

      case 'cancel': {
        const cancelResult = approvalService.cancelApproval(approvalId, session.user_id);

        if (!cancelResult.success) {
          return NextResponse.json({ error: cancelResult.error }, { status: 400, headers });
        }

        auditService.logSuccess(session.user_id, 'approvals.cancel', 'approvals', {
          resourceId: approvalId,
          channel: AUDIT_CHANNELS.WEB,
        });

        return NextResponse.json({ success: true }, { headers });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }

  } catch (error) {
    console.error('Approval action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500, headers });
  }
}

// Helper to format approval for response
function formatApproval(approval: any) {
  return {
    id: approval.id,
    createdAt: approval.createdAt || approval.created_at,
    requesterId: approval.requesterId || approval.requester_id,
    action: approval.action,
    resourceType: approval.resourceType || approval.resource_type,
    resourceId: approval.resourceId || approval.resource_id,
    reason: approval.reason,
    status: approval.status,
    priority: approval.priority,
    requiredApprovers: approval.requiredApprovers || approval.required_approvers,
    currentApprovals: approval.currentApprovals || approval.current_approvals,
    expiresAt: approval.expiresAt || approval.expires_at,
    resolvedAt: approval.resolvedAt || approval.resolved_at,
    resolvedBy: approval.resolvedBy || approval.resolved_by,
    rejectionReason: approval.rejectionReason || approval.rejection_reason,
  };
}