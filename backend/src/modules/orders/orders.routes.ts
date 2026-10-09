import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/orders - Get all orders for the org
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', orgId)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { customer, items, total, status, date, channel } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        organization_id: orgId,
        customer,
        items: items || 0,
        total: total || 0,
        status: status || 'pending',
        order_date: date || new Date().toISOString().split('T')[0],
        channel: channel || 'WhatsApp'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates = req.body;
    if (updates.date !== undefined) { updates.order_date = updates.date; delete updates.date; }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting order:', error);
      return res.status(500).json({ error: 'Failed to delete order' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
