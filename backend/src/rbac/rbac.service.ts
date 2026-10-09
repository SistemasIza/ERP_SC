/**
 * RBAC Service
 * Service for Role-Based Access Control
 */

import { Role, Permission, UserRole, ResourceAccess, AccessPolicy, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from './types/rbac.types';
import { EventEmitter } from 'events';

export class RBACService extends EventEmitter {
  private userRoles: Map<string, UserRole> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();
  private resourceAccess: Map<string, ResourceAccess> = new Map();

  constructor() {
    super();
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, tenantId: string, role: Role): Promise<UserRole> {
    const userRole: UserRole = {
      id: this.generateId(),
      userId,
      tenantId,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.userRoles.set(userRole.id, userRole);
    
    // TODO: Save to database
    this.emit('role.assigned', { userRole });

    return userRole;
  }

  /**
   * Get user role
   */
  getUserRole(userId: string, tenantId: string): UserRole | undefined {
    return Array.from(this.userRoles.values()).find(
      ur => ur.userId === userId && ur.tenantId === tenantId
    );
  }

  /**
   * Update user role
   */
  async updateUserRole(userRoleId: string, updates: Partial<UserRole>): Promise<UserRole | null> {
    const userRole = this.userRoles.get(userRoleId);
    if (!userRole) return null;

    const updatedRole: UserRole = {
      ...userRole,
      ...updates,
      id: userRoleId,
      updatedAt: new Date(),
    };

    this.userRoles.set(userRoleId, updatedRole);
    
    // TODO: Update in database
    this.emit('role.updated', { userRole: updatedRole });

    return updatedRole;
  }

  /**
   * Remove user role
   */
  async removeUserRole(userRoleId: string): Promise<boolean> {
    const deleted = this.userRoles.delete(userRoleId);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('role.removed', { userRoleId });
    }

    return deleted;
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, tenantId: string, permission: Permission): boolean {
    const userRole = this.getUserRole(userId, tenantId);
    if (!userRole) return false;

    // Check custom permissions first
    if (userRole.customPermissions?.includes(permission)) {
      return true;
    }

    // Check default role permissions
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userRole.role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string, tenantId: string): Permission[] {
    const userRole = this.getUserRole(userId, tenantId);
    if (!userRole) return [];

    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole.role] || [];
    const customPermissions = userRole.customPermissions || [];

    // Combine and deduplicate
    return [...new Set([...defaultPermissions, ...customPermissions])];
  }

  /**
   * Add custom permission to user role
   */
  async addCustomPermission(userRoleId: string, permission: Permission): Promise<UserRole | null> {
    const userRole = this.userRoles.get(userRoleId);
    if (!userRole) return null;

    if (!userRole.customPermissions) {
      userRole.customPermissions = [];
    }

    if (!userRole.customPermissions.includes(permission)) {
      userRole.customPermissions.push(permission);
      userRole.updatedAt = new Date();
      
      // TODO: Update in database
      this.emit('permission.added', { userRoleId, permission });
    }

    return userRole;
  }

  /**
   * Remove custom permission from user role
   */
  async removeCustomPermission(userRoleId: string, permission: Permission): Promise<UserRole | null> {
    const userRole = this.userRoles.get(userRoleId);
    if (!userRole) return null;

    if (userRole.customPermissions) {
      userRole.customPermissions = userRole.customPermissions.filter(p => p !== permission);
      userRole.updatedAt = new Date();
      
      // TODO: Update in database
      this.emit('permission.removed', { userRoleId, permission });
    }

    return userRole;
  }

  /**
   * Create an access policy
   */
  async createAccessPolicy(tenantId: string, name: string, resourceType: string, permissions: Permission[], description?: string, conditions?: Record<string, any>): Promise<AccessPolicy> {
    const policy: AccessPolicy = {
      id: this.generateId(),
      tenantId,
      name,
      description,
      resourceType,
      permissions,
      conditions,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accessPolicies.set(policy.id, policy);
    
    // TODO: Save to database
    this.emit('policy.created', { policy });

    return policy;
  }

  /**
   * Get access policies for a tenant
   */
  getTenantAccessPolicies(tenantId: string): AccessPolicy[] {
    return Array.from(this.accessPolicies.values()).filter(p => p.tenantId === tenantId && p.isActive);
  }

  /**
   * Update an access policy
   */
  async updateAccessPolicy(policyId: string, updates: Partial<AccessPolicy>): Promise<AccessPolicy | null> {
    const policy = this.accessPolicies.get(policyId);
    if (!policy) return null;

    const updatedPolicy: AccessPolicy = {
      ...policy,
      ...updates,
      id: policyId,
      updatedAt: new Date(),
    };

    this.accessPolicies.set(policyId, updatedPolicy);
    
    // TODO: Update in database
    this.emit('policy.updated', { policy: updatedPolicy });

    return updatedPolicy;
  }

  /**
   * Delete an access policy
   */
  async deleteAccessPolicy(policyId: string): Promise<boolean> {
    const deleted = this.accessPolicies.delete(policyId);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('policy.deleted', { policyId });
    }

    return deleted;
  }

  /**
   * Check resource access
   */
  hasResourceAccess(userId: string, tenantId: string, resourceType: string, resourceId: string, permission: Permission): boolean {
    const userRole = this.getUserRole(userId, tenantId);
    if (!userRole) return false;

    // Check if user has the permission via role
    if (!this.hasPermission(userId, tenantId, permission)) {
      return false;
    }

    // Check resource-specific access policies
    const policies = this.getTenantAccessPolicies(tenantId);
    for (const policy of policies) {
      if (policy.resourceType === resourceType && policy.permissions.includes(permission)) {
        // Check conditions if they exist
        if (policy.conditions) {
          // TODO: Implement condition evaluation
          return true;
        }
        return true;
      }
    }

    // Check explicit resource access
    const resourceAccessKey = `${userId}:${resourceType}:${resourceId}`;
    const resourceAccess = this.resourceAccess.get(resourceAccessKey);
    if (resourceAccess && resourceAccess.permissions.includes(permission)) {
      return true;
    }

    // Admin and owner have access to all resources
    if (userRole.role === 'admin' || userRole.role === 'owner') {
      return true;
    }

    return false;
  }

  /**
   * Grant resource access
   */
  async grantResourceAccess(userId: string, tenantId: string, resourceType: string, resourceId: string, permissions: Permission[]): Promise<ResourceAccess> {
    const access: ResourceAccess = {
      userId,
      tenantId,
      resourceType,
      resourceId,
      permissions,
    };

    const key = `${userId}:${resourceType}:${resourceId}`;
    this.resourceAccess.set(key, access);
    
    // TODO: Save to database
    this.emit('resource_access.granted', { access });

    return access;
  }

  /**
   * Revoke resource access
   */
  async revokeResourceAccess(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
    const key = `${userId}:${resourceType}:${resourceId}`;
    const deleted = this.resourceAccess.delete(key);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('resource_access.revoked', { userId, resourceType, resourceId });
    }

    return deleted;
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Record<Permission, string> {
    return PERMISSIONS;
  }

  /**
   * Get default permissions for a role
   */
  getRolePermissions(role: Role): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
