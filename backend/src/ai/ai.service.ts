/**
 * AI Service
 * Main service for AI/LLM operations
 */

import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, LLMConfig, AIConversation, AIUsage, AIContext } from './types/ai.types';
import { LLMProviderInterface } from './providers/base-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { EventEmitter } from 'events';

export class AIService extends EventEmitter {
  private providers: Map<string, LLMProviderInterface> = new Map();
  private providerConfigs: Map<string, LLMConfig> = new Map();
  private conversations: Map<string, AIConversation> = new Map();
  private usage: AIUsage[] = [];

  constructor() {
    super();
  }

  /**
   * Register a provider configuration for a tenant
   */
  registerProviderConfig(tenantId: string, config: LLMConfig): void {
    const key = `${tenantId}:${config.provider}`;
    this.providerConfigs.set(key, config);

    // Create provider instance
    const provider = this.createProvider(config);
    this.providers.set(key, provider);

    this.emit('provider.registered', { tenantId, provider: config.provider });
  }

  /**
   * Get a provider for a tenant
   */
  getProvider(tenantId: string, provider: LLMProvider): LLMProviderInterface | undefined {
    const key = `${tenantId}:${provider}`;
    return this.providers.get(key);
  }

  /**
   * Generate a completion
   */
  async generateCompletion(tenantId: string, request: LLMRequest, context?: AIContext): Promise<LLMResponse> {
    const provider = this.getProvider(tenantId, request.provider);
    if (!provider) {
      throw new Error(`Provider ${request.provider} not configured for tenant ${tenantId}`);
    }

    try {
      const response = await provider.generateCompletion(request);

      // Track usage
      this.trackUsage(tenantId, request.provider, request.model, response.usage);

      // Emit event
      this.emit('completion.generated', { tenantId, request, response, context });

      return response;
    } catch (error) {
      this.emit('completion.error', { tenantId, request, error, context });
      throw error;
    }
  }

  /**
   * Generate a streaming completion
   */
  async *generateCompletionStream(tenantId: string, request: LLMRequest, context?: AIContext): AsyncGenerator<LLMStreamChunk> {
    const provider = this.getProvider(tenantId, request.provider);
    if (!provider) {
      throw new Error(`Provider ${request.provider} not configured for tenant ${tenantId}`);
    }

    try {
      const stream = provider.generateCompletionStream(request);
      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk.content;
        this.emit('completion.chunk', { tenantId, chunk, context });
        yield chunk;
      }

      // Track estimated usage
      const estimatedTokens = Math.ceil(fullContent.length / 4);
      this.trackUsage(tenantId, request.provider, request.model, {
        promptTokens: 0,
        completionTokens: estimatedTokens,
        totalTokens: estimatedTokens,
      });

      this.emit('completion.stream.completed', { tenantId, request, context });
    } catch (error) {
      this.emit('completion.error', { tenantId, request, error, context });
      throw error;
    }
  }

  /**
   * Create or get a conversation
   */
  getConversation(conversationId: string): AIConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Create a new conversation
   */
  createConversation(tenantId: string, userId?: string, title?: string): AIConversation {
    const conversation: AIConversation = {
      id: this.generateId(),
      tenantId,
      userId,
      title,
      messages: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversation.id, conversation);
    this.emit('conversation.created', { conversation });

    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  addMessageToConversation(conversationId: string, role: 'system' | 'user' | 'assistant', content: string): AIConversation | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    conversation.messages.push({ role, content });
    conversation.updatedAt = new Date();

    this.emit('conversation.message_added', { conversationId, role, content });

    return conversation;
  }

  /**
   * Get conversations for a tenant
   */
  getTenantConversations(tenantId: string): AIConversation[] {
    return Array.from(this.conversations.values()).filter(c => c.tenantId === tenantId);
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): boolean {
    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      this.emit('conversation.deleted', { conversationId });
    }
    return deleted;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(tenantId: string, request: LLMRequest): number {
    const provider = this.getProvider(tenantId, request.provider);
    if (!provider) {
      throw new Error(`Provider ${request.provider} not configured for tenant ${tenantId}`);
    }

    return provider.estimateCost(request);
  }

  /**
   * Get usage statistics for a tenant
   */
  getTenantUsage(tenantId: string, startDate?: Date, endDate?: Date): AIUsage[] {
    let usage = this.usage.filter(u => u.tenantId === tenantId);

    if (startDate) {
      usage = usage.filter(u => u.timestamp >= startDate);
    }

    if (endDate) {
      usage = usage.filter(u => u.timestamp <= endDate);
    }

    return usage;
  }

  /**
   * Get total cost for a tenant
   */
  getTenantTotalCost(tenantId: string, startDate?: Date, endDate?: Date): number {
    const usage = this.getTenantUsage(tenantId, startDate, endDate);
    return usage.reduce((sum, u) => sum + u.cost, 0);
  }

  /**
   * Remove provider configuration
   */
  removeProviderConfig(tenantId: string, provider: LLMProvider): void {
    const key = `${tenantId}:${provider}`;
    this.providers.delete(key);
    this.providerConfigs.delete(key);
    this.emit('provider.removed', { tenantId, provider });
  }

  /**
   * Get all configured providers for a tenant
   */
  getTenantProviders(tenantId: string): LLMProvider[] {
    const providers: LLMProvider[] = [];
    for (const [key, config] of this.providerConfigs.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        providers.push(config.provider);
      }
    }
    return providers;
  }

  /**
   * Create a provider instance based on config
   */
  private createProvider(config: LLMConfig): LLMProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Track usage
   */
  private trackUsage(tenantId: string, provider: LLMProvider, model: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }): void {
    // Calculate cost (simplified, should use actual pricing)
    const cost = this.calculateCost(provider, model, usage);

    const usageRecord: AIUsage = {
      tenantId,
      provider,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost,
      timestamp: new Date(),
    };

    this.usage.push(usageRecord);
    this.emit('usage.tracked', { usageRecord });
  }

  /**
   * Calculate cost based on usage
   */
  private calculateCost(provider: LLMProvider, model: string, usage: { promptTokens: number; completionTokens: number }): number {
    // Simplified pricing (should use actual provider pricing)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    const inputCost = (usage.promptTokens / 1000) * modelPricing.input;
    const outputCost = (usage.completionTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
