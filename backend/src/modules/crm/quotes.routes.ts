import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/quotes - Get all quotes (with items) for the org
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// POST /api/quotes - Create new quote with items
router.post('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { number, clientName, clientEmail, clientPhone, date, expiryDate, status, items, taxRate, discount, notes, createdBy, history } = req.body;

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        organization_id: orgId,
        number,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        quote_date: date || new Date().toISOString().split('T')[0],
        expiry_date: expiryDate,
        status: status || 'draft',
        tax_rate: taxRate || 0,
        discount: discount || 0,
        notes: notes || '',
        created_by: createdBy || 'Admin',
        history: history || []
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error creating quote:', quoteError);
      return res.status(500).json({ error: 'Failed to create quote' });
    }

    let insertedItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      const itemRows = items.map((i: any) => ({
        quote_id: quote.id,
        description: i.description,
        quantity: i.quantity || 1,
        unit_price: i.unitPrice || 0
      }));

      const { data, error } = await supabase
        .from('quote_items')
        .insert(itemRows)
        .select();

      if (error) {
        console.error('Error creating quote items:', error);
        return res.status(500).json({ error: 'Failed to create quote items' });
      }
      insertedItems = data;
    }

    res.status(201).json({ ...quote, items: insertedItems });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PUT /api/quotes/:id - Update quote (and replace its items)
router.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const { items, ...rest } = req.body;

    const updates: any = { ...rest };
    if (updates.clientName !== undefined) { updates.client_name = updates.clientName; delete updates.clientName; }
    if (updates.clientEmail !== undefined) { updates.client_email = updates.clientEmail; delete updates.clientEmail; }
    if (updates.clientPhone !== undefined) { updates.client_phone = updates.clientPhone; delete updates.clientPhone; }
    if (updates.date !== undefined) { updates.quote_date = updates.date; delete updates.date; }
    if (updates.expiryDate !== undefined) { updates.expiry_date = updates.expiryDate; delete updates.expiryDate; }
    if (updates.taxRate !== undefined) { updates.tax_rate = updates.taxRate; delete updates.taxRate; }
    if (updates.createdBy !== undefined) { updates.created_by = updates.createdBy; delete updates.createdBy; }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (quoteError) {
      console.error('Error updating quote:', quoteError);
      return res.status(500).json({ error: 'Failed to update quote' });
    }

    let insertedItems: any[] = [];
    if (Array.isArray(items)) {
      await supabase.from('quote_items').delete().eq('quote_id', id);

      if (items.length > 0) {
        const itemRows = items.map((i: any) => ({
          quote_id: id,
          description: i.description,
          quantity: i.quantity || 1,
          unit_price: i.unitPrice || 0
        }));

        const { data, error } = await supabase
          .from('quote_items')
          .insert(itemRows)
          .select();

        if (error) {
          console.error('Error replacing quote items:', error);
          return res.status(500).json({ error: 'Failed to update quote items' });
        }
        insertedItems = data;
      }
    }

    res.json({ ...quote, items: insertedItems });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// DELETE /api/quotes/:id - Delete quote (cascade deletes items)
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting quote:', error);
      return res.status(500).json({ error: 'Failed to delete quote' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

export default router;
