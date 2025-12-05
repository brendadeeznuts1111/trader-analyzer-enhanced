/**
 * Enterprise Admin System - Type Definitions
 * Multi-tier RBAC, Audit Logging, and Approval Workflows
 *
 * [#REF:ADMIN-TYPES-HEX:0x41444D54]
 */

// ═══════════════════════════════════════════════════════════════════════════
// ROLE HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Role levels define the hierarchy:
 * - Higher level = more permissions
 * - Permissions inherit downward (Admin has all Moderator perms)
 */
export const ROLE_LEVELS = {
  OWNER: 100,
  SUPER_ADMIN: 80,
  ADMIN: 60,
  MODERATOR: 40,
  USER: 20,
} as const;

export type RoleLevel = typeof ROLE_LEVELS[keyof typeof ROLE_LEVELS];

export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: RoleLevel;
  description: string;
  isSystemRole: boolean;
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export const PERMISSION_CATEGORIES = {
  VIEW: 'view',
  MANAGE: 'manage',
  EXECUTE: 'execute',
  CONFIGURE: 'configure',
  APPROVE: 'approve',
} as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];

export const RESOURCES = {
  TRADES: 'trades',
  USERS: 'users',
  CONFIG: 'config',
  BOT: 'bot',
  REPORTS: 'reports',
  APPROVALS: 'approvals',
  AUDIT: 'audit',
  TOPICS: 'topics',
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];

export interface Permission {
  id: string;
  name: string;                    // e.g., 'trades.view', 'users.ban'
  category: PermissionCategory;
  resource: Resource;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  createdAt: number;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  grantedAt: number;
  grantedBy: number | null;        // Telegram user ID
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ROLES
// ═══════════════════════════════════════════════════════════════════════════

export interface UserRole {
  userId: number;                   // Telegram user ID
  roleId: string;
  assignedAt: number;
  assignedBy: number | null;
  expiresAt: number | null;         // For temporary roles
  isActive: boolean;
}

export interface AdminUser {
  userId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  effectiveLevel: RoleLevel;        // Computed highest role level
  isVerified: boolean;
  lastActiveAt: number | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

export const AUDIT_CHANNELS = {
  TELEGRAM: 'telegram',
  WEB: 'web',
  API: 'api',
  SYSTEM: 'system',
} as const;

export type AuditChannel = typeof AUDIT_CHANNELS[keyof typeof AUDIT_CHANNELS];

export const AUDIT_STATUSES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  DENIED: 'denied',
} as const;

export type AuditStatus = typeof AUDIT_STATUSES[keyof typeof AUDIT_STATUSES];

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: number;
  action: string;                   // e.g., 'trade.execute', 'user.ban'
  resourceType: Resource;
  resourceId: string | null;
  category: PermissionCategory;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;         // Links to X-Request-Id
  channel: AuditChannel;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  durationMs: number | null;
  approvalId: string | null;
  sessionId: string | null;
}

