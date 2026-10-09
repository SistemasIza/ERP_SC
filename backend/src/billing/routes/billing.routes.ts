/**
 * Billing API Routes
 * REST API endpoints for billing and subscription management
 */

import { Router, Request, Response } from 'express';
import { BillingService } from '../billing.service';

const router = Router();
const billingService = new BillingService();

/**
 * GET /api/billing/plans
 * Get all available plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = billingService.getPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/billing/plans/:id
 * Get a specific plan
 */
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const planId = Array.isArray(id) ? id[0] : id;
    const plan = billingService.getPlan(planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

/**
 * POST /api/billing/subscriptions
 * Create a new subscription
 */
router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { tenantId, planId, cycle, trialDays } = req.body;
    
    if (!tenantId || !planId || !cycle) {
      return res.status(400).json({ error: 'tenantId, planId, and cycle are required' });
    }

    const subscription = await billingService.createSubscription(tenantId, planId, cycle, trialDays);
    res.status(201).json({ subscription });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create subscription' });
  }
});

/**
 * GET /api/billing/subscriptions/:tenantId
 * Get subscription for a tenant
 */
router.get('/subscriptions/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const subscription = billingService.getTenantSubscription(resolvedTenantId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * PUT /api/billing/subscriptions/:id
 * Update a subscription
 */
router.put('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscriptionId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const subscription = await billingService.updateSubscription(subscriptionId, updates);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * POST /api/billing/subscriptions/:id/cancel
 * Cancel a subscription
 */
router.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscriptionId = Array.isArray(id) ? id[0] : id;
    const { cancelAtPeriodEnd } = req.body;

    const subscription = await billingService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * GET /api/billing/invoices/:tenantId
 * Get invoices for a tenant
 */
router.get('/invoices/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const invoices = billingService.getTenantInvoices(resolvedTenantId);
    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * POST /api/billing/invoices
 * Create an invoice
 */
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId, items } = req.body;
    
    if (!tenantId || !subscriptionId || !items) {
      return res.status(400).json({ error: 'tenantId, subscriptionId, and items are required' });
    }

    const invoice = await billingService.createInvoice(tenantId, subscriptionId, items);
    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create invoice' });
  }
});

/**
 * POST /api/billing/invoices/:id/pay
 * Pay an invoice
 */
router.post('/invoices/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = Array.isArray(id) ? id[0] : id;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId is required' });
    }

    const invoice = await billingService.payInvoice(invoiceId, paymentMethodId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Error paying invoice:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to pay invoice' });
  }
});

/**
 * GET /api/billing/payment-methods/:tenantId
 * Get payment methods for a tenant
 */
router.get('/payment-methods/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const paymentMethods = billingService.getTenantPaymentMethods(resolvedTenantId);
    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

/**
 * POST /api/billing/payment-methods
 * Add a payment method
 */
router.post('/payment-methods', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, provider, providerCustomerId, providerPaymentMethodId, details } = req.body;
    
    if (!tenantId || !type || !provider || !providerCustomerId || !providerPaymentMethodId) {
      return res.status(400).json({ error: 'tenantId, type, provider, providerCustomerId, and providerPaymentMethodId are required' });
    }

    const paymentMethod = await billingService.addPaymentMethod(tenantId, type, provider, providerCustomerId, providerPaymentMethodId, details);
    res.status(201).json({ paymentMethod });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

/**
 * PUT /api/billing/payment-methods/:id/default
 * Set default payment method
 */
router.put('/payment-methods/:id/default', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const paymentMethodId = Array.isArray(id) ? id[0] : id;
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const success = await billingService.setDefaultPaymentMethod(tenantId, paymentMethodId);
    if (!success) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

/**
 * POST /api/billing/usage
 * Record usage
 */
router.post('/usage', async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId, metrics } = req.body;
    
    if (!tenantId || !subscriptionId || !metrics) {
      return res.status(400).json({ error: 'tenantId, subscriptionId, and metrics are required' });
    }

    const usage = await billingService.recordUsage(tenantId, subscriptionId, metrics);
    res.status(201).json({ usage });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to record usage' });
  }
});

/**
 * GET /api/billing/usage/:tenantId
 * Get usage for a tenant
 */
router.get('/usage/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { startDate, endDate } = req.query;

    const usage = billingService.getTenantUsage(
      resolvedTenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ usage });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * GET /api/billing/limits/:tenantId
 * Check if tenant has exceeded limits
 */
router.get('/limits/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const limits = billingService.checkLimits(resolvedTenantId);
    res.json({ limits });
  } catch (error) {
    console.error('Error checking limits:', error);
    res.status(500).json({ error: 'Failed to check limits' });
  }
});

export default router;
