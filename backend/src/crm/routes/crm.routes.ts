/**
 * CRM API Routes
 * REST API endpoints for Customer Relationship Management
 */

import { Router, Request, Response } from 'express';
import { CRMService } from '../crm.service';

const router = Router();
const crmService = new CRMService();

/**
 * POST /api/crm/contacts
 * Create a contact
 */
router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...contactData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const contact = await crmService.createContact(tenantId, contactData);
    res.status(201).json({ contact });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * GET /api/crm/contacts/:tenantId
 * Get contacts for a tenant
 */
router.get('/contacts/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { status, assignedTo } = req.query;

    const contacts = crmService.getTenantContacts(resolvedTenantId, {
      status: status as any,
      assignedTo: assignedTo as string,
    });
    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/crm/contacts/:id
 * Get a specific contact
 */
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contactId = Array.isArray(id) ? id[0] : id;
    const contact = crmService.getContact(contactId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * PUT /api/crm/contacts/:id
 * Update a contact
 */
router.put('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contactId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const contact = await crmService.updateContact(contactId, updates);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * DELETE /api/crm/contacts/:id
 * Delete a contact
 */
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contactId = Array.isArray(id) ? id[0] : id;
    const deleted = await crmService.deleteContact(contactId);

    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

/**
 * POST /api/crm/deals
 * Create a deal
 */
router.post('/deals', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...dealData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const deal = await crmService.createDeal(tenantId, dealData);
    res.status(201).json({ deal });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

/**
 * GET /api/crm/deals/:tenantId
 * Get deals for a tenant
 */
router.get('/deals/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { stage, assignedTo } = req.query;

    const deals = crmService.getTenantDeals(resolvedTenantId, {
      stage: stage as any,
      assignedTo: assignedTo as string,
    });
    res.json({ deals });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

/**
 * PUT /api/crm/deals/:id
 * Update a deal
 */
router.put('/deals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dealId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const deal = await crmService.updateDeal(dealId, updates);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ deal });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

/**
 * DELETE /api/crm/deals/:id
 * Delete a deal
 */
router.delete('/deals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dealId = Array.isArray(id) ? id[0] : id;
    const deleted = await crmService.deleteDeal(dealId);

    if (!deleted) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

/**
 * POST /api/crm/tasks
 * Create a task
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...taskData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const task = await crmService.createTask(tenantId, taskData);
    res.status(201).json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * GET /api/crm/tasks/:tenantId
 * Get tasks for a tenant
 */
router.get('/tasks/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { assignedTo, status, priority } = req.query;

    const tasks = crmService.getTenantTasks(resolvedTenantId, {
      assignedTo: assignedTo as string,
      status: status as any,
      priority: priority as any,
    });
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * PUT /api/crm/tasks/:id
 * Update a task
 */
router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const task = await crmService.updateTask(taskId, updates);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * POST /api/crm/tasks/:id/complete
 * Complete a task
 */
router.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const task = await crmService.completeTask(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

/**
 * POST /api/crm/notes
 * Create a note
 */
router.post('/notes', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...noteData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const note = await crmService.createNote(tenantId, noteData);
    res.status(201).json({ note });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * GET /api/crm/notes/:tenantId
 * Get notes for a tenant
 */
router.get('/notes/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { relatedContactId, relatedDealId } = req.query;

    const notes = crmService.getTenantNotes(resolvedTenantId, {
      relatedContactId: relatedContactId as string,
      relatedDealId: relatedDealId as string,
    });
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/crm/activities
 * Log an activity
 */
router.post('/activities', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...activityData } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const activity = await crmService.logActivity(tenantId, activityData);
    res.status(201).json({ activity });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * GET /api/crm/activities/:tenantId
 * Get activities for a tenant
 */
router.get('/activities/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { relatedContactId, relatedDealId } = req.query;

    const activities = crmService.getTenantActivities(resolvedTenantId, {
      relatedContactId: relatedContactId as string,
      relatedDealId: relatedDealId as string,
    });
    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * POST /api/crm/pipelines
 * Create a pipeline
 */
router.post('/pipelines', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, stages } = req.body;
    
    if (!tenantId || !name || !stages) {
      return res.status(400).json({ error: 'tenantId, name, and stages are required' });
    }

    const pipeline = await crmService.createPipeline(tenantId, name, stages);
    res.status(201).json({ pipeline });
  } catch (error) {
    console.error('Error creating pipeline:', error);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

/**
 * GET /api/crm/pipelines/:tenantId
 * Get pipelines for a tenant
 */
router.get('/pipelines/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const pipelines = crmService.getTenantPipelines(resolvedTenantId);
    res.json({ pipelines });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

export default router;