export interface AuditLogQuery {
  userId?: number;
  action?: string;
  resourceType?: Resource;
  resourceId?: string;
  status?: AuditStatus;
  channel?: AuditChannel;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

export const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type ApprovalStatus = typeof APPROVAL_STATUSES[keyof typeof APPROVAL_STATUSES];

export const APPROVAL_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type ApprovalPriority = typeof APPROVAL_PRIORITIES[keyof typeof APPROVAL_PRIORITIES];

export const VOTE_TYPES = {
  APPROVE: 'approve',
  REJECT: 'reject',
  ABSTAIN: 'abstain',
} as const;

export type VoteType = typeof VOTE_TYPES[keyof typeof VOTE_TYPES];

export interface ApprovalRequest {
  id: string;
  createdAt: number;
  requesterId: number;
  action: string;
  resourceType: Resource;
  resourceId: string | null;
  actionPayload: Record<string, unknown>;
  reason: string | null;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  requiredApprovers: number;
  currentApprovals: number;
  expiresAt: number | null;
  escalationLevel: number;
  escalatedAt: number | null;
  resolvedAt: number | null;
  resolvedBy: number | null;
  rejectionReason: string | null;
  notificationSent: boolean;
  threadId: number | null;          // Telegram thread for discussion
  metadata: Record<string, unknown> | null;
}

export interface ApprovalVote {
  id: string;
  approvalId: string;
  voterId: number;
  vote: VoteType;
  comment: string | null;
  votedAt: number;
  voterLevel: RoleLevel;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SESSIONS
// ═══════════════════════════════════════════════════════════════════════════

export const AUTH_METHODS = {
  TELEGRAM_WEBAPP: 'telegram_webapp',
  TELEGRAM_LOGIN: 'telegram_login',
  API_KEY: 'api_key',
} as const;

export type AuthMethod = typeof AUTH_METHODS[keyof typeof AUTH_METHODS];

export interface AdminSession {
  id: string;
  userId: number;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  authMethod: AuthMethod;
  metadata: Record<string, unknown> | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitEntry {
  userId: number;
  action: string;
  windowStart: number;
  count: number;
}

export interface RateLimitConfig {
  action: string;
  maxRequests: number;
  windowSeconds: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT PERMISSIONS BY ROLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Permission definitions with role level requirements
 * Used to seed the database and for runtime checks
 */
export const PERMISSION_DEFINITIONS: Array<{
  name: string;
  category: PermissionCategory;
  resource: Resource;
  description: string;
  riskLevel: RiskLevel;
  minLevel: RoleLevel;
  requiresApproval: boolean;
  approvalThreshold?: string;      // e.g., '>1000' for trades
}> = [
  // Trades
  { name: 'trades.view', category: 'view', resource: 'trades', description: 'View own trades', riskLevel: 'low', minLevel: 20, requiresApproval: false },
  { name: 'trades.view_all', category: 'view', resource: 'trades', description: 'View all trades', riskLevel: 'low', minLevel: 40, requiresApproval: false },
  { name: 'trades.execute', category: 'execute', resource: 'trades', description: 'Execute trades', riskLevel: 'medium', minLevel: 20, requiresApproval: false },
  { name: 'trades.execute_large', category: 'execute', resource: 'trades', description: 'Execute large trades (>$1000)', riskLevel: 'high', minLevel: 60, requiresApproval: true, approvalThreshold: '>1000' },
  { name: 'trades.cancel', category: 'execute', resource: 'trades', description: 'Cancel own trades', riskLevel: 'low', minLevel: 20, requiresApproval: false },
  { name: 'trades.cancel_any', category: 'execute', resource: 'trades', description: 'Cancel any trade', riskLevel: 'high', minLevel: 80, requiresApproval: true },

  // Users
  { name: 'users.view', category: 'view', resource: 'users', description: 'View user list', riskLevel: 'low', minLevel: 40, requiresApproval: false },
  { name: 'users.manage', category: 'manage', resource: 'users', description: 'Manage user profiles', riskLevel: 'medium', minLevel: 60, requiresApproval: false },
  { name: 'users.ban', category: 'manage', resource: 'users', description: 'Ban/restrict users', riskLevel: 'medium', minLevel: 40, requiresApproval: false },
  { name: 'users.assign_roles', category: 'manage', resource: 'users', description: 'Assign roles to users', riskLevel: 'high', minLevel: 80, requiresApproval: false },
  { name: 'users.assign_admin', category: 'manage', resource: 'users', description: 'Assign admin roles', riskLevel: 'critical', minLevel: 100, requiresApproval: true },

  // Config
  { name: 'config.view', category: 'view', resource: 'config', description: 'View configuration', riskLevel: 'low', minLevel: 60, requiresApproval: false },
  { name: 'config.modify', category: 'configure', resource: 'config', description: 'Modify configuration', riskLevel: 'high', minLevel: 80, requiresApproval: true },
  { name: 'config.modify_critical', category: 'configure', resource: 'config', description: 'Modify critical config', riskLevel: 'critical', minLevel: 100, requiresApproval: true },

  // Bot
  { name: 'bot.view_status', category: 'view', resource: 'bot', description: 'View bot status', riskLevel: 'low', minLevel: 20, requiresApproval: false },
  { name: 'bot.start', category: 'execute', resource: 'bot', description: 'Start trading bot', riskLevel: 'medium', minLevel: 60, requiresApproval: false },
  { name: 'bot.stop', category: 'execute', resource: 'bot', description: 'Stop trading bot', riskLevel: 'high', minLevel: 60, requiresApproval: true },
  { name: 'bot.configure', category: 'configure', resource: 'bot', description: 'Configure bot settings', riskLevel: 'high', minLevel: 80, requiresApproval: true },

  // Reports
  { name: 'reports.view', category: 'view', resource: 'reports', description: 'View reports', riskLevel: 'low', minLevel: 40, requiresApproval: false },
  { name: 'reports.export', category: 'manage', resource: 'reports', description: 'Export reports', riskLevel: 'medium', minLevel: 60, requiresApproval: false },

  // Approvals
  { name: 'approvals.view', category: 'view', resource: 'approvals', description: 'View approval queue', riskLevel: 'low', minLevel: 40, requiresApproval: false },
  { name: 'approvals.vote', category: 'approve', resource: 'approvals', description: 'Vote on approvals', riskLevel: 'medium', minLevel: 60, requiresApproval: false },
  { name: 'approvals.override', category: 'approve', resource: 'approvals', description: 'Override approval decisions', riskLevel: 'high', minLevel: 80, requiresApproval: false },

  // Audit
  { name: 'audit.view', category: 'view', resource: 'audit', description: 'View audit logs', riskLevel: 'low', minLevel: 40, requiresApproval: false },
  { name: 'audit.export', category: 'manage', resource: 'audit', description: 'Export audit logs', riskLevel: 'medium', minLevel: 80, requiresApproval: false },

  // Topics
  { name: 'topics.view', category: 'view', resource: 'topics', description: 'View topics', riskLevel: 'low', minLevel: 20, requiresApproval: false },
  { name: 'topics.manage', category: 'manage', resource: 'topics', description: 'Manage topics', riskLevel: 'medium', minLevel: 40, requiresApproval: false },
  { name: 'topics.delete', category: 'manage', resource: 'topics', description: 'Delete topics', riskLevel: 'high', minLevel: 60, requiresApproval: false },

  // Admin access
  { name: 'admin.access', category: 'view', resource: 'config', description: 'Access admin panel', riskLevel: 'low', minLevel: 40, requiresApproval: false },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT ROLES
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'owner', displayName: 'Owner', level: ROLE_LEVELS.OWNER, description: 'Full system access', isSystemRole: true },
  { name: 'super_admin', displayName: 'Super Admin', level: ROLE_LEVELS.SUPER_ADMIN, description: 'Can manage admins and all config', isSystemRole: true },
  { name: 'admin', displayName: 'Admin', level: ROLE_LEVELS.ADMIN, description: 'Can manage users and execute trades', isSystemRole: true },
  { name: 'moderator', displayName: 'Moderator', level: ROLE_LEVELS.MODERATOR, description: 'Can moderate content and view logs', isSystemRole: true },
  { name: 'user', displayName: 'User', level: ROLE_LEVELS.USER, description: 'Basic trading access', isSystemRole: true },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  userLevel?: RoleLevel;
  requiredLevel?: RoleLevel;
}

export interface UserContext {
  userId: number;
  username?: string;
  effectiveLevel: RoleLevel;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}
