/**
 * Public API Service
 * Service for managing public API access (n8n integration)
 */

import { APIKey, APIRequest, APIResponse, APIRateLimit, PublicWebhook } from './types/public-api.types';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export class PublicAPIService extends EventEmitter {
  private apiKeys: Map<string, APIKey> = new Map();
  private rateLimits: Map<string, APIRateLimit> = new Map();
  private publicWebhooks: Map<string, PublicWebhook> = new Map();

  constructor() {
    super();
  }

  /**
   * Generate a new API key
   */
  generateAPIKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Create an API key for a tenant
   */
  async createAPIKey(tenantId: string, name: string, scopes: string[], expiresAt?: Date): Promise<APIKey> {
    const apiKey: APIKey = {
      id: this.generateId(),
      tenantId,
      name,
      key: this.generateAPIKey(),
      scopes,
      isActive: true,
      expiresAt,
      createdAt: new Date(),
    };

    this.apiKeys.set(apiKey.key, apiKey);
    
    // TODO: Save to database
    this.emit('api_key.created', { apiKey });

    return apiKey;
  }

  /**
   * Validate an API key
   */
  validateAPIKey(apiKey: string): { valid: boolean; tenantId?: string; scopes?: string[] } {
    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData) {
      return { valid: false };
    }

    if (!keyData.isActive) {
      return { valid: false };
    }

    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return { valid: false };
    }

    // Update last used
    keyData.lastUsedAt = new Date();
    
    return {
      valid: true,
      tenantId: keyData.tenantId,
      scopes: keyData.scopes,
    };
  }

  /**
   * Get API keys for a tenant
   */
  getTenantAPIKeys(tenantId: string): APIKey[] {
    return Array.from(this.apiKeys.values()).filter(k => k.tenantId === tenantId);
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(apiKey: string): Promise<boolean> {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) return false;

    keyData.isActive = false;
    
    // TODO: Update in database
    this.emit('api_key.revoked', { apiKey });

    return true;
  }

  /**
   * Delete an API key
   */
  async deleteAPIKey(apiKey: string): Promise<boolean> {
    const deleted = this.apiKeys.delete(apiKey);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('api_key.deleted', { apiKey });
    }

    return deleted;
  }

  /**
   * Check rate limit for a tenant
   */
  checkRateLimit(tenantId: string, limit: { perMinute: number; perHour: number }): { allowed: boolean; resetAt?: Date } {
    const now = new Date();
    let rateLimit = this.rateLimits.get(tenantId);

    if (!rateLimit || rateLimit.resetAt < now) {
      rateLimit = {
        tenantId,
        requestsPerMinute: limit.perMinute,
        requestsPerHour: limit.perHour,
        currentMinute: 0,
        currentHour: 0,
        resetAt: new Date(now.getTime() + 60000), // Reset in 1 minute
      };
      this.rateLimits.set(tenantId, rateLimit);
    }

    if (rateLimit.currentMinute >= rateLimit.requestsPerMinute) {
      return { allowed: false, resetAt: rateLimit.resetAt };
    }

    rateLimit.currentMinute++;
    rateLimit.currentHour++;

    return { allowed: true };
  }

  /**
   * Create a public webhook endpoint
   */
  async createPublicWebhook(tenantId: string, name: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): Promise<PublicWebhook> {
    const path = `/public/webhooks/${this.generateId()}`;
    
    const webhook: PublicWebhook = {
      id: this.generateId(),
      tenantId,
      name,
      path,
      method,
      isActive: true,
      createdAt: new Date(),
    };

    this.publicWebhooks.set(webhook.id, webhook);
    
    // TODO: Save to database
    this.emit('public_webhook.created', { webhook });

    return webhook;
  }

  /**
   * Get public webhooks for a tenant
   */
  getTenantPublicWebhooks(tenantId: string): PublicWebhook[] {
    return Array.from(this.publicWebhooks.values()).filter(w => w.tenantId === tenantId);
  }

  /**
   * Delete a public webhook
   */
  async deletePublicWebhook(webhookId: string): Promise<boolean> {
    const deleted = this.publicWebhooks.delete(webhookId);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('public_webhook.deleted', { webhookId });
    }

    return deleted;
  }

  /**
   * Log an API request
   */
  logRequest(request: APIRequest): void {
    this.emit('api.request', { request });
  }

  /**
   * Log an API response
   */
  logResponse(response: APIResponse): void {
    this.emit('api.response', { response });
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
