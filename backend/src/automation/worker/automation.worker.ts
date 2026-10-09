/**
 * Automation Worker
 * Background worker for executing workflows
 */

import { Worker, Job } from 'bullmq';
import { WorkflowService } from '../workflow.service';
import { SystemEvent } from '../types/workflow.types';

export class AutomationWorker {
  private worker: Worker;
  private workflowService: WorkflowService;

  constructor(redisConfig: { host: string; port: number }) {
    this.workflowService = new WorkflowService();
    
    this.worker = new Worker(
      'automation-queue',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConfig,
        concurrency: 5,
      }
    );

    this.setupEventListeners();
  }

  /**
   * Process a job from the queue
   */
  private async processJob(job: Job): Promise<any> {
    const { type, data } = job.data;

    switch (type) {
      case 'execute_workflow':
        return this.executeWorkflow(data);
      case 'trigger_event':
        return this.triggerEvent(data);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Execute a specific workflow
   */
  private async executeWorkflow(data: { workflowId: string; triggerEvent: SystemEvent }): Promise<any> {
    try {
      const { workflowId, triggerEvent } = data;
      const execution = await this.workflowService.executeWorkflow(workflowId, triggerEvent);
      return { success: true, execution };
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Trigger workflows based on an event
   */
  private async triggerEvent(data: { event: SystemEvent }): Promise<any> {
    try {
      const { event } = data;
      const executions = await this.workflowService.triggerWorkflows(event);
      return { success: true, executions, count: executions.length };
    } catch (error) {
      console.error('Failed to trigger workflows:', error);
      throw error;
    }
  }

  /**
   * Setup worker event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error);
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    await this.worker.run();
    console.log('Automation worker started');
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    console.log('Automation worker stopped');
  }

  /**
   * Get worker status
   */
  getStatus(): string {
    return this.worker.isRunning() ? 'running' : 'stopped';
  }
}
