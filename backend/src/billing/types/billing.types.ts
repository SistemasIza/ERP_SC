/**
 * Billing System Types
 * Type definitions for billing and subscription management
 */

export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'unpaid';

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  currency: string;
  cycle: BillingCycle;
  features: string[];
  limits: {
    users: number;
    conversations: number;
    workflows: number;
    aiTokens: number;
    apiCalls: number;
    storage: number; // in GB
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  items: InvoiceItem[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'card' | 'bank_account' | 'paypal';
  provider: string; // stripe, paypal, etc.
  providerCustomerId: string;
  providerPaymentMethodId: string;
  isDefault: boolean;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Usage {
  id: string;
  tenantId: string;
  subscriptionId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    users: number;
    conversations: number;
    workflows: number;
    aiTokens: number;
    apiCalls: number;
    storage: number;
  };
  calculatedCost: number;
  createdAt: Date;
}

export interface BillingEvent {
  id: string;
  tenantId: string;
  type: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' | 'invoice_created';
  data: any;
  timestamp: Date;
}
