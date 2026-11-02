import express from 'express';
import { supabase } from '../../core/config/supabase';
import { multiWhatsAppService } from '../integrations/multiWhatsAppService';
import { whatsappCloudService } from '../integrations/platform/whatsappCloudService';
import { auditLogService } from '../audit/auditLogService';
import { uploadDataUrlToChatMedia } from '../system/mediaService';

const router = express.Router();

// GET /api/conversations
router.get('/', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    // 1. Fetch conversations + contacts (with bot_state inside contacts)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, contact_id, last_message_at, status, assigned_to, created_at, platform_type, organization_id, contacts(phone_number, profile_name, profile_picture, custom_attributes, bot_state)')
      .eq('organization_id', orgId)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Conversations API] DB Error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    if (!conversations || conversations.length === 0) {
      return res.json([]);
    }

    const convIds = conversations.map((c: any) => c.id);
    // Solo importan los mensajes recientes para hallar el último y el no-leídos;
    // la ventana de 7 días acota el volumen descargado (estos queries se paralelizan)
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 2+3+3.5. Paralelizar la carga de agentes y de mensajes (último + no-leídos)
    const [agentsResult, messagesResult, repliedResult] = await Promise.all([
      // Agent names
      (async () => {
        const assignedUserIds = Array.from(new Set(conversations.map((c: any) => c.assigned_to).filter(Boolean)));
        const agentMap = new Map<string, any>();
        if (assignedUserIds.length > 0) {
          try {
            const { data: agentsData } = await supabase
              .from('users')
              .select('id, name, email, avatar_url')
              .in('id', assignedUserIds);
            if (agentsData) {
              agentsData.forEach((agent: any) => agentMap.set(agent.id, agent));
            }
          } catch (e) {
            console.warn('[Conversations API] Failed to fetch agent info:', e);
          }
        }
        return agentMap;
      })(),

      // 3+3.5. Una sola query devuelve, en orden descendente por fecha, los mensajes
      // recientes de las conversaciones (acotada a 7 días). Del primer mensaje de cada
      // conversación se obtiene el contenido del último; el no-leídos se cuentan aquí mismo.
      (async () => {
        const { data: msgs, error: msgsErr } = await supabase
          .from('messages')
          .select('conversation_id, content, status, direction')
          .in('conversation_id', convIds)
          .gte('created_at', since7d)
          .order('created_at', { ascending: false })
          .limit(2000);
        if (msgsErr) {
          console.warn('[Conversations API] Failed to fetch last messages:', msgsErr);
          return { lastMsgMap: new Map<string, string>(), unreadMap: new Map<string, number>() };
        }
        const lastMsgMap = new Map<string, string>();
        const unreadMap = new Map<string, number>();
        if (msgs) {
          for (const msg of msgs) {
            if (!lastMsgMap.has(msg.conversation_id)) {
              lastMsgMap.set(msg.conversation_id, msg.content);
            }
            if (msg.direction === 'inbound' && msg.status !== 'read') {
              unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
            }
          }
        }
        return { lastMsgMap, unreadMap };
      })(),

      // 3.6. ¿El contacto respondió alguna vez? Se marca la conversación si
      // tiene al menos un mensaje entrante, sin importar su antigüedad.
      (async () => {
        const replied = new Set<string>();
        const { data: inboundRows } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('direction', 'inbound')
          .limit(2000);
        if (inboundRows) {
          inboundRows.forEach((row: any) => replied.add(row.conversation_id));
        }

        const missing = convIds.filter((cid: string) => !replied.has(cid));
        if (missing.length > 0) {
          const checks = await Promise.all(missing.map(async (cid: string) => {
            const { data } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', cid)
              .eq('direction', 'inbound')
              .limit(1)
              .maybeSingle();
            return data ? cid : null;
          }));
          checks.forEach((cid) => {
            if (cid) replied.add(cid);
          });
        }
        return replied;
      })(),
    ]);

    const agentMap = agentsResult;
    const { lastMsgMap, unreadMap } = messagesResult;
    const repliedSet = repliedResult;

    // La consulta masiva se limita a 7 días para no descargar todo el historial.
    // Las conversaciones cuyo último mensaje es más antiguo quedarían sin vista
    // previa ("Sin mensajes"), así que se resuelve su último mensaje aparte.
    const missingLastMsgIds = conversations
      .map((c: any) => c.id)
      .filter((cid: string) => !lastMsgMap.has(cid));

    if (missingLastMsgIds.length > 0) {
      const fallbacks = await Promise.all(missingLastMsgIds.map(async (cid: string) => {
        const { data } = await supabase
          .from('messages')
          .select('conversation_id, content')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      }));
      for (const row of fallbacks) {
        if (row) lastMsgMap.set(row.conversation_id, row.content);
      }
    }

    // 4. Format response
    const formattedConversations = conversations.map((conv: any) => {
      const storedPhone = conv.contacts?.phone_number || '';
      const phoneDigits = storedPhone.replace(/\D/g, '');
      const isLidPhone = storedPhone.length > 15 || phoneDigits.length > 15;
      const displayPhone = isLidPhone ? '' : storedPhone;

      return {
        _id: conv.id,
        id: conv.id,
        contactId: {
          id: conv.contact_id,
          _id: conv.contact_id,
          phoneNumber: displayPhone || storedPhone || 'Desconocido',
          name: (conv.contacts?.profile_name && conv.contacts.profile_name !== 'Sin nombre')
            ? conv.contacts.profile_name
            : (displayPhone || storedPhone || 'Sin nombre'),
          profilePicture: conv.contacts?.profile_picture || null,
          tags: Array.isArray(conv.contacts?.custom_attributes?.tags)
            ? conv.contacts.custom_attributes.tags.filter((tag: any) => typeof tag === 'string' && tag.trim())
            : [],
          isGroup: conv.contacts?.custom_attributes?.is_group ||
                   conv.contacts?.phone_number?.includes('-') ||
                   (displayPhone && displayPhone.length > 15)
        },
        lastMessageAt: conv.last_message_at,
        lastMessageContent: lastMsgMap.get(conv.id) || 'Sin mensajes',
        hasReplied: repliedSet.has(conv.id),
        channel: conv.platform_type || 'whatsapp',
        unreadCount: unreadMap.get(conv.id) || 0,
        status: conv.status,
        botState: conv.contacts?.bot_state || 'main_menu',
        assignedTo: conv.assigned_to,
        assignedAgent: conv.assigned_to ? agentMap.get(conv.assigned_to) || null : null,
        createdAt: conv.created_at
      };
    });

    res.json(formattedConversations);
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, created_at, direction, type, status')
      .eq('conversation_id', req.params.id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Return in chronological order
    const formattedMessages = (messages || []).reverse().map((msg: any) => ({
      _id: msg.id,
      direction: msg.direction,
      content: msg.content,
      createdAt: msg.created_at,
      type: msg.type,
      status: msg.status
    }));

    // The agent is viewing this conversation → mark its inbound messages as read
    // so the "No leídos" count clears (fire-and-forget, non-blocking).
    void (async () => {
      try {
        await supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('conversation_id', req.params.id)
          .eq('organization_id', orgId)
          .eq('direction', 'inbound')
          .neq('status', 'read');
      } catch (e: any) {
        console.warn('[Conversations] Failed to mark messages as read:', e?.message);
      }
    })();

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:id/reactivate-bot — clears contact bot_state (handoff/capture)
// so the bot resumes responding to this conversation.
router.post('/:id/reactivate-bot', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, contact_id, contacts(custom_attributes)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!conversation?.contact_id) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const currentAttributes = (conversation as any)?.contacts?.custom_attributes || {};
    const { error } = await supabase
      .from('contacts')
      .update({
        bot_state: null,
        custom_attributes: { ...currentAttributes, flow_history: [] }
      })
      .eq('id', conversation.contact_id)
      .eq('organization_id', orgId);

    if (error) {
      return res.status(500).json({ error: 'No se pudo reactivar el bot' });
    }

    // Auditoría
    auditLogService.log({
      organizationId: orgId,
      userId: (req as any).user?.id,
      userEmail: (req as any).user?.email,
      action: 'REACTIVATE_BOT',
      resourceType: 'conversation',
      resourceId: id,
      details: 'Bot reactivado manualmente en la conversación',
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'localhost'
    });

    res.json({ success: true, message: 'Bot reactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reactivate bot' });
  }
});

