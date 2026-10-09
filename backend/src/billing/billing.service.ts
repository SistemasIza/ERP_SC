/**
 * Billing Service
 * Service for billing and subscription management
 */

import { Plan, Subscription, Invoice, PaymentMethod, Usage, BillingEvent, PlanType, BillingCycle, SubscriptionStatus, InvoiceStatus } from './types/billing.types';
import { EventEmitter } from 'events';

export class BillingService extends EventEmitter {
  private plans: Map<string, Plan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private usage: Map<string, Usage> = new Map();

  constructor() {
    super();
    this.initializeDefaultPlans();
  }

  /**
   * Initialize default plans
   */
  private initializeDefaultPlans(): void {
    const defaultPlans: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Free',
        type: 'free',
        price: 0,
        currency: 'USD',
        cycle: 'monthly',
        features: ['Basic messaging', '1 channel', '100 messages/month'],
        limits: {
          users: 1,
          conversations: 100,
          workflows: 0,
          aiTokens: 0,
          apiCalls: 100,
          storage: 1,
        },
        isActive: true,
      },
      {
        name: 'Starter',
        type: 'starter',
        price: 29,
        currency: 'USD',
        cycle: 'monthly',
        features: ['Unlimited messaging', '3 channels', '10,000 messages/month', 'Basic workflows', 'AI assistant'],
        limits: {
          users: 3,
          conversations: 10000,
          workflows: 5,
          aiTokens: 100000,
          apiCalls: 10000,
          storage: 10,
        },
        isActive: true,
      },
      {
        name: 'Professional',
        type: 'professional',
        price: 99,
        currency: 'USD',
        cycle: 'monthly',
        features: ['Unlimited messaging', 'Unlimited channels', '100,000 messages/month', 'Advanced workflows', 'AI assistant', 'Priority support'],
        limits: {
          users: 10,
          conversations: 100000,
          workflows: 50,
          aiTokens: 1000000,
          apiCalls: 100000,
          storage: 100,
        },
        isActive: true,
      },
      {
        name: 'Enterprise',
        type: 'enterprise',
        price: 299,
        currency: 'USD',
        cycle: 'monthly',
        features: ['Everything in Professional', 'Unlimited users', 'Unlimited workflows', 'Custom integrations', 'Dedicated support', 'SLA'],
        limits: {
          users: -1, // unlimited
          conversations: -1,
          workflows: -1,
          aiTokens: -1,
          apiCalls: -1,
          storage: -1,
        },
        isActive: true,
      },
    ];

    for (const planData of defaultPlans) {
      const plan: Plan = {
        ...planData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.plans.set(plan.id, plan);
    }
  }

  /**
   * Get all plans
   */
  getPlans(): Plan[] {
    return Array.from(this.plans.values()).filter(p => p.isActive);
  }

  /**
   * Get a plan by ID
   */
  getPlan(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  /**
   * Get a plan by type
   */
  getPlanByType(type: PlanType): Plan | undefined {
    return Array.from(this.plans.values()).find(p => p.type === type && p.isActive);
  }

  /**
   * Create a subscription
   */
  async createSubscription(tenantId: string, planId: string, cycle: BillingCycle, trialDays?: number): Promise<Subscription> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = new Date();
    const startDate = now;
    const endDate = this.calculateEndDate(startDate, cycle);
    const trialEndsAt = trialDays ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined;

    const subscription: Subscription = {
      id: this.generateId(),
      tenantId,
      planId,
      status: trialDays ? 'trialing' : 'active',
      cycle,
      startDate,
      endDate,
      trialEndsAt,
      cancelAtPeriodEnd: false,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscription.id, subscription);
    
    // TODO: Save to database
    this.emit('subscription.created', { subscription });

    return subscription;
  }

  /**
   * Get subscription for a tenant
   */
  getTenantSubscription(tenantId: string): Subscription | undefined {
    return Array.from(this.subscriptions.values()).find(s => s.tenantId === tenantId && s.status !== 'cancelled');
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return null;

    const updatedSubscription: Subscription = {
      ...subscription,
      ...updates,
      id: subscriptionId,
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, updatedSubscription);
    
    // TODO: Update in database
    this.emit('subscription.updated', { subscription: updatedSubscription });

    return updatedSubscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return null;

    if (cancelAtPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
    } else {
      subscription.status = 'cancelled';
      subscription.endDate = new Date();
    }

    subscription.updatedAt = new Date();
    
    // TODO: Update in database
    this.emit('subscription.cancelled', { subscription });

    return subscription;
  }

  /**
   * Create an invoice
   */
  async createInvoice(tenantId: string, subscriptionId: string, items: any[]): Promise<Invoice> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = this.plans.get(subscription.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const invoiceItems = items.map(item => ({
      id: this.generateId(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    const invoice: Invoice = {
      id: this.generateId(),
      tenantId,
      subscriptionId,
      number: this.generateInvoiceNumber(),
      status: 'pending',
      amount: totalAmount,
      currency: plan.currency,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items: invoiceItems,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    
    // TODO: Save to database
    this.emit('invoice.created', { invoice });

    return invoice;
  }

  /**
   * Get invoices for a tenant
   */
  getTenantInvoices(tenantId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(i => i.tenantId === tenantId);
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string, paymentMethodId: string): Promise<Invoice | null> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return null;

    const paymentMethod = this.paymentMethods.get(paymentMethodId);
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // TODO: Process payment with payment provider
    // For now, simulate successful payment
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.updatedAt = new Date();

    this.emit('payment.succeeded', { invoice, paymentMethod });

    return invoice;
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(tenantId: string, type: 'card' | 'bank_account' | 'paypal', provider: string, providerCustomerId: string, providerPaymentMethodId: string, details: any): Promise<PaymentMethod> {
    const paymentMethod: PaymentMethod = {
      id: this.generateId(),
      tenantId,
      type,
      provider,
      providerCustomerId,
      providerPaymentMethodId,
      isDefault: false,
      last4: details.last4,
      expiryMonth: details.expiryMonth,
      expiryYear: details.expiryYear,
      brand: details.brand,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Set as default if it's the first payment method
    const existingMethods = this.getTenantPaymentMethods(tenantId);
    if (existingMethods.length === 0) {
      paymentMethod.isDefault = true;
    }

    this.paymentMethods.set(paymentMethod.id, paymentMethod);
    
    // TODO: Save to database
    this.emit('payment_method.added', { paymentMethod });

    return paymentMethod;
  }

  /**
   * Get payment methods for a tenant
   */
  getTenantPaymentMethods(tenantId: string): PaymentMethod[] {
    return Array.from(this.paymentMethods.values()).filter(pm => pm.tenantId === tenantId);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(tenantId: string, paymentMethodId: string): Promise<boolean> {
    const paymentMethod = this.paymentMethods.get(paymentMethodId);
    if (!paymentMethod || paymentMethod.tenantId !== tenantId) {
      return false;
    }

    // Remove default from all other payment methods
    for (const pm of this.paymentMethods.values()) {
      if (pm.tenantId === tenantId) {
        pm.isDefault = false;
      }
    }

    paymentMethod.isDefault = true;
    paymentMethod.updatedAt = new Date();
    
    // TODO: Update in database
    this.emit('payment_method.updated', { paymentMethod });

    return true;
  }

  /**
   * Record usage
   */
  async recordUsage(tenantId: string, subscriptionId: string, metrics: Partial<Usage['metrics']>): Promise<Usage> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage: Usage = {
      id: this.generateId(),
      tenantId,
      subscriptionId,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      metrics: {
        users: 0,
        conversations: 0,
        workflows: 0,
        aiTokens: 0,
        apiCalls: 0,
        storage: 0,
        ...metrics,
      },
      calculatedCost: 0,
      createdAt: now,
    };

    this.usage.set(usage.id, usage);
    
    // TODO: Save to database
    this.emit('usage.recorded', { usage });

    return usage;
  }

  /**
   * Get usage for a tenant
   */
  getTenantUsage(tenantId: string, startDate?: Date, endDate?: Date): Usage[] {
    let usage = Array.from(this.usage.values()).filter(u => u.tenantId === tenantId);

    if (startDate) {
      usage = usage.filter(u => u.createdAt >= startDate);
    }

    if (endDate) {
      usage = usage.filter(u => u.createdAt <= endDate);
    }

    return usage;
  }

  /**
   * Check if tenant has exceeded limits
   */
  checkLimits(tenantId: string): { exceeded: boolean; limits: Record<string, { current: number; limit: number; exceeded: boolean }> } {
    const subscription = this.getTenantSubscription(tenantId);
    if (!subscription) {
      return { exceeded: false, limits: {} };
    }

    const plan = this.plans.get(subscription.planId);
    if (!plan) {
      return { exceeded: false, limits: {} };
    }

    const currentUsage = this.getTenantUsage(tenantId);
    const metrics = currentUsage.reduce((acc, u) => {
      for (const [key, value] of Object.entries(u.metrics)) {
        acc[key] = (acc[key] || 0) + value;
      }
      return acc;
    }, {} as Record<string, number>);

    const limits: Record<string, { current: number; limit: number; exceeded: boolean }> = {};
    let exceeded = false;

    for (const [key, limit] of Object.entries(plan.limits)) {
      if (limit === -1) continue; // unlimited

      const current = metrics[key] || 0;
      const isExceeded = current > limit;
      if (isExceeded) exceeded = true;

      limits[key] = {
        current,
        limit,
        exceeded: isExceeded,
      };
    }

    return { exceeded, limits };
  }

  /**
   * Calculate end date based on cycle
   */
  private calculateEndDate(startDate: Date, cycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    
    if (cycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return endDate;
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
