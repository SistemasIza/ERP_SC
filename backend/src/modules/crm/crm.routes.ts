import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// GET /api/crm/clients - Get CRM clients (bounded cap to prevent unbounded scans)
router.get('/clients', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 1000, 1000);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching CRM clients:', error);
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/crm/clients - Create new CRM client
router.post('/clients', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { name, email, phone, company, status, source, notes, assigned_to } = req.body;

    const { data, error } = await supabase
      .from('crm_clients')
      .insert({
        organization_id: orgId,
        name,
        email,
        phone,
        company,
        status: status || 'lead',
        source: source || 'manual',
        notes,
        assigned_to
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating CRM client:', error);
      return res.status(500).json({ error: 'Failed to create client' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/crm/clients/:id - Update CRM client
router.put('/clients/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('crm_clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating CRM client:', error);
      return res.status(500).json({ error: 'Failed to update client' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/crm/clients/:id - Delete CRM client
router.delete('/clients/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('crm_clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting CRM client:', error);
      return res.status(500).json({ error: 'Failed to delete client' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// GET /api/crm/deals - Get all deals
router.get('/deals', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('crm_deals')
      .select('*, crm_clients(name, email)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
      return res.status(500).json({ error: 'Failed to fetch deals' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// POST /api/crm/deals - Create new deal
router.post('/deals', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { client_id, name, value, stage, probability, expected_close_date, assigned_to, notes } = req.body;

    const { data, error } = await supabase
      .from('crm_deals')
      .insert({
        organization_id: orgId,
        client_id,
        name,
        value: value || 0,
        stage: stage || 'prospecting',
        probability: probability || 10,
        expected_close_date,
        assigned_to,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deal:', error);
      return res.status(500).json({ error: 'Failed to create deal' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PUT /api/crm/deals/:id - Update deal
router.put('/deals/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('crm_deals')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      return res.status(500).json({ error: 'Failed to update deal' });
    }

    res.json(data);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE /api/crm/deals/:id - Delete deal
router.delete('/deals/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { id } = req.params;

    const { error } = await supabase
      .from('crm_deals')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting deal:', error);
      return res.status(500).json({ error: 'Failed to delete deal' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// GET /api/crm/pipeline - Get pipeline stages and deals
router.get('/pipeline', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    // Get all deals grouped by stage
    const { data: deals, error } = await supabase
      .from('crm_deals')
      .select('*, crm_clients(name, email, company)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pipeline:', error);
      return res.status(500).json({ error: 'Failed to fetch pipeline' });
    }

    // Define pipeline stages
    const stages = [
      { id: 'prospecting', name: 'Prospectación', color: '#6366f1' },
      { id: 'qualification', name: 'Calificación', color: '#8b5cf6' },
      { id: 'proposal', name: 'Propuesta', color: '#ec4899' },
      { id: 'negotiation', name: 'Negociación', color: '#f59e0b' },
      { id: 'closed_won', name: 'Ganado', color: '#10b981' },
      { id: 'closed_lost', name: 'Perdido', color: '#ef4444' }
    ];

    // Group deals by stage
    const pipeline = stages.map(stage => ({
      ...stage,
      deals: (deals || []).filter((deal: any) => deal.stage === stage.id)
    }));

    res.json(pipeline);
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// GET /api/crm/dashboard - Get CRM dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    // Get total clients
    const { data: clients, error: clientsError } = await supabase
      .from('crm_clients')
      .select('id, status')
      .eq('organization_id', orgId);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }

    // Get total deals
    const { data: deals, error: dealsError } = await supabase
      .from('crm_deals')
      .select('id, stage, value, client_id')
      .eq('organization_id', orgId);

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }

    // Calculate metrics
    const totalDeals = deals?.length || 0;

    // "Clientes potenciales": oportunidades abiertas (deals sin cerrar), sin duplicar con
    // los clientes ya registrados en la tabla crm_clients (evita doble conteo).
    const registeredClientIds = new Set((clients || []).map((c: any) => c.id));
    const potentialClientIds = new Set<string>();
    (deals || [])
      .filter((d: any) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .forEach((d: any) => {
        if (d.client_id && !registeredClientIds.has(d.client_id)) potentialClientIds.add(d.client_id);
      });
    const totalClients = (clients?.length || 0) + potentialClientIds.size;
    
    // Count clients by status
    const clientsByStatus = {
      lead: (clients || []).filter((c: any) => c.status === 'lead').length,
      prospect: (clients || []).filter((c: any) => c.status === 'prospect').length,
      customer: (clients || []).filter((c: any) => c.status === 'customer').length,
      churned: (clients || []).filter((c: any) => c.status === 'churned').length
    };

    // Count deals by stage
    const dealsByStage = {
      prospecting: (deals || []).filter((d: any) => d.stage === 'prospecting').length,
      qualification: (deals || []).filter((d: any) => d.stage === 'qualification').length,
      proposal: (deals || []).filter((d: any) => d.stage === 'proposal').length,
      negotiation: (deals || []).filter((d: any) => d.stage === 'negotiation').length,
      closed_won: (deals || []).filter((d: any) => d.stage === 'closed_won').length,
      closed_lost: (deals || []).filter((d: any) => d.stage === 'closed_lost').length
    };

    // Calculate total value
    const totalValue = (deals || []).reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);
    const wonValue = (deals || []).filter((d: any) => d.stage === 'closed_won').reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);

    res.json({
      totalClients,
      totalDeals,
      potentialClients: potentialClientIds.size,
      clientsByStatus,
      dealsByStage,
      totalValue,
      wonValue,
      conversionRate: totalClients > 0 ? Math.round((clientsByStatus.customer / totalClients) * 100) : 0
    });
  } catch (err) {
    console.error('Detailed Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;
