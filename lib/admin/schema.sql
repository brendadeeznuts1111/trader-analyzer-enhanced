-- ═══════════════════════════════════════════════════════════════════════════
-- Enterprise Admin System - Database Schema
-- Multi-tier RBAC, Audit Logging, and Approval Workflows
--
-- [#REF:ADMIN-SCHEMA-HEX:0x41444D53]
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,                    -- UUID v5 for consistency
  name TEXT NOT NULL UNIQUE,              -- owner, super_admin, admin, moderator, user
  display_name TEXT NOT NULL,             -- Human-readable name
  level INTEGER NOT NULL,                 -- Hierarchy: 100=owner, 80=super_admin, 60=admin, 40=moderator, 20=user
  description TEXT,
  is_system_role INTEGER DEFAULT 0,       -- System roles cannot be deleted
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_level ON admin_roles(level DESC);
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- e.g., trades.view, trades.execute, config.modify
  category TEXT NOT NULL,                 -- view, manage, execute, configure, approve
  resource TEXT NOT NULL,                 -- trades, users, config, bot, reports, approvals, audit, topics
  description TEXT,
  risk_level TEXT DEFAULT 'low',          -- low, medium, high, critical
  min_level INTEGER NOT NULL DEFAULT 20,  -- Minimum role level required
  requires_approval INTEGER DEFAULT 0,    -- Whether this action requires approval workflow
  approval_threshold TEXT,                -- Optional threshold for approval (e.g., '>1000')
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_name ON admin_permissions(name);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource ON admin_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_min_level ON admin_permissions(min_level);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLE_PERMISSIONS TABLE (Many-to-Many)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  granted_by INTEGER,                     -- Telegram user ID who granted this permission
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_role ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission ON admin_role_permissions(permission_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- USER_ROLES TABLE (Users can have multiple roles)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id INTEGER NOT NULL,               -- Telegram user ID
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assigned_by INTEGER,                    -- Telegram user ID who assigned role
  expires_at INTEGER,                     -- Optional expiration for temporary roles
  is_active INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON admin_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_active ON admin_user_roles(is_active, user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_expires ON admin_user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN_USERS TABLE (Extended user profiles for admins)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_users (
  user_id INTEGER PRIMARY KEY,            -- Telegram user ID
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  effective_level INTEGER NOT NULL DEFAULT 20,  -- Computed highest role level
  is_verified INTEGER DEFAULT 0,          -- 2FA or additional verification completed
  last_active_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT                           -- JSON for additional user metadata
);

CREATE INDEX IF NOT EXISTS idx_admin_users_level ON admin_users(effective_level DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(last_active_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT_LOGS TABLE (Comprehensive action logging)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,                    -- UUID
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER NOT NULL,               -- Who performed the action
  action TEXT NOT NULL,                   -- Action type (e.g., trade.execute, config.update)
  resource_type TEXT NOT NULL,            -- trades, users, config, bot, approvals, etc.
  resource_id TEXT,                       -- ID of affected resource
  category TEXT NOT NULL,                 -- view, manage, execute, configure, approve
  status TEXT NOT NULL DEFAULT 'success', -- success, failed, pending, denied
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,                        -- Links to X-Request-Id header
  channel TEXT NOT NULL,                  -- telegram, web, api, system
  before_state TEXT,                      -- JSON of state before action
  after_state TEXT,                       -- JSON of state after action
  metadata TEXT,                          -- Additional JSON metadata
  error_message TEXT,                     -- If status is failed
  duration_ms INTEGER,                    -- How long the action took
  approval_id TEXT,                       -- If action required approval
  session_id TEXT                         -- Session tracking
);

-- Optimized indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON admin_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON admin_audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON admin_audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_time ON admin_audit_logs(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_channel ON admin_audit_logs(channel, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON admin_audit_logs(request_id) WHERE request_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- APPROVAL_QUEUE TABLE (Multi-stage approval workflow)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_approval_queue (
  id TEXT PRIMARY KEY,                    -- UUID
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  requester_id INTEGER NOT NULL,          -- User requesting approval
  action TEXT NOT NULL,                   -- Action requiring approval
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  action_payload TEXT NOT NULL,           -- JSON of the requested action
  reason TEXT,                            -- Requester's reason for action
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired, cancelled
  priority TEXT DEFAULT 'normal',         -- low, normal, high, urgent
  required_approvers INTEGER DEFAULT 1,   -- Number of approvals needed
  current_approvals INTEGER DEFAULT 0,
  expires_at INTEGER,                     -- When approval request expires
  escalation_level INTEGER DEFAULT 0,     -- Current escalation level
  escalated_at INTEGER,                   -- When last escalated
  resolved_at INTEGER,                    -- When finally resolved
  resolved_by INTEGER,                    -- User who approved/rejected
  rejection_reason TEXT,
  notification_sent INTEGER DEFAULT 0,    -- Whether notification was sent
  thread_id INTEGER,                      -- Telegram thread for discussion
  metadata TEXT                           -- Additional JSON metadata
);

CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON admin_approval_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_queue_requester ON admin_approval_queue(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_queue_expires ON admin_approval_queue(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approval_queue_priority ON admin_approval_queue(priority, created_at DESC) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- APPROVAL_VOTES TABLE (Individual approval votes)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_approval_votes (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL REFERENCES admin_approval_queue(id) ON DELETE CASCADE,
  voter_id INTEGER NOT NULL,
  vote TEXT NOT NULL,                     -- approve, reject, abstain
  comment TEXT,
  voted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  voter_level INTEGER NOT NULL,           -- Role level at time of vote
  UNIQUE(approval_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_votes_approval ON admin_approval_votes(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_votes_voter ON admin_approval_votes(voter_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN_SESSIONS TABLE (Web dashboard sessions)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,                    -- Session token
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  auth_method TEXT NOT NULL,              -- telegram_webapp, telegram_login, api_key
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_activity ON admin_sessions(last_activity_at DESC) WHERE is_active = 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- RATE_LIMITS TABLE (Per-user action rate limiting)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_rate_limits (
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON admin_rate_limits(user_id, action);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DEFAULT ROLES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO admin_roles (id, name, display_name, level, description, is_system_role) VALUES
  ('role-owner-001', 'owner', 'Owner', 100, 'Full system access', 1),
  ('role-super-admin-001', 'super_admin', 'Super Admin', 80, 'Can manage admins and all config', 1),
  ('role-admin-001', 'admin', 'Admin', 60, 'Can manage users and execute trades', 1),
  ('role-moderator-001', 'moderator', 'Moderator', 40, 'Can moderate content and view logs', 1),
  ('role-user-001', 'user', 'User', 20, 'Basic trading access', 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DEFAULT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO admin_permissions (id, name, category, resource, description, risk_level, min_level, requires_approval) VALUES
  -- Trades
  ('perm-trades-view', 'trades.view', 'view', 'trades', 'View own trades', 'low', 20, 0),
  ('perm-trades-view-all', 'trades.view_all', 'view', 'trades', 'View all trades', 'low', 40, 0),
  ('perm-trades-execute', 'trades.execute', 'execute', 'trades', 'Execute trades', 'medium', 20, 0),
  ('perm-trades-execute-large', 'trades.execute_large', 'execute', 'trades', 'Execute large trades (>$1000)', 'high', 60, 1),
  ('perm-trades-cancel', 'trades.cancel', 'execute', 'trades', 'Cancel own trades', 'low', 20, 0),
  ('perm-trades-cancel-any', 'trades.cancel_any', 'execute', 'trades', 'Cancel any trade', 'high', 80, 1),

  -- Users
  ('perm-users-view', 'users.view', 'view', 'users', 'View user list', 'low', 40, 0),
  ('perm-users-manage', 'users.manage', 'manage', 'users', 'Manage user profiles', 'medium', 60, 0),
  ('perm-users-ban', 'users.ban', 'manage', 'users', 'Ban/restrict users', 'medium', 40, 0),
  ('perm-users-assign-roles', 'users.assign_roles', 'manage', 'users', 'Assign roles to users', 'high', 80, 0),
  ('perm-users-assign-admin', 'users.assign_admin', 'manage', 'users', 'Assign admin roles', 'critical', 100, 1),

  -- Config
  ('perm-config-view', 'config.view', 'view', 'config', 'View configuration', 'low', 60, 0),
  ('perm-config-modify', 'config.modify', 'configure', 'config', 'Modify configuration', 'high', 80, 1),
  ('perm-config-modify-critical', 'config.modify_critical', 'configure', 'config', 'Modify critical config', 'critical', 100, 1),

  -- Bot
  ('perm-bot-view', 'bot.view_status', 'view', 'bot', 'View bot status', 'low', 20, 0),
  ('perm-bot-start', 'bot.start', 'execute', 'bot', 'Start trading bot', 'medium', 60, 0),
  ('perm-bot-stop', 'bot.stop', 'execute', 'bot', 'Stop trading bot', 'high', 60, 1),
  ('perm-bot-configure', 'bot.configure', 'configure', 'bot', 'Configure bot settings', 'high', 80, 1),

  -- Reports
  ('perm-reports-view', 'reports.view', 'view', 'reports', 'View reports', 'low', 40, 0),
  ('perm-reports-export', 'reports.export', 'manage', 'reports', 'Export reports', 'medium', 60, 0),

  -- Approvals
  ('perm-approvals-view', 'approvals.view', 'view', 'approvals', 'View approval queue', 'low', 40, 0),
  ('perm-approvals-vote', 'approvals.vote', 'approve', 'approvals', 'Vote on approvals', 'medium', 60, 0),
  ('perm-approvals-override', 'approvals.override', 'approve', 'approvals', 'Override approval decisions', 'high', 80, 0),

  -- Audit
  ('perm-audit-view', 'audit.view', 'view', 'audit', 'View audit logs', 'low', 40, 0),
  ('perm-audit-export', 'audit.export', 'manage', 'audit', 'Export audit logs', 'medium', 80, 0),

  -- Topics
  ('perm-topics-view', 'topics.view', 'view', 'topics', 'View topics', 'low', 20, 0),
  ('perm-topics-manage', 'topics.manage', 'manage', 'topics', 'Manage topics', 'medium', 40, 0),
  ('perm-topics-delete', 'topics.delete', 'manage', 'topics', 'Delete topics', 'high', 60, 0),

  -- Admin access
  ('perm-admin-access', 'admin.access', 'view', 'config', 'Access admin panel', 'low', 40, 0);
