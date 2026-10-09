import axios from 'axios';
import crypto from 'crypto';
import { supabase } from '../../../core/config/supabase';
import { handleIncomingMessage } from '../../bots/engine/flow-core';
import { BasePlatformService, PlatformConnection, PlatformMessage, PlatformServiceAdapter } from './basePlatformService';

export class TikTokService extends BasePlatformService {
  getPlatformType(): 'tiktok' {
    return 'tiktok';
  }

  async initializeConnection(connectionData: any): Promise<void> {
    const connection: PlatformConnection = {
      id: connectionData.id,
      userId: connectionData.user_id,
      organizationId: connectionData.organization_id,
      platformType: 'tiktok',
      displayName: connectionData.display_name,
      platformAccountId: connectionData.platform_account_id,
      status: connectionData.status || 'disconnected',
      config: connectionData.config || {},
      lastConnectedAt: connectionData.last_connected_at ? new Date(connectionData.last_connected_at) : undefined
    };

    this.connections.set(connectionData.id, connection);

    // Get TikTok config
    const { data: tiktokConfig } = await supabase
      .from('tiktok_configs')
      .select('*')
      .eq('platform_connection_id', connectionData.id)
      .single();

    if (tiktokConfig && connection.status === 'connected') {
      await this.setupWebhook(connection, tiktokConfig);
    }
  }

  async startConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('TikTok connection not found');

    const { data: tiktokConfig } = await supabase
      .from('tiktok_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    if (!tiktokConfig) {
      throw new Error('TikTok config not found');
    }

    // Verify access token
    try {
      const response = await axios.get(
        `https://business-api.tiktok.com/open_api/v1.3/user/info/`,
        {
          params: {
            access_token: tiktokConfig.access_token
          }
        }
      );
      
      if (response.data.code === 0 && response.data.data) {
        connection.status = 'connected';
        connection.lastConnectedAt = new Date();
        connection.platformAccountId = tiktokConfig.advertiser_id || response.data.data.advertiser_id;
        
        await this.updateConnectionStatus(connectionId, 'connected', connection.platformAccountId);
        await this.setupWebhook(connection, tiktokConfig);
      }
    } catch (error) {
      console.error('Error verifying TikTok access token:', error);
      connection.status = 'error';
      await this.updateConnectionStatus(connectionId, 'error');
    }
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      // Delete webhook subscriptions if exists
      const { data: tiktokConfig } = await supabase
        .from('tiktok_configs')
        .select('*')
        .eq('platform_connection_id', connectionId)
        .single();

      if (tiktokConfig) {
        try {
          // TikTok webhook deletion (if supported)
          console.log('[TikTok] Webhook deletion not fully supported by TikTok API');
        } catch (error) {
          console.error('Error deleting TikTok webhook subscription:', error);
        }
      }
      
