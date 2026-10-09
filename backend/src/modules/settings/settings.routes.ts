import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// POST /api/settings
router.post('/', async (req, res) => {
  try {
    const { botName, whatsappToken, verifyToken, phoneNumberId, connectionMethod } = req.body;
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const updates: any = {};
    if (botName) updates.name = botName;
    if (phoneNumberId !== undefined) updates.whatsapp_phone_number_id = phoneNumberId;
    if (whatsappToken !== undefined) updates.whatsapp_access_token = whatsappToken;
    if (verifyToken !== undefined) updates.whatsapp_verify_token = verifyToken;
    if (connectionMethod !== undefined) updates.whatsapp_connection_method = connectionMethod;

    const { error } = await supabase.from('organizations').update(updates).eq('id', orgId);

    if (error) throw error;
    res.status(200).json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (!org) return res.status(404).json({ error: 'Settings not found' });

    const maskToken = (token?: string | null) => {
      if (!token || token.length < 8) return '';
      return `${token.slice(0, 4)}...${token.slice(-4)}`;
    };

    res.status(200).json({
      botName: org.name,
      systemStatus: 'active',
      whatsappToken: maskToken(org.whatsapp_access_token),
      verifyToken: maskToken(org.whatsapp_verify_token),
      phoneNumberId: org.whatsapp_phone_number_id || '',
      connectionMethod: org.whatsapp_connection_method || 'qr'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

export default router;
