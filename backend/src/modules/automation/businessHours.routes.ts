import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/business-hours - Get all business hours for the org
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('organization_id', orgId)
      .order('day', { ascending: true });

    if (error) {
      console.error('Error fetching business hours:', error);
      return res.status(500).json({ error: 'Failed to fetch business hours' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

// POST /api/business-hours - Create new business hour (upsert by day)
router.post('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { day, openTime, closeTime, autoResponse } = req.body;

    const { data, error } = await supabase
      .from('business_hours')
      .upsert({
        organization_id: orgId,
        day,
        open_time: openTime,
        close_time: closeTime,
        auto_response: autoResponse || ''
      }, { onConflict: 'organization_id,day' })
      .select()
      .single();

    if (error) {
      console.error('Error creating business hour:', error);
      return res.status(500).json({ error: 'Failed to create business hour' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create business hour' });
  }
});

// PUT /api/business-hours/:id - Update business hour
router.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates = req.body;
    if (updates.openTime) updates.open_time = updates.openTime;
    if (updates.closeTime) updates.close_time = updates.closeTime;
    if (updates.autoResponse !== undefined) updates.auto_response = updates.autoResponse;
    if (updates.openTime) delete updates.openTime;
    if (updates.closeTime) delete updates.closeTime;
    if (updates.autoResponse !== undefined) delete updates.autoResponse;

    const { data, error } = await supabase
      .from('business_hours')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business hour:', error);
      return res.status(500).json({ error: 'Failed to update business hour' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update business hour' });
  }
});

// DELETE /api/business-hours/:id - Delete business hour
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('business_hours')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting business hour:', error);
      return res.status(500).json({ error: 'Failed to delete business hour' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete business hour' });
  }
});

export default router;
