import axios from 'axios';
import { supabase } from '../../../core/config/supabase';
import { handleIncomingMessage } from '../../bots/engine/flow-core';
import { BasePlatformService, PlatformConnection, PlatformMessage, PlatformServiceAdapter } from './basePlatformService';

export class MercadoLibreService extends BasePlatformService {
  getPlatformType(): 'mercadolibre' {
    return 'mercadolibre';
  }

  async initializeConnection(connectionData: any): Promise<void> {
    const connection: PlatformConnection = {
      id: connectionData.id,
      userId: connectionData.user_id,
      organizationId: connectionData.organization_id,
      platformType: 'mercadolibre',
      displayName: connectionData.display_name,
      platformAccountId: connectionData.platform_account_id,
      status: connectionData.status || 'disconnected',
      config: connectionData.config || {},
      lastConnectedAt: connectionData.last_connected_at ? new Date(connectionData.last_connected_at) : undefined
    };

    this.connections.set(connectionData.id, connection);

    const { data: mlConfig } = await supabase
      .from('mercadolibre_configs')
      .select('*')
      .eq('platform_connection_id', connectionData.id)
      .single();

    if (mlConfig && connection.status === 'connected') {
      await this.setupWebhook(connection, mlConfig);
    }
  }

  async startConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Mercado Libre connection not found');

    const { data: mlConfig } = await supabase
      .from('mercadolibre_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    if (!mlConfig) {
      throw new Error('Mercado Libre config not found');
    }

    try {
      const response = await axios.get(
        `https://api.mercadolibre.com/users/me`,
        {
          headers: { Authorization: `Bearer ${mlConfig.access_token}` }
        }
      );
      
      if (response.data.id) {
        connection.status = 'connected';
        connection.lastConnectedAt = new Date();
        connection.platformAccountId = mlConfig.seller_id;
        
        await this.updateConnectionStatus(connectionId, 'connected', mlConfig.seller_id);
        await this.setupWebhook(connection, mlConfig);
      }
    } catch (error) {
      console.error('Error verifying Mercado Libre access token:', error);
      connection.status = 'error';
      await this.updateConnectionStatus(connectionId, 'error');
    }
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      const { data: mlConfig } = await supabase
        .from('mercadolibre_configs')
        .select('*')
        .eq('platform_connection_id', connectionId)
        .single();

      if (mlConfig) {
        try {
          // Mercado Libre webhook deletion (if supported)
          console.log('[Mercado Libre] Webhook deletion');
        } catch (error) {
          console.error('Error deleting Mercado Libre webhook subscription:', error);
        }
      }
      
