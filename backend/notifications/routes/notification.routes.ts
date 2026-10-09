/**
 * Notification API Routes
 * REST API endpoints for notification management
 */

import { Router, Request, Response } from 'express';
import { NotificationService } from '../notification.service';

const router = Router();
const notificationService = new NotificationService();

/**
 * POST /api/notifications/send
 * Send a notification
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const notificationData = req.body;
    const notification = await notificationService.sendNotification(notificationData);
    res.status(201).json({ notification });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * GET /api/notifications/:tenantId
 * Get notifications for a tenant
 */
router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { status, channel } = req.query;

    const notifications = notificationService.getTenantNotifications(resolvedTenantId, {
      status: status as any,
      channel: channel as any,
    });
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/:id
 * Get a specific notification
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notificationId = Array.isArray(id) ? id[0] : id;
    const notification = notificationService.getNotification(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

/**
 * POST /api/notifications/templates
 * Create a notification template
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...templateData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const template = await notificationService.createTemplate(tenantId, templateData);
    res.status(201).json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * GET /api/notifications/templates/:tenantId
 * Get templates for a tenant
 */
router.get('/templates/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const templates = notificationService.getTenantTemplates(resolvedTenantId);
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * POST /api/notifications/templates/:id/render
 * Render a template with variables
 */
router.post('/templates/:id/render', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = Array.isArray(id) ? id[0] : id;
    const { variables } = req.body;

    const template = notificationService.getTenantTemplates('default').find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const rendered = notificationService.renderTemplate(template, variables);
    res.json({ rendered });
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

/**
 * POST /api/notifications/preferences
 * Set user notification preferences
 */
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const preferenceData = req.body;
    const preference = await notificationService.setPreferences(preferenceData);
    res.status(201).json({ preference });
  } catch (error) {
    console.error('Error setting preferences:', error);
    res.status(500).json({ error: 'Failed to set preferences' });
  }
});

/**
 * GET /api/notifications/preferences/:userId/:tenantId
 * Get user preferences
 */
router.get('/preferences/:userId/:tenantId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.params;
    const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const preferences = notificationService.getUserPreferences(resolvedUserId, resolvedTenantId);
    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * POST /api/notifications/configure/email
 * Configure email provider
 */
router.post('/configure/email', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    notificationService.configureEmail(config);
    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring email:', error);
    res.status(500).json({ error: 'Failed to configure email' });
  }
});

/**
 * POST /api/notifications/configure/sms
 * Configure SMS provider
 */
router.post('/configure/sms', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    notificationService.configureSMS(config);
    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring SMS:', error);
    res.status(500).json({ error: 'Failed to configure SMS' });
  }
});

/**
 * POST /api/notifications/configure/push
 * Configure push provider
 */
router.post('/configure/push', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    notificationService.configurePush(config);
    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring push:', error);
    res.status(500).json({ error: 'Failed to configure push' });
  }
});

export default router;
