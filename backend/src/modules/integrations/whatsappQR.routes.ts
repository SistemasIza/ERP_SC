import express from 'express';
// @ts-ignore
import QRCode from 'qrcode';
import { multiWhatsAppService } from './multiWhatsAppService';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// Caché de imágenes QR: evita re-codificar el PNG en cada poll (5s/30s).
// La clave incluye el payload QR; cuando cambia (init/logout) se regenera.
const qrImageCache = new Map<string, string>();

async function getQRImage(connection: any): Promise<string | null> {
  if (!connection?.qr) return null;
  const cacheKey = `${connection.id}:${connection.qr}`;
  const cached = qrImageCache.get(cacheKey);
  if (cached) return cached;
  try {
    const dataUrl = await QRCode.toDataURL(connection.qr);
    qrImageCache.set(cacheKey, dataUrl);
    // Limitar el tamaño del caché por si hay muchas conexiones
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
    // Check DB in case it wasn't initialized
    const { data: dbConns } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('organization_id', orgId)
      .limit(1);
    
    if (dbConns && dbConns.length > 0) {
      await multiWhatsAppService.initializeConnection(dbConns[0]);
      return multiWhatsAppService.getConnection(dbConns[0].id);
    }
    return null;
  }
  
  return connections[0];
}

// GET /api/qr/status
router.get('/status', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(401).json({ error: 'No organization context' });

    const connection = await getOrgConnection(orgId);
    
    if (!connection) {
      return res.json({ status: 'disconnected', message: 'No connection found for this organization' });
    }

    let qrImage = await getQRImage(connection);

    res.json({
      id: connection.id,
      status: connection.status,
      qr: qrImage,
      displayName: connection.displayName,
      phoneNumber: connection.phoneNumber
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qr/init
router.post('/init', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    const userId = (req as any).headers['x-user-id']; // We should ideally get this from auth middleware
    
    if (!orgId) return res.status(401).json({ error: 'No organization context' });

    let connection = await getOrgConnection(orgId);
    
    if (!connection) {
      if (!userId) return res.status(400).json({ error: 'UserId required to create connection' });
      // Create a default connection if none exists
      connection = await multiWhatsAppService.createConnection(userId, 'Principal');
    } else {
      // Just re-init if existing
      await multiWhatsAppService.initializeConnection(connection);
    }

    if (!connection) {
      return res.status(500).json({ error: 'Failed to initialize or create connection' });
    }

    // Force start connection to ensure QR is generated
    await multiWhatsAppService.startConnection(connection.id);

    res.json({ message: 'WhatsApp connection initialized', id: connection.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qr/test-send
router.post('/test-send', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Se requiere "to" y "message"' });
    }

    const connection = await getOrgConnection(orgId);
    if (!connection || connection.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp no está conectado para esta organización' });
    }

    const adapter = multiWhatsAppService.createWaServiceAdapter(connection);
    const result = await adapter.sendTextMessage(to, message);
    
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qr/logout
router.post('/logout', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    const userId = (req as any).headers['x-user-id'];

    const connection = await getOrgConnection(orgId);
    if (connection && connection.userId) {
      await multiWhatsAppService.deleteConnection(connection.id, connection.userId);
      res.json({ message: 'Logged out and connection deleted' });
    } else {
      res.json({ message: 'No active connection found to logout' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
