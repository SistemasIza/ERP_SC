/**
 * Create Contact Node
 * Creates a new contact in the system
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';

export class CreateContactNode extends BaseWorkflowNode {
  type = 'create_contact';
  name = 'Create Contact';
  description = 'Creates a new contact in the system';
  category = 'action' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { contactData, updateIfExists = false } = this.config;
    
    try {
      // Resolve variables in contact data
      const resolvedData = this.resolveObjectVariables(contactData, context);
      
      // TODO: Integrate with actual contact service
      // For now, simulate contact creation
      console.log('[CreateContactNode] Creating contact:', resolvedData);
      
      const contactId = this.generateId();
      const contact = {
        id: contactId,
        ...resolvedData,
        createdAt: new Date().toISOString(),
      };
      
      // Store created contact in context
      this.setVariable(context, 'contact.created', contact);
      this.setVariable(context, 'contact.id', contactId);
      
      return this.success({
        created: true,
        contactId,
        contact,
      });
    } catch (error) {
      return this.error(`Failed to create contact: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  private resolveVariables(text: string, context: WorkflowContext): string {
    if (!text) return '';
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getVariable(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private generateId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.contactData) {
      errors.push('contactData is required');
    } else if (typeof config.contactData !== 'object') {
      errors.push('contactData must be an object');
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
        contactData: {
          type: 'object',
          description: 'Contact data (supports {{variable}} syntax)',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            externalId: { type: 'string' },
          },
        },
        updateIfExists: {
          type: 'boolean',
          description: 'Update contact if it already exists',
          default: false,
        },
      },
      required: ['contactData'],
    };
  }
}
