/**
 * Enterprise Admin System - Audit Service
 * Comprehensive Action Logging with Queryable History
 *
 * [#REF:AUDIT-SERVICE-HEX:0x41554454]
 */

import { Database } from 'bun:sqlite';
import {
  type AuditLogEntry,
  type AuditLogQuery,
  type AuditChannel,
  type AuditStatus,
  type PermissionCategory,
  type Resource,
  AUDIT_CHANNELS,
  AUDIT_STATUSES,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class AuditService {
  private db: Database;

  // Prepared statements
  private stmtInsertLog!: ReturnType<Database['prepare']>;
  private stmtGetById!: ReturnType<Database['prepare']>;
  private stmtGetByRequestId!: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.db = db;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    this.stmtInsertLog = this.db.prepare(`
      INSERT INTO admin_audit_logs (
        id, timestamp, user_id, action, resource_type, resource_id,
        category, status, ip_address, user_agent, request_id, channel,
        before_state, after_state, metadata, error_message, duration_ms,
        approval_id, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetById = this.db.prepare(`
      SELECT * FROM admin_audit_logs WHERE id = ?
    `);

    this.stmtGetByRequestId = this.db.prepare(`
      SELECT * FROM admin_audit_logs WHERE request_id = ?
    `);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Log an action to the audit trail
   */
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): string {
    const id = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    this.stmtInsertLog.run(
      id,
      timestamp,
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId ?? null,
      entry.category,
      entry.status,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      entry.requestId ?? null,
      entry.channel,
      entry.beforeState ? JSON.stringify(entry.beforeState) : null,
      entry.afterState ? JSON.stringify(entry.afterState) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.errorMessage ?? null,
      entry.durationMs ?? null,
      entry.approvalId ?? null,
      entry.sessionId ?? null
    );

    return id;
  }

  /**
   * Log a successful action
   */
  logSuccess(
    userId: number,
    action: string,
    resourceType: Resource,
    options: {
      resourceId?: string;
      category?: PermissionCategory;
      channel?: AuditChannel;
      beforeState?: Record<string, unknown>;
      afterState?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      requestId?: string;
      sessionId?: string;
      durationMs?: number;
    } = {}
  ): string {
    return this.logAction({
      userId,
      action,
      resourceType,
      resourceId: options.resourceId ?? null,
      category: options.category ?? 'execute',
      status: AUDIT_STATUSES.SUCCESS,
      channel: options.channel ?? AUDIT_CHANNELS.SYSTEM,
      beforeState: options.beforeState ?? null,
      afterState: options.afterState ?? null,
      metadata: options.metadata ?? null,
      requestId: options.requestId ?? null,
      sessionId: options.sessionId ?? null,
      durationMs: options.durationMs ?? null,
      ipAddress: null,
      userAgent: null,
      errorMessage: null,
      approvalId: null,
    });
  }

  /**
   * Log a failed action
   */
  logFailure(
    userId: number,
    action: string,
    resourceType: Resource,
    errorMessage: string,
    options: {
      resourceId?: string;
      category?: PermissionCategory;
      channel?: AuditChannel;
      metadata?: Record<string, unknown>;
      requestId?: string;
      sessionId?: string;
    } = {}
  ): string {
    return this.logAction({
      userId,
      action,
      resourceType,
      resourceId: options.resourceId ?? null,
      category: options.category ?? 'execute',
      status: AUDIT_STATUSES.FAILED,
      channel: options.channel ?? AUDIT_CHANNELS.SYSTEM,
      errorMessage,
      metadata: options.metadata ?? null,
      requestId: options.requestId ?? null,
      sessionId: options.sessionId ?? null,
      beforeState: null,
      afterState: null,
      ipAddress: null,
      userAgent: null,
      durationMs: null,
      approvalId: null,
    });
  }

  /**
   * Log a denied action (permission denied)
   */
  logDenied(
    userId: number,
    action: string,
    resourceType: Resource,
    reason: string,
    options: {
      resourceId?: string;
      channel?: AuditChannel;
      requestId?: string;
      sessionId?: string;
    } = {}
  ): string {
    return this.logAction({
      userId,
      action,
      resourceType,
      resourceId: options.resourceId ?? null,
      category: 'execute',
      status: AUDIT_STATUSES.DENIED,
      channel: options.channel ?? AUDIT_CHANNELS.SYSTEM,
      errorMessage: reason,
      metadata: { deniedReason: reason },
      requestId: options.requestId ?? null,
      sessionId: options.sessionId ?? null,
      beforeState: null,
      afterState: null,
      ipAddress: null,
      userAgent: null,
      durationMs: null,
      approvalId: null,
    });
  }

  /**
   * Log an action pending approval
   */
  logPending(
    userId: number,
    action: string,
    resourceType: Resource,
    approvalId: string,
    options: {
      resourceId?: string;
      channel?: AuditChannel;
      metadata?: Record<string, unknown>;
      requestId?: string;
    } = {}
  ): string {
    return this.logAction({
      userId,
      action,
      resourceType,
      resourceId: options.resourceId ?? null,
      category: 'approve',
      status: AUDIT_STATUSES.PENDING,
      channel: options.channel ?? AUDIT_CHANNELS.SYSTEM,
      approvalId,
      metadata: options.metadata ?? null,
      requestId: options.requestId ?? null,
      beforeState: null,
      afterState: null,
      ipAddress: null,
      userAgent: null,
      errorMessage: null,
      durationMs: null,
      sessionId: null,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERYING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Query audit logs with filters
   */
  queryLogs(query: AuditLogQuery): AuditLogEntry[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }

    if (query.action !== undefined) {
      conditions.push('action = ?');
      params.push(query.action);
    }

    if (query.resourceType !== undefined) {
      conditions.push('resource_type = ?');
      params.push(query.resourceType);
    }

    if (query.resourceId !== undefined) {
      conditions.push('resource_id = ?');
      params.push(query.resourceId);
    }

    if (query.status !== undefined) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.channel !== undefined) {
      conditions.push('channel = ?');
      params.push(query.channel);
    }

    if (query.fromTimestamp !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(query.fromTimestamp);
    }

    if (query.toTimestamp !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(query.toTimestamp);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const sql = `
      SELECT * FROM admin_audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(sql).all(...params, limit, offset) as RawAuditRow[];
    return rows.map(this.rowToEntry);
  }

  /**
   * Get recent audit logs
   */
  getRecentLogs(limit = 50): AuditLogEntry[] {
    return this.queryLogs({ limit });
  }

  /**
   * Get logs for a specific user
   */
  getUserLogs(userId: number, limit = 50): AuditLogEntry[] {
    return this.queryLogs({ userId, limit });
  }

  /**
   * Get the action trail for a specific resource
   */
  getActionTrail(resourceType: Resource, resourceId: string): AuditLogEntry[] {
    return this.queryLogs({ resourceType, resourceId, limit: 1000 });
  }

  /**
   * Get audit entry by ID
   */
  getById(id: string): AuditLogEntry | undefined {
    const row = this.stmtGetById.get(id) as RawAuditRow | undefined;
    return row ? this.rowToEntry(row) : undefined;
  }

  /**
   * Get audit entry by request ID
   */
  getByRequestId(requestId: string): AuditLogEntry | undefined {
    const row = this.stmtGetByRequestId.get(requestId) as RawAuditRow | undefined;
    return row ? this.rowToEntry(row) : undefined;
  }

  /**
   * Count logs matching query
   */
  countLogs(query: Omit<AuditLogQuery, 'limit' | 'offset'>): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }

    if (query.action !== undefined) {
      conditions.push('action = ?');
      params.push(query.action);
    }

    if (query.resourceType !== undefined) {
      conditions.push('resource_type = ?');
      params.push(query.resourceType);
    }

    if (query.status !== undefined) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.fromTimestamp !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(query.fromTimestamp);
    }

    if (query.toTimestamp !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(query.toTimestamp);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM admin_audit_logs ${whereClause}
    `).get(...params) as { count: number };

    return result.count;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get action counts by status for a time period
   */
  getStatusCounts(fromTimestamp?: number, toTimestamp?: number): Record<AuditStatus, number> {
    const conditions: string[] = [];
    const params: number[] = [];

    if (fromTimestamp !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(fromTimestamp);
    }

    if (toTimestamp !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(toTimestamp);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM admin_audit_logs
      ${whereClause}
      GROUP BY status
    `).all(...params) as { status: string; count: number }[];

    const counts: Record<string, number> = {
      success: 0,
      failed: 0,
      pending: 0,
      denied: 0,
    };

    for (const row of rows) {
      counts[row.status] = row.count;
    }

    return counts as Record<AuditStatus, number>;
  }

  /**
   * Get most active users in a time period
   */
  getMostActiveUsers(limit = 10, fromTimestamp?: number): { userId: number; actionCount: number }[] {
    const whereClause = fromTimestamp ? 'WHERE timestamp >= ?' : '';
    const params = fromTimestamp ? [fromTimestamp] : [];

    return this.db.prepare(`
      SELECT user_id as userId, COUNT(*) as actionCount
      FROM admin_audit_logs
      ${whereClause}
      GROUP BY user_id
      ORDER BY actionCount DESC
      LIMIT ?
    `).all(...params, limit) as { userId: number; actionCount: number }[];
  }

  /**
   * Get action frequency by hour for the last 24 hours
   */
  getHourlyActivity(): { hour: number; count: number }[] {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

    return this.db.prepare(`
      SELECT
        CAST((timestamp - ?) / 3600 AS INTEGER) as hour,
        COUNT(*) as count
      FROM admin_audit_logs
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY hour
    `).all(oneDayAgo, oneDayAgo) as { hour: number; count: number }[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Delete old audit logs (retention policy)
   * Default: Keep 90 days of logs
   */
  cleanupOldLogs(retentionDays = 90): number {
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (retentionDays * 86400);

    const result = this.db.prepare(`
      DELETE FROM admin_audit_logs WHERE timestamp < ?
    `).run(cutoffTimestamp);

    return result.changes;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private rowToEntry(row: RawAuditRow): AuditLogEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type as Resource,
      resourceId: row.resource_id,
      category: row.category as PermissionCategory,
      status: row.status as AuditStatus,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      channel: row.channel as AuditChannel,
      beforeState: row.before_state ? JSON.parse(row.before_state) : null,
      afterState: row.after_state ? JSON.parse(row.after_state) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      errorMessage: row.error_message,
      durationMs: row.duration_ms,
      approvalId: row.approval_id,
      sessionId: row.session_id,
    };
  }
}

