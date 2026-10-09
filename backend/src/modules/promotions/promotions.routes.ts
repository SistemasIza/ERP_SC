import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/promotions - Get all promotions for the org
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      return res.status(500).json({ error: 'Failed to fetch promotions' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// POST /api/promotions - Create new promotion
router.post('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { code, discount, type, minPurchase, usageLimit, used, status, expiresAt } = req.body;

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        organization_id: orgId,
        code,
        discount: discount || 0,
        type: type || 'percentage',
        min_purchase: minPurchase || 0,
        usage_limit: usageLimit || 0,
        used: used || 0,
        status: status || 'active',
        expires_at: expiresAt || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating promotion:', error);
      return res.status(500).json({ error: 'Failed to create promotion' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// PUT /api/promotions/:id - Update promotion
router.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates: any = { ...req.body };
    if (updates.minPurchase !== undefined) { updates.min_purchase = updates.minPurchase; delete updates.minPurchase; }
    if (updates.usageLimit !== undefined) { updates.usage_limit = updates.usageLimit; delete updates.usageLimit; }
    if (updates.expiresAt !== undefined) { updates.expires_at = updates.expiresAt; delete updates.expiresAt; }

    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating promotion:', error);
      return res.status(500).json({ error: 'Failed to update promotion' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting promotion:', error);
      return res.status(500).json({ error: 'Failed to delete promotion' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

export default router;
