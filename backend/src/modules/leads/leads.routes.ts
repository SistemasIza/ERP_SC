import express from 'express';
import { supabase } from '../../core/config/supabase';
import { tenantMiddleware } from '../../shared/middleware/tenant.middleware';

const router = express.Router();

router.get('/', tenantMiddleware.use.bind(tenantMiddleware), async (req, res) => {
    try {
        const orgId = (req as any).organizationId;
        if (!orgId) return res.status(404).json({ error: 'Organization not found' });

        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

        const { data, error } = await supabase
            .from('contacts')
            .select('id, phone_number, profile_name, custom_attributes, last_active_at, created_at')
            .eq('organization_id', orgId)
            .contains('custom_attributes', { is_potential_lead: true })
            .order('last_active_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching leads:', error);
            return res.status(500).json({ error: 'Failed to fetch leads' });
        }

        res.json(data || []);
    } catch (err) {
        console.error('Detailed Error:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

export default router;