      this.connections.delete(connectionId);
    }

    await supabase
      .from('platform_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    await supabase
      .from('mercadolibre_configs')
      .delete()
      .eq('platform_connection_id', connectionId);
  }

  async processIncomingMessage(rawMessage: any, connection: PlatformConnection): Promise<void> {
    try {
      // Mercado Libre messages come via webhooks
      const mlMessage = this.parseMercadoLibreMessage(rawMessage);
      if (!mlMessage) return;

      const senderId = mlMessage.from;

      console.log(`[Mercado Libre] Incoming message from ${senderId} on connection ${connection.displayName}`);

      const { contact, conversation } = await this.saveMessageData(
        mlMessage,
        senderId,
        connection
      );

      const organizationConfig = {
        organizationId: connection.organizationId,
        conversationId: conversation?.id || undefined,
        contactId: contact?.id || undefined,
        platformConnectionId: connection.id,
        platformType: 'mercadolibre',
        senderId
      };

      const formattedMessage = this.formatMessageForFlow(mlMessage, senderId);
      await handleIncomingMessage(formattedMessage, senderId, organizationConfig, this.createServiceAdapter(connection));

    } catch (error) {
      console.error(`Error processing Mercado Libre message for connection ${connection.id}:`, error);
    }
  }

  async handleWebhook(req: any, res: any): Promise<void> {
    const body = req.body;
    
    // Mercado Libre webhook structure
    if (body.resource || body.topic) {
      const connectionId = this.findConnectionBySellerId(body.resource?.split('/')[2]);
      if (!connectionId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const connection = this.connections.get(connectionId);
      if (connection) {
        await this.processIncomingMessage(body, connection);
      }
    }

    res.status(200).json({ status: 'ok' });
  }

  async verifyWebhook(req: any, res: any): Promise<void> {
    // Mercado Libre webhook verification
    const challenge = req.query['challenge'];
    
    if (challenge) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Verification failed' });
    }
  }

  async getConnectionStatus(connectionId: string): Promise<any> {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    const { data: mlConfig } = await supabase
      .from('mercadolibre_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    return {
      id: connection.id,
      platformType: connection.platformType,
      status: connection.status,
      displayName: connection.displayName,
      platformAccountId: connection.platformAccountId,
      sellerId: mlConfig?.seller_id,
      lastConnectedAt: connection.lastConnectedAt
    };
  }

  createServiceAdapter(connection: PlatformConnection): PlatformServiceAdapter {
    return {
      sendTextMessage: async (to: string, body: string, options?: any) => {
        const { data: mlConfig } = await supabase
          .from('mercadolibre_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!mlConfig) throw new Error('Mercado Libre config not found');

        // Mercado Libre messaging API
        const response = await axios.post(
          `https://api.mercadolibre.com/messages`,
          {
            from: { user_id: mlConfig.seller_id },
            to: { user_id: to },
            text: body
          },
          {
            headers: { Authorization: `Bearer ${mlConfig.access_token}` }
          }
        );

        return response.data;
      },

      sendButtonMessage: async (to: string, bodyText: string, buttons: any[], options?: any) => {
        const { data: mlConfig } = await supabase
          .from('mercadolibre_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!mlConfig) throw new Error('Mercado Libre config not found');

        // Mercado Libre doesn't support buttons natively, send as numbered options
        const numberedOptions = buttons.map((btn, index) => `${index + 1}. ${btn.text || btn.title}`).join('\n');
        const fullMessage = `${bodyText}\n\n${numberedOptions}`;

        const response = await axios.post(
          `https://api.mercadolibre.com/messages`,
          {
            from: { user_id: mlConfig.seller_id },
            to: { user_id: to },
            text: fullMessage
          },
          {
            headers: { Authorization: `Bearer ${mlConfig.access_token}` }
          }
        );

        const buttonMapping: { [key: string]: string } = {};
        buttons.forEach((btn, index) => {
          buttonMapping[(index + 1).toString()] = btn.id || `btn-${index}`;
        });

        return {
          ...response.data,
          buttonMapping,
          isNumericButtons: true
        };
      },

      sendMediaMessage: async (to: string, url: string, options?: any) => {
        const { data: mlConfig } = await supabase
          .from('mercadolibre_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!mlConfig) throw new Error('Mercado Libre config not found');

        // Mercado Libre media attachments
        const response = await axios.post(
          `https://api.mercadolibre.com/messages/attachments`,
          {
            from: { user_id: mlConfig.seller_id },
            to: { user_id: to },
            attachments: [{ url: url }]
          },
          {
            headers: { Authorization: `Bearer ${mlConfig.access_token}` }
          }
        );

        return response.data;
      }
    };
  }

  private async setupWebhook(connection: PlatformConnection, mlConfig: any): Promise<void> {
    try {
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/mercadolibre`;
      
      // Mercado Libre webhook setup
      await axios.post(
        `https://api.mercadolibre.com/integrations/notifications`,
        {
          url: webhookUrl,
          app_id: mlConfig.app_id,
          topics: ['messages', 'orders']
        },
        {
          headers: { Authorization: `Bearer ${mlConfig.access_token}` }
        }
      );

      console.log(`[Mercado Libre] Webhook set for ${connection.displayName}`);
    } catch (error) {
      console.error('Error setting Mercado Libre webhook:', error);
    }
  }

  private parseMercadoLibreMessage(rawMessage: any): PlatformMessage | null {
    try {
      const messageId = rawMessage.message_id || rawMessage.id || `ml_${Date.now()}`;
      const senderId = rawMessage.from?.user_id || rawMessage.sender_id;
      const text = rawMessage.text || rawMessage.message?.text;

      let platformMessage: PlatformMessage = {
        id: messageId,
        from: senderId,
        type: 'text',
        raw: rawMessage
      };

      if (text) {
        platformMessage.text = text;
      }

      if (rawMessage.attachments || rawMessage.media) {
        const attachment = rawMessage.attachments?.[0] || rawMessage.media;
        if (attachment) {
          platformMessage.type = 'media';
          platformMessage.media = {
            type: attachment.type || 'image',
            url: attachment.url
          };
        }
      }

      return platformMessage;
    } catch (error) {
      console.error('Error parsing Mercado Libre message:', error);
      return null;
    }
  }

  private async saveMessageData(
    message: PlatformMessage,
    senderId: string,
    connection: PlatformConnection
  ): Promise<{ contact: any, conversation: any }> {
    const { data: contact } = await supabase
      .from('contacts')
      .upsert({
        organization_id: connection.organizationId,
        platform_type: 'mercadolibre',
        platform_user_id: senderId,
        platform_connection_id: connection.id,
        phone_number: senderId,
        custom_attributes: {
          mercadolibre_user_id: senderId
        },
        last_active_at: new Date().toISOString()
      }, { onConflict: 'organization_id,platform_type,platform_user_id' })
      .select()
      .single();

    let { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', connection.organizationId)
      .eq('contact_id', contact.id)
      .eq('platform_type', 'mercadolibre')
      .eq('platform_connection_id', connection.id)
      .order('last_message_at', { ascending: false })
      .limit(1);

    let conversation = conversations && conversations.length > 0 ? conversations[0] : null;

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          organization_id: connection.organizationId,
          contact_id: contact.id,
          platform_type: 'mercadolibre',
          platform_connection_id: connection.id
        })
        .select()
        .single();
      conversation = newConversation;
    }

    await supabase.from('messages').insert({
      organization_id: connection.organizationId,
      conversation_id: conversation.id,
      contact_id: contact.id,
      platform_type: 'mercadolibre',
      platform_connection_id: connection.id,
      direction: 'inbound',
      type: message.type,
      content: JSON.stringify(message),
      platform_message_id: message.id
    });

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    return { contact, conversation };
  }

  private async updateConnectionStatus(connectionId: string, status: string, platformAccountId?: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = status as any;
    if (platformAccountId) connection.platformAccountId = platformAccountId;

    const updateData: any = { 
      status,
      last_connected_at: status === 'connected' ? new Date().toISOString() : null
    };

    if (platformAccountId) {
      updateData.platform_account_id = platformAccountId;
    }

    await supabase
      .from('platform_connections')
      .update(updateData)
      .eq('id', connectionId);
  }

  private findConnectionBySellerId(sellerId: string): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection.config?.seller_id === sellerId || connection.platformAccountId === sellerId) {
        return id;
      }
    }
    return null;
  }
}

export const mercadolibreService = new MercadoLibreService();
