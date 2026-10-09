/**
 * Event Trigger Node
 * Starts a workflow when a specific event is received
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';

export class EventTriggerNode extends BaseWorkflowNode {
  type = 'event_trigger';
  name = 'Event Trigger';
  description = 'Starts the workflow when a specific event is received';
  category = 'trigger' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { eventType, eventFilters } = this.config;
    
    // Check if the trigger event matches the configured event type
    if (context.triggerEvent.type !== eventType) {
      return this.error('Event type does not match trigger configuration');
    }
    
    // Apply event filters if configured
    if (eventFilters) {
      for (const [key, expectedValue] of Object.entries(eventFilters)) {
        const actualValue = context.triggerEvent.payload[key];
        if (actualValue !== expectedValue) {
          return this.error(`Event filter failed for ${key}`);
        }
      }
    }
    
    // Store event data in context variables
    this.setVariable(context, 'event', context.triggerEvent);
    this.setVariable(context, 'event.type', context.triggerEvent.type);
    this.setVariable(context, 'event.source', context.triggerEvent.source);
    this.setVariable(context, 'event.payload', context.triggerEvent.payload);
    
    return this.success({
      eventType: context.triggerEvent.type,
      source: context.triggerEvent.source,
      payload: context.triggerEvent.payload,
    });
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.eventType) {
      errors.push('eventType is required');
    }
    
    if (config.eventFilters && typeof config.eventFilters !== 'object') {
      errors.push('eventFilters must be an object');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          description: 'The event type to trigger on (e.g., message.received, contact.created)',
        },
        eventFilters: {
          type: 'object',
          description: 'Optional filters to apply to the event payload',
          properties: {},
        },
      },
      required: ['eventType'],
    };
  }
}
