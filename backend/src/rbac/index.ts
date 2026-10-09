/**
 * RBAC Module
 * Main entry point for Role-Based Access Control
 */

export { RBACService } from './rbac.service';
export * from './types/rbac.types';
export { default as rbacRoutes } from './routes/rbac.routes';
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireResourceAccess,
} from './middleware/authorization.middleware';
