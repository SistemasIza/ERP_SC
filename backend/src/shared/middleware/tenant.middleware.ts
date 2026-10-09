/**
 * Tenant Middleware
 * Handles multi-tenant isolation by extracting tenant ID from requests
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      companyId?: string;
      organizationId?: string;
    }
  }
}

export class TenantNotFoundException extends Error {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
    this.name = 'TenantNotFoundException';
  }
}

export class TenantMiddleware {
  /**
   * Main middleware function
   * Extracts tenant ID from request and sets it in the request object
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract tenant ID from various sources
      const tenantId = this.extractTenantId(req);
      
      if (!tenantId) {
        res.status(400).json({ 
          error: 'Tenant ID required',
          message: 'Provide tenant ID via header, subdomain, or query parameter' 
        });
        return;
      }

      // Set tenant ID in request
      req.tenantId = tenantId;
      req.companyId = tenantId;
      req.organizationId = tenantId;

      next();
    } catch (error) {
      console.error('Tenant middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process tenant request' 
      });
      return;
    }
  }

  /**
   * Extract tenant ID from request
   * Priority: X-Organization-ID > X-Tenant-ID > Subdomain > Query Parameter
   */
  private extractTenantId(req: Request): string | null {
    // 1. Check X-Organization-ID header (from frontend)
    const orgHeader = req.headers['x-organization-id'] as string;
    if (orgHeader) return orgHeader;

    // 2. Check X-Tenant-ID header
    const headerTenant = req.headers['x-tenant-id'] as string;
    if (headerTenant) return headerTenant;

    // 3. Check subdomain (e.g., company-name.sparktree.com)
    const host = req.headers.host;
    if (host) {
      const hostname = host.split(':')[0];
      const subdomain = hostname.split('.')[0];
      if (
        subdomain
        && subdomain !== 'www'
        && subdomain !== 'api'
        && subdomain !== 'localhost'
        && subdomain !== '127.0.0.1'
      ) {
        return subdomain;
      }
    }

    // 4. Check query parameter
    const queryTenant = req.query.tenantId as string;
    if (queryTenant) return queryTenant;

    // 5. Check JWT token (if already authenticated)
    if (req.userId) {
      // In a real implementation, extract tenant from JWT
      // For now, return null
    }

    return null;
  }
}

// Factory function to create middleware
export const createTenantMiddleware = () => {
  const middleware = new TenantMiddleware();
  return middleware.use.bind(middleware);
};

// Export singleton instance
export const tenantMiddleware = new TenantMiddleware();
