/**
 * Webhook Service
 * Main service for webhook management and delivery
 */

import { Webhook, WebhookEvent, WebhookDelivery, WebhookPayload } from './types/webhook.types';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export class WebhookService extends EventEmitter {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new webhook
   */
  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Webhook> {
    const newWebhook: Webhook = {
      ...webhook,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.webhooks.set(newWebhook.id, newWebhook);
    
    // TODO: Save to database
    this.emit('webhook.created', { webhook: newWebhook });

    return newWebhook;
  }

  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Get all webhooks for a tenant
   */
  getTenantWebhooks(tenantId: string): Webhook[] {
    return Array.from(this.webhooks.values()).filter(w => w.tenantId === tenantId);
  }

  /**
   * Get active webhooks for a tenant and event
   */
  getActiveWebhooksForEvent(tenantId: string, eventType: string): Webhook[] {
    return Array.from(this.webhooks.values()).filter(
      w => w.tenantId === tenantId && w.isActive && w.events.includes(eventType)
    );
  }

  /**
   * Update a webhook
   */
  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | null> {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;

    const updatedWebhook: Webhook = {
      ...webhook,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.webhooks.set(id, updatedWebhook);
    
    // TODO: Update in database
    this.emit('webhook.updated', { webhook: updatedWebhook });

    return updatedWebhook;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<boolean> {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    this.webhooks.delete(id);
    
    // TODO: Delete from database
    this.emit('webhook.deleted', { webhook });

    return true;
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(event: WebhookEvent): Promise<WebhookDelivery[]> {
    const deliveries: WebhookDelivery[] = [];

    // Get active webhooks for this event
    const webhooks = this.getActiveWebhooksForEvent(event.tenantId, event.eventType);

    // Trigger each webhook
    for (const webhook of webhooks) {
      try {
        const delivery = await this.deliverWebhook(webhook, event);
        deliveries.push(delivery);
      } catch (error) {
        console.error(`Failed to deliver webhook ${webhook.id}:`, error);
      }
    }

    return deliveries;
  }

  /**
   * Deliver a webhook
   */
  private async deliverWebhook(webhook: Webhook, event: WebhookEvent, attemptNumber: number = 1): Promise<WebhookDelivery> {
    const deliveryId = this.generateId();
    
    // Build payload
    const payload: WebhookPayload = {
      event: event.eventType,
      data: event.payload,
      timestamp: event.timestamp.toISOString(),
      tenantId: event.tenantId,
      webhookId: webhook.id,
    };

    // Add signature if secret is configured
    const headers = { ...webhook.headers };
    if (webhook.secret) {
      const signature = this.generateSignature(payload, webhook.secret);
      headers['x-webhook-signature'] = signature;
      headers['x-webhook-timestamp'] = payload.timestamp;
    }

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId: webhook.id,
      tenantId: webhook.tenantId,
      eventId: event.id,
      eventType: event.eventType,
      url: webhook.url,
      method: webhook.method,
      headers,
      payload,
      attemptNumber,
      status: 'pending',
      createdAt: new Date(),
    };

    this.deliveries.set(deliveryId, delivery);

    try {
      // Send HTTP request
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeoutMs),
      });

      delivery.responseStatus = response.status;
      delivery.responseBody = await response.text();
      delivery.status = response.ok ? 'success' : 'failed';
      delivery.deliveredAt = new Date();

      this.emit('webhook.delivered', { delivery, webhook });

      // Handle retry if failed
      if (!response.ok && attemptNumber < webhook.retryPolicy.maxRetries) {
        delivery.status = 'retrying';
        delivery.nextRetryAt = new Date(Date.now() + webhook.retryPolicy.backoffMs * attemptNumber);
        this.scheduleRetry(delivery, webhook, event, attemptNumber);
      }
    } catch (error) {
      delivery.error = error instanceof Error ? error.message : String(error);
      delivery.status = 'failed';

      // Handle retry if error is retryable
      if (attemptNumber < webhook.retryPolicy.maxRetries) {
        delivery.status = 'retrying';
        delivery.nextRetryAt = new Date(Date.now() + webhook.retryPolicy.backoffMs * attemptNumber);
        this.scheduleRetry(delivery, webhook, event, attemptNumber);
      }

      this.emit('webhook.failed', { delivery, webhook, error });
    }

    // TODO: Save delivery to database
    return delivery;
  }

  /**
   * Schedule a retry for a failed webhook delivery
   */
  private scheduleRetry(delivery: WebhookDelivery, webhook: Webhook, event: WebhookEvent, attemptNumber: number): void {
    const delay = webhook.retryPolicy.backoffMs * attemptNumber;
    
    setTimeout(async () => {
      try {
        await this.deliverWebhook(webhook, event, attemptNumber + 1);
      } catch (error) {
        console.error(`Retry failed for webhook ${webhook.id}:`, error);
      }
    }, delay);
  }

  /**
   * Get a delivery by ID
   */
  getDelivery(id: string): WebhookDelivery | undefined {
    return this.deliveries.get(id);
  }

  /**
   * Get deliveries for a webhook
   */
  getWebhookDeliveries(webhookId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(d => d.webhookId === webhookId);
  }

  /**
   * Get deliveries for a tenant
   */
  getTenantDeliveries(tenantId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(d => d.tenantId === tenantId);
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(JSON.parse(payload), secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
