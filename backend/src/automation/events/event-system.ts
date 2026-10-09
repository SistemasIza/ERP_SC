/**
 * Event System
 * Manages system events and triggers workflows based on events
 */

import { EventEmitter } from 'events';
import { WorkflowService } from '../workflow.service';
import { SystemEvent, EventType } from '../types/workflow.types';

export class EventSystem extends EventEmitter {
  private workflowService: WorkflowService;
  private eventQueue: SystemEvent[] = [];
  private processing = false;

  constructor(workflowService: WorkflowService) {
    super();
    this.workflowService = workflowService;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.on('event.received', async (event: SystemEvent) => {
      await this.processEvent(event);
    });
  }

  /**
   * Emit a system event
   */
  emitEvent(event: SystemEvent): void {
    this.eventQueue.push(event);
    this.emit('event.received', event);
  }

  /**
   * Process an event and trigger matching workflows
   */
  private async processEvent(event: SystemEvent): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      // Log the event
      console.log(`[EventSystem] Processing event: ${event.type} for tenant: ${event.tenantId}`);

      // Trigger workflows that match this event
      const executions = await this.workflowService.triggerWorkflows(event);

      console.log(`[EventSystem] Triggered ${executions.length} workflows for event: ${event.type}`);

      // Emit completion event
      this.emit('event.processed', { event, executions });
    } catch (error) {
      console.error(`[EventSystem] Error processing event:`, error);
      this.emit('event.error', { event, error });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Create a system event
   */
  createEvent(
    tenantId: string,
    type: EventType,
    source: string,
    payload: any,
    metadata?: Partial<SystemEvent['metadata']>
  ): SystemEvent {
    return {
      id: this.generateId(),
      tenantId,
      type,
      source,
      payload,
      metadata: {
        timestamp: Date.now(),
        ...metadata,
      },
    };
  }

  /**
   * Emit a contact created event
   */
  emitContactCreated(tenantId: string, contactData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.CONTACT_CREATED,
      'contact_service',
      contactData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a contact updated event
   */
  emitContactUpdated(tenantId: string, contactData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.CONTACT_UPDATED,
      'contact_service',
      contactData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a message received event
   */
  emitMessageReceived(tenantId: string, messageData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.MESSAGE_RECEIVED,
      messageData.channel || 'unknown',
      messageData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a message sent event
   */
  emitMessageSent(tenantId: string, messageData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.MESSAGE_SENT,
      messageData.channel || 'unknown',
      messageData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a conversation assigned event
   */
  emitConversationAssigned(tenantId: string, assignmentData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.CONVERSATION_ASSIGNED,
      'assignment_service',
      assignmentData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a lead created event
   */
  emitLeadCreated(tenantId: string, leadData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.LEAD_CREATED,
      'crm_service',
      leadData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a deal won event
   */
  emitDealWon(tenantId: string, dealData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.DEAL_WON,
      'crm_service',
      dealData
    );
    this.emitEvent(event);
  }

  /**
   * Emit a channel connected event
   */
  emitChannelConnected(tenantId: string, channelData: any): void {
    const event = this.createEvent(
      tenantId,
      EventType.CHANNEL_CONNECTED,
      'channel_service',
      channelData
    );
    this.emitEvent(event);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event queue status
   */
  getQueueStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.eventQueue.length,
      processing: this.processing,
    };
  }
}
