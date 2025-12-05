/**
 * Enterprise Admin System - Approval Telegram Commands
 * Command handlers for approval workflow
 *
 * [#REF:APPROVAL-CMDS-HEX:0x41505243]
 */

import { Context, Markup } from 'telegraf';
import { ApprovalService } from './approval-service';
import { RBACService } from './rbac-service';
import { AuditService } from './audit-service';
import { RateLimiter, createPermissionMiddleware, formatRoleBadge, formatPermissionDenied } from './command-middleware';
import { AUDIT_CHANNELS, APPROVAL_STATUSES, VOTE_TYPES, type RoleLevel, type ApprovalRequest } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export class ApprovalCommandHandler {
  private approvalService: ApprovalService;
  private rbacService: RBACService;
  private auditService: AuditService;
  private rateLimiter: RateLimiter;
  private checkPermission: ReturnType<typeof createPermissionMiddleware>;

  constructor(
    approvalService: ApprovalService,
    rbacService: RBACService,
    auditService: AuditService,
    rateLimiter: RateLimiter
  ) {
    this.approvalService = approvalService;
    this.rbacService = rbacService;
    this.auditService = auditService;
    this.rateLimiter = rateLimiter;
    this.checkPermission = createPermissionMiddleware(rbacService, auditService, rateLimiter);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL LIST
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /approve list - Show pending approvals
   */
  async handleApproveList(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'approvals.view');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const pending = this.approvalService.getPendingApprovals(10);

    const lines = ['✅ *Pending Approvals*', ''];

    if (pending.length === 0) {
      lines.push('_No pending approvals_');
    } else {
      for (const approval of pending) {
        const priorityEmoji = this.getPriorityEmoji(approval.priority);
        const timeAgo = this.formatTimeAgo(approval.createdAt);
        lines.push(`${priorityEmoji} \`${approval.id.slice(0, 8)}\``);
        lines.push(`├ Action: ${approval.action}`);
        lines.push(`├ From: User ${approval.requesterId}`);
        lines.push(`├ Progress: ${approval.currentApprovals}/${approval.requiredApprovers}`);
        lines.push(`└ ${timeAgo}`);
        lines.push('');
      }
    }

    lines.push('*Commands:*');
    lines.push('/approve view <id> - View details');
    lines.push('/approve yes <id> - Approve');
    lines.push('/approve no <id> [reason] - Reject');

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });

    this.auditService.logSuccess(userId, 'approvals.view', 'approvals', {
      channel: AUDIT_CHANNELS.TELEGRAM,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /approve view <id> - View approval details
   */
  async handleApproveView(ctx: Context, approvalId: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'approvals.view');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    // Try to match partial ID
    const approval = this.findApproval(approvalId);

    if (!approval) {
      await ctx.reply('❌ Approval not found. Use /approve list to see pending approvals.');
      return;
    }

    const votes = this.approvalService.getVotes(approval.id);
    const statusEmoji = this.getStatusEmoji(approval.status);
    const priorityEmoji = this.getPriorityEmoji(approval.priority);

    const lines = [
      `${statusEmoji} *Approval Request*`,
      '',
      `ID: \`${approval.id}\``,
      `Action: \`${approval.action}\``,
      `Status: ${approval.status}`,
      `Priority: ${priorityEmoji} ${approval.priority}`,
      '',
      '*Requester:*',
      `User ID: ${approval.requesterId}`,
      approval.reason ? `Reason: ${approval.reason}` : '',
      '',
      '*Progress:*',
      `Approvals: ${approval.currentApprovals}/${approval.requiredApprovers}`,
      '',
    ];

    if (votes.length > 0) {
      lines.push('*Votes:*');
      for (const vote of votes) {
        const voteEmoji = vote.vote === 'approve' ? '✅' : vote.vote === 'reject' ? '❌' : '⏸️';
        lines.push(`${voteEmoji} User ${vote.voterId} - ${vote.vote}`);
        if (vote.comment) {
          lines.push(`   "${vote.comment}"`);
        }
      }
      lines.push('');
    }

    if (approval.expiresAt) {
      const expiresIn = approval.expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        lines.push(`⏰ Expires in: ${this.formatDuration(expiresIn)}`);
      } else {
        lines.push('⏰ *EXPIRED*');
      }
    }

    // Add action buttons if pending
    let keyboard;
    if (approval.status === APPROVAL_STATUSES.PENDING) {
      keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Approve', `approve_yes_${approval.id}`),
          Markup.button.callback('❌ Reject', `approve_no_${approval.id}`),
        ],
        [
          Markup.button.callback('⬆️ Escalate', `approve_escalate_${approval.id}`),
        ],
      ]);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', ...keyboard });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /approve yes <id> - Approve a request
   */
  async handleApproveYes(ctx: Context, approvalId: string, comment?: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'approvals.vote', 'approval.vote');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const approval = this.findApproval(approvalId);
    if (!approval) {
      await ctx.reply('❌ Approval not found.');
      return;
    }

    const voteResult = this.approvalService.vote(approval.id, userId, VOTE_TYPES.APPROVE, comment);

    if (!voteResult.success) {
      await ctx.reply(`❌ ${voteResult.error}`);
      return;
    }

    if (voteResult.resolved) {
      await ctx.reply(
        `✅ *Approval ${voteResult.newStatus}!*\n\n` +
        `Request \`${approval.id.slice(0, 8)}\` has been approved.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      const updated = this.approvalService.getApproval(approval.id);
      await ctx.reply(
        `✅ *Vote Recorded*\n\n` +
        `Progress: ${updated?.currentApprovals}/${updated?.requiredApprovers} approvals`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * /approve no <id> [reason] - Reject a request
   */
  async handleApproveNo(ctx: Context, approvalId: string, reason?: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'approvals.vote', 'approval.vote');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const approval = this.findApproval(approvalId);
    if (!approval) {
      await ctx.reply('❌ Approval not found.');
      return;
    }

    const voteResult = this.approvalService.vote(
      approval.id,
      userId,
      VOTE_TYPES.REJECT,
      reason || 'No reason provided'
    );

    if (!voteResult.success) {
      await ctx.reply(`❌ ${voteResult.error}`);
      return;
    }

    await ctx.reply(
      `❌ *Approval Rejected*\n\n` +
      `Request \`${approval.id.slice(0, 8)}\` has been rejected.` +
      (reason ? `\n\nReason: ${reason}` : ''),
      { parse_mode: 'Markdown' }
    );
  }

  /**
   * /approve escalate <id> - Escalate to next level
   */
  async handleApproveEscalate(ctx: Context, approvalId: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const result = await this.checkPermission(ctx, 'approvals.vote');
    if (!result.allowed) {
      await ctx.reply(formatPermissionDenied(result), { parse_mode: 'Markdown' });
      return;
    }

    const approval = this.findApproval(approvalId);
    if (!approval) {
      await ctx.reply('❌ Approval not found.');
      return;
    }

    const escalateResult = this.approvalService.escalateApproval(approval.id, userId);

    if (!escalateResult.success) {
      await ctx.reply(`❌ ${escalateResult.error}`);
      return;
    }

    await ctx.reply(
      `⬆️ *Approval Escalated*\n\n` +
      `Request \`${approval.id.slice(0, 8)}\` has been escalated to higher level.`,
      { parse_mode: 'Markdown' }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MY APPROVALS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * /myapprovals - Show user's own approval requests
   */
  async handleMyApprovals(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const approvals = this.approvalService.getApprovalsByRequester(userId, 10);

    const lines = ['📋 *Your Approval Requests*', ''];

    if (approvals.length === 0) {
      lines.push('_No approval requests found_');
    } else {
      for (const approval of approvals) {
        const statusEmoji = this.getStatusEmoji(approval.status);
        const timeAgo = this.formatTimeAgo(approval.createdAt);
        lines.push(`${statusEmoji} \`${approval.id.slice(0, 8)}\` - ${approval.action}`);
        lines.push(`   ${approval.status} | ${timeAgo}`);
      }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND ROUTER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Route approval commands to appropriate handlers
   */
  async routeCommand(ctx: Context, command: string, args: string[]): Promise<boolean> {
    if (command === 'myapprovals') {
      await this.handleMyApprovals(ctx);
      return true;
    }

    if (command !== 'approve') {
      return false;
    }

    const subcommand = args[0]?.toLowerCase() || 'list';

    switch (subcommand) {
      case 'list':
        await this.handleApproveList(ctx);
        return true;

      case 'view':
        if (!args[1]) {
          await ctx.reply('❌ Usage: /approve view <approval_id>');
          return true;
        }
        await this.handleApproveView(ctx, args[1]);
        return true;

      case 'yes':
        if (!args[1]) {
          await ctx.reply('❌ Usage: /approve yes <approval_id> [comment]');
          return true;
        }
        await this.handleApproveYes(ctx, args[1], args.slice(2).join(' ') || undefined);
        return true;

      case 'no':
        if (!args[1]) {
          await ctx.reply('❌ Usage: /approve no <approval_id> [reason]');
          return true;
        }
        await this.handleApproveNo(ctx, args[1], args.slice(2).join(' ') || undefined);
        return true;

      case 'escalate':
        if (!args[1]) {
          await ctx.reply('❌ Usage: /approve escalate <approval_id>');
          return true;
        }
        await this.handleApproveEscalate(ctx, args[1]);
        return true;

      default:
        await ctx.reply(
          '❓ Approval commands:\n' +
          '/approve list - Pending approvals\n' +
          '/approve view <id> - View details\n' +
          '/approve yes <id> - Approve\n' +
          '/approve no <id> [reason] - Reject\n' +
          '/approve escalate <id> - Escalate'
        );
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle callback queries for approvals
   */
  async handleCallback(ctx: Context, data: string): Promise<boolean> {
    if (data.startsWith('approve_yes_')) {
      const approvalId = data.replace('approve_yes_', '');
      await this.handleApproveYes(ctx, approvalId);
      await ctx.answerCbQuery();
      return true;
    }

    if (data.startsWith('approve_no_')) {
      const approvalId = data.replace('approve_no_', '');
      await this.handleApproveNo(ctx, approvalId);
      await ctx.answerCbQuery();
      return true;
    }

    if (data.startsWith('approve_escalate_')) {
      const approvalId = data.replace('approve_escalate_', '');
      await this.handleApproveEscalate(ctx, approvalId);
      await ctx.answerCbQuery();
      return true;
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private findApproval(idOrPartial: string): ApprovalRequest | undefined {
    // Try exact match first
    let approval = this.approvalService.getApproval(idOrPartial);
    if (approval) return approval;

    // Try partial match from pending
    const pending = this.approvalService.getPendingApprovals(100);
    approval = pending.find(a => a.id.startsWith(idOrPartial));

    return approval;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'expired': return '⏰';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

import { Database } from 'bun:sqlite';
import { getApprovalService } from './approval-service';
import { getRBACService } from './rbac-service';
import { getAuditService } from './audit-service';

/**
 * Create approval command handler with all dependencies
 */
export function createApprovalCommandHandler(db: Database): ApprovalCommandHandler {
  const approvalService = getApprovalService(db);
  const rbacService = getRBACService(db);
  const auditService = getAuditService(db);
  const rateLimiter = new RateLimiter(db);

  return new ApprovalCommandHandler(approvalService, rbacService, auditService, rateLimiter);
}
