import { Request, Response } from 'express';
import crypto from 'crypto';
import { handleIncomingMessage } from '../bots/engine/flow-core';
import { supabase } from '../../core/config/supabase';
import WhatsAppService from '../integrations/whatsappService';

/**
 * Validates X-Hub-Signature-256 HMAC signature from Meta.
 * Required env var: WHATSAPP_APP_SECRET (from Meta App Dashboard > Settings > Basic)
 */
function verifySignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return false;

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[Webhook] WHATSAPP_APP_SECRET not configured — skipping HMAC validation (INSECURE)');
    return true; // Allow if not configured (dev mode), but warn
  }

  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Validates the WhatsApp Webhook Verification Request
 */
export const verifyWebhook = async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!mode || !token) {
    return res.status(400).send('Missing parameters');
  }

  if (mode !== 'subscribe') {
    return res.sendStatus(403);
  }

  // Check against ALL organizations' verify tokens (multi-tenant)
  const { data: orgs } = await supabase
    .from('organizations')
    .select('whatsapp_verify_token')
    .not('whatsapp_verify_token', 'is', null);

  const orgTokens = (orgs || []).map(o => o.whatsapp_verify_token).filter(Boolean);

  // Also check platform_connections config.webhook_verify_token
  const { data: platformConns } = await supabase
    .from('platform_connections')
    .select('config')
    .eq('platform_type', 'whatsapp')
    .eq('status', 'connected');

  const platformTokens = (platformConns || [])
    .map(c => c.config?.webhook_verify_token)
    .filter(Boolean);

  const allTokens = [...new Set([...orgTokens, ...platformTokens, process.env.WHATSAPP_VERIFY_TOKEN].filter(Boolean))];

  if (allTokens.includes(token as string)) {
    console.log('[Webhook] Verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed for token:', token);
  return res.sendStatus(403);
};

/**
 * Handles incoming WhatsApp messages and status updates
 * Spec: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages
 */
export const handleIncomingWebhook = async (req: Request, res: Response) => {
  try {
    // Validate HMAC signature first
    if (!verifySignature(req)) {
      console.warn('[Webhook] Invalid HMAC signature — rejecting request');
      return res.sendStatus(401);
    }

    const body = req.body;

    // Meta spec: always respond 200 first, then process
    // Webhook must acknowledge receipt quickly (within 20 seconds)
    res.sendStatus(200);

    // Validate object type per Meta spec
    if (body.object !== 'whatsapp_business_account') {
      console.log('[Webhook] Ignoring non-WhatsApp object:', body.object);
      return;
    }

    if (!body.entry || !Array.isArray(body.entry)) {
      return;
    }

    // Process ALL entries (Meta can batch multiple WABAs)
    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        if (change.value) {
          await processChange(change.value);
        }
      }
    }
  } catch (error) {
    console.error('[Webhook] Error handling webhook:', error);
  }
};

async function processChange(changeValue: any) {
    // MM API for WhatsApp: eventos account_update (onboarding)
    if (changeValue.event) {
      await handleAccountUpdateEvent(changeValue);
    }

    // Process messages (Meta can send multiple messages in one payload)
    if (changeValue.messages && Array.isArray(changeValue.messages)) {
      for (const message of changeValue.messages) {
        await processIncomingMessage(message, changeValue);
      }
    }

    // Process status updates
    if (changeValue.statuses && Array.isArray(changeValue.statuses)) {
      for (const status of changeValue.statuses) {
        console.log(`[Webhook] Status update: ${status.status} for message ${status.id}`);
        // Update message status in DB
        if (status.id && status.status) {
          const dbStatus = status.status === 'read' ? 'read' :
                          status.status === 'delivered' ? 'delivered' :
                          status.status === 'sent' ? 'sent' :
                          status.status === 'failed' ? 'failed' : null;
          if (dbStatus) {
            await supabase
              .from('messages')
              .update({ status: dbStatus })
              .eq('whatsapp_message_id', status.id);
          }
        }
      }
    }
};

/**
 * MM API for WhatsApp: procesa los eventos account_update de onboarding.
 * Eventos: MM_LITE_TERMS_SIGNED (ToS firmado) y AD_ACCOUNT_LINKED (legacy).
 * value = { event, waba_info: { owner_business_id, waba_id, ad_account_id } }
 */
