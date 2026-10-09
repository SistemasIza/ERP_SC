/**
 * Workflow Orchestrator
 * Core engine for executing workflows composed of nodes
 */

import { Workflow, WorkflowContext, SystemEvent, NodeResult, WorkflowExecution } from '../types/workflow.types';
import { WorkflowNodeExecutor } from '../nodes/base-node.interface';
import { EventEmitter } from 'events';

export class WorkflowOrchestrator extends EventEmitter {
  private nodeRegistry: Map<string, WorkflowNodeExecutor> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();

  /**
   * Register a workflow node executor
   */
  registerNode(executor: WorkflowNodeExecutor): void {
    this.nodeRegistry.set(executor.type, executor);
  }

  /**
   * Get a node executor by type
   */
  getNode(type: string): WorkflowNodeExecutor | undefined {
    return this.nodeRegistry.get(type);
  }

  /**
   * Execute a workflow with a trigger event
   */
  async executeWorkflow(workflow: Workflow, triggerEvent: SystemEvent): Promise<WorkflowExecution> {
    const executionId = this.generateId();

    const context: WorkflowContext = {
      workflowId: workflow.id,
      executionId,
      tenantId: workflow.tenantId,
      triggerEvent,
      variables: { ...workflow.variables },
      currentNodeId: workflow.trigger.config.startNodeId || this.findStartNode(workflow),
      history: [],
      metadata: {
        startTime: Date.now(),
      },
    };

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      status: 'running',
      triggerEvent,
      context,
      startedAt: new Date(),
    };

    this.activeExecutions.set(executionId, execution);

    try {
      this.emit('workflow.started', { execution, workflow });

      await this.executeNode(context, workflow);

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.result = { success: true };

      this.emit('workflow.completed', { execution, workflow });
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : String(error);

      this.emit('workflow.failed', { execution, workflow, error });
    } finally {
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  /**
   * Execute a single node in the workflow
   */
  private async executeNode(context: WorkflowContext, workflow: Workflow): Promise<void> {
    const node = workflow.nodes.find(n => n.id === context.currentNodeId);
    if (!node) {
      throw new Error(`Node ${context.currentNodeId} not found in workflow`);
    }

    const executor = this.nodeRegistry.get(node.type);
    if (!executor) {
      throw new Error(`No executor registered for node type: ${node.type}`);
    }

    // Validate node configuration
    const validation = executor.validate(node.config);
    if (!validation.valid) {
      throw new Error(`Node configuration invalid: ${validation.errors.join(', ')}`);
    }

    // Execute node with timeout
    const result = await this.executeWithTimeout(
      () => executor.execute(context),
      workflow.settings.timeoutMs
    );

    // Record execution history
    context.history.push({
      nodeId: node.id,
      nodeType: node.type,
      timestamp: Date.now(),
      success: result.success,
      output: result.output,
      error: result.error?.message,
    });

    // Handle error based on workflow settings
    if (!result.success) {
      if (workflow.settings.errorHandling === 'stop') {
        throw result.error;
      } else if (workflow.settings.errorHandling === 'retry') {
        await this.retryNode(context, workflow, node, executor);
        return;
      }
      // If 'continue', just log and move on
    }

    // Check if workflow should stop
    if (result.shouldStop) {
      return;
    }

    // Determine next node
    context.currentNodeId = result.nextNodeId || this.getNextNodeId(node, workflow);
    
    if (context.currentNodeId) {
      await this.executeNode(context, workflow);
    }
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Node execution timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Retry a node execution with backoff
   */
  private async retryNode(
    context: WorkflowContext,
    workflow: Workflow,
    node: any,
    executor: WorkflowNodeExecutor
  ): Promise<void> {
    const { maxRetries, backoffMs } = workflow.settings.retryPolicy;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
      
      try {
        const result = await executor.execute(context);
        
        context.history.push({
          nodeId: node.id,
          nodeType: node.type,
          timestamp: Date.now(),
          success: result.success,
          output: result.output,
          error: result.error?.message,
        });

        if (result.success) {
          context.currentNodeId = result.nextNodeId || this.getNextNodeId(node, workflow);
          if (context.currentNodeId) {
            await this.executeNode(context, workflow);
          }
          return;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
  }

  /**
   * Find the start node in a workflow
   */
  private findStartNode(workflow: Workflow): string {
    // Find nodes with no input connections (trigger nodes)
    const startNodes = workflow.nodes.filter(
      node => node.connections.input.length === 0
    );
    
    if (startNodes.length === 0) {
      throw new Error('No start node found in workflow');
    }
    
    if (startNodes.length > 1) {
      throw new Error('Multiple start nodes found in workflow');
    }
    
    return startNodes[0].id;
  }

  /**
   * Get the next node ID based on connections
   */
  private getNextNodeId(currentNode: any, workflow: Workflow): string | null {
    const outputConnections = currentNode.connections.output;
    
    if (outputConnections.length === 0) {
      return null; // End of workflow
    }
    
    if (outputConnections.length === 1) {
      return outputConnections[0];
    }
    
    // If multiple outputs, return the first one (condition nodes should handle this)
    return outputConnections[0];
  }

  /**
   * Get an active execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Stop an active execution
   */
  stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }
    
    execution.status = 'stopped';
    execution.completedAt = new Date();
    this.activeExecutions.delete(executionId);
    
    this.emit('workflow.stopped', { execution });
    return true;
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Validate a workflow structure and configuration
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if workflow has nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check if trigger references a valid start node
    if (workflow.trigger?.config?.startNodeId) {
      const startNodeExists = workflow.nodes.some(n => n.id === workflow.trigger.config.startNodeId);
      if (!startNodeExists) {
        errors.push(`Trigger references non-existent start node: ${workflow.trigger.config.startNodeId}`);
      }
    }

    // Check if all nodes have valid types
    workflow.nodes.forEach(node => {
      if (!node.type) {
        errors.push(`Node ${node.id} is missing type`);
      }
    });

    // Check if all node connections reference valid nodes
    workflow.nodes.forEach(node => {
      node.connections.output?.forEach(targetNodeId => {
        const targetExists = workflow.nodes.some(n => n.id === targetNodeId);
        if (!targetExists) {
          errors.push(`Node ${node.id} references non-existent output node: ${targetNodeId}`);
        }
      });
    });

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
