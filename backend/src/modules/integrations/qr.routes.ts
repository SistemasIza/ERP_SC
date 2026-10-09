import { Router, Response } from 'express';
import { multiWhatsAppService } from './multiWhatsAppService';
import { supabase } from '../../core/config/supabase';
import { tenantMiddleware, TenantRequest } from '../../core/middleware/tenant';
import QRCode from 'qrcode';

const router = Router();

// Caché de imágenes QR: evita re-codificar el PNG en cada poll (5s/30s).
const qrImageCache = new Map<string, string>();

async function getQRImage(connection: any): Promise<string | null> {
  if (!connection?.qr) return null;
  const cacheKey = `${connection.id}:${connection.qr}`;
  const cached = qrImageCache.get(cacheKey);
  if (cached) return cached;
  try {
    const dataUrl = await QRCode.toDataURL(connection.qr);
    qrImageCache.set(cacheKey, dataUrl);
    if (qrImageCache.size > 200) {
      const firstKey = qrImageCache.keys().next().value;
      if (firstKey) qrImageCache.delete(firstKey);
    }
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR image:', err);
    return null;
  }
}

// Helper to get primary connection for organization
async function getOrgConnection(orgId: string) {
  let connections = multiWhatsAppService.getOrganizationConnections(orgId);
  
  if (connections.length === 0) {
    // Check DB in case it wasn't initialized in memory
    const { data: dbConns, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('organization_id', orgId)
      .limit(1);
    
    if (error) {
      console.error('[QR Route] Error searching for connection in DB:', error.message);
      return null;
    }

    if (dbConns && dbConns.length > 0) {
      await multiWhatsAppService.initializeConnection(dbConns[0]);
      return multiWhatsAppService.getConnection(dbConns[0].id);
    }
    return null;
  }
  
  return connections[0];
}

// GET /api/qr/status
router.get('/status', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization ID required. Add X-Organization-ID header.' });

    const connection = await getOrgConnection(orgId);
    
    if (!connection) {
      return res.json({ status: 'disconnected', message: 'No connection found' });
    }

    let qrImage = await getQRImage(connection);

    res.json({
      id: connection.id,
      status: connection.status,
      qr: qrImage,
      displayName: connection.displayName,
      phoneNumber: connection.phoneNumber,
      lastConnectedAt: connection.lastConnectedAt
    });
  } catch (error: any) {
    console.error('Error in /qr/status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qr/init
router.post('/init', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const userId = req.headers['x-user-id'] as string;
    
    if (!orgId) return res.status(400).json({ error: 'Organization ID required. Add X-Organization-ID header.' });

    let connection = await getOrgConnection(req.organizationId!);
    
    if (!connection) {
      if (!userId) {
        // Fallback: try to find a user in this organization
        const { data: orgUser } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1)
          .single();
        
        if (!orgUser) return res.status(400).json({ error: 'UserId required and no default user found' });
        connection = await multiWhatsAppService.createConnection(orgUser.id, 'Principal');
      } else {
        connection = await multiWhatsAppService.createConnection(userId, 'Principal');
      }
    }

    if (!connection) {
      return res.status(500).json({ error: 'Failed to initialize or create connection' });
    }

    // Force start connection to get QR
    await multiWhatsAppService.startConnection(connection.id);

    res.json({ message: 'WhatsApp connection initialized', id: connection.id });
  } catch (error: any) {
    console.error('Error in /qr/init:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qr/logout
router.post('/logout', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization ID required. Add X-Organization-ID header.' });

    const connection = await getOrgConnection(orgId);
    
    if (connection && connection.userId) {
      await multiWhatsAppService.deleteConnection(connection.id, connection.userId);
      res.json({ message: 'Logged out and connection deleted', status: 'disconnected' });
    } else if (connection) {
      // If we don't have userId in memory but have a connection ID
      const { data: dbConn } = await supabase
        .from('whatsapp_connections')
        .select('user_id')
        .eq('id', connection.id)
        .single();
      
      if (dbConn) {
        await multiWhatsAppService.deleteConnection(connection.id, dbConn.user_id);
        return res.json({ message: 'Logged out and connection deleted', status: 'disconnected' });
      }
      res.status(400).json({ error: 'Could not find user associated with connection' });
    } else {
      res.json({ message: 'No connection to logout', status: 'disconnected' });
    }
  } catch (error: any) {
    console.error('Error in /qr/logout:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
