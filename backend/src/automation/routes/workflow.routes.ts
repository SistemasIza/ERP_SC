/**
 * Workflow API Routes
 * REST API endpoints for workflow management
 */

import { Router, Request, Response } from 'express';
import { WorkflowService } from '../workflow.service';
import { Workflow, SystemEvent } from '../types/workflow.types';

const router = Router();
const workflowService = new WorkflowService();

/**
 * GET /api/automation/workflows
 * Get all workflows for the current tenant
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const workflows = workflowService.getWorkflowsByTenant(tenantId);
    res.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/automation/workflows/:id
 * Get a specific workflow by ID
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const workflow = workflowService.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/automation/workflows
 * Create a new workflow
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const workflowData = req.body;
    const workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> = {
      ...workflowData,
      tenantId,
    };

    // Validate workflow
    const validation = workflowService.validateWorkflow(workflow as Workflow);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid workflow', errors: validation.errors });
    }

    const createdWorkflow = await workflowService.createWorkflow(workflow);
    res.status(201).json({ workflow: createdWorkflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * PUT /api/automation/workflows/:id
 * Update a workflow
 */
router.put('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    // Validate updated workflow
    const existingWorkflow = workflowService.getWorkflow(workflowId);
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const updatedWorkflow = { ...existingWorkflow, ...updates };
    const validation = workflowService.validateWorkflow(updatedWorkflow);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid workflow', errors: validation.errors });
    }

    const workflow = await workflowService.updateWorkflow(workflowId, updates);
    res.json({ workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/automation/workflows/:id
 * Delete a workflow
 */
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const deleted = await workflowService.deleteWorkflow(workflowId);

    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * POST /api/automation/workflows/:id/activate
 * Activate a workflow
 */
router.post('/workflows/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const workflow = await workflowService.activateWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error activating workflow:', error);
    res.status(500).json({ error: 'Failed to activate workflow' });
  }
});

/**
 * POST /api/automation/workflows/:id/deactivate
 * Deactivate a workflow
 */
router.post('/workflows/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const workflow = await workflowService.deactivateWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error deactivating workflow:', error);
    res.status(500).json({ error: 'Failed to deactivate workflow' });
  }
});

/**
 * POST /api/automation/workflows/:id/execute
 * Manually execute a workflow
 */
router.post('/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const { triggerEvent } = req.body;

    if (!triggerEvent) {
      return res.status(400).json({ error: 'triggerEvent is required' });
    }

    const execution = await workflowService.executeWorkflow(workflowId, triggerEvent);
    res.status(202).json({ execution });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to execute workflow' });
  }
});

/**
 * GET /api/automation/workflows/:id/executions
 * Get all executions for a workflow
 */
router.get('/workflows/:id/executions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const executions = workflowService.getWorkflowExecutions(workflowId);
    res.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

/**
 * GET /api/automation/executions/:id
 * Get a specific execution by ID
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = Array.isArray(id) ? id[0] : id;
    const execution = workflowService.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ execution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

/**
 * POST /api/automation/executions/:id/stop
 * Stop a running execution
 */
router.post('/executions/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = Array.isArray(id) ? id[0] : id;
    const stopped = workflowService.stopExecution(executionId);

    if (!stopped) {
      return res.status(404).json({ error: 'Execution not found or already stopped' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping execution:', error);
    res.status(500).json({ error: 'Failed to stop execution' });
  }
});

/**
 * GET /api/automation/nodes
 * Get all registered node types
 */
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const nodeTypes = workflowService.getRegisteredNodeTypes();
    res.json({ nodeTypes });
  } catch (error) {
    console.error('Error fetching node types:', error);
    res.status(500).json({ error: 'Failed to fetch node types' });
  }
});

/**
 * GET /api/automation/nodes/:type/schema
 * Get the schema for a specific node type
 */
router.get('/nodes/:type/schema', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const nodeType = Array.isArray(type) ? type[0] : type;
    const schema = workflowService.getNodeSchema(nodeType);

    if (!schema) {
      return res.status(404).json({ error: 'Node type not found' });
    }

    res.json({ schema });
  } catch (error) {
    console.error('Error fetching node schema:', error);
    res.status(500).json({ error: 'Failed to fetch node schema' });
  }
});

/**
 * POST /api/automation/validate
 * Validate a workflow configuration
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const workflow = req.body;
    const validation = workflowService.validateWorkflow(workflow);
    res.json(validation);
  } catch (error) {
    console.error('Error validating workflow:', error);
    res.status(500).json({ error: 'Failed to validate workflow' });
  }
});

/**
 * POST /api/automation/trigger
 * Trigger workflows based on an event
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const event: SystemEvent = req.body;
    const executions = await workflowService.triggerWorkflows(event);
    res.json({ executions, count: executions.length });
  } catch (error) {
    console.error('Error triggering workflows:', error);
    res.status(500).json({ error: 'Failed to trigger workflows' });
  }
});

export default router;
