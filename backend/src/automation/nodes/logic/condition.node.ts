/**
 * Condition Node
 * Evaluates a condition and routes execution based on the result
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';

export class ConditionNode extends BaseWorkflowNode {
  type = 'condition';
  name = 'Condition';
  description = 'Evaluates a condition and routes execution based on the result';
  category = 'logic' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { condition, trueOutput, falseOutput } = this.config;
    
    try {
      // Evaluate the condition expression
      const result = this.evaluateExpression(condition, context);
      const isTrue = Boolean(result);
      
      // Store result in context
      this.setVariable(context, 'condition.result', isTrue);
      
      // Route to appropriate output
      if (isTrue) {
        return this.success({ result: true }, trueOutput);
      } else {
        return this.success({ result: false }, falseOutput);
      }
    } catch (error) {
      return this.error(`Failed to evaluate condition: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.condition) {
      errors.push('condition expression is required');
    }
    
    if (!config.trueOutput) {
      errors.push('trueOutput node ID is required');
    }
    
    if (!config.falseOutput) {
      errors.push('falseOutput node ID is required');
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
        condition: {
          type: 'string',
          description: 'JavaScript expression to evaluate (e.g., vars.contact.vip === true)',
        },
        trueOutput: {
          type: 'string',
          description: 'Node ID to execute when condition is true',
        },
        falseOutput: {
          type: 'string',
          description: 'Node ID to execute when condition is false',
        },
      },
      required: ['condition', 'trueOutput', 'falseOutput'],
    };
  }
}
