/**
 * Enterprise Admin System - RBAC Service
 * Role-Based Access Control with Permission Inheritance
 *
 * [#REF:RBAC-SERVICE-HEX:0x52424143]
 */

import { Database } from 'bun:sqlite';
import {
  type Role,
  type Permission,
  type UserRole,
  type AdminUser,
  type RoleLevel,
  type PermissionCheckResult,
  type UserContext,
  ROLE_LEVELS,
  PERMISSION_DEFINITIONS,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// RBAC SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class RBACService {
  private db: Database;
  private permissionCache: Map<string, Permission> = new Map();
  private roleCache: Map<string, Role> = new Map();
  private userPermissionCache: Map<number, Set<string>> = new Map();
  private cacheExpiry = 60000; // 1 minute cache
  private lastCacheRefresh = 0;

  // Prepared statements for performance
  private stmtGetUserRoles!: ReturnType<Database['prepare']>;
  private stmtGetRolePermissions!: ReturnType<Database['prepare']>;
  private stmtGetUserEffectiveLevel!: ReturnType<Database['prepare']>;
  private stmtGetPermissionByName!: ReturnType<Database['prepare']>;
  private stmtAssignRole!: ReturnType<Database['prepare']>;
  private stmtRevokeRole!: ReturnType<Database['prepare']>;
  private stmtGetAdminUser!: ReturnType<Database['prepare']>;
  private stmtUpsertAdminUser!: ReturnType<Database['prepare']>;
  private stmtUpdateUserLevel!: ReturnType<Database['prepare']>;
  private stmtGetAllRoles!: ReturnType<Database['prepare']>;
  private stmtGetRoleByName!: ReturnType<Database['prepare']>;

  constructor(db: Database) {
    this.db = db;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    // Get all roles assigned to a user
    this.stmtGetUserRoles = this.db.prepare(`
      SELECT r.* FROM admin_roles r
      JOIN admin_user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND ur.is_active = 1
      AND (ur.expires_at IS NULL OR ur.expires_at > unixepoch())
      ORDER BY r.level DESC
    `);

    // Get all permissions for a role
    this.stmtGetRolePermissions = this.db.prepare(`
      SELECT p.* FROM admin_permissions p
      JOIN admin_role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `);

    // Get user's effective (highest) role level
    this.stmtGetUserEffectiveLevel = this.db.prepare(`
      SELECT MAX(r.level) as effective_level FROM admin_roles r
      JOIN admin_user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND ur.is_active = 1
      AND (ur.expires_at IS NULL OR ur.expires_at > unixepoch())
    `);

    // Get permission by name
    this.stmtGetPermissionByName = this.db.prepare(`
      SELECT * FROM admin_permissions WHERE name = ?
    `);

    // Assign role to user
    this.stmtAssignRole = this.db.prepare(`
      INSERT INTO admin_user_roles (user_id, role_id, assigned_by, expires_at, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, role_id) DO UPDATE SET
        assigned_at = unixepoch(),
        assigned_by = excluded.assigned_by,
        expires_at = excluded.expires_at,
        is_active = 1
    `);

    // Revoke role from user
    this.stmtRevokeRole = this.db.prepare(`
      UPDATE admin_user_roles SET is_active = 0
      WHERE user_id = ? AND role_id = ?
    `);

    // Get admin user
    this.stmtGetAdminUser = this.db.prepare(`
      SELECT * FROM admin_users WHERE user_id = ?
    `);

    // Upsert admin user
    this.stmtUpsertAdminUser = this.db.prepare(`
      INSERT INTO admin_users (user_id, username, first_name, last_name, effective_level, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        effective_level = excluded.effective_level,
        updated_at = unixepoch(),
        metadata = excluded.metadata
    `);

    // Update user's effective level
    this.stmtUpdateUserLevel = this.db.prepare(`
      UPDATE admin_users SET effective_level = ?, updated_at = unixepoch()
      WHERE user_id = ?
    `);

    // Get all roles
    this.stmtGetAllRoles = this.db.prepare(`
      SELECT * FROM admin_roles ORDER BY level DESC
    `);

    // Get role by name
    this.stmtGetRoleByName = this.db.prepare(`
      SELECT * FROM admin_roles WHERE name = ?
    `);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION CHECKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if a user has a specific permission
   * Uses level-based inheritance: higher level roles inherit lower level permissions
   */
  hasPermission(userId: number, permissionName: string): PermissionCheckResult {
    const userLevel = this.getEffectiveLevel(userId);

    // Check permission definition
    const permDef = PERMISSION_DEFINITIONS.find(p => p.name === permissionName);
    if (!permDef) {
      return {
        allowed: false,
        reason: `Unknown permission: ${permissionName}`,
        userLevel,
      };
    }

    // Level-based check with inheritance
    if (userLevel >= permDef.minLevel) {
      return {
        allowed: true,
        requiresApproval: permDef.requiresApproval,
        userLevel,
        requiredLevel: permDef.minLevel as RoleLevel,
      };
    }

    return {
      allowed: false,
      reason: `Insufficient permission level (have: ${userLevel}, need: ${permDef.minLevel})`,
      userLevel,
      requiredLevel: permDef.minLevel as RoleLevel,
    };
  }

  /**
   * Check multiple permissions at once
   */
  hasAllPermissions(userId: number, permissionNames: string[]): PermissionCheckResult {
    for (const perm of permissionNames) {
      const result = this.hasPermission(userId, perm);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  /**
   * Check if user has any of the given permissions
   */
  hasAnyPermission(userId: number, permissionNames: string[]): PermissionCheckResult {
    for (const perm of permissionNames) {
      const result = this.hasPermission(userId, perm);
      if (result.allowed) {
        return result;
      }
    }
    return {
      allowed: false,
      reason: `None of the required permissions found`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER LEVEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the effective (highest) role level for a user
   */
  getEffectiveLevel(userId: number): RoleLevel {
    const result = this.stmtGetUserEffectiveLevel.get(userId) as { effective_level: number | null } | undefined;
    return (result?.effective_level ?? ROLE_LEVELS.USER) as RoleLevel;
  }

  /**
   * Get all roles assigned to a user
   */
  getUserRoles(userId: number): Role[] {
    return this.stmtGetUserRoles.all(userId) as Role[];
  }

  /**
   * Get all permissions a user has based on their roles
   */
  getUserPermissions(userId: number): string[] {
    const userLevel = this.getEffectiveLevel(userId);

    // Return all permissions where user's level meets minimum requirement
    return PERMISSION_DEFINITIONS
      .filter(p => userLevel >= p.minLevel)
      .map(p => p.name);
  }

  /**
   * Build complete user context for session
   */
  getUserContext(userId: number, username?: string): UserContext {
    const roles = this.getUserRoles(userId);
    const effectiveLevel = this.getEffectiveLevel(userId);
    const permissions = this.getUserPermissions(userId);

    return {
      userId,
      username,
      effectiveLevel,
      roles: roles.map(r => r.name),
      permissions,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Assign a role to a user
   * Returns success status and any error message
   */
  assignRole(
    userId: number,
    roleId: string,
    assignedBy: number,
    expiresAt?: number
  ): { success: boolean; error?: string } {
    try {
      // Check if assigner has permission to assign roles
      const assignerLevel = this.getEffectiveLevel(assignedBy);

      // Get the role being assigned
      const role = this.db.prepare('SELECT * FROM admin_roles WHERE id = ?').get(roleId) as Role | undefined;
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      // Can only assign roles below your own level
      if (role.level >= assignerLevel && assignedBy !== userId) {
        return {
          success: false,
          error: `Cannot assign role at or above your level (role: ${role.level}, your level: ${assignerLevel})`
        };
      }

      // Special check for admin roles
      if (role.level >= ROLE_LEVELS.ADMIN) {
        const canAssign = this.hasPermission(assignedBy, 'users.assign_admin');
        if (!canAssign.allowed) {
          return { success: false, error: 'Cannot assign admin roles without users.assign_admin permission' };
        }
      }

      // Assign the role
      this.stmtAssignRole.run(userId, roleId, assignedBy, expiresAt ?? null);

      // Update user's effective level
      this.updateUserEffectiveLevel(userId);

      // Clear cache
      this.userPermissionCache.delete(userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Assign role by name instead of ID
   */
  assignRoleByName(
    userId: number,
    roleName: string,
    assignedBy: number,
    expiresAt?: number
  ): { success: boolean; error?: string } {
    const role = this.stmtGetRoleByName.get(roleName) as Role | undefined;
    if (!role) {
      return { success: false, error: `Role '${roleName}' not found` };
    }
    return this.assignRole(userId, role.id, assignedBy, expiresAt);
  }

  /**
   * Revoke a role from a user
   */
  revokeRole(
    userId: number,
    roleId: string,
    revokedBy: number
  ): { success: boolean; error?: string } {
    try {
      // Check if revoker has permission
      const revokerLevel = this.getEffectiveLevel(revokedBy);

      // Get the role being revoked
      const role = this.db.prepare('SELECT * FROM admin_roles WHERE id = ?').get(roleId) as Role | undefined;
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      // Can only revoke roles below your own level
      if (role.level >= revokerLevel) {
        return {
          success: false,
          error: `Cannot revoke role at or above your level`
        };
      }

      // Cannot revoke system roles from owner
      if (role.isSystemRole && role.level === ROLE_LEVELS.OWNER) {
        return { success: false, error: 'Cannot revoke owner role' };
      }

      this.stmtRevokeRole.run(userId, roleId);

      // Update user's effective level
      this.updateUserEffectiveLevel(userId);

      // Clear cache
      this.userPermissionCache.delete(userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Revoke role by name
   */
  revokeRoleByName(
    userId: number,
    roleName: string,
    revokedBy: number
  ): { success: boolean; error?: string } {
    const role = this.stmtGetRoleByName.get(roleName) as Role | undefined;
    if (!role) {
      return { success: false, error: `Role '${roleName}' not found` };
    }
    return this.revokeRole(userId, role.id, revokedBy);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get or create admin user profile
   */
  getOrCreateUser(
    userId: number,
    profile?: { username?: string; firstName?: string; lastName?: string }
  ): AdminUser {
    let user = this.stmtGetAdminUser.get(userId) as AdminUser | undefined;

    if (!user) {
      // Create new user with default USER role
      const effectiveLevel = ROLE_LEVELS.USER;
      this.stmtUpsertAdminUser.run(
        userId,
        profile?.username ?? null,
        profile?.firstName ?? null,
        profile?.lastName ?? null,
        effectiveLevel,
        '{}'
      );

      // Assign default user role
      const userRole = this.stmtGetRoleByName.get('user') as Role | undefined;
      if (userRole) {
        this.stmtAssignRole.run(userId, userRole.id, userId, null);
      }

      user = this.stmtGetAdminUser.get(userId) as AdminUser;
    } else if (profile) {
      // Update existing user profile
      this.stmtUpsertAdminUser.run(
        userId,
        profile.username ?? user.username,
        profile.firstName ?? user.firstName,
        profile.lastName ?? user.lastName,
        user.effectiveLevel,
        JSON.stringify(user.metadata ?? {})
      );
    }

    return user;
  }

  /**
   * Update user's last active timestamp
   */
  updateLastActive(userId: number): void {
    this.db.prepare(`
      UPDATE admin_users SET last_active_at = unixepoch() WHERE user_id = ?
    `).run(userId);
  }

  /**
   * Recalculate and update user's effective level based on assigned roles
   */
  private updateUserEffectiveLevel(userId: number): void {
    const effectiveLevel = this.getEffectiveLevel(userId);
    this.stmtUpdateUserLevel.run(effectiveLevel, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all available roles
   */
  getAllRoles(): Role[] {
    return this.stmtGetAllRoles.all() as Role[];
  }

  /**
   * Get role by name
   */
  getRoleByName(name: string): Role | undefined {
    return this.stmtGetRoleByName.get(name) as Role | undefined;
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Role | undefined {
    return this.db.prepare('SELECT * FROM admin_roles WHERE id = ?').get(id) as Role | undefined;
  }

  /**
   * Get all users with a specific role
   */
  getUsersWithRole(roleId: string): AdminUser[] {
    return this.db.prepare(`
      SELECT u.* FROM admin_users u
      JOIN admin_user_roles ur ON u.user_id = ur.user_id
      WHERE ur.role_id = ? AND ur.is_active = 1
      AND (ur.expires_at IS NULL OR ur.expires_at > unixepoch())
      ORDER BY u.effective_level DESC
    `).all(roleId) as AdminUser[];
  }

  /**
   * Get all users at or above a certain level
   */
  getUsersAtLevel(minLevel: RoleLevel): AdminUser[] {
    return this.db.prepare(`
      SELECT * FROM admin_users
      WHERE effective_level >= ?
      ORDER BY effective_level DESC, user_id
    `).all(minLevel) as AdminUser[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get permission by name
   */
  getPermission(name: string): Permission | undefined {
    return this.stmtGetPermissionByName.get(name) as Permission | undefined;
  }

  /**
   * Get all permissions for a specific resource
   */
  getPermissionsForResource(resource: string): Permission[] {
    return this.db.prepare(`
      SELECT * FROM admin_permissions WHERE resource = ?
    `).all(resource) as Permission[];
  }

  /**
   * Get all permissions requiring approval
   */
  getApprovalRequiredPermissions(): Permission[] {
    return this.db.prepare(`
      SELECT * FROM admin_permissions WHERE requires_approval = 1
    `).all() as Permission[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL COMPARISON UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if user A can manage user B (A's level > B's level)
   */
  canManageUser(managerId: number, targetId: number): boolean {
    const managerLevel = this.getEffectiveLevel(managerId);
    const targetLevel = this.getEffectiveLevel(targetId);
    return managerLevel > targetLevel;
  }

  /**
   * Get role name for display
   */
  getLevelDisplayName(level: RoleLevel): string {
    switch (level) {
      case ROLE_LEVELS.OWNER: return 'Owner';
      case ROLE_LEVELS.SUPER_ADMIN: return 'Super Admin';
      case ROLE_LEVELS.ADMIN: return 'Admin';
      case ROLE_LEVELS.MODERATOR: return 'Moderator';
      case ROLE_LEVELS.USER: return 'User';
      default: return 'Unknown';
    }
  }

  /**
   * Check if a level is at least admin
   */
  isAdmin(level: RoleLevel): boolean {
    return level >= ROLE_LEVELS.ADMIN;
  }

  /**
   * Check if a level is at least moderator
   */
  isModerator(level: RoleLevel): boolean {
    return level >= ROLE_LEVELS.MODERATOR;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let rbacServiceInstance: RBACService | null = null;

/**
 * Get or create the RBAC service singleton
 */
export function getRBACService(db: Database): RBACService {
  if (!rbacServiceInstance) {
    rbacServiceInstance = new RBACService(db);
  }
  return rbacServiceInstance;
}

/**
 * Reset the RBAC service (for testing)
 */
export function resetRBACService(): void {
  rbacServiceInstance = null;
}
