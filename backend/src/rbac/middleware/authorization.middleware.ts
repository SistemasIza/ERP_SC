/**
 * Authorization Middleware
 * Express middleware for RBAC authorization
 */

import { Request, Response, NextFunction } from 'express';
import { RBACService } from '../rbac.service';
import { Permission } from '../types/rbac.types';

const rbacService = new RBACService();

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const tenantId = (req as any).tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = rbacService.hasPermission(userId, tenantId, permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const tenantId = (req as any).tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAnyPermission = permissions.some(perm => 
        rbacService.hasPermission(userId, tenantId, perm)
      );

      if (!hasAnyPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check if user has all required permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const tenantId = (req as any).tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAllPermissions = permissions.every(perm => 
        rbacService.hasPermission(userId, tenantId, perm)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const tenantId = (req as any).tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = rbacService.getUserRole(userId, tenantId);
      if (!userRole || userRole.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check resource access
 */
export const requireResourceAccess = (resourceType: string, permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const tenantId = (req as any).tenantId;
      const resourceId = req.params.id;

      if (!userId || !tenantId || !resourceId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resolvedResourceId = Array.isArray(resourceId) ? resourceId[0] : resourceId;
      const hasAccess = rbacService.hasResourceAccess(userId, tenantId, resourceType, resolvedResourceId, permission);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions for this resource' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
