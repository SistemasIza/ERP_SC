import express from 'express';
import QRCode from 'qrcode';
import { multiWhatsAppService } from './multiWhatsAppService';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// Middleware to verify user is authenticated
const authenticateUser = async (req: any, res: any, next: any) => {
  // In a real app, you'd verify JWT token here
  // For now, we'll use a simple user ID from the request
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  // Verify user exists
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  req.user = user;
  next();
};

// GET /api/multi-whatsapp/connections
router.get('/connections', authenticateUser, async (req: any, res: any) => {
  try {
    const { data: connections, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(connections || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/multi-whatsapp/connections
router.post('/connections', authenticateUser, async (req: any, res: any) => {
  try {
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const connection = await multiWhatsAppService.createConnection(
      req.user.id,
      displayName.trim()
    );

    res.status(201).json(connection);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/multi-whatsapp/connections/:id/qr
router.get('/connections/:id/qr', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const qrImage = await multiWhatsAppService.getConnectionQR(id, req.user.id);

    if (!qrImage) {
      return res.status(404).json({ error: 'QR not available' });
    }

    res.json({ qr: qrImage });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/multi-whatsapp/connections/:id/status
router.get('/connections/:id/status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const connection = multiWhatsAppService.getConnection(id);

    if (!connection || connection.userId !== req.user.id) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({
      id: connection.id,
      status: connection.status,
      displayName: connection.displayName,
      phoneNumber: connection.phoneNumber,
      lastConnectedAt: connection.lastConnectedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/multi-whatsapp/connections/:id
router.delete('/connections/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    await multiWhatsAppService.deleteConnection(id, req.user.id);

    res.json({ message: 'Connection deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/multi-whatsapp/connections/:id/assign-flow
router.post('/connections/:id/assign-flow', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { flowId } = req.body;

    if (!flowId) {
      return res.status(400).json({ error: 'Flow ID is required' });
    }

    // Verify connection belongs to user
    const connection = multiWhatsAppService.getConnection(id);
    if (!connection || connection.userId !== req.user.id) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Verify flow belongs to user's organization
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('organization_id', req.user.organization_id)
      .single();

    if (flowError || !flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    // Create flow assignment
    const { data: assignment, error: assignError } = await supabase
      .from('flow_assignments')
      .upsert({
        flow_id: flowId,
        whatsapp_connection_id: id,
        is_active: true
      }, {
        onConflict: 'flow_id,whatsapp_connection_id'
      })
      .select()
      .single();

    if (assignError) {
      return res.status(500).json({ error: assignError.message });
    }

    res.json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/multi-whatsapp/connections/:id/flows
router.get('/connections/:id/flows', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Verify connection belongs to user
    const connection = multiWhatsAppService.getConnection(id);
    if (!connection || connection.userId !== req.user.id) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get assigned flows
    const { data: assignments, error } = await supabase
      .from('flow_assignments')
      .select(`
        flows!inner(*)
      `)
      .eq('whatsapp_connection_id', id)
      .eq('is_active', true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const flows = assignments?.map(a => a.flows) || [];
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/multi-whatsapp/connections/:id/test-message
router.post('/connections/:id/test-message', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'To and message are required' });
    }

    // Verify connection belongs to user
    const connection = multiWhatsAppService.getConnection(id);
    if (!connection || connection.userId !== req.user.id) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.status !== 'connected') {
      return res.status(400).json({ error: 'Connection is not active' });
    }

    const waService = multiWhatsAppService.createWaServiceAdapter(connection);
    const result = await waService.sendTextMessage(to, message);

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize user connections on startup
router.post('/initialize', authenticateUser, async (req: any, res: any) => {
  try {
    await multiWhatsAppService.initializeUserConnections(req.user.id);
    res.json({ message: 'User connections initialized' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