async function handleAccountUpdateEvent(value: any) {
  const event = value.event;
  const info = value.waba_info || {};
  const wabaId = info.waba_id;
  const ownerBusinessId = info.owner_business_id;
  const adAccountId = info.ad_account_id;

  console.log(`[Webhook] MM API account_update: ${event} | waba=${wabaId} | business=${ownerBusinessId}${adAccountId ? ` | adAccount=${adAccountId}` : ''}`);

  // Persistir el evento (best-effort; si la tabla aún no existe, no interrumpe el webhook).
  try {
    await supabase.from('platform_webhook_events').insert({
      platform: 'whatsapp',
      event_type: 'account_update',
      event_name: event,
      waba_id: wabaId,
      owner_business_id: ownerBusinessId,
      ad_account_id: adAccountId,
      raw_payload: value,
    });
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.code !== '42P01' && !msg.includes('not find the table') && !msg.includes('relation') && !msg.includes('42P01')) {
      console.error('[Webhook] Error persisting account_update event:', err?.message || err);
    }
  }

  // Si terminó el onboarding (ToS firmado), marcamos la conexión WhatsApp como onboarded
  // en memoria para que el status refleje la elegibilidad sin depender del mapeo WABA→número.
  if (event === 'MM_LITE_TERMS_SIGNED' && wabaId) {
    console.log(`[Webhook] MM API ToS firmado para WABA ${wabaId} (business ${ownerBusinessId}). El cliente ya puede enviar marketing optimizado.`);
  }
}

/**
 * Process a single incoming message from the webhook payload
 */
