import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../core/middleware/auth';
import { supabase } from '../../core/config/supabase';
import { tenantMiddleware } from '../../shared/middleware/tenant.middleware';

const router = Router();

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organization_id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

// Obtener todas las conexiones WhatsApp de una organización
router.get('/', authenticateToken, tenantMiddleware.use.bind(tenantMiddleware), async (req: any, res: any) => {
  try {
    const organization_id = req.organizationId || (req.user && req.user.organization_id);
    
    if (!organization_id) {
       return res.status(401).json({ error: 'No organization context found' });
    }
    
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching WhatsApp connections:', error);
      return res.status(500).json({ error: 'Error fetching connections' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Crear nueva conexión WhatsApp
router.post('/', authenticateToken, tenantMiddleware.use.bind(tenantMiddleware), async (req: any, res: any) => {
  try {
    const { phoneNumber, displayName } = req.body;
    const organization_id = req.organizationId || (req.user && req.user.organization_id);
    const user_id = req.user?.id;

    if (!organization_id || !user_id) {
      return res.status(401).json({ error: 'Auth credentials missing' });
    }

    // Verificar límite de 2 conexiones por organización
    const { data: existingConnections } = await supabase
      .from('whatsapp_connections')
      .select('id')
      .eq('organization_id', organization_id);

    if (existingConnections && existingConnections.length >= 2) {
      return res.status(400).json({ 
        error: 'Maximum WhatsApp connections reached (2 per organization)' 
      });
    }

    const { data, error } = await supabase
      .from('whatsapp_connections')
      .insert({
        organization_id,
        user_id,
        display_name: displayName,
        phone_number: phoneNumber,
        status: 'disconnected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating WhatsApp connection:', error);
      return res.status(500).json({ error: 'Error creating connection' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Eliminar conexión WhatsApp
router.delete('/:id', authenticateToken, tenantMiddleware.use.bind(tenantMiddleware), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const organization_id = req.organizationId || (req.user && req.user.organization_id);

    if (!organization_id) {
      return res.status(401).json({ error: 'Organization context missing' });
    }

    const { data, error } = await supabase
      .from('whatsapp_connections')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id); // Seguridad: solo puede eliminar sus propias conexiones

    if (error) {
      console.error('Error deleting WhatsApp connection:', error);
      return res.status(500).json({ error: 'Error deleting connection' });
    }

    res.json({ message: 'Connection deleted successfully' });
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Actualizar estado de conexión WhatsApp
router.patch('/:id/status', authenticateToken, tenantMiddleware.use.bind(tenantMiddleware), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, qrCode } = req.body;
    const organization_id = req.organizationId || (req.user && req.user.organization_id);

    if (!organization_id) {
      return res.status(401).json({ error: 'Organization context missing' });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'connected') {
      updateData.last_connected_at = new Date().toISOString();
    }

    if (qrCode) {
      updateData.qr_code = qrCode;
    }

    const { data, error } = await supabase
      .from('whatsapp_connections')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating WhatsApp connection:', error);
      return res.status(500).json({ error: 'Error updating connection' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
