/**
 * Base LLM Provider Interface
 * All LLM providers must implement this interface
 */

import { LLMRequest, LLMResponse, LLMStreamChunk, LLMConfig, AIError } from '../types/ai.types';

export interface LLMProviderInterface {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Configure the provider
   */
  configure(config: LLMConfig): void;

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig;

  /**
   * Generate a completion (non-streaming)
   */
  generateCompletion(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Generate a streaming completion
   */
  generateCompletionStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;

  /**
   * Validate the request
   */
  validateRequest(request: LLMRequest): { valid: boolean; errors: string[] };

  /**
   * Estimate cost for a request
   */
  estimateCost(request: LLMRequest): number;

  /**
   * Handle errors
   */
  handleError(error: any): AIError;
}

export abstract class BaseLLMProvider implements LLMProviderInterface {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract getProviderName(): string;

  configure(config: LLMConfig): void {
    this.config = config;
  }

  getConfig(): LLMConfig {
    return this.config;
  }

  abstract generateCompletion(request: LLMRequest): Promise<LLMResponse>;

  abstract generateCompletionStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;

  validateRequest(request: LLMRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.messages || request.messages.length === 0) {
      errors.push('Messages array is required and must not be empty');
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (request.maxTokens !== undefined && request.maxTokens < 1) {
      errors.push('maxTokens must be greater than 0');
    }

    if (request.topP !== undefined && (request.topP < 0 || request.topP > 1)) {
      errors.push('topP must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  abstract estimateCost(request: LLMRequest): number;

  handleError(error: any): AIError {
    const aiError = error as AIError;
    return {
      name: error.name || 'AIError',
      message: error.message || 'Unknown error occurred',
      code: aiError.code || 'UNKNOWN_ERROR',
      provider: this.config.provider,
      retryable: aiError.retryable ?? this.isRetryable(error),
      stack: error.stack,
    };
  }

  protected isRetryable(error: any): boolean {
    const retryableCodes = ['rate_limit_exceeded', 'timeout', 'server_error', '503', '502', '429'];
    const errorMessage = error.message?.toLowerCase() || '';
    
    return (
      retryableCodes.some(code => error.code === code || errorMessage.includes(code)) ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit')
    );
  }
}