// POST /api/conversations/:id/send  — send a message to a contact via WhatsApp
// Detecta automáticamente el proveedor: 'whatsapp_cloud' usa Cloud API, resto usa Baileys
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, mediaUrl, mediaType, caption, location } = req.body;

    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    const hasLocation = !!location && Number.isFinite(latitude) && Number.isFinite(longitude);

    if (location && !hasLocation) {
      return res.status(400).json({ error: 'Ubicación inválida: se requieren latitude y longitude numéricos.' });
    }
    if (!text && !mediaUrl && !hasLocation) {
      return res.status(400).json({ error: 'El mensaje o el archivo no pueden estar vacíos' });
    }

    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    // Get conversation with contact phone and JID
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contacts(phone_number, custom_attributes)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Obtener el número real del contacto de la conversación.
    // Prioridad: phone_number > whatsapp_jid (de custom_attributes) > external_id de la conversación
    const storedPhone = conversation.contacts?.phone_number;
    const contactJid: string | undefined = (conversation.contacts as any)?.custom_attributes?.whatsapp_jid
      || (conversation as any).external_id;

    let correctedPhone = '';

    if (storedPhone) {
      const cleanPhone = storedPhone.replace(/\D/g, '');
      correctedPhone = cleanPhone;
      console.log(`[Conversations] Using stored phone: ${storedPhone} -> cleaned: ${cleanPhone}`);

      // Si el número tiene 9 dígitos y no empieza con código de país, asumimos que es de Perú
      if (cleanPhone.length === 9 && !cleanPhone.startsWith('51')) {
        correctedPhone = '51' + cleanPhone;
        console.log(`[Conversations] Converted 9-digit number to Peruvian format: ${correctedPhone}`);
      }
    } else if (contactJid) {
      // Extraer número del JID (ej: "51987654321@s.whatsapp.net" -> "51987654321")
      correctedPhone = contactJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      console.log(`[Conversations] No phone_number, extracted from JID: ${contactJid} -> ${correctedPhone}`);
    }

    if (!correctedPhone) {
      return res.status(400).json({ 
        error: 'El contacto no tiene número de teléfono registrado. Puede que este contacto aún no haya enviado un mensaje.' 
      });
    }

    console.log(`[Conversations] Sending to: ${correctedPhone} via provider: ${conversation.platform_type || 'baileys'}`);

    let savedMessage: any;
    let sendResult: any = null;

    // ── ROUTER DE PROVEEDOR ──────────────────────────────────────────────────
    // La conexión Cloud API se identifica por la presencia de platform_connection_id
    // (el platform_type puede ser 'whatsapp' o 'whatsapp_cloud').
    if ((conversation.platform_type === 'whatsapp_cloud' || conversation.platform_type === 'whatsapp') && conversation.platform_connection_id) {
      // ── Cloud API ──────────────────────────────────────────────────────────
      let cloudConn = whatsappCloudService.getConnection(conversation.platform_connection_id);
      if (!cloudConn) {
        // Inicializar desde la BD en memoria si aún no está cargada (p.ej. tras un reinicio)
        try {
          const { data: platformConn } = await supabase
            .from('platform_connections')
            .select('*')
            .eq('id', conversation.platform_connection_id)
            .single();
          if (platformConn) {
            await whatsappCloudService.initializeConnection(platformConn);
            cloudConn = whatsappCloudService.getConnection(conversation.platform_connection_id);
          }
        } catch (initErr) {
          console.error('[Conversations] Error initializing Cloud connection:', initErr);
        }
      }
      if (!cloudConn) {
        return res.status(503).json({ error: 'La conexión de WhatsApp Cloud API no está disponible.' });
      }
      const adapter = whatsappCloudService.createServiceAdapter(cloudConn);

      if (hasLocation) {
        if (!adapter.sendLocationMessage) {
          return res.status(503).json({ error: 'La conexión no soporta el envío de ubicaciones.' });
        }
        sendResult = await adapter.sendLocationMessage(correctedPhone, {
          latitude,
          longitude,
          name: location.name || 'Ubicación compartida',
          address: location.address || '',
        });
      } else if (mediaUrl) {
        const isBase64 = typeof mediaUrl === 'string' && mediaUrl.startsWith('data:');
        if (isBase64 && adapter.sendMediaBuffer) {
          sendResult = await adapter.sendMediaBuffer(correctedPhone, mediaUrl, {
            type: mediaType || 'image',
            caption: text || caption || '',
            filename: req.body.filename,
          });
        } else {
          sendResult = await adapter.sendMediaMessage(correctedPhone, mediaUrl, {
            type: mediaType || 'image',
            caption: text || caption || '',
          });
        }
      } else {
        sendResult = await adapter.sendTextMessage(correctedPhone, text.trim());
      }
    } else {
      // ── Baileys ────────────────────────────────────────────────────────────
      const connections = (multiWhatsAppService as any).getOrganizationConnections(orgId);
      const activeConn = connections.find((c: any) => c.status === 'connected');

      if (!activeConn) {
        return res.status(503).json({ error: 'WhatsApp no está conectado para esta organización. Por favor conecta el dispositivo primero.' });
      }

      const adapter = (multiWhatsAppService as any).createWaServiceAdapter(activeConn);

      if (hasLocation) {
        sendResult = await adapter.sendLocationMessage(correctedPhone, {
          latitude,
          longitude,
          name: location.name || 'Ubicación compartida',
          address: location.address || '',
        }, { jid: contactJid });
      } else if (mediaUrl) {
        sendResult = await adapter.sendMediaMessage(correctedPhone, mediaUrl, {
          jid: contactJid,
          type: mediaType || 'image',
          caption: text || caption || '',
          filename: req.body.filename,
        });
      } else {
        sendResult = await adapter.sendTextMessage(correctedPhone, text.trim(), { jid: contactJid });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Save message to DB
    const isBase64Media = typeof mediaUrl === 'string' && mediaUrl.startsWith('data:');
    // Extraer el id del proveedor (p.ej. wamid de WhatsApp Cloud API) del resultado
    // del envío. Se persiste en messages.whatsapp_message_id para que el webhook
    // de status (delivered/read/failed) pueda hacer match y actualizar los checks.
    const msgId =
      (sendResult as any)?.messages?.[0]?.id ||
      (sendResult as any)?.id ||
      (sendResult as any)?.key?.id ||
      null;

    // El navegador envía el archivo como base64; guardarlo tal cual en la BD
    // infla cada fila varios MB. Se sube a chat-media y se persiste la URL
    // pública, que sirve tanto para el chat como para el historial.
    let storedMediaUrl = mediaUrl;
    if (mediaUrl && isBase64Media) {
      try {
        storedMediaUrl = await uploadDataUrlToChatMedia(mediaUrl, {
          organizationId: orgId,
          keyBase: msgId || `out-${Date.now()}`,
          filename: req.body.filename,
        });
      } catch (uploadError: any) {
        console.warn('[Conversations] No se pudo subir el adjunto a Storage:', uploadError?.message || uploadError);
      }
    }

    // Contenido normalizado de una ubicación compartida (mismo formato que el
    // que produce el webhook para ubicaciones entrantes).
    const locationContent = hasLocation
      ? {
          type: 'location',
          location: {
            latitude,
            longitude,
            name: location.name || 'Ubicación compartida',
            address: location.address || '',
            url: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
          },
        }
      : null;

    const { data: msg } = await supabase
      .from('messages')
      .insert({
        organization_id: orgId,
        conversation_id: id,
        contact_id: conversation.contact_id,
        direction: 'outbound',
        type: hasLocation ? 'location' : mediaUrl ? (mediaType || 'image') : 'text',
        whatsapp_message_id: msgId,
        content: hasLocation
          ? JSON.stringify(locationContent)
          : mediaUrl
          ? JSON.stringify({
              url: storedMediaUrl,
              type: mediaType || 'image',
              filename: req.body.filename || 'adjunto',
              caption: (isBase64Media ? req.body.caption : text) || '',
            })
          : (text || '').trim(),
        status: 'sent'
      })
      .select()
      .single();

    savedMessage = msg;

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId);

    // El agente respondió → marcar inbound como leídos (fire-and-forget)
    void (async () => {
      try {
        await supabase
          .from('messages')
          .update({ status: 'read' })
          .eq('conversation_id', id)
          .eq('organization_id', orgId)
          .eq('direction', 'inbound')
          .neq('status', 'read');
      } catch (e: any) {
        console.warn('[Conversations] Failed to mark messages as read on reply:', e?.message);
      }
    })();

    res.json({
      _id: savedMessage?.id,
      direction: 'outbound',
      content: hasLocation
        ? locationContent
        : mediaUrl
        ? { url: storedMediaUrl, type: mediaType || 'image', filename: req.body.filename, caption: text }
        : (text || '').trim(),
      createdAt: savedMessage?.created_at,
      type: hasLocation ? 'location' : mediaUrl ? (mediaType || 'image') : 'text',
      status: 'sent'
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Error al enviar el mensaje' });
  }
});

