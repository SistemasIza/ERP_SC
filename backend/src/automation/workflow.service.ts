/**
 * Workflow Service
 * Main service for managing workflows
 */

import { Workflow, WorkflowExecution, SystemEvent, EventType } from './types/workflow.types';
import { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator';
import { EventTriggerNode } from './nodes/triggers/event-trigger.node';
import { ConditionNode } from './nodes/logic/condition.node';
import { DelayNode } from './nodes/logic/delay.node';
import { SendMessageNode } from './nodes/actions/send-message.node';
import { CreateContactNode } from './nodes/actions/create-contact.node';
import { WebhookNode } from './nodes/integration/webhook.node';
import { HttpRequestNode } from './nodes/integration/http-request.node';
import { EventEmitter } from 'events';

export class WorkflowService extends EventEmitter {
  private orchestrator: WorkflowOrchestrator;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor() {
    super();
    this.orchestrator = new WorkflowOrchestrator();
    this.registerNodes();
    this.setupOrchestratorListeners();
  }

  /**
   * Register all available workflow nodes
   */
  private registerNodes(): void {
    // Trigger nodes
    this.orchestrator.registerNode(new EventTriggerNode());

    // Logic nodes
    this.orchestrator.registerNode(new ConditionNode());
    this.orchestrator.registerNode(new DelayNode());

    // Action nodes
    this.orchestrator.registerNode(new SendMessageNode());
    this.orchestrator.registerNode(new CreateContactNode());

    // Integration nodes
    this.orchestrator.registerNode(new WebhookNode());
    this.orchestrator.registerNode(new HttpRequestNode());
  }

  /**
   * Setup orchestrator event listeners
   */
  private setupOrchestratorListeners(): void {
    this.orchestrator.on('workflow.started', ({ execution, workflow }) => {
      this.executions.set(execution.id, execution);
      this.emit('workflow.started', { execution, workflow });
    });

    this.orchestrator.on('workflow.completed', ({ execution, workflow }) => {
      this.emit('workflow.completed', { execution, workflow });
    });

    this.orchestrator.on('workflow.failed', ({ execution, workflow, error }) => {
      this.emit('workflow.failed', { execution, workflow, error });
    });

    this.orchestrator.on('workflow.stopped', ({ execution }) => {
      this.emit('workflow.stopped', { execution });
    });
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(newWorkflow.id, newWorkflow);
    
    // TODO: Save to database
    this.emit('workflow.created', { workflow: newWorkflow });

    return newWorkflow;
  }

  /**
   * Get a workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all workflows for a tenant
   */
  getWorkflowsByTenant(tenantId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter(w => w.tenantId === tenantId);
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    const updatedWorkflow: Workflow = {
      ...workflow,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.workflows.set(id, updatedWorkflow);
    
    // TODO: Update in database
    this.emit('workflow.updated', { workflow: updatedWorkflow });

    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    this.workflows.delete(id);
    
    // TODO: Delete from database
    this.emit('workflow.deleted', { workflow });

    return true;
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(id: string): Promise<Workflow | null> {
    return this.updateWorkflow(id, { status: 'active' });
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string): Promise<Workflow | null> {
    return this.updateWorkflow(id, { status: 'inactive' });
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string, triggerEvent: SystemEvent): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    return this.orchestrator.executeWorkflow(workflow, triggerEvent);
  }

  /**
   * Trigger workflows based on an event
   */
  async triggerWorkflows(event: SystemEvent): Promise<WorkflowExecution[]> {
    const executions: WorkflowExecution[] = [];

    // Find all active workflows that match the event
    const matchingWorkflows = Array.from(this.workflows.values()).filter(
      workflow =>
        workflow.status === 'active' &&
        workflow.trigger.type === 'event' &&
        workflow.trigger.config.eventType === event.type
    );

    // Execute all matching workflows
    for (const workflow of matchingWorkflows) {
      try {
        const execution = await this.orchestrator.executeWorkflow(workflow, event);
        executions.push(execution);
      } catch (error) {
        console.error(`Failed to execute workflow ${workflow.id}:`, error);
      }
    }

    return executions;
  }

  /**
   * Get a workflow execution by ID
   */
  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  /**
   * Get all executions for a workflow
   */
  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.workflowId === workflowId);
  }

  /**
   * Get all executions for a tenant
   */
  getTenantExecutions(tenantId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);
  }

  /**
   * Stop a workflow execution
   */
  stopExecution(executionId: string): boolean {
    return this.orchestrator.stopExecution(executionId);
  }

  /**
   * Get all registered node types
   */
  getRegisteredNodeTypes(): string[] {
    return Array.from(this.orchestrator['nodeRegistry'].keys());
  }

  /**
   * Get node schema by type
   */
  getNodeSchema(type: string) {
    const node = this.orchestrator.getNode(type);
    if (!node) return null;
    return node.getConfigSchema();
  }

  /**
   * Validate a workflow configuration
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate trigger
    if (!workflow.trigger) {
      errors.push('Workflow must have a trigger');
    }

    // Validate nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    } else {
      for (const node of workflow.nodes) {
        const executor = this.orchestrator.getNode(node.type);
        if (!executor) {
          errors.push(`Unknown node type: ${node.type}`);
          continue;
        }

        const validation = executor.validate(node.config);
        if (!validation.valid) {
          errors.push(`Node ${node.id} (${node.type}): ${validation.errors.join(', ')}`);
        }
      }
    }

    // Validate node connections
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const node of workflow.nodes) {
      for (const inputId of node.connections.input) {
        if (!nodeIds.has(inputId)) {
          errors.push(`Node ${node.id} has invalid input connection: ${inputId}`);
        }
      }
      for (const outputId of node.connections.output) {
        if (!nodeIds.has(outputId)) {
          errors.push(`Node ${node.id} has invalid output connection: ${outputId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
