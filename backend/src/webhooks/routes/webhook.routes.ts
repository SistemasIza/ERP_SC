/**
 * Webhook API Routes
 * REST API endpoints for webhook management
 */

import { Router, Request, Response } from 'express';
import { WebhookService } from '../webhook.service';
import { Webhook, WebhookEvent } from '../types/webhook.types';

const router = Router();
const webhookService = new WebhookService();

/**
 * GET /api/webhooks
 * Get all webhooks for the current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const webhooks = webhookService.getTenantWebhooks(tenantId);
    res.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * GET /api/webhooks/:id
 * Get a specific webhook by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = Array.isArray(id) ? id[0] : id;
    const webhook = webhookService.getWebhook(webhookId);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ webhook });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const webhookData = req.body;
    const webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'> = {
      ...webhookData,
      tenantId,
    };

    const createdWebhook = await webhookService.createWebhook(webhook);
    res.status(201).json({ webhook: createdWebhook });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * PUT /api/webhooks/:id
 * Update a webhook
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const webhook = await webhookService.updateWebhook(webhookId, updates);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ webhook });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = Array.isArray(id) ? id[0] : id;
    const deleted = await webhookService.deleteWebhook(webhookId);

    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get all deliveries for a webhook
 */
router.get('/:id/deliveries', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = Array.isArray(id) ? id[0] : id;
    const deliveries = webhookService.getWebhookDeliveries(webhookId);
    res.json({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

/**
 * POST /api/webhooks/trigger
 * Manually trigger webhooks for an event
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const event: WebhookEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      eventType: req.body.eventType,
      payload: req.body.payload,
      metadata: req.body.metadata || {},
      timestamp: new Date(),
    };

    const deliveries = await webhookService.triggerWebhooks(event);
    res.json({ deliveries, count: deliveries.length });
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    res.status(500).json({ error: 'Failed to trigger webhooks' });
  }
});

/**
 * GET /api/webhooks/deliveries/:id
 * Get a specific delivery by ID
 */
router.get('/deliveries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deliveryId = Array.isArray(id) ? id[0] : id;
    const delivery = webhookService.getDelivery(deliveryId);

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({ delivery });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({ error: 'Failed to fetch delivery' });
  }
});

export default router;