      this.connections.delete(connectionId);
    }

    // Delete from database
    await supabase
      .from('platform_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    // Delete TikTok config
    await supabase
      .from('tiktok_configs')
      .delete()
      .eq('platform_connection_id', connectionId);
  }

  async processIncomingMessage(rawMessage: any, connection: PlatformConnection): Promise<void> {
    try {
      // TikTok messaging API is limited and requires special business verification
      // This is a placeholder for future implementation when TikTok opens up their messaging API
      console.log('[TikTok] Incoming message processing - TikTok messaging API is limited');
      console.log('[TikTok] Raw message:', JSON.stringify(rawMessage, null, 2));

      // Parse TikTok message (structure may vary)
      const tiktokMessage = this.parseTikTokMessage(rawMessage);
      if (!tiktokMessage) return;

      const senderId = tiktokMessage.from;

      console.log(`[TikTok] Incoming message from ${senderId} on connection ${connection.displayName}`);

      // Save to database
      const { contact, conversation } = await this.saveMessageData(
        tiktokMessage,
        senderId,
        connection
      );

      // Delegate to flow engine
      const organizationConfig = {
        organizationId: connection.organizationId,
        conversationId: conversation?.id || undefined,
        contactId: contact?.id || undefined,
        platformConnectionId: connection.id,
        platformType: 'tiktok',
        senderId
      };

      const formattedMessage = this.formatMessageForFlow(tiktokMessage, senderId);
      await handleIncomingMessage(formattedMessage, senderId, organizationConfig, this.createServiceAdapter(connection));

    } catch (error) {
      console.error(`Error processing TikTok message for connection ${connection.id}:`, error);
    }
  }

  async handleWebhook(req: any, res: any): Promise<void> {
    const body = req.body;
    
    // TikTok webhook structure
    if (body.type === 'MESSAGE' || body.event_type === 'message') {
      const connectionId = this.findConnectionByAdvertiserId(body.advertiser_id);
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
    // TikTok webhook verification (if supported)
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

    const { data: tiktokConfig } = await supabase
      .from('tiktok_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    return {
      id: connection.id,
      platformType: connection.platformType,
      status: connection.status,
      displayName: connection.displayName,
      platformAccountId: connection.platformAccountId,
      advertiserId: tiktokConfig?.advertiser_id,
      lastConnectedAt: connection.lastConnectedAt,
      note: 'TikTok messaging API is limited and requires business verification'
    };
  }

  createServiceAdapter(connection: PlatformConnection): PlatformServiceAdapter {
    return {
      sendTextMessage: async (to: string, body: string, options?: any) => {
        const { data: tiktokConfig } = await supabase
          .from('tiktok_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!tiktokConfig) throw new Error('TikTok config not found');

        // TikTok messaging API is limited - this is a placeholder
        console.log('[TikTok] Send text message - TikTok messaging API is limited');
        console.log('[TikTok] To:', to, 'Body:', body);
        
        // Placeholder response
        return {
          message_id: `tiktok_${Date.now()}`,
          status: 'sent'
        };
      },

      sendButtonMessage: async (to: string, bodyText: string, buttons: any[], options?: any) => {
        const { data: tiktokConfig } = await supabase
          .from('tiktok_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!tiktokConfig) throw new Error('TikTok config not found');

        // TikTok messaging API is limited - this is a placeholder
        console.log('[TikTok] Send button message - TikTok messaging API is limited');
        console.log('[TikTok] To:', to, 'Body:', bodyText, 'Buttons:', buttons);
        
        const buttonMapping: { [key: string]: string } = {};
        buttons.forEach((btn, index) => {
          buttonMapping[(index + 1).toString()] = btn.id || `btn-${index}`;
        });

        return {
          message_id: `tiktok_${Date.now()}`,
          status: 'sent',
          buttonMapping,
          isNumericButtons: false
        };
      },

      sendMediaMessage: async (to: string, url: string, options?: any) => {
        const { data: tiktokConfig } = await supabase
          .from('tiktok_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!tiktokConfig) throw new Error('TikTok config not found');

        // TikTok messaging API is limited - this is a placeholder
        console.log('[TikTok] Send media message - TikTok messaging API is limited');
        console.log('[TikTok] To:', to, 'URL:', url);
        
        return {
          message_id: `tiktok_${Date.now()}`,
          status: 'sent'
        };
      }
    };
  }

  private async setupWebhook(connection: PlatformConnection, tiktokConfig: any): Promise<void> {
    try {
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/tiktok`;
      
      // TikTok webhook setup (if supported)
      console.log('[TikTok] Webhook setup - TikTok webhook API is limited');
      console.log('[TikTok] Webhook URL:', webhookUrl);
      
      // Placeholder for future implementation
      // await axios.post('https://business-api.tiktok.com/open_api/v1.3/webhook/create/', {
      //   webhook_url: webhookUrl,
      //   ...
      // });
    } catch (error) {
      console.error('Error setting TikTok webhook:', error);
    }
  }

  private parseTikTokMessage(rawMessage: any): PlatformMessage | null {
    // TikTok message parsing (structure may vary based on API version)
    try {
      const messageId = rawMessage.message_id || rawMessage.id || `tiktok_${Date.now()}`;
      const senderId = rawMessage.sender_id || rawMessage.from || rawMessage.user_id;
      const text = rawMessage.text || rawMessage.content || rawMessage.message;

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
            url: attachment.url || attachment.media_url
          };
        }
      }

      return platformMessage;
    } catch (error) {
      console.error('Error parsing TikTok message:', error);
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
        platform_type: 'tiktok',
        platform_user_id: senderId,
        platform_connection_id: connection.id,
        phone_number: senderId, // Using TikTok user ID as phone_number for compatibility
        custom_attributes: {
          tiktok_user_id: senderId
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
      .eq('platform_type', 'tiktok')
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
          platform_type: 'tiktok',
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
      platform_type: 'tiktok',
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

  private findConnectionByAdvertiserId(advertiserId: string): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection.config?.advertiser_id === advertiserId || connection.platformAccountId === advertiserId) {
        return id;
      }
    }
    return null;
  }
}

export const tiktokService = new TikTokService();
