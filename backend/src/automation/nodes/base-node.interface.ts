/**
 * Base Node Interface
 * All workflow nodes must implement this interface
 */

import { WorkflowContext, NodeResult, ValidationResult } from '../types/workflow.types';

export interface WorkflowNodeExecutor {
  type: string;
  name: string;
  description: string;
  category: 'trigger' | 'logic' | 'action' | 'integration' | 'ai' | 'utility';
  
  /**
   * Execute the node with the given context
   */
  execute(context: WorkflowContext): Promise<NodeResult>;
  
  /**
   * Validate the node configuration
   */
  validate(config: any): ValidationResult;
  
  /**
   * Get the schema for this node's configuration
   */
  getConfigSchema(): ConfigSchema;
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  properties?: Record<string, ConfigProperty>;
  items?: ConfigProperty;
}

/**
 * Abstract base class for workflow nodes
 */
export abstract class BaseWorkflowNode implements WorkflowNodeExecutor {
  abstract type: string;
  abstract name: string;
  abstract description: string;
  abstract category: 'trigger' | 'logic' | 'action' | 'integration' | 'ai' | 'utility';
  
  abstract execute(context: WorkflowContext): Promise<NodeResult>;
  abstract validate(config: any): ValidationResult;
  abstract getConfigSchema(): ConfigSchema;
  
  /**
   * Helper method to extract variable from context
   */
  protected getVariable(context: WorkflowContext, path: string): any {
    const parts = path.split('.');
    let value: any = context.variables;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return undefined;
    }
    
    return value;
  }
  
  /**
   * Helper method to set variable in context
   */
  protected setVariable(context: WorkflowContext, path: string, value: any): void {
    const parts = path.split('.');
    let obj: any = context.variables;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]];
    }
    
    obj[parts[parts.length - 1]] = value;
  }
  
  /**
   * Helper method to evaluate expression
   */
  protected evaluateExpression(expression: string, context: WorkflowContext): any {
    try {
      // Simple variable substitution
      const vars = context.variables;
      // eslint-disable-next-line no-new-func
      const func = new Function('vars', `return ${expression}`);
      return func(vars);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }
  
  /**
   * Helper method to create success result
   */
  protected success(output?: any, nextNodeId?: string): NodeResult {
    return {
      success: true,
      output,
      nextNodeId,
    };
  }
  
  /**
   * Helper method to create error result
   */
  protected error(error: Error | string): NodeResult {
    return {
      success: false,
      error: typeof error === 'string' ? new Error(error) : error,
    };
  }
  
  /**
   * Helper method to create stop result
   */
  protected stop(output?: any): NodeResult {
    return {
      success: true,
      output,
      shouldStop: true,
    };
  }
}
