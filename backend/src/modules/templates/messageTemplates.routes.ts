import express from 'express';
import { messageTemplatesService } from './messageTemplates.service';
import { whatsappCloudService } from '../integrations/platform/whatsappCloudService';
import { supabase } from '../../core/config/supabase';


const router = express.Router();

// GET /api/message-templates - Listar plantillas
router.get('/', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const category = req.query.category as string | undefined;
    const templates = await messageTemplatesService.list(orgId, category);
    res.json(templates);
  } catch (err: any) {
    const msg = err?.message || err?.details || '';
    if (err?.code === '42P01' || err?.code === 'PGRST116' || msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[MessageTemplates] Tabla no existe aún. Ejecuta schema_message_templates.sql');
      return res.json([]);
    }
    console.error('[MessageTemplates] Error listing:', err);
    res.status(500).json({ error: 'No se pudieron cargar las plantillas' });
  }
});

// GET /api/message-templates/stats - Estadísticas de uso
router.get('/stats', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const stats = await messageTemplatesService.getStats(orgId);
    res.json(stats);
  } catch (err: any) {
    const msg = err?.message || err?.details || '';
    if (err?.code === '42P01' || err?.code === 'PGRST116' || msg.includes('does not exist') || msg.includes('relation')) {
      return res.json({ totalTemplates: 0, totalUsage: 0, byCategory: {}, mostUsed: [] });
    }
    console.error('[MessageTemplates] Error getting stats:', err);
    res.status(500).json({ error: 'No se pudieron cargar las estadísticas' });
  }
});

// GET /api/message-templates/:id - Detalle de plantilla
router.get('/:id', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const template = await messageTemplatesService.getOne(req.params.id, orgId);
    res.json(template);
  } catch (err: any) {
    console.error('[MessageTemplates] Error fetching:', err);
    res.status(404).json({ error: 'Plantilla no encontrada' });
  }
});

// POST /api/message-templates - Crear plantilla
router.post('/', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { name, category, content } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la plantilla es obligatorio' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'El contenido de la plantilla es obligatorio' });
    }

    const template = await messageTemplatesService.create({
      organizationId: orgId,
      name: name.trim(),
      category: category || 'general',
      content: content.trim(),
      createdBy: (req as any).userId || null,
    });

    res.status(201).json(template);
  } catch (err: any) {
    console.error('[MessageTemplates] Error creating:', err);
    res.status(500).json({ error: 'No se pudo crear la plantilla' });
  }
});

// PUT /api/message-templates/:id - Actualizar plantilla
router.put('/:id', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.content !== undefined) updates.content = req.body.content;

    const template = await messageTemplatesService.update(req.params.id, orgId, updates);
    res.json(template);
  } catch (err: any) {
    console.error('[MessageTemplates] Error updating:', err);
    res.status(404).json({ error: 'Plantilla no encontrada' });
  }
});

// DELETE /api/message-templates/:id - Eliminar plantilla
router.delete('/:id', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    await messageTemplatesService.delete(req.params.id, orgId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[MessageTemplates] Error deleting:', err);
    res.status(500).json({ error: 'No se pudo eliminar la plantilla' });
  }
});

// POST /api/message-templates/:id/increment-usage - Incrementar contador de uso
router.post('/:id/increment-usage', async (req: any, res: any) => {
  try {
    await messageTemplatesService.incrementUsage(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[MessageTemplates] Error incrementing usage:', err);
    res.status(500).json({ error: 'No se pudo actualizar el contador' });
  }
});

// GET /api/message-templates/meta-templates?connectionId=xxx
// Lista los templates APROBADOS directamente desde Meta (Cloud API)
router.get('/meta-templates', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const connectionId = req.query.connectionId as string;
    if (!connectionId) {
      return res.status(400).json({ error: 'Se requiere el connectionId de la conexión Cloud API' });
    }

    const templates = await whatsappCloudService.getMetaTemplates(connectionId);
    res.json(templates);
  } catch (err: any) {
    console.error('[MessageTemplates] Error fetching Meta templates:', err);
    res.status(500).json({ error: err.message || 'No se pudieron obtener los templates de Meta' });
  }
});

// POST /api/message-templates/send-template
// Envía un template aprobado de Meta a un número de teléfono e inicia la conversación
router.post('/send-template', async (req: any, res: any) => {
  try {
    const orgId = req.organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { connectionId, phoneNumber, templateName, languageCode, components } = req.body;

    if (!connectionId || !phoneNumber || !templateName) {
      return res.status(400).json({
        error: 'Se requieren connectionId, phoneNumber y templateName'
      });
    }

    const cloudConn = whatsappCloudService.getConnection(connectionId);
    if (!cloudConn) {
      return res.status(503).json({ error: 'Conexión Cloud API no encontrada o no inicializada' });
    }

    // Normalizar teléfono
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = (cleanPhone.length === 9 && !cleanPhone.startsWith('51'))
      ? '51' + cleanPhone
      : cleanPhone;

    // Enviar template via Meta
    const adapter = whatsappCloudService.createServiceAdapter(cloudConn);
    const result = await adapter.sendTemplateMessage!(
      normalizedPhone,
      templateName,
      languageCode || 'es',
      components || []
    );

    // Buscar o crear contacto
    const { data: contact } = await supabase
      .from('contacts')
      .upsert({
        organization_id: orgId,
        phone_number: normalizedPhone,
        profile_name: 'Sin nombre',
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,phone_number' })
      .select()
      .single();

    let conversation: any = null;
    if (contact) {
      // Buscar conversación existente
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('contact_id', contact.id)
        .eq('platform_type', 'whatsapp_cloud')
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            organization_id: orgId,
            contact_id: contact.id,
            platform_type: 'whatsapp_cloud',
            platform_connection_id: connectionId,
            status: 'open',
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        conversation = newConv;
      }

      if (conversation) {
        await supabase.from('messages').insert({
          organization_id: orgId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          direction: 'outbound',
          type: 'text',
          content: `[Template: ${templateName}]`,
          status: 'sent',
        });

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }
    }

    res.json({ success: true, metaResult: result, conversation, contact });
  } catch (err: any) {
    console.error('[MessageTemplates] Error sending template:', err);
    res.status(500).json({ error: err.message || 'No se pudo enviar el template' });
  }
});

export default router;

