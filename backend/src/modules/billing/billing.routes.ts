import { Router, Request, Response } from 'express';
import { supabase } from '../../core/config/supabase';

const router = Router();

const getOrgId = (req: Request): string | null => {
  const orgId = (req as any).organizationId;
  const bodyTenant = (req.body as any)?.tenantId;
  return orgId || bodyTenant || null;
};

const getOrgIdFromPath = (req: Request): string | null => {
  const orgId = (req as any).organizationId;
  return orgId || req.params.tenantId || null;
};

const mapPlan = (plan: any): any => ({
  id: plan.id,
  name: plan.name,
  type: plan.type,
  price: Number(plan.price) || 0,
  currency: plan.currency || 'USD',
  interval: plan.cycle || 'monthly',
  features: plan.features || [],
  highlighted: plan.type === 'professional',
  popular: plan.type === 'professional',
  maxMessages: plan.limits?.conversations ?? (plan.type === 'free' ? 100 : plan.type === 'starter' ? 1000 : plan.type === 'professional' ? 10000 : -1),
  maxChannels: plan.limits?.whatsappConnections ?? (plan.type === 'free' ? 1 : plan.type === 'starter' ? 3 : plan.type === 'professional' ? 10 : 25),
  maxContacts: plan.limits?.contacts,
  isActive: plan.is_active,
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
});

const mapSubscription = (sub: any): any => ({
  id: sub.id,
  planId: sub.plan_id,
  status: sub.status,
  cycle: sub.cycle,
  currentPeriodStart: sub.start_date,
  currentPeriodEnd: sub.end_date,
  cancelAtPeriodEnd: sub.cancel_at_period_end,
  trialEndsAt: sub.trial_ends_at,
  plan: sub.plan ? mapPlan(sub.plan) : null,
  createdAt: sub.created_at,
  updatedAt: sub.updated_at,
});

// GET /api/billing/plans
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }

    res.json((data || []).map(mapPlan));
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/billing/plans/:id
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.json(mapPlan(data));
  } catch (err) {
    console.error('Error fetching plan:', err);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /api/billing/subscriptions
router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { planId, cycle = 'monthly', trialDays } = req.body || {};
    if (!planId) {
      return res.status(400).json({ error: 'planId es requerido' });
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const now = new Date();
    const endDate = new Date(now);
    if (cycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    let trialEndsAt: string | null = null;
    let status = 'active';
    if (trialDays && trialDays > 0) {
      trialEndsAt = new Date(now.getTime() + trialDays * 86400000).toISOString();
      status = 'trialing';
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: orgId,
        plan_id: planId,
        status,
        cycle,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    res.status(201).json(mapSubscription({ ...data, plan }));
  } catch (err) {
    console.error('Error creating subscription:', err);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// GET /api/billing/subscriptions/:tenantId
router.get('/subscriptions/:tenantId', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgIdFromPath(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'No subscription found' });
      }
      console.error('Error fetching subscription:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    res.json(mapSubscription({ ...data, plan: data.plans }));
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// PUT /api/billing/subscriptions/:id
router.put('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { planId, cycle, status, cancelAtPeriodEnd } = req.body || {};

    const updates: any = {};
    if (planId) updates.plan_id = planId;
    if (cycle) updates.cycle = cycle;
    if (status) updates.status = status;
    if (typeof cancelAtPeriodEnd === 'boolean') updates.cancel_at_period_end = cancelAtPeriodEnd;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Sin campos para actualizar' });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    res.json(mapSubscription(data));
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// POST /api/billing/subscriptions/:id/cancel
router.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelAtPeriodEnd = true } = req.body || {};

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: cancelAtPeriodEnd })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    res.json(mapSubscription(data));
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /api/billing/invoices/:tenantId
router.get('/invoices/:tenantId', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgIdFromPath(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/billing/invoices
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { subscriptionId, items = [] } = req.body || {};
    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId es requerido' });
    }

    const total = items.reduce((sum: number, item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice ?? item.unit_price) || 0;
      return sum + qty * price;
    }, 0);

    const number = `INV-${Date.now()}`;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        subscription_id: subscriptionId,
        number,
        status: 'pending',
        amount: total,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }

    if (items.length > 0) {
      const itemsToInsert = items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice ?? item.unit_price) || 0;
        return {
          invoice_id: invoice.id,
          description: item.description || 'Item',
          quantity: qty,
          unit_price: price,
          amount: qty * price,
        };
      });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError);
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// POST /api/billing/invoices/:id/pay
router.post('/invoices/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error paying invoice:', err);
    res.status(500).json({ error: 'Failed to pay invoice' });
  }
});

// GET /api/billing/payment-methods/:tenantId
router.get('/payment-methods/:tenantId', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgIdFromPath(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return res.status(500).json({ error: 'Failed to fetch payment methods' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// POST /api/billing/payment-methods
router.post('/payment-methods', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { type, provider, last4, expiryMonth, expiryYear, brand, isDefault, token } = req.body || {};

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        organization_id: orgId,
        type: type || 'card',
        provider: provider || 'manual',
        provider_payment_method_id: token || null,
        last4: last4 || null,
        expiry_month: expiryMonth || null,
        expiry_year: expiryYear || null,
        brand: brand || null,
        is_default: Boolean(isDefault),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment method:', error);
      return res.status(500).json({ error: 'Failed to add payment method' });
    }

    if (isDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .neq('id', data.id);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error adding payment method:', err);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// PUT /api/billing/payment-methods/:id/default
router.put('/payment-methods/:id/default', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { id } = req.params;

    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('organization_id', orgId)
      .neq('id', id);

    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Método de pago no encontrado' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error setting default payment method:', err);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// POST /api/billing/usage
router.post('/usage', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { subscriptionId, metrics = {} } = req.body || {};
    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId es requerido' });
    }

    const { data, error } = await supabase
      .from('usage')
      .insert({
        organization_id: orgId,
        subscription_id: subscriptionId,
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString(),
        metrics,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording usage:', error);
      return res.status(500).json({ error: 'Failed to record usage' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error recording usage:', err);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// GET /api/billing/usage/:tenantId
router.get('/usage/:tenantId', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgIdFromPath(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { startDate, endDate } = req.query as any;

    let query = supabase
      .from('usage')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching usage:', error);
      return res.status(500).json({ error: 'Failed to fetch usage' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching usage:', err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// GET /api/billing/limits/:tenantId
router.get('/limits/:tenantId', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgIdFromPath(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, plans(limits)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    res.json(subscription.plans?.limits || {});
  } catch (err) {
    console.error('Error fetching limits:', err);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

export default router;
