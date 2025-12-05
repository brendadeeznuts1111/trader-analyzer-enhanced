/**
 * Enterprise Admin System - Approval Service
 * Multi-stage approval workflow for sensitive operations
 *
 * [#REF:APPROVAL-SVC-HEX:0x41505052]
 */

import { Database } from 'bun:sqlite';
import {
  type ApprovalRequest,
  type ApprovalVote,
  type ApprovalStatus,
  type ApprovalPriority,
  type VoteType,
  type Resource,
  type RoleLevel,
  APPROVAL_STATUSES,
  APPROVAL_PRIORITIES,
  VOTE_TYPES,
  ROLE_LEVELS,
} from './types';
import { getRBACService, RBACService } from './rbac-service';
import { getAuditService, AuditService } from './audit-service';
import { AUDIT_CHANNELS } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ApprovalConfig {
  action: string;
  requiredApprovers: number;
  minApproverLevel: RoleLevel;
  expirationHours: number;
  autoEscalateHours?: number;
}

const DEFAULT_APPROVAL_CONFIGS: ApprovalConfig[] = [
  { action: 'trades.execute_large', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.ADMIN, expirationHours: 24 },
  { action: 'trades.cancel_any', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.SUPER_ADMIN, expirationHours: 4 },
  { action: 'bot.stop', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.ADMIN, expirationHours: 1 },
  { action: 'bot.configure', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.SUPER_ADMIN, expirationHours: 24 },
  { action: 'config.modify', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.SUPER_ADMIN, expirationHours: 24 },
  { action: 'config.modify_critical', requiredApprovers: 2, minApproverLevel: ROLE_LEVELS.SUPER_ADMIN, expirationHours: 48, autoEscalateHours: 12 },
  { action: 'users.assign_admin', requiredApprovers: 1, minApproverLevel: ROLE_LEVELS.OWNER, expirationHours: 72 },
];

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ApprovalService {
  private db: Database;
  private rbacService: RBACService;
  private auditService: AuditService;
  private configs: Map<string, ApprovalConfig>;

  // Prepared statements
  private stmtCreateApproval!: ReturnType<Database['prepare']>;
  private stmtGetApproval!: ReturnType<Database['prepare']>;
  private stmtUpdateApprovalStatus!: ReturnType<Database['prepare']>;
  private stmtAddVote!: ReturnType<Database['prepare']>;
  private stmtGetVotes!: ReturnType<Database['prepare']>;
  private stmtIncrementApprovals!: ReturnType<Database['prepare']>;

  constructor(db: Database, configs: ApprovalConfig[] = DEFAULT_APPROVAL_CONFIGS) {
    this.db = db;
    this.rbacService = getRBACService(db);
    this.auditService = getAuditService(db);
    this.configs = new Map(configs.map(c => [c.action, c]));
    this.prepareStatements();
  }

  private prepareStatements(): void {
    this.stmtCreateApproval = this.db.prepare(`
      INSERT INTO admin_approval_queue (
        id, requester_id, action, resource_type, resource_id,
        action_payload, reason, status, priority, required_approvers,
        expires_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetApproval = this.db.prepare(`
      SELECT * FROM admin_approval_queue WHERE id = ?
    `);

    this.stmtUpdateApprovalStatus = this.db.prepare(`
      UPDATE admin_approval_queue
      SET status = ?, resolved_at = ?, resolved_by = ?, rejection_reason = ?
      WHERE id = ?
    `);

    this.stmtAddVote = this.db.prepare(`
      INSERT INTO admin_approval_votes (id, approval_id, voter_id, vote, comment, voter_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetVotes = this.db.prepare(`
      SELECT * FROM admin_approval_votes WHERE approval_id = ?
    `);

    this.stmtIncrementApprovals = this.db.prepare(`
      UPDATE admin_approval_queue
      SET current_approvals = current_approvals + 1
      WHERE id = ?
    `);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new approval request
   */
  createApproval(request: {
    requesterId: number;
    action: string;
    resourceType: Resource;
    resourceId?: string;
    payload: Record<string, unknown>;
    reason?: string;
    priority?: ApprovalPriority;
    metadata?: Record<string, unknown>;
  }): { id: string; requiresApproval: boolean; config?: ApprovalConfig } {
    const config = this.configs.get(request.action);

    // If no config, action doesn't require approval
    if (!config) {
      return { id: '', requiresApproval: false };
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (config.expirationHours * 3600);

    this.stmtCreateApproval.run(
      id,
      request.requesterId,
      request.action,
      request.resourceType,
      request.resourceId ?? null,
      JSON.stringify(request.payload),
      request.reason ?? null,
      APPROVAL_STATUSES.PENDING,
      request.priority ?? APPROVAL_PRIORITIES.NORMAL,
      config.requiredApprovers,
      expiresAt,
      request.metadata ? JSON.stringify(request.metadata) : null
    );

    this.auditService.logPending(
      request.requesterId,
      request.action,
      request.resourceType,
      id,
      {
        resourceId: request.resourceId,
        channel: AUDIT_CHANNELS.SYSTEM,
        metadata: request.metadata,
      }
    );

    return { id, requiresApproval: true, config };
  }

  /**
   * Check if an action requires approval
   */
  requiresApproval(action: string): boolean {
    return this.configs.has(action);
  }

  /**
   * Get approval configuration for an action
   */
  getConfig(action: string): ApprovalConfig | undefined {
    return this.configs.get(action);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cast a vote on an approval request
   */
  vote(
    approvalId: string,
    voterId: number,
    vote: VoteType,
    comment?: string
  ): { success: boolean; error?: string; resolved?: boolean; newStatus?: ApprovalStatus } {
    // Get the approval
    const approval = this.getApproval(approvalId);
    if (!approval) {
      return { success: false, error: 'Approval request not found' };
    }

    // Check if still pending
    if (approval.status !== APPROVAL_STATUSES.PENDING) {
      return { success: false, error: `Approval is already ${approval.status}` };
    }

    // Check if expired
    if (approval.expiresAt && approval.expiresAt < Math.floor(Date.now() / 1000)) {
      this.expireApproval(approvalId);
      return { success: false, error: 'Approval request has expired' };
    }

    // Check voter level
    const config = this.configs.get(approval.action);
    const voterLevel = this.rbacService.getEffectiveLevel(voterId);

    if (config && voterLevel < config.minApproverLevel) {
      return {
        success: false,
        error: `Insufficient level to vote. Need level ${config.minApproverLevel}, have ${voterLevel}`,
      };
    }

    // Check voter isn't the requester
    if (voterId === approval.requesterId) {
      return { success: false, error: 'Cannot vote on your own request' };
    }

    // Check for existing vote
    const existingVotes = this.getVotes(approvalId);
    if (existingVotes.some(v => v.voterId === voterId)) {
      return { success: false, error: 'Already voted on this request' };
    }

    // Record the vote
    const voteId = crypto.randomUUID();
    this.stmtAddVote.run(voteId, approvalId, voterId, vote, comment ?? null, voterLevel);

    // Handle vote outcome
    if (vote === VOTE_TYPES.REJECT) {
      // Single rejection resolves as rejected
      this.resolveApproval(approvalId, APPROVAL_STATUSES.REJECTED, voterId, comment);
      return { success: true, resolved: true, newStatus: APPROVAL_STATUSES.REJECTED };
    }

    if (vote === VOTE_TYPES.APPROVE) {
      this.stmtIncrementApprovals.run(approvalId);

      // Refresh approval to get updated count
      const updated = this.getApproval(approvalId);
      if (updated && updated.currentApprovals >= updated.requiredApprovers) {
        this.resolveApproval(approvalId, APPROVAL_STATUSES.APPROVED, voterId);
        return { success: true, resolved: true, newStatus: APPROVAL_STATUSES.APPROVED };
      }
    }

    return { success: true, resolved: false };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get an approval request by ID
   */
  getApproval(id: string): ApprovalRequest | undefined {
    const row = this.stmtGetApproval.get(id) as RawApprovalRow | undefined;
    return row ? this.rowToApproval(row) : undefined;
  }

  /**
   * Get votes for an approval
   */
  getVotes(approvalId: string): ApprovalVote[] {
    const rows = this.stmtGetVotes.all(approvalId) as RawVoteRow[];
    return rows.map(this.rowToVote);
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(limit = 50): ApprovalRequest[] {
    const rows = this.db.prepare(`
      SELECT * FROM admin_approval_queue
      WHERE status = 'pending'
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
      LIMIT ?
    `).all(limit) as RawApprovalRow[];

    return rows.map(this.rowToApproval);
  }

  /**
   * Get approvals by requester
   */
  getApprovalsByRequester(requesterId: number, limit = 20): ApprovalRequest[] {
    const rows = this.db.prepare(`
      SELECT * FROM admin_approval_queue
      WHERE requester_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(requesterId, limit) as RawApprovalRow[];

    return rows.map(this.rowToApproval);
  }

  /**
   * Cancel an approval request (by requester)
   */
  cancelApproval(approvalId: string, requesterId: number): { success: boolean; error?: string } {
    const approval = this.getApproval(approvalId);

    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    if (approval.requesterId !== requesterId) {
      return { success: false, error: 'Only the requester can cancel' };
    }

    if (approval.status !== APPROVAL_STATUSES.PENDING) {
      return { success: false, error: `Cannot cancel ${approval.status} approval` };
    }

    this.resolveApproval(approvalId, APPROVAL_STATUSES.CANCELLED, requesterId);
    return { success: true };
  }

  /**
   * Escalate an approval to higher level
   */
  escalateApproval(approvalId: string, escalatedBy: number): { success: boolean; error?: string } {
    const approval = this.getApproval(approvalId);

    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    if (approval.status !== APPROVAL_STATUSES.PENDING) {
      return { success: false, error: 'Can only escalate pending approvals' };
    }

    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      UPDATE admin_approval_queue
      SET escalation_level = escalation_level + 1, escalated_at = ?
      WHERE id = ?
    `).run(now, approvalId);

    this.auditService.logSuccess(escalatedBy, 'approvals.escalate', 'approvals', {
      resourceId: approvalId,
      channel: AUDIT_CHANNELS.SYSTEM,
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPIRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Expire stale approval requests
   */
  expireStaleApprovals(): number {
    const now = Math.floor(Date.now() / 1000);

    const result = this.db.prepare(`
      UPDATE admin_approval_queue
      SET status = 'expired', resolved_at = ?
      WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?
    `).run(now, now);

    return result.changes;
  }

  private expireApproval(approvalId: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.stmtUpdateApprovalStatus.run(APPROVAL_STATUSES.EXPIRED, now, null, null, approvalId);
  }

  private resolveApproval(
    approvalId: string,
    status: ApprovalStatus,
    resolvedBy: number,
    reason?: string
  ): void {
    const now = Math.floor(Date.now() / 1000);
    this.stmtUpdateApprovalStatus.run(status, now, resolvedBy, reason ?? null, approvalId);

    const approval = this.getApproval(approvalId);
    if (approval) {
      this.auditService.logSuccess(resolvedBy, `approvals.${status}`, 'approvals', {
        resourceId: approvalId,
        channel: AUDIT_CHANNELS.SYSTEM,
        afterState: { status, reason },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Count pending approvals
   */
  countPending(): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM admin_approval_queue WHERE status = 'pending'
    `).get() as { count: number };
    return result.count;
  }

  /**
   * Get approval statistics
   */
  getStats(): {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    avgResolutionHours: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        AVG(CASE WHEN resolved_at IS NOT NULL THEN (resolved_at - created_at) / 3600.0 ELSE NULL END) as avg_hours
      FROM admin_approval_queue
    `).get() as any;

    return {
      pending: stats.pending ?? 0,
      approved: stats.approved ?? 0,
      rejected: stats.rejected ?? 0,
      expired: stats.expired ?? 0,
      avgResolutionHours: stats.avg_hours ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private rowToApproval(row: RawApprovalRow): ApprovalRequest {
    return {
      id: row.id,
      createdAt: row.created_at,
      requesterId: row.requester_id,
      action: row.action,
      resourceType: row.resource_type as Resource,
      resourceId: row.resource_id,
      actionPayload: JSON.parse(row.action_payload),
      reason: row.reason,
      status: row.status as ApprovalStatus,
      priority: row.priority as ApprovalPriority,
      requiredApprovers: row.required_approvers,
      currentApprovals: row.current_approvals,
      expiresAt: row.expires_at,
      escalationLevel: row.escalation_level,
      escalatedAt: row.escalated_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      rejectionReason: row.rejection_reason,
      notificationSent: !!row.notification_sent,
      threadId: row.thread_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  }

  private rowToVote(row: RawVoteRow): ApprovalVote {
    return {
      id: row.id,
      approvalId: row.approval_id,
      voterId: row.voter_id,
      vote: row.vote as VoteType,
      comment: row.comment,
      votedAt: row.voted_at,
      voterLevel: row.voter_level as RoleLevel,
    };
  }
}

// Raw database row types
interface RawApprovalRow {
  id: string;
  created_at: number;
  requester_id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  action_payload: string;
  reason: string | null;
  status: string;
  priority: string;
  required_approvers: number;
  current_approvals: number;
  expires_at: number | null;
  escalation_level: number;
  escalated_at: number | null;
  resolved_at: number | null;
  resolved_by: number | null;
  rejection_reason: string | null;
  notification_sent: number;
  thread_id: number | null;
  metadata: string | null;
}

interface RawVoteRow {
  id: string;
  approval_id: string;
  voter_id: number;
  vote: string;
  comment: string | null;
  voted_at: number;
  voter_level: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let approvalServiceInstance: ApprovalService | null = null;

/**
 * Get or create the Approval service singleton
 */
export function getApprovalService(db: Database): ApprovalService {
  if (!approvalServiceInstance) {
    approvalServiceInstance = new ApprovalService(db);
  }
  return approvalServiceInstance;
}

/**
 * Reset the Approval service (for testing)
 */
export function resetApprovalService(): void {
  approvalServiceInstance = null;
}
