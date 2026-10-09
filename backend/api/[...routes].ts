import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { verifyWebhook, handleIncomingWebhook } from '../src/modules/system/webhookController';
import usersRoutes from '../src/modules/users/users.routes';
import conversationsRoutes from '../src/modules/chat/conversations.routes';
import analyticsRoutes from '../src/modules/analytics/analytics.routes';
import settingsRoutes from '../src/modules/settings/settings.routes';
import flowsRoutes from '../src/modules/bots/bots.routes';
import qrRoutes from '../src/modules/integrations/whatsappQR.routes';
import leadsRoutes from '../src/modules/leads/leads.routes';
import debugRoutes from '../src/modules/system/debug.routes';
import adminRoutes from '../src/modules/admin/admin.routes';
import authRoutes from '../src/modules/auth/auth.routes';
import { multiWhatsAppService } from '../src/modules/integrations/multiWhatsAppService';

import { tenantMiddleware } from '../src/core/middleware/tenant';
const app = express();

// Supabase is a cloud DB, no persistent connection needed

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// tenantMiddleware moved down

// Rutas base para el frontend y validación
app.get('/', (req: Request, res: Response) => {
  res.send('API Backend del SaaS de WhatsApp Funcionando Correctamente');
});

// Rutas Públicas (Auth y Webhooks)
app.use('/api/auth', authRoutes);
app.get('/api/webhook', verifyWebhook);
app.post('/api/webhook', handleIncomingWebhook);

// Middleware Multi-Tenancy (Requerido para el resto)
app.use(tenantMiddleware);

// APIs para el Dashboard
app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/admin', adminRoutes);

// Iniciar servidor localmente si no estamos en Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor local corriendo en puerto ${PORT}`);
  });
}

// Iniciar todas las conexiones de WhatsApp al arrancar
const initializeWhatsApp = async () => {
  try {
    const { data: connections } = await require('../config/supabase').supabase
      .from('whatsapp_connections')
      .select('*');
    
    for (const conn of connections || []) {
      await multiWhatsAppService.initializeConnection(conn);
    }
    console.log(`[Backend] Initialized ${connections?.length || 0} WhatsApp connections`);
  } catch (err) {
    console.error('Error auto-initializing WhatsApp connections:', err);
  }
};

initializeWhatsApp();

// Exportar como handler serverless para Vercel
export default app;
