/**
 * HTTP Request Node
 * Makes a generic HTTP request to any URL
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';
import axios from 'axios';

export class HttpRequestNode extends BaseWorkflowNode {
  type = 'http_request';
  name = 'HTTP Request';
  description = 'Makes a generic HTTP request to any URL';
  category = 'integration' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { url, method = 'GET', headers = {}, body, params, timeout = 30000, auth } = this.config;
    
    try {
      // Resolve variables
      const resolvedUrl = this.resolveVariables(url, context);
      const resolvedBody = body ? this.resolveObjectVariables(body, context) : undefined;
      const resolvedHeaders = this.resolveObjectVariables(headers, context);
      const resolvedParams = params ? this.resolveObjectVariables(params, context) : undefined;
      const resolvedAuth = auth ? this.resolveObjectVariables(auth, context) : undefined;
      
      // Make HTTP request
      const response = await axios({
        method,
        url: resolvedUrl,
        headers: resolvedHeaders,
        data: resolvedBody,
        params: resolvedParams,
        auth: resolvedAuth,
        timeout,
      });
      
      // Store response in context
      this.setVariable(context, 'http.response', {
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
      this.setVariable(context, 'http.error', {
        message: errorMessage,
      });
      
      return this.error(`HTTP request failed: ${errorMessage}`);
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
    
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
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
          description: 'Request URL (supports {{variable}} syntax)',
        },
        method: {
          type: 'string',
          description: 'HTTP method',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          default: 'GET',
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
        params: {
          type: 'object',
          description: 'URL query parameters',
        },
        auth: {
          type: 'object',
          description: 'Authentication (username/password or bearer token)',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
            bearer: { type: 'string' },
          },
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
