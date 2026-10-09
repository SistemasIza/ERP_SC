/**
 * OpenAI Provider
 * Implementation of LLM provider for OpenAI
 */

import { BaseLLMProvider } from './base-provider.interface';
import { LLMRequest, LLMResponse, LLMStreamChunk, LLMConfig, AIError } from '../types/ai.types';
import OpenAI from 'openai';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
  }

  getProviderName(): string {
    return 'openai';
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        functions: request.functions,
        function_call: request.functionCall,
      });

      const choice = response.choices[0];
      const content = choice.message.content || '';
      const functionCall = choice.message.function_call;

      return {
        content,
        finishReason: choice.finish_reason as any,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
        functionCall: functionCall
          ? {
              name: functionCall.name,
              arguments: functionCall.arguments,
            }
          : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *generateCompletionStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        functions: request.functions,
        function_call: request.functionCall,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        yield {
          content: delta?.content || '',
          finishReason: finishReason || undefined,
          delta: {
            content: delta?.content ?? undefined,
            role: delta?.role,
          },
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  estimateCost(request: LLMRequest): number {
    // OpenAI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4o': { input: 0.005, output: 0.015 },
    };

    const modelPricing = pricing[request.model] || pricing['gpt-3.5-turbo'];
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const promptChars = request.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedPromptTokens = Math.ceil(promptChars / 4);
    const estimatedOutputTokens = request.maxTokens || 1000;

    const inputCost = (estimatedPromptTokens / 1000) * modelPricing.input;
    const outputCost = (estimatedOutputTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }
}
