/**
 * Send Message Node
 * Sends a message through a specific channel
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';

export class SendMessageNode extends BaseWorkflowNode {
  type = 'send_message';
  name = 'Send Message';
  description = 'Sends a message through a specific channel (WhatsApp, Telegram, etc.)';
  category = 'action' as const;
  private config: any = {};

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { channel, recipient, message, template } = this.config;
    
    try {
      // Resolve variables in message content
      const resolvedMessage = this.resolveVariables(message, context);
      const resolvedRecipient = this.resolveVariables(recipient, context);
      
      // Prepare message payload
      const messagePayload: any = {
        channel,
        recipient: resolvedRecipient,
        content: resolvedMessage,
      };
      
      // Add template if specified
      if (template) {
        messagePayload.template = template;
      }
      
      // TODO: Integrate with actual channel service to send message
      // For now, just log and simulate success
      console.log(`[SendMessageNode] Sending message via ${channel} to ${resolvedRecipient}:`, resolvedMessage);
      
      // Store sent message in context
      this.setVariable(context, 'message.sent', {
        channel,
        recipient: resolvedRecipient,
        content: resolvedMessage,
        timestamp: new Date().toISOString(),
      });
      
      return this.success({
        sent: true,
        channel,
        recipient: resolvedRecipient,
        messageId: this.generateId(),
      });
    } catch (error) {
      return this.error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private resolveVariables(text: string, context: WorkflowContext): string {
    if (!text) return '';
    
    // Replace {{variable}} syntax with actual values
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getVariable(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.channel) {
      errors.push('channel is required');
    }
    
    if (!config.recipient) {
      errors.push('recipient is required');
    }
    
    if (!config.message) {
      errors.push('message is required');
    }
    
    const validChannels = ['whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'webchat'];
    if (config.channel && !validChannels.includes(config.channel)) {
      errors.push(`channel must be one of: ${validChannels.join(', ')}`);
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
        channel: {
          type: 'string',
          description: 'Channel to send message through',
          enum: ['whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'webchat'],
        },
        recipient: {
          type: 'string',
          description: 'Recipient identifier (phone number, user ID, etc.)',
        },
        message: {
          type: 'string',
          description: 'Message content (supports {{variable}} syntax)',
        },
        template: {
          type: 'string',
          description: 'Optional message template name',
        },
      },
      required: ['channel', 'recipient', 'message'],
    };
  }
}
