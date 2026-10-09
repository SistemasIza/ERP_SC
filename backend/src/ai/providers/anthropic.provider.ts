/**
 * Anthropic Provider
 * Implementation of LLM provider for Anthropic Claude
 */

import { BaseLLMProvider } from './base-provider.interface';
import { LLMRequest, LLMResponse, LLMStreamChunk, LLMConfig, AIError } from '../types/ai.types';

export class AnthropicProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(config: LLMConfig) {
    super(config);
  }

  getProviderName(): string {
    return 'anthropic';
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          messages: this.convertMessages(request.messages),
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature,
          top_p: request.topP,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      return {
        content,
        finishReason: data.stop_reason as any,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        model: data.model,
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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          messages: this.convertMessages(request.messages),
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature,
          top_p: request.topP,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                yield {
                  content: parsed.delta?.text || '',
                  delta: {
                    content: parsed.delta?.text,
                  },
                };
              } else if (parsed.type === 'message_stop') {
                yield {
                  content: '',
                  finishReason: parsed.stop_reason,
                };
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private convertMessages(messages: LLMRequest['messages']): any[] {
    // Anthropic expects messages in a different format
    // System message should be separate
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const result: any[] = userMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    if (systemMessage) {
      result.unshift({ role: 'system', content: systemMessage.content });
    }

    return result;
  }

  estimateCost(request: LLMRequest): number {
    // Anthropic pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    };

    const modelPricing = pricing[request.model] || pricing['claude-3-sonnet'];
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const promptChars = request.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedPromptTokens = Math.ceil(promptChars / 4);
    const estimatedOutputTokens = request.maxTokens || 1000;

    const inputCost = (estimatedPromptTokens / 1000) * modelPricing.input;
    const outputCost = (estimatedOutputTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }
}
