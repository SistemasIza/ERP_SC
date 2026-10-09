/**
 * RBAC Types
 * Type definitions for Role-Based Access Control
 */

export type Permission = string;

export type Role = 'admin' | 'owner' | 'agent' | 'viewer' | 'custom';

export interface RolePermission {
  role: Role;
  permissions: Permission[];
}

export interface UserRole {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  customPermissions?: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceAccess {
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  permissions: Permission[];
}

export interface AccessPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  resourceType: string;
  permissions: Permission[];
  conditions?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Predefined permissions
export const PERMISSIONS = {
  // User management
  'users:create': 'Create users',
  'users:read': 'Read users',
  'users:update': 'Update users',
  'users:delete': 'Delete users',
  
  // Role management
  'roles:create': 'Create roles',
  'roles:read': 'Read roles',
  'roles:update': 'Update roles',
  'roles:delete': 'Delete roles',
  'roles:assign': 'Assign roles',
  
  // Workflow management
  'workflows:create': 'Create workflows',
  'workflows:read': 'Read workflows',
  'workflows:update': 'Update workflows',
  'workflows:delete': 'Delete workflows',
  'workflows:execute': 'Execute workflows',
  
  // AI management
  'ai:configure': 'Configure AI providers',
  'ai:use': 'Use AI features',
  'ai:manage': 'Manage AI usage',
  
  // Webhook management
  'webhooks:create': 'Create webhooks',
  'webhooks:read': 'Read webhooks',
  'webhooks:update': 'Update webhooks',
  'webhooks:delete': 'Delete webhooks',
  
  // API key management
  'api_keys:create': 'Create API keys',
  'api_keys:read': 'Read API keys',
  'api_keys:revoke': 'Revoke API keys',
  
  // Billing management
  'billing:read': 'Read billing information',
  'billing:update': 'Update billing information',
  'billing:manage': 'Manage subscriptions',
  
  // Analytics
  'analytics:read': 'Read analytics',
  
  // Settings
  'settings:read': 'Read settings',
  'settings:update': 'Update settings',
  
  // Conversations
  'conversations:read': 'Read conversations',
  'conversations:respond': 'Respond to conversations',
  'conversations:assign': 'Assign conversations',
  'conversations:transfer': 'Transfer conversations',
  
  // Contacts
  'contacts:create': 'Create contacts',
  'contacts:read': 'Read contacts',
  'contacts:update': 'Update contacts',
  'contacts:delete': 'Delete contacts',
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  owner: Object.values(PERMISSIONS),
  agent: [
    'conversations:read',
    'conversations:respond',
    'conversations:assign',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'workflows:read',
    'workflows:execute',
  ],
  viewer: [
    'conversations:read',
    'contacts:read',
    'workflows:read',
    'analytics:read',
    'billing:read',
  ],
  custom: [],
};
