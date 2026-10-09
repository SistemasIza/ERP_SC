/**
 * Public API Routes
 * REST API endpoints for public API management (n8n integration)
 */

import { Router, Request, Response } from 'express';
import { PublicAPIService } from '../public-api.service';

const router = Router();
const publicAPIService = new PublicAPIService();

/**
 * Middleware to validate API key
 */
const validateAPIKey = async (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] as string || req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const validation = publicAPIService.validateAPIKey(apiKey);
  if (!validation.valid) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  // Attach tenant info to request
  (req as any).tenantId = validation.tenantId;
  (req as any).apiKeyScopes = validation.scopes;
  
  next();
};

/**
 * Middleware to check rate limit
 */
const checkRateLimit = async (req: Request, res: Response, next: any) => {
  const tenantId = (req as any).tenantId;
  
  const limitCheck = publicAPIService.checkRateLimit(tenantId, {
    perMinute: 60,
    perHour: 1000,
  });

  if (!limitCheck.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      resetAt: limitCheck.resetAt,
    });
  }

  next();
};

/**
 * POST /api/public/api-keys
 * Create a new API key (requires tenant authentication)
 */
router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { name, scopes, expiresAt } = req.body;
    
    if (!name || !scopes) {
      return res.status(400).json({ error: 'name and scopes are required' });
    }

    const apiKey = await publicAPIService.createAPIKey(tenantId, name, scopes, expiresAt);
    res.status(201).json({ apiKey });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * GET /api/public/api-keys
 * Get all API keys for a tenant
 */
router.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const apiKeys = publicAPIService.getTenantAPIKeys(tenantId);
    res.json({ apiKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * DELETE /api/public/api-keys/:key
 * Revoke an API key
 */
router.delete('/api-keys/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const apiKey = Array.isArray(key) ? key[0] : key;
    const revoked = await publicAPIService.revokeAPIKey(apiKey);

    if (!revoked) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * POST /api/public/webhooks
 * Create a public webhook endpoint
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { name, method } = req.body;
    
    if (!name || !method) {
      return res.status(400).json({ error: 'name and method are required' });
    }

    const webhook = await publicAPIService.createPublicWebhook(tenantId, name, method);
    res.status(201).json({ webhook });
  } catch (error) {
    console.error('Error creating public webhook:', error);
    res.status(500).json({ error: 'Failed to create public webhook' });
  }
});

/**
 * GET /api/public/webhooks
 * Get all public webhooks for a tenant
 */
router.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const webhooks = publicAPIService.getTenantPublicWebhooks(tenantId);
    res.json({ webhooks });
  } catch (error) {
    console.error('Error fetching public webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch public webhooks' });
  }
});

/**
 * DELETE /api/public/webhooks/:id
 * Delete a public webhook
 */
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = Array.isArray(id) ? id[0] : id;
    const deleted = await publicAPIService.deletePublicWebhook(webhookId);

    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting public webhook:', error);
    res.status(500).json({ error: 'Failed to delete public webhook' });
  }
});

/**
 * GET /api/v1/health
 * Public health check endpoint
 */
router.get('/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v1/tenants/:tenantId/info
 * Get tenant information (requires API key)
 */
router.get('/v1/tenants/:tenantId/info', validateAPIKey, checkRateLimit, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const requestTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const authenticatedTenantId = (req as any).tenantId;

    // Ensure the authenticated tenant can only access their own data
    if (requestTenantId !== authenticatedTenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: Fetch actual tenant info from database
    res.json({
      tenantId: requestTenantId,
      name: 'Tenant Name',
      status: 'active',
    });
  } catch (error) {
    console.error('Error fetching tenant info:', error);
    res.status(500).json({ error: 'Failed to fetch tenant info' });
  }
});

export default router;
