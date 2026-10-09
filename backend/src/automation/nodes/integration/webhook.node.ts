/**
 * Webhook Node
 * Makes an HTTP request to a webhook URL
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';
import axios from 'axios';

export class WebhookNode extends BaseWorkflowNode {
  type = 'webhook';
  name = 'Webhook';
  description = 'Makes an HTTP request to a webhook URL';
  category = 'integration' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { url, method = 'POST', headers = {}, body, timeout = 30000 } = this.config;
    
    try {
      // Resolve variables in URL and body
      const resolvedUrl = this.resolveVariables(url, context);
      const resolvedBody = body ? this.resolveObjectVariables(body, context) : undefined;
      const resolvedHeaders = this.resolveObjectVariables(headers, context);
      
      // Make HTTP request
      const response = await axios({
        method,
        url: resolvedUrl,
        headers: resolvedHeaders,
        data: resolvedBody,
        timeout,
      });
      
      // Store response in context
      this.setVariable(context, 'webhook.response', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      });
      
      return this.success({
        success: true,
        status: response.status,
        data: response.data,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Store error in context
      this.setVariable(context, 'webhook.error', {
        message: errorMessage,
      });
      
      return this.error(`Webhook request failed: ${errorMessage}`);
    }
  }

  private resolveVariables(text: string, context: WorkflowContext): string {
    if (!text) return '';
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getVariable(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private resolveObjectVariables(obj: any, context: WorkflowContext): any {
    if (typeof obj === 'string') {
      return this.resolveVariables(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObjectVariables(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObjectVariables(value, context);
      }
      return resolved;
    }
    
    return obj;
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.url) {
      errors.push('url is required');
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (config.method && !validMethods.includes(config.method.toUpperCase())) {
      errors.push(`method must be one of: ${validMethods.join(', ')}`);
    }
    
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 0)) {
      errors.push('timeout must be a positive number');
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
        url: {
          type: 'string',
          description: 'Webhook URL (supports {{variable}} syntax)',
        },
        method: {
          type: 'string',
          description: 'HTTP method',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'POST',
        },
        headers: {
          type: 'object',
          description: 'HTTP headers',
          properties: {},
        },
        body: {
          type: 'object',
          description: 'Request body (supports {{variable}} syntax)',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds',
          default: 30000,
          minimum: 0,
        },
      },
      required: ['url'],
    };
  }
}
