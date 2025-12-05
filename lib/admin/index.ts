/**
 * Enterprise Admin System - Module Index
 * Central export point for all admin functionality
 *
 * [#REF:ADMIN-INDEX-HEX:0x41444D49]
 */

// Types and Constants
export {
  ROLE_LEVELS,
  PERMISSION_CATEGORIES,
  RESOURCES,
  RISK_LEVELS,
  AUDIT_CHANNELS,
  AUDIT_STATUSES,
  APPROVAL_STATUSES,
  APPROVAL_PRIORITIES,
  VOTE_TYPES,
  AUTH_METHODS,
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLES,
  type RoleLevel,
  type PermissionCategory,
  type Resource,
  type RiskLevel,
  type AuditChannel,
  type AuditStatus,
  type ApprovalStatus,
  type ApprovalPriority,
  type VoteType,
  type AuthMethod,
  type Role,
  type Permission,
  type RolePermission,
  type UserRole,
  type AdminUser,
  type AuditLogEntry,
  type AuditLogQuery,
  type ApprovalRequest,
  type ApprovalVote,
  type AdminSession,
  type RateLimitEntry,
  type RateLimitConfig,
  type PermissionCheckResult,
  type UserContext,
} from './types';

// RBAC Service
export {
  RBACService,
  getRBACService,
  resetRBACService,
} from './rbac-service';

// Audit Service
export {
  AuditService,
  getAuditService,
  resetAuditService,
  createAuditContext,
  withAuditLogging,
} from './audit-service';

// Command Middleware
export {
  RateLimiter,
  createPermissionMiddleware,
  createAdminContext,
  formatUserMention,
  formatRoleBadge,
  formatPermissionDenied,
  parseCommandArgs,
  extractUserId,
  type CommandContext,
  type MiddlewareResult,
  type AdminContext,
} from './command-middleware';

// Telegram Commands
export {
  AdminCommandHandler,
  createAdminCommandHandler,
} from './telegram-commands';

// Approval Service
export {
  ApprovalService,
  getApprovalService,
  resetApprovalService,
  type ApprovalConfig,
} from './approval-service';

// Approval Commands
export {
  ApprovalCommandHandler,
  createApprovalCommandHandler,
} from './approval-commands';
