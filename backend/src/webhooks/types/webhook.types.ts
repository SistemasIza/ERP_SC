/**
 * Webhook System Types
 * Type definitions for webhook management
 */

export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  eventType: string;
  payload: any;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  tenantId: string;
  eventId: string;
  eventType: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attemptNumber: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  deliveredAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
}

export interface WebhookSignature {
  timestamp: string;
  signature: string;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  tenantId: string;
  webhookId: string;
}