// Raw database row type
interface RawAuditRow {
  id: string;
  timestamp: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  category: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  channel: string;
  before_state: string | null;
  after_state: string | null;
  metadata: string | null;
  error_message: string | null;
  duration_ms: number | null;
  approval_id: string | null;
  session_id: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let auditServiceInstance: AuditService | null = null;

/**
 * Get or create the Audit service singleton
 */
export function getAuditService(db: Database): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService(db);
  }
  return auditServiceInstance;
}

/**
 * Reset the Audit service (for testing)
 */
export function resetAuditService(): void {
  auditServiceInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an audit context from HTTP request headers
 */
export function createAuditContext(headers: Headers): {
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    requestId: headers.get('x-request-id'),
    ipAddress: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip'),
    userAgent: headers.get('user-agent'),
  };
}

/**
 * Wrap an action with audit logging
 */
export async function withAuditLogging<T>(
  auditService: AuditService,
  userId: number,
  action: string,
  resourceType: Resource,
  fn: () => Promise<T>,
  options: {
    resourceId?: string;
    category?: PermissionCategory;
    channel?: AuditChannel;
    requestId?: string;
    sessionId?: string;
    getBeforeState?: () => Promise<Record<string, unknown>>;
    getAfterState?: (result: T) => Promise<Record<string, unknown>>;
  } = {}
): Promise<T> {
  const startTime = Date.now();
  let beforeState: Record<string, unknown> | null = null;

  try {
    if (options.getBeforeState) {
      beforeState = await options.getBeforeState();
    }

    const result = await fn();

    let afterState: Record<string, unknown> | null = null;
    if (options.getAfterState) {
      afterState = await options.getAfterState(result);
    }

    auditService.logSuccess(userId, action, resourceType, {
      resourceId: options.resourceId,
      category: options.category,
      channel: options.channel,
      requestId: options.requestId,
      sessionId: options.sessionId,
      beforeState: beforeState ?? undefined,
      afterState: afterState ?? undefined,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    auditService.logFailure(
      userId,
      action,
      resourceType,
      error instanceof Error ? error.message : 'Unknown error',
      {
        resourceId: options.resourceId,
        category: options.category,
        channel: options.channel,
        requestId: options.requestId,
        sessionId: options.sessionId,
      }
    );
    throw error;
  }
}
