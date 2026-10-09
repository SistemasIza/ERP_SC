/**
 * AI Module Types
 * Type definitions for AI/LLM integration
 */

export type LLMProvider = 'openai' | 'anthropic' | 'cohere' | 'custom';

export type LLMModel = string;

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface LLMRequest {
  provider: LLMProvider;
  model: LLMModel;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface LLMStreamChunk {
  content: string;
  finishReason?: string;
  delta?: {
    content?: string;
    role?: string;
  };
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  organizationId?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface LLMProviderConfig {
  tenantId: string;
  provider: LLMProvider;
  config: LLMConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIContext {
  tenantId: string;
  conversationId?: string;
  userId?: string;
  metadata: Record<string, any>;
}

export interface AIConversation {
  id: string;
  tenantId: string;
  userId?: string;
  title?: string;
  messages: LLMMessage[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIUsage {
  tenantId: string;
  provider: LLMProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

export interface AIError extends Error {
  code: string;
  provider: LLMProvider;
  retryable: boolean;
}