async function processIncomingMessage(message: any, changeValue: any) {
  try {
    const senderPhone = message.from;
    const profileName = changeValue.contacts?.[0]?.profile?.name || '';
    const receivingPhoneId = changeValue.metadata.phone_number_id;

    // Ignore messages from groups
    if (message.participant || senderPhone.includes('@g.us')) {
      return;
    }

    console.log(`[Webhook] Message from ${senderPhone} (type: ${message.type})`);

    // Detect numeric button replies (Cloud API sends them as plain text).
    // When the user types a number (e.g. "1", "2") after a numbered button
    // list, treat it as a button continuation for the flow engine.
    if (message.type === 'text' && message.text?.body) {
      const cleanText = message.text.body.trim();
      const numberMatch = cleanText.match(/^(\d+)$/);
      if (numberMatch) {
        message.isNumericButtonResponse = true;
        message.buttonNumber = numberMatch[1];
        console.log(`[Webhook] Detected numeric button response: ${message.buttonNumber}`);
      }
    }

    // Lookup organization by phone number ID
    let { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('whatsapp_phone_number_id', receivingPhoneId)
      .single();

    // Fallback: lookup via platform_connections (Cloud API stores phone_number_id there)
    if (!organization) {
      const { data: platformConn } = await supabase
        .from('platform_connections')
        .select('organization_id')
        .eq('platform_type', 'whatsapp')
        .eq('platform_account_id', receivingPhoneId)
        .eq('status', 'connected')
        .single();

      if (platformConn?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', platformConn.organization_id)
          .single();
        organization = org;
      }
    }

    if (!organization) {
      console.warn('[Webhook] No organization found for phone_number_id:', receivingPhoneId, '— message dropped');
      return;
    }

    // Upsert Contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          organization_id: organization.id,
          phone_number: senderPhone,
          profile_name: profileName,
          platform_type: 'whatsapp_cloud',
          last_active_at: new Date().toISOString()
        },
        { onConflict: 'organization_id,phone_number' }
      )
      .select()
      .single();

    if (contactError || !contact) {
      console.error('[Webhook] Error upserting contact:', contactError);
      return;
    }

    // Upsert Conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('contact_id', contact.id)
      .single();

    let connectionMethod = organization.whatsapp_connection_method || 'qr';
    let platformConnectionId: string | null = null;

    // Detect Cloud API from platform_connections
    {
      const { data: platformConn } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('platform_type', 'whatsapp')
        .eq('platform_account_id', receivingPhoneId)
        .eq('status', 'connected')
        .single();
      if (platformConn) {
        connectionMethod = 'cloud';
        platformConnectionId = platformConn.id;
      }
    }

    if (!conversation) {
      const insertData: any = { organization_id: organization.id, contact_id: contact.id };
      if (connectionMethod === 'cloud') {
        // Use 'whatsapp' (not 'whatsapp_cloud') for platform_type because the
        // conversations.platform_type CHECK constraint in the deployed DB may
        // not yet include 'whatsapp_cloud'. The Cloud-vs-QR distinction is
        // handled via platform_connection_id, not via this field.
        insertData.platform_type = 'whatsapp';
        insertData.platform_connection_id = platformConnectionId;
      }
      const { data: newConv } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single();
      conversation = newConv;
    } else {
      // Update existing conversation - ensure platform_connection_id is set for Cloud API
      const updateData: any = { last_message_at: new Date().toISOString() };
      if (connectionMethod === 'cloud' && platformConnectionId && !conversation.platform_connection_id) {
        updateData.platform_type = 'whatsapp';
        updateData.platform_connection_id = platformConnectionId;
      }
      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversation.id);
    }

    // Save Incoming Message (with deduplication)
    if (message.id) {
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('whatsapp_message_id', message.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(`[Webhook] Duplicate message ${message.id} — skipping`);
        return;
      }
    }

    // Normalize the message content/type so it passes the `messages.type` CHECK
    // constraint (which only allows text/image/audio/video/document/location/contact).
    // Interactive button/list replies are stored as text with the chosen option.
    let messageType = message.type || 'text';
    let messageContent = message.text?.body || JSON.stringify(message);

    if (message.type === 'interactive') {
      const reply = message.interactive?.button_reply || message.interactive?.list_reply;
      messageType = 'text';
      messageContent = reply?.title || 'Opción seleccionada';
    } else if (message.type === 'image') messageType = 'image';
    else if (message.type === 'video') messageType = 'video';
    else if (message.type === 'document') messageType = 'document';
    else if (message.type === 'audio') messageType = 'audio';
    else if (message.type === 'location') messageType = 'location';
    else if (message.type === 'contact') messageType = 'contact';

    await supabase.from('messages').insert({
      organization_id: organization.id,
      conversation_id: conversation?.id,
      contact_id: contact.id,
      direction: 'inbound',
      type: messageType,
      content: messageContent,
      whatsapp_message_id: message.id
    });

    // Process bot flow
    const organizationConfig = {
      organizationId: organization.id,
      conversationId: conversation?.id,
      contactId: contact.id,
      whatsappConnectionId: platformConnectionId || undefined
    };

    let waService;

    if (connectionMethod === 'cloud') {
      const { data: platformConn } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('platform_type', 'whatsapp')
        .eq('platform_account_id', receivingPhoneId)
        .eq('status', 'connected')
        .single();

      if (platformConn) {
        const { whatsappCloudService } = await import('../integrations/platform/whatsappCloudService');
        await whatsappCloudService.initializeConnection(platformConn);
        const cloudConn = whatsappCloudService['connections'].get(platformConn.id);
        if (cloudConn) {
          waService = whatsappCloudService.createServiceAdapter(cloudConn);
        }
      }
      if (!waService) {
        waService = new WhatsAppService({
          phoneNumberId: organization.whatsapp_phone_number_id || receivingPhoneId,
          accessToken: organization.whatsapp_access_token || ''
        });
      }
    } else {
      const { multiWhatsAppService } = await import('../integrations/multiWhatsAppService');
      const connections = multiWhatsAppService.getOrganizationConnections(organization.id);
      const activeConn = connections.find(c => c.status === 'connected');

      if (activeConn) {
        waService = multiWhatsAppService.createWaServiceAdapter(activeConn);
      } else {
        waService = new WhatsAppService({
          phoneNumberId: organization.whatsapp_phone_number_id || '',
          accessToken: organization.whatsapp_access_token || ''
        });
      }
    }

    await handleIncomingMessage(message, senderPhone, organizationConfig, waService);
  } catch (error) {
    console.error('[Webhook] Error processing message:', error);
  }
}
