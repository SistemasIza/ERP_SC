/**
 * Public API Types
 * Type definitions for public API (n8n integration)
 */

export interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  scopes: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface APIRequest {
  tenantId: string;
  apiKey: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
}

export interface APIResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
  timestamp: Date;
}

export interface APIRateLimit {
  tenantId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  currentMinute: number;
  currentHour: number;
  resetAt: Date;
}

export interface PublicWebhook {
  id: string;
  tenantId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  isActive: boolean;
  createdAt: Date;
}
