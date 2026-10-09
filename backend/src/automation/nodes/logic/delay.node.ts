/**
 * Delay Node
 * Pauses workflow execution for a specified duration
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';

export class DelayNode extends BaseWorkflowNode {
  type = 'delay';
  name = 'Delay';
  description = 'Pauses workflow execution for a specified duration';
  category = 'logic' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { duration, unit = 'seconds' } = this.config;
    
    try {
      // Convert duration to milliseconds
      const durationMs = this.convertToMs(duration, unit);
      
      // Wait for the specified duration
      await new Promise(resolve => setTimeout(resolve, durationMs));
      
      return this.success({
        delayed: true,
        durationMs,
      });
    } catch (error) {
      return this.error(`Delay failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private convertToMs(duration: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'milliseconds':
      case 'ms':
        return duration;
      case 'seconds':
      case 's':
        return duration * 1000;
      case 'minutes':
      case 'm':
        return duration * 60 * 1000;
      case 'hours':
      case 'h':
        return duration * 60 * 60 * 1000;
      case 'days':
      case 'd':
        return duration * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (config.duration === undefined || config.duration === null) {
      errors.push('duration is required');
    } else if (typeof config.duration !== 'number' || config.duration < 0) {
      errors.push('duration must be a positive number');
    }
    
    if (config.unit && !['milliseconds', 'ms', 'seconds', 's', 'minutes', 'm', 'hours', 'h', 'days', 'd'].includes(config.unit)) {
      errors.push('unit must be one of: milliseconds, seconds, minutes, hours, days');
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
        duration: {
          type: 'number',
          description: 'The duration to wait',
          minimum: 0,
        },
        unit: {
          type: 'string',
          description: 'Time unit (milliseconds, seconds, minutes, hours, days)',
          enum: ['milliseconds', 'ms', 'seconds', 's', 'minutes', 'm', 'hours', 'h', 'days', 'd'],
          default: 'seconds',
        },
      },
      required: ['duration'],
    };
  }
}
