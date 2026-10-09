/**
 * RBAC API Routes
 * REST API endpoints for role-based access control
 */

import { Router, Request, Response } from 'express';
import { RBACService } from '../rbac.service';
import { Role, Permission } from '../types/rbac.types';

const router = Router();
const rbacService = new RBACService();

/**
 * POST /api/rbac/roles
 * Assign a role to a user
 */
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.body;
    
    if (!userId || !tenantId || !role) {
      return res.status(400).json({ error: 'userId, tenantId, and role are required' });
    }

    const userRole = await rbacService.assignRole(userId, tenantId, role);
    res.status(201).json({ userRole });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

/**
 * GET /api/rbac/roles/:userId/:tenantId
 * Get user role
 */
router.get('/roles/:userId/:tenantId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.params;
    const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    
    const userRole = rbacService.getUserRole(resolvedUserId, resolvedTenantId);
    
    if (!userRole) {
      return res.status(404).json({ error: 'User role not found' });
    }

    res.json({ userRole });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
});

/**
 * PUT /api/rbac/roles/:id
 * Update user role
 */
router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roleId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const userRole = await rbacService.updateUserRole(roleId, updates);
    if (!userRole) {
      return res.status(404).json({ error: 'User role not found' });
    }

    res.json({ userRole });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * DELETE /api/rbac/roles/:id
 * Remove user role
 */
router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roleId = Array.isArray(id) ? id[0] : id;
    const deleted = await rbacService.removeUserRole(roleId);

    if (!deleted) {
      return res.status(404).json({ error: 'User role not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing user role:', error);
    res.status(500).json({ error: 'Failed to remove user role' });
  }
});

/**
 * GET /api/rbac/permissions/:userId/:tenantId
 * Get all permissions for a user
 */
router.get('/permissions/:userId/:tenantId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.params;
    const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    
    const permissions = rbacService.getUserPermissions(resolvedUserId, resolvedTenantId);
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

/**
 * POST /api/rbac/permissions/:roleId
 * Add custom permission to user role
 */
router.post('/permissions/:roleId', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const resolvedRoleId = Array.isArray(roleId) ? roleId[0] : roleId;
    const { permission } = req.body;
    
    if (!permission) {
      return res.status(400).json({ error: 'permission is required' });
    }

    const userRole = await rbacService.addCustomPermission(resolvedRoleId, permission);
    if (!userRole) {
      return res.status(404).json({ error: 'User role not found' });
    }

    res.json({ userRole });
  } catch (error) {
    console.error('Error adding custom permission:', error);
    res.status(500).json({ error: 'Failed to add custom permission' });
  }
});

/**
 * DELETE /api/rbac/permissions/:roleId/:permission
 * Remove custom permission from user role
 */
router.delete('/permissions/:roleId/:permission', async (req: Request, res: Response) => {
  try {
    const { roleId, permission } = req.params;
    const resolvedRoleId = Array.isArray(roleId) ? roleId[0] : roleId;
    const resolvedPermission = Array.isArray(permission) ? permission[0] : permission;
    
    const userRole = await rbacService.removeCustomPermission(resolvedRoleId, resolvedPermission);
    if (!userRole) {
      return res.status(404).json({ error: 'User role not found' });
    }

    res.json({ userRole });
  } catch (error) {
    console.error('Error removing custom permission:', error);
    res.status(500).json({ error: 'Failed to remove custom permission' });
  }
});

/**
 * POST /api/rbac/policies
 * Create an access policy
 */
router.post('/policies', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, resourceType, permissions, description, conditions } = req.body;
    
    if (!tenantId || !name || !resourceType || !permissions) {
      return res.status(400).json({ error: 'tenantId, name, resourceType, and permissions are required' });
    }

    const policy = await rbacService.createAccessPolicy(tenantId, name, resourceType, permissions, description, conditions);
    res.status(201).json({ policy });
  } catch (error) {
    console.error('Error creating access policy:', error);
    res.status(500).json({ error: 'Failed to create access policy' });
  }
});

/**
 * GET /api/rbac/policies
 * Get access policies for a tenant
 */
router.get('/policies', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const policies = rbacService.getTenantAccessPolicies(tenantId);
    res.json({ policies });
  } catch (error) {
    console.error('Error fetching access policies:', error);
    res.status(500).json({ error: 'Failed to fetch access policies' });
  }
});

/**
 * PUT /api/rbac/policies/:id
 * Update an access policy
 */
router.put('/policies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policyId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const policy = await rbacService.updateAccessPolicy(policyId, updates);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ policy });
  } catch (error) {
    console.error('Error updating access policy:', error);
    res.status(500).json({ error: 'Failed to update access policy' });
  }
});

/**
 * DELETE /api/rbac/policies/:id
 * Delete an access policy
 */
router.delete('/policies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policyId = Array.isArray(id) ? id[0] : id;
    const deleted = await rbacService.deleteAccessPolicy(policyId);

    if (!deleted) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting access policy:', error);
    res.status(500).json({ error: 'Failed to delete access policy' });
  }
});

/**
 * POST /api/rbac/resource-access
 * Grant resource access
 */
router.post('/resource-access', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, resourceType, resourceId, permissions } = req.body;
    
    if (!userId || !tenantId || !resourceType || !resourceId || !permissions) {
      return res.status(400).json({ error: 'userId, tenantId, resourceType, resourceId, and permissions are required' });
    }

    const access = await rbacService.grantResourceAccess(userId, tenantId, resourceType, resourceId, permissions);
    res.status(201).json({ access });
  } catch (error) {
    console.error('Error granting resource access:', error);
    res.status(500).json({ error: 'Failed to grant resource access' });
  }
});

/**
 * DELETE /api/rbac/resource-access
 * Revoke resource access
 */
router.delete('/resource-access', async (req: Request, res: Response) => {
  try {
    const { userId, resourceType, resourceId } = req.body;
    
    if (!userId || !resourceType || !resourceId) {
      return res.status(400).json({ error: 'userId, resourceType, and resourceId are required' });
    }

    const deleted = await rbacService.revokeResourceAccess(userId, resourceType, resourceId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking resource access:', error);
    res.status(500).json({ error: 'Failed to revoke resource access' });
  }
});

/**
 * GET /api/rbac/permissions/all
 * Get all available permissions
 */
router.get('/permissions/all', async (req: Request, res: Response) => {
  try {
    const permissions = rbacService.getAllPermissions();
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    res.status(500).json({ error: 'Failed to fetch all permissions' });
  }
});

/**
 * GET /api/rbac/roles/:role/permissions
 * Get default permissions for a role
 */
router.get('/roles/:role/permissions', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const resolvedRole = Array.isArray(role) ? role[0] : role;
    
    const permissions = rbacService.getRolePermissions(resolvedRole as Role);
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

export default router;
