/**
 * LLM Completion Node
 * Generates text completion using LLM providers
 */

import { BaseWorkflowNode } from '../base-node.interface';
import { WorkflowContext, NodeResult, ValidationResult, ConfigSchema } from '../../types/workflow.types';
import { AIService } from '../../../ai/ai.service';
import { LLMRequest, LLMMessage } from '../../../ai/types/ai.types';

export class LLMCompletionNode extends BaseWorkflowNode {
  type = 'llm_completion';
  name = 'LLM Completion';
  description = 'Generates text completion using LLM providers';
  category = 'ai' as const;
  private config: any = {};
  private aiService: AIService;

  constructor(aiService: AIService) {
    super();
    this.aiService = aiService;
  }

  setConfig(config: any): void {
    this.config = config;
  }

  async execute(context: WorkflowContext): Promise<NodeResult> {
    const { provider, model, systemPrompt, userPrompt, temperature, maxTokens } = this.config;
    
    try {
      // Resolve variables in prompts
      const resolvedSystemPrompt = this.resolveVariables(systemPrompt, context);
      const resolvedUserPrompt = this.resolveVariables(userPrompt, context);
      
      // Build messages
      const messages: LLMMessage[] = [];
      
      if (resolvedSystemPrompt) {
        messages.push({ role: 'system', content: resolvedSystemPrompt });
      }
      
      messages.push({ role: 'user', content: resolvedUserPrompt });
      
      // Build request
      const request: LLMRequest = {
        provider,
        model,
        messages,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 1000,
      };
      
      // Generate completion
      const response = await this.aiService.generateCompletion(context.tenantId, request);
      
      // Store result in context
      this.setVariable(context, 'llm.completion', response.content);
      this.setVariable(context, 'llm.usage', response.usage);
      this.setVariable(context, 'llm.model', response.model);
      
      return this.success({
        completion: response.content,
        usage: response.usage,
        model: response.model,
      });
    } catch (error) {
      return this.error(`LLM completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private resolveVariables(text: string, context: WorkflowContext): string {
    if (!text) return '';
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getVariable(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  validate(config: any): ValidationResult {
    const errors: string[] = [];
    
    if (!config.provider) {
      errors.push('provider is required');
    }
    
    if (!config.model) {
      errors.push('model is required');
    }
    
    if (!config.userPrompt) {
      errors.push('userPrompt is required');
    }
    
    const validProviders = ['openai', 'anthropic', 'cohere', 'custom'];
    if (config.provider && !validProviders.includes(config.provider)) {
      errors.push(`provider must be one of: ${validProviders.join(', ')}`);
    }
    
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('temperature must be between 0 and 2');
    }
    
    if (config.maxTokens !== undefined && config.maxTokens < 1) {
      errors.push('maxTokens must be greater than 0');
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
        provider: {
          type: 'string',
          description: 'LLM provider to use',
          enum: ['openai', 'anthropic', 'cohere', 'custom'],
        },
        model: {
          type: 'string',
          description: 'Model name (e.g., gpt-4, claude-3-opus)',
        },
        systemPrompt: {
          type: 'string',
          description: 'System prompt for the LLM (supports {{variable}} syntax)',
        },
        userPrompt: {
          type: 'string',
          description: 'User prompt for the LLM (supports {{variable}} syntax)',
        },
        temperature: {
          type: 'number',
          description: 'Temperature for generation (0-2)',
          minimum: 0,
          maximum: 2,
          default: 0.7,
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens to generate',
          minimum: 1,
          default: 1000,
        },
      },
      required: ['provider', 'model', 'userPrompt'],
    };
  }
}