// POST /api/conversations/start — Inicia una conversación nueva
// Con Cloud API: envía un template aprobado; Con Baileys: envía texto libre
router.post('/start', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { phoneNumber, text, templateName, languageCode, components, templatePreview, connectionId, provider } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'El número de teléfono es obligatorio' });
    }

    // Normalizar número
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const normalizedPhone = (cleanPhone.length === 9 && !cleanPhone.startsWith('51'))
      ? '51' + cleanPhone
      : cleanPhone;

    let conversationPlatformType = 'whatsapp';
    let platformConnectionId: string | null = null;
    let messageContent = '';
    let wamid: string | null = null;

    if (provider === 'whatsapp_cloud' && connectionId) {
      // ── Iniciar con Cloud API (template obligatorio) ──────────────────────
      if (!templateName) {
        return res.status(400).json({ error: 'Se requiere un template para iniciar conversaciones con Cloud API' });
      }

      let cloudConn = whatsappCloudService.getConnection(connectionId);
      if (!cloudConn) {
        // La conexión vive en memoria; tras un reinicio hay que rehidratarla.
        try {
          const { data: platformConn } = await supabase
            .from('platform_connections')
            .select('*')
            .eq('id', connectionId)
            .single();
          if (platformConn) {
            await whatsappCloudService.initializeConnection(platformConn);
            cloudConn = whatsappCloudService.getConnection(connectionId);
          }
        } catch (initErr) {
          console.error('[Conversations/start] Error initializing Cloud connection:', initErr);
        }
      }
      if (!cloudConn) {
        return res.status(503).json({ error: 'Conexión Cloud API no encontrada' });
      }

      const adapter = whatsappCloudService.createServiceAdapter(cloudConn);
      const sendResult = await adapter.sendTemplateMessage!(normalizedPhone, templateName, languageCode || 'es', components || []);
      wamid = sendResult?.messages?.[0]?.id || null;

      conversationPlatformType = 'whatsapp_cloud';
      platformConnectionId = connectionId;
      messageContent = (templatePreview && String(templatePreview).trim())
        || `[Plantilla: ${templateName}]`;
    } else {
      // ── Iniciar con Baileys (texto libre) ─────────────────────────────────
      if (!text) {
        return res.status(400).json({ error: 'Se requiere un mensaje de texto para iniciar la conversación' });
      }

      const connections = (multiWhatsAppService as any).getOrganizationConnections(orgId);
      const activeConn = connections.find((c: any) => c.status === 'connected');

      if (!activeConn) {
        return res.status(503).json({ error: 'WhatsApp (Baileys) no está conectado' });
      }

      const adapter = (multiWhatsAppService as any).createWaServiceAdapter(activeConn);
      await adapter.sendTextMessage(normalizedPhone, text.trim());

      platformConnectionId = activeConn.id || null;
      messageContent = text.trim();
    }

    // El contacto se busca/crea recién después de que el envío fue exitoso: así
    // un template rechazado o una conexión caída no deja contactos fantasma.
    // Un upsert con profile_name fijo borraría el nombre real ya guardado.
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    let contact = existingContact;
    if (contact) {
      await supabase
        .from('contacts')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', contact.id);
    } else {
      const { data: createdContact } = await supabase
        .from('contacts')
        .insert({
          organization_id: orgId,
          phone_number: normalizedPhone,
          profile_name: 'Sin nombre',
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single();
      contact = createdContact;
    }

    if (!contact) {
      return res.status(500).json({ error: 'No se pudo crear el contacto' });
    }

    // Buscar conversación existente o crear una nueva
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('contact_id', contact.id)
      .eq('platform_type', conversationPlatformType)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          organization_id: orgId,
          contact_id: contact.id,
          platform_type: conversationPlatformType,
          platform_connection_id: platformConnectionId,
          status: 'open',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Guardar el mensaje enviado
    if (conversation) {
      await supabase.from('messages').insert({
        organization_id: orgId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        direction: 'outbound',
        type: 'text',
        whatsapp_message_id: wamid,
        content: messageContent,
        status: 'sent',
      });

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    res.json({
      success: true,
      conversation,
      contact,
    });
  } catch (error: any) {
    console.error('[Conversations/start] Error:', error);
    res.status(500).json({ error: error.message || 'Error al iniciar la conversación' });
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', orgId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// GET /api/contacts - Get all contacts with platform info
router.get('/contacts', async (req, res) => {
  try {
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('last_active_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    // Log para debug: ver qué datos están llegando
    if (contacts && contacts.length > 0) {
      console.log('[Contacts API] First contact:', contacts[0]);
    }

    // Las etiquetas viven en custom_attributes.tags (JSONB) porque la tabla
    // contacts no tiene columna propia. Se exponen también como `tags`.
    const normalizedContacts = (contacts || []).map((contact: any) => ({
      ...contact,
      tags: Array.isArray(contact.custom_attributes?.tags)
        ? contact.custom_attributes.tags.filter((tag: any) => typeof tag === 'string' && tag.trim())
        : [],
    }));

    res.json(normalizedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

export default router;


