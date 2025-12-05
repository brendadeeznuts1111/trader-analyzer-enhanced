/**
 * Enterprise Admin System - Command Middleware
 * Permission checking and rate limiting for Telegram commands
 *
 * [#REF:CMD-MIDDLEWARE-HEX:0x434D4457]
 */

import { Context } from 'telegraf';
import { RBACService } from './rbac-service';
import { AuditService } from './audit-service';
import { AUDIT_CHANNELS, ROLE_LEVELS, type RoleLevel } from './types';
import { Database } from 'bun:sqlite';

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  action: string;
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig[] = [
  { action: 'admin.command', maxRequests: 30, windowSeconds: 60 },
  { action: 'role.assign', maxRequests: 10, windowSeconds: 60 },
  { action: 'role.revoke', maxRequests: 10, windowSeconds: 60 },
  { action: 'user.ban', maxRequests: 5, windowSeconds: 60 },
  { action: 'audit.query', maxRequests: 20, windowSeconds: 60 },
  { action: 'approval.vote', maxRequests: 20, windowSeconds: 60 },
];

export class RateLimiter {
  private db: Database;
  private configs: Map<string, RateLimitConfig>;

  constructor(db: Database, configs: RateLimitConfig[] = DEFAULT_RATE_LIMITS) {
    this.db = db;
    this.configs = new Map(configs.map(c => [c.action, c]));
  }

  /**
   * Check if action is rate limited
   * Returns true if allowed, false if rate limited
   */
  checkLimit(userId: number, action: string): { allowed: boolean; retryAfter?: number } {
    const config = this.configs.get(action);
    if (!config) {
      return { allowed: true }; // No limit configured
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.windowSeconds);

    // Get current count
    const row = this.db.prepare(`
      SELECT count FROM admin_rate_limits
      WHERE user_id = ? AND action = ? AND window_start = ?
    `).get(userId, action, windowStart) as { count: number } | undefined;

    const currentCount = row?.count ?? 0;

    if (currentCount >= config.maxRequests) {
      const retryAfter = windowStart + config.windowSeconds - now;
      return { allowed: false, retryAfter };
    }

    // Increment count
    this.db.prepare(`
      INSERT INTO admin_rate_limits (user_id, action, window_start, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, action, window_start)
      DO UPDATE SET count = count + 1
    `).run(userId, action, windowStart);

    return { allowed: true };
  }

  /**
   * Clean up old rate limit entries
   */
  cleanup(): number {
    const cutoff = Math.floor(Date.now() / 1000) - 3600; // Keep 1 hour of data
    const result = this.db.prepare(`
      DELETE FROM admin_rate_limits WHERE window_start < ?
    `).run(cutoff);
    return result.changes;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandContext {
  userId: number;
  username?: string;
  chatId: number;
  command: string;
  args: string[];
  messageId: number;
}

export interface MiddlewareResult {
  allowed: boolean;
  reason?: string;
  userLevel?: RoleLevel;
  requiresApproval?: boolean;
}

/**
 * Create a permission-checking middleware for admin commands
 */
export function createPermissionMiddleware(
  rbacService: RBACService,
  auditService: AuditService,
  rateLimiter: RateLimiter
) {
  return async function checkPermission(
    ctx: Context,
    permission: string,
    rateAction = 'admin.command'
  ): Promise<MiddlewareResult> {
    const userId = ctx.from?.id;
    if (!userId) {
      return { allowed: false, reason: 'User not identified' };
    }

    // Check rate limit first
    const rateCheck = rateLimiter.checkLimit(userId, rateAction);
    if (!rateCheck.allowed) {
      auditService.logDenied(userId, permission, 'config', `Rate limited (retry in ${rateCheck.retryAfter}s)`, {
        channel: AUDIT_CHANNELS.TELEGRAM,
      });
      return {
        allowed: false,
        reason: `Rate limited. Try again in ${rateCheck.retryAfter} seconds.`,
      };
    }

    // Ensure user exists in admin system
    rbacService.getOrCreateUser(userId, {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    });

    // Update last active
    rbacService.updateLastActive(userId);

    // Check permission
    const result = rbacService.hasPermission(userId, permission);

    if (!result.allowed) {
      auditService.logDenied(userId, permission, 'config', result.reason ?? 'Permission denied', {
        channel: AUDIT_CHANNELS.TELEGRAM,
      });
      return {
        allowed: false,
        reason: result.reason ?? 'Permission denied',
        userLevel: result.userLevel,
      };
    }

    return {
      allowed: true,
      userLevel: result.userLevel,
      requiresApproval: result.requiresApproval,
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminContext {
  rbacService: RBACService;
  auditService: AuditService;
  rateLimiter: RateLimiter;
  checkPermission: ReturnType<typeof createPermissionMiddleware>;
}

/**
 * Create admin context with all necessary services
 */
export function createAdminContext(db: Database): AdminContext {
  // Import dynamically to avoid circular deps
  const { getRBACService } = require('./rbac-service');
  const { getAuditService } = require('./audit-service');

  const rbacService = getRBACService(db);
  const auditService = getAuditService(db);
  const rateLimiter = new RateLimiter(db);
  const checkPermission = createPermissionMiddleware(rbacService, auditService, rateLimiter);

  return {
    rbacService,
    auditService,
    rateLimiter,
    checkPermission,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format user mention for Telegram
 */
export function formatUserMention(userId: number, username?: string): string {
  if (username) {
    return `@${username}`;
  }
  return `[User ${userId}](tg://user?id=${userId})`;
}

/**
 * Format role level badge
 */
export function formatRoleBadge(level: RoleLevel): string {
  switch (level) {
    case ROLE_LEVELS.OWNER: return '👑 Owner';
    case ROLE_LEVELS.SUPER_ADMIN: return '⭐ Super Admin';
    case ROLE_LEVELS.ADMIN: return '🔷 Admin';
    case ROLE_LEVELS.MODERATOR: return '🔹 Moderator';
    case ROLE_LEVELS.USER: return '👤 User';
    default: return '❓ Unknown';
  }
}

/**
 * Format permission result for user display
 */
export function formatPermissionDenied(result: MiddlewareResult): string {
  const lines = ['❌ *Permission Denied*', ''];

  if (result.reason) {
    lines.push(result.reason);
  }

  if (result.userLevel !== undefined) {
    lines.push(`Your level: ${formatRoleBadge(result.userLevel)}`);
  }

  return lines.join('\n');
}

/**
 * Parse command arguments from text
 */
export function parseCommandArgs(text: string): { command: string; args: string[] } {
  const parts = text.trim().split(/\s+/);
  const command = parts[0]?.replace(/^\//, '') ?? '';
  const args = parts.slice(1);
  return { command, args };
}

/**
 * Extract user ID from mention or numeric string
 */
export function extractUserId(input: string): number | null {
  // Direct numeric ID
  const numericMatch = input.match(/^(\d+)$/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }

  // @username - return null, needs lookup
  if (input.startsWith('@')) {
    return null;
  }

  // tg://user?id=123 format
  const tgMatch = input.match(/tg:\/\/user\?id=(\d+)/);
  if (tgMatch) {
    return parseInt(tgMatch[1], 10);
  }

  return null;
}
