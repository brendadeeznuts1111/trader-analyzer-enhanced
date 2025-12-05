/**
 * Enterprise Admin System - Telegram Command Handlers
 * Admin commands for Telegram bot control
 *
 * [#REF:TG-CMDS-HEX:0x54474D44]
 */

import { Context, Markup } from 'telegraf';
import { RBACService } from './rbac-service';
import { AuditService } from './audit-service';
import {
  RateLimiter,
  createPermissionMiddleware,
  formatUserMention,
  formatRoleBadge,
  formatPermissionDenied,
  extractUserId,
} from './command-middleware';
import {
  AUDIT_CHANNELS,
  ROLE_LEVELS,
  type RoleLevel,
  type AuditLogEntry,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export class AdminCommandHandler {
  private rbacService: RBACService;
  private auditService: AuditService;
  private rateLimiter: RateLimiter;
  private checkPermission: ReturnType<typeof createPermissionMiddleware>;

  constructor(
    rbacService: RBACService,
    auditService: AuditService,
    rateLimiter: RateLimiter
  ) {
    this.rbacService = rbacService;
    this.auditService = auditService;
    this.rateLimiter = rateLimiter;
    this.checkPermission = createPermissionMiddleware(
      rbacService,
      auditService,
      rateLimiter
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /admin status - Show admin panel overview
   */
  async handleAdminStatus(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'admin.access');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const userContext = this.rbacService.getUserContext(userId, ctx.from?.username);
    const pendingApprovals = this.countPendingApprovals();
    const recentActions = this.auditService.countLogs({
      fromTimestamp: Math.floor(Date.now() / 1000) - 86400,
    });

    const lines = [
      '🔐 *Admin Panel*',
      '',
      `👤 *Your Role:* ${formatRoleBadge(userContext.effectiveLevel)}`,
      `🔑 *Permissions:* ${userContext.permissions.length} active`,
      '',
      '📊 *System Stats:*',
      `├ Pending Approvals: ${pendingApprovals}`,
      `├ Actions (24h): ${recentActions}`,
      `└ Your Level: ${userContext.effectiveLevel}`,
      '',
      '*Quick Commands:*',
      '/admin users - View user list',
      '/admin audit - Recent audit logs',
      '/admin roles - View all roles',
    ];

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('👥 Users', 'admin_users'),
        Markup.button.callback('📜 Audit', 'admin_audit'),
      ],
      [
        Markup.button.callback('✅ Approvals', 'admin_approvals'),
        Markup.button.callback('🔐 Roles', 'admin_roles'),
      ],
    ]);

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', ...keyboard });

    this.auditService.logSuccess(userId, 'admin.view_status', 'config', {
      channel: AUDIT_CHANNELS.TELEGRAM,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /admin users - List users with roles
   */
  async handleAdminUsers(ctx: Context, page = 0): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'users.view');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const pageSize = 10;
    const users = this.rbacService.getUsersAtLevel(ROLE_LEVELS.USER);
    const totalPages = Math.ceil(users.length / pageSize);
    const pageUsers = users.slice(page * pageSize, (page + 1) * pageSize);

    const lines = [
      '👥 *User Management*',
      `Page ${page + 1}/${totalPages || 1}`,
      '',
    ];

    if (pageUsers.length === 0) {
      lines.push('_No users found_');
    } else {
      for (const user of pageUsers) {
        const badge = formatRoleBadge(user.effectiveLevel as RoleLevel);
        const username = user.username ? `@${user.username}` : `ID: ${user.userId}`;
        lines.push(`${badge} ${username}`);
      }
    }

    const buttons: any[][] = [];

    // Pagination buttons
    if (totalPages > 1) {
      const navButtons = [];
      if (page > 0) {
        navButtons.push(Markup.button.callback('◀️ Prev', `admin_users_${page - 1}`));
      }
      if (page < totalPages - 1) {
        navButtons.push(Markup.button.callback('Next ▶️', `admin_users_${page + 1}`));
      }
      buttons.push(navButtons);
    }

    buttons.push([Markup.button.callback('🔙 Back', 'admin_status')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', ...keyboard });

    this.auditService.logSuccess(userId, 'users.view', 'users', {
      channel: AUDIT_CHANNELS.TELEGRAM,
      metadata: { page },
    });
  }

  /**
   * /role assign <userId> <roleName> - Assign role to user
   */
  async handleRoleAssign(ctx: Context, args: string[]): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (args.length < 2) {
      await ctx.reply(
        '❌ Usage: /role assign <user_id> <role_name>\n' +
        'Example: /role assign 123456789 admin'
      );
      return;
    }

    const [targetInput, roleName] = args;
    const targetId = extractUserId(targetInput);

    if (!targetId) {
      await ctx.reply('❌ Invalid user ID. Use numeric ID.');
      return;
    }

    // Check permission based on role being assigned
    const role = this.rbacService.getRoleByName(roleName);
    if (!role) {
      await ctx.reply(`❌ Role '${roleName}' not found. Use /admin roles to see available roles.`);
      return;
    }

    const permission = role.level >= ROLE_LEVELS.ADMIN ? 'users.assign_admin' : 'users.assign_roles';
    const result = await this.checkPermission(ctx, permission, 'role.assign');

    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    // Perform assignment
    const assignResult = this.rbacService.assignRoleByName(targetId, roleName, userId);

    if (!assignResult.success) {
      await ctx.reply(`❌ Failed to assign role: ${assignResult.error}`);
      this.auditService.logFailure(userId, 'users.assign_roles', 'users', assignResult.error ?? 'Unknown error', {
        resourceId: targetId.toString(),
        channel: AUDIT_CHANNELS.TELEGRAM,
      });
      return;
    }

    await ctx.reply(
      `✅ *Role Assigned*\n\n` +
      `User: ${targetId}\n` +
      `Role: ${formatRoleBadge(role.level as RoleLevel)}`,
      { parse_mode: 'Markdown' }
    );

    this.auditService.logSuccess(userId, 'users.assign_roles', 'users', {
      resourceId: targetId.toString(),
      channel: AUDIT_CHANNELS.TELEGRAM,
      afterState: { role: roleName },
    });
  }

  /**
   * /role revoke <userId> <roleName> - Revoke role from user
   */
  async handleRoleRevoke(ctx: Context, args: string[]): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (args.length < 2) {
      await ctx.reply(
        '❌ Usage: /role revoke <user_id> <role_name>\n' +
        'Example: /role revoke 123456789 admin'
      );
      return;
    }

    const [targetInput, roleName] = args;
    const targetId = extractUserId(targetInput);

    if (!targetId) {
      await ctx.reply('❌ Invalid user ID. Use numeric ID.');
      return;
    }

    const result = await this.checkPermission(ctx, 'users.assign_roles', 'role.revoke');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const revokeResult = this.rbacService.revokeRoleByName(targetId, roleName, userId);

    if (!revokeResult.success) {
      await ctx.reply(`❌ Failed to revoke role: ${revokeResult.error}`);
      this.auditService.logFailure(userId, 'users.revoke_role', 'users', revokeResult.error ?? 'Unknown error', {
        resourceId: targetId.toString(),
        channel: AUDIT_CHANNELS.TELEGRAM,
      });
      return;
    }

    await ctx.reply(
      `✅ *Role Revoked*\n\n` +
      `User: ${targetId}\n` +
      `Role: ${roleName}`,
      { parse_mode: 'Markdown' }
    );

    this.auditService.logSuccess(userId, 'users.revoke_role', 'users', {
      resourceId: targetId.toString(),
      channel: AUDIT_CHANNELS.TELEGRAM,
      beforeState: { role: roleName },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER RESTRICTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /restrict <userId> [reason] - Restrict a user (set to user level)
   */
  async handleRestrict(ctx: Context, args: string[]): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (args.length < 1) {
      await ctx.reply('❌ Usage: /restrict <user_id> [reason]');
      return;
    }

    const targetId = extractUserId(args[0]);
    if (!targetId) {
      await ctx.reply('❌ Invalid user ID.');
      return;
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const result = await this.checkPermission(ctx, 'users.ban', 'user.ban');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    // Check if can manage target
    if (!this.rbacService.canManageUser(userId, targetId)) {
      await ctx.reply('❌ Cannot restrict a user with equal or higher level.');
      return;
    }

    // Remove all roles except 'user'
    const targetRoles = this.rbacService.getUserRoles(targetId);
    for (const role of targetRoles) {
      if (role.name !== 'user') {
        this.rbacService.revokeRole(targetId, role.id, userId);
      }
    }

    await ctx.reply(
      `⚠️ *User Restricted*\n\n` +
      `User: ${targetId}\n` +
      `Reason: ${reason}\n` +
      `All elevated roles have been removed.`,
      { parse_mode: 'Markdown' }
    );

    this.auditService.logSuccess(userId, 'users.restrict', 'users', {
      resourceId: targetId.toString(),
      channel: AUDIT_CHANNELS.TELEGRAM,
      metadata: { reason },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /audit recent [n] - Show recent audit logs
   */
  async handleAuditRecent(ctx: Context, limit = 10): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'audit.view', 'audit.query');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const logs = this.auditService.getRecentLogs(Math.min(limit, 20));

    const lines = ['📜 *Recent Audit Logs*', ''];

    if (logs.length === 0) {
      lines.push('_No recent activity_');
    } else {
      for (const log of logs) {
        const time = new Date(log.timestamp * 1000).toLocaleTimeString();
        const statusEmoji = this.getStatusEmoji(log.status);
        lines.push(`${statusEmoji} \`${time}\` ${log.action}`);
        lines.push(`   User: ${log.userId} | ${log.channel}`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });

    this.auditService.logSuccess(userId, 'audit.view', 'audit', {
      channel: AUDIT_CHANNELS.TELEGRAM,
    });
  }

  /**
   * /audit user <userId> - Show audit logs for specific user
   */
  async handleAuditUser(ctx: Context, targetId: number): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'audit.view', 'audit.query');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const logs = this.auditService.getUserLogs(targetId, 15);

    const lines = [`📜 *Audit Logs for User ${targetId}*`, ''];

    if (logs.length === 0) {
      lines.push('_No activity found_');
    } else {
      for (const log of logs) {
        const time = new Date(log.timestamp * 1000).toLocaleString();
        const statusEmoji = this.getStatusEmoji(log.status);
        lines.push(`${statusEmoji} ${log.action}`);
        lines.push(`   ${time}`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /admin roles - Show all available roles
   */
  async handleAdminRoles(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'admin.access');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const roles = this.rbacService.getAllRoles();

    const lines = ['🔐 *Available Roles*', ''];

    for (const role of roles) {
      const badge = formatRoleBadge(role.level as RoleLevel);
      lines.push(`${badge}`);
      lines.push(`├ Name: \`${role.name}\``);
      lines.push(`├ Level: ${role.level}`);
      lines.push(`└ ${role.description}`);
      lines.push('');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MY INFO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /myinfo - Show current user's admin info
   */
  async handleMyInfo(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Ensure user exists
    this.rbacService.getOrCreateUser(userId, {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    });

    const userContext = this.rbacService.getUserContext(userId, ctx.from?.username);
    const roles = this.rbacService.getUserRoles(userId);

    const lines = [
      '👤 *Your Admin Profile*',
      '',
      `ID: \`${userId}\``,
      `Username: ${ctx.from?.username ? `@${ctx.from.username}` : '_not set_'}`,
      `Level: ${formatRoleBadge(userContext.effectiveLevel)}`,
      '',
      '*Your Roles:*',
    ];

    if (roles.length === 0) {
      lines.push('_No roles assigned_');
    } else {
      for (const role of roles) {
        lines.push(`• ${role.displayName} (level ${role.level})`);
      }
    }

    lines.push('', `*Permissions:* ${userContext.permissions.length} active`);

    // Show some key permissions
    const keyPerms = ['trades.execute', 'users.view', 'audit.view', 'admin.access'];
    const activeKeyPerms = keyPerms.filter(p => userContext.permissions.includes(p));
    if (activeKeyPerms.length > 0) {
      lines.push(`Key: ${activeKeyPerms.join(', ')}`);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND ROUTER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Route admin commands to appropriate handlers
   */
  async routeCommand(ctx: Context, command: string, args: string[]): Promise<boolean> {
    switch (command) {
      case 'admin':
        return this.handleAdminSubcommand(ctx, args);

      case 'role':
        return this.handleRoleSubcommand(ctx, args);

      case 'audit':
        return this.handleAuditSubcommand(ctx, args);

      case 'restrict':
        await this.handleRestrict(ctx, args);
        return true;

      case 'myinfo':
        await this.handleMyInfo(ctx);
        return true;

      default:
        return false;
    }
  }

  private async handleAdminSubcommand(ctx: Context, args: string[]): Promise<boolean> {
    const subcommand = args[0]?.toLowerCase() || 'status';

    switch (subcommand) {
      case 'status':
        await this.handleAdminStatus(ctx);
        return true;

      case 'users':
        const page = parseInt(args[1] || '0', 10);
        await this.handleAdminUsers(ctx, page);
        return true;

      case 'roles':
        await this.handleAdminRoles(ctx);
        return true;

      case 'audit':
        const limit = parseInt(args[1] || '10', 10);
        await this.handleAuditRecent(ctx, limit);
        return true;

      default:
        await ctx.reply(
          '❓ Unknown admin command. Available:\n' +
          '/admin status - Overview\n' +
          '/admin users - User list\n' +
          '/admin roles - Available roles\n' +
          '/admin audit [n] - Recent logs'
        );
        return true;
    }
  }

  private async handleRoleSubcommand(ctx: Context, args: string[]): Promise<boolean> {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'assign':
        await this.handleRoleAssign(ctx, args.slice(1));
        return true;

      case 'revoke':
        await this.handleRoleRevoke(ctx, args.slice(1));
        return true;

      default:
        await ctx.reply(
          '❓ Role commands:\n' +
          '/role assign <user_id> <role> - Assign role\n' +
          '/role revoke <user_id> <role> - Revoke role'
        );
        return true;
    }
  }

  private async handleAuditSubcommand(ctx: Context, args: string[]): Promise<boolean> {
    const subcommand = args[0]?.toLowerCase() || 'recent';

    switch (subcommand) {
      case 'recent':
        const limit = parseInt(args[1] || '10', 10);
        await this.handleAuditRecent(ctx, limit);
        return true;

      case 'user':
        const targetId = extractUserId(args[1] || '');
        if (!targetId) {
          await ctx.reply('❌ Usage: /audit user <user_id>');
          return true;
        }
        await this.handleAuditUser(ctx, targetId);
        return true;

      default:
        await ctx.reply(
          '❓ Audit commands:\n' +
          '/audit recent [n] - Recent logs\n' +
          '/audit user <id> - User activity'
        );
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK QUERY HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle callback queries for admin panel
   */
  async handleCallback(ctx: Context, data: string): Promise<boolean> {
    if (data === 'admin_status') {
      await this.handleAdminStatus(ctx);
      await ctx.answerCbQuery();
      return true;
    }

    if (data === 'admin_users') {
      await this.handleAdminUsers(ctx);
      await ctx.answerCbQuery();
      return true;
    }

    if (data.startsWith('admin_users_')) {
      const page = parseInt(data.replace('admin_users_', ''), 10);
      await this.handleAdminUsers(ctx, page);
      await ctx.answerCbQuery();
      return true;
    }

    if (data === 'admin_audit') {
      await this.handleAuditRecent(ctx);
      await ctx.answerCbQuery();
      return true;
    }

    if (data === 'admin_roles') {
      await this.handleAdminRoles(ctx);
      await ctx.answerCbQuery();
      return true;
    }

    if (data === 'admin_approvals') {
      // TODO: Implement approvals list
      await ctx.answerCbQuery('Approvals coming soon');
      return true;
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'denied': return '🚫';
      default: return '❓';
    }
  }

  private countPendingApprovals(): number {
    // TODO: Implement with approval service
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

import { Database } from 'bun:sqlite';
import { getRBACService } from './rbac-service';
import { getAuditService } from './audit-service';

/**
 * Create admin command handler with all dependencies
 */
export function createAdminCommandHandler(db: Database): AdminCommandHandler {
  const rbacService = getRBACService(db);
  const auditService = getAuditService(db);
  const rateLimiter = new RateLimiter(db);

  return new AdminCommandHandler(rbacService, auditService, rateLimiter);
}
