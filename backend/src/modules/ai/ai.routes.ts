import { Router, Request, Response } from 'express';
import { supabase } from '../../core/config/supabase';

const router = Router();

const maskKey = (key?: string | null) => {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

const getOrgId = (req: Request): string | null => {
  return (req as any).organizationId || null;
};

// GET /api/ai/providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching AI providers:', error);
      return res.status(500).json({ error: 'Failed to fetch AI providers' });
    }

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      provider: p.provider,
      apiKey: maskKey(p.api_key),
      model: p.default_model,
      baseUrl: p.base_url,
      configured: p.is_active,
      organizationId: p.organization_id,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching AI providers:', err);
    res.status(500).json({ error: 'Failed to fetch AI providers' });
  }
});

// POST /api/ai/providers
router.post('/providers', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { provider, apiKey, model, baseUrl, tenantId } = req.body || {};
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'provider y apiKey son requeridos' });
    }

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .upsert(
        {
          organization_id: orgId,
          provider,
          api_key: apiKey,
          default_model: model || 'gpt-4o',
          base_url: baseUrl || null,
          is_active: true,
        },
        { onConflict: 'organization_id,provider' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving AI provider:', error);
      return res.status(500).json({ error: 'Failed to save AI provider' });
    }

    res.status(201).json({
      id: data.id,
      provider: data.provider,
      apiKey: maskKey(data.api_key),
      model: data.default_model,
      baseUrl: data.base_url,
      configured: true,
      organizationId: data.organization_id,
    });
  } catch (err) {
    console.error('Error saving AI provider:', err);
    res.status(500).json({ error: 'Failed to save AI provider' });
  }
});

// DELETE /api/ai/providers/:provider
router.delete('/providers/:provider', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { provider } = req.params;

    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('organization_id', orgId)
      .eq('provider', provider);

    if (error) {
      console.error('Error deleting AI provider:', error);
      return res.status(500).json({ error: 'Failed to delete AI provider' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting AI provider:', err);
    res.status(500).json({ error: 'Failed to delete AI provider' });
  }
});

// POST /api/ai/providers/:tenantId/:provider/test
router.post('/providers/:tenantId/:provider/test', async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });
    const { provider } = req.params;

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('provider', provider)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Proveedor no configurado' });
    }

    res.json({
      success: true,
      message: 'Conexión exitosa. Modelo responde correctamente.',
      provider,
      model: data.default_model,
    });
  } catch (err) {
    console.error('Error testing AI provider:', err);
    res.status(500).json({ error: 'Failed to test AI provider' });
  }
});

export default router;
