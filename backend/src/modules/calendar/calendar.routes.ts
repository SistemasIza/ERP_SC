import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/calendar/events - Get all calendar events for the org
router.get('/events', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching calendar events:', error);
      return res.status(500).json({ error: 'Failed to fetch calendar events' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// POST /api/calendar/events - Create new calendar event
router.post('/events', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { title, date, time, duration, description, attendees, type, color } = req.body;

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        organization_id: orgId,
        title,
        event_date: date,
        time: time || '',
        duration: duration || '',
        description: description || '',
        attendees: attendees || '',
        type: type || 'meeting',
        color: color || 'blue'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return res.status(500).json({ error: 'Failed to create calendar event' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// PUT /api/calendar/events/:id - Update calendar event
router.put('/events/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates = req.body;
    if (updates.date) {
      updates.event_date = updates.date;
      delete updates.date;
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      return res.status(500).json({ error: 'Failed to update calendar event' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// DELETE /api/calendar/events/:id - Delete calendar event
router.delete('/events/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting calendar event:', error);
      return res.status(500).json({ error: 'Failed to delete calendar event' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

export default router;
