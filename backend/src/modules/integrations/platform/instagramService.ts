import axios from 'axios';
import crypto from 'crypto';
import { supabase } from '../../../core/config/supabase';
import { handleIncomingMessage } from '../../bots/engine/flow-core';
import { BasePlatformService, PlatformConnection, PlatformMessage, PlatformServiceAdapter } from './basePlatformService';

export class InstagramService extends BasePlatformService {
  getPlatformType(): 'instagram' {
    return 'instagram';
  }

  async initializeConnection(connectionData: any): Promise<void> {
    const connection: PlatformConnection = {
      id: connectionData.id,
      userId: connectionData.user_id,
      organizationId: connectionData.organization_id,
      platformType: 'instagram',
      displayName: connectionData.display_name,
      platformAccountId: connectionData.platform_account_id,
      status: connectionData.status || 'disconnected',
      config: connectionData.config || {},
      lastConnectedAt: connectionData.last_connected_at ? new Date(connectionData.last_connected_at) : undefined
    };

    this.connections.set(connectionData.id, connection);

    // Get Instagram config
    const { data: instaConfig } = await supabase
      .from('instagram_configs')
      .select('*')
      .eq('platform_connection_id', connectionData.id)
      .single();

    if (instaConfig && connection.status === 'connected') {
      await this.setupWebhook(connection, instaConfig);
    }
  }

  async startConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Instagram connection not found');

    const { data: instaConfig } = await supabase
      .from('instagram_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    if (!instaConfig) {
      throw new Error('Instagram config not found');
    }

    // Verify access token
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${instaConfig.access_token}`
      );
      
      if (response.data.id) {
        connection.status = 'connected';
        connection.lastConnectedAt = new Date();
        connection.platformAccountId = instaConfig.instagram_business_account_id;
        
        await this.updateConnectionStatus(connectionId, 'connected', instaConfig.instagram_business_account_id);
        await this.setupWebhook(connection, instaConfig);
      }
    } catch (error) {
      console.error('Error verifying Instagram access token:', error);
      connection.status = 'error';
      await this.updateConnectionStatus(connectionId, 'error');
    }
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      // Delete webhook subscriptions if exists
      const { data: instaConfig } = await supabase
        .from('instagram_configs')
        .select('*')
        .eq('platform_connection_id', connectionId)
        .single();

      if (instaConfig) {
        try {
          // Unsubscribe from webhook
          await axios.post(
            `https://graph.facebook.com/v18.0/${instaConfig.instagram_business_account_id}/subscriptions`,
            null,
            {
              params: {
                access_token: instaConfig.access_token,
                object: 'instagram',
                callback_url: instaConfig.webhook_url,
                fields: instaConfig.subscribed_fields?.join(',') || 'messages',
                verify_token: instaConfig.webhook_verify_token
              }
            }
          );
        } catch (error) {
          console.error('Error deleting Instagram webhook subscription:', error);
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

    // Delete Instagram config
    await supabase
      .from('instagram_configs')
      .delete()
      .eq('platform_connection_id', connectionId);
  }

  async processIncomingMessage(rawMessage: any, connection: PlatformConnection): Promise<void> {
    try {
      const entry = rawMessage.entry?.[0];
      if (!entry) return;

      const messaging = entry.messaging?.[0];
      if (!messaging) return;

      const instagramMessage = this.parseInstagramMessage(messaging);
      if (!instagramMessage) return;

      const senderId = messaging.sender.id;
      const recipientId = messaging.recipient.id;

      console.log(`[Instagram] Incoming message from ${senderId} on connection ${connection.displayName}`);

      // Save to database
      const { contact, conversation } = await this.saveMessageData(
        instagramMessage,
        senderId,
        connection
      );

      // Delegate to flow engine
      const organizationConfig = {
        organizationId: connection.organizationId,
        conversationId: conversation?.id || undefined,
        contactId: contact?.id || undefined,
        platformConnectionId: connection.id,
        platformType: 'instagram',
        senderId
      };

      const formattedMessage = this.formatMessageForFlow(instagramMessage, senderId);
      await handleIncomingMessage(formattedMessage, senderId, organizationConfig, this.createServiceAdapter(connection));

    } catch (error) {
      console.error(`Error processing Instagram message for connection ${connection.id}:`, error);
    }
  }

  async handleWebhook(req: any, res: any): Promise<void> {
    const body = req.body;
    
    if (body.object === 'instagram') {
      const entry = body.entry?.[0];
      if (entry) {
        const connectionId = this.findConnectionByPageId(entry.id);
        if (!connectionId) {
          res.status(404).json({ error: 'Connection not found' });
          return;
        }

        const connection = this.connections.get(connectionId);
        if (connection) {
          await this.processIncomingMessage(body, connection);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  }

  async verifyWebhook(req: any, res: any): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Find connection with matching verify token
    const connectionId = this.findConnectionByVerifyToken(token);
    
    if (mode === 'subscribe' && connectionId) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Verification failed' });
    }
  }

  async getConnectionStatus(connectionId: string): Promise<any> {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    const { data: instaConfig } = await supabase
      .from('instagram_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    return {
      id: connection.id,
      platformType: connection.platformType,
      status: connection.status,
      displayName: connection.displayName,
      platformAccountId: connection.platformAccountId,
      instagramBusinessAccountId: instaConfig?.instagram_business_account_id,
      facebookPageId: instaConfig?.facebook_page_id,
      lastConnectedAt: connection.lastConnectedAt
    };
  }

  createServiceAdapter(connection: PlatformConnection): PlatformServiceAdapter {
    return {
      sendTextMessage: async (to: string, body: string, options?: any) => {
        const { data: instaConfig } = await supabase
          .from('instagram_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!instaConfig) throw new Error('Instagram config not found');

        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${instaConfig.instagram_business_account_id}/messages`,
          {
            recipient: { id: to },
            message: { text: body }
          },
          {
            params: { access_token: instaConfig.access_token }
          }
        );

        return response.data;
      },

      sendButtonMessage: async (to: string, bodyText: string, buttons: any[], options?: any) => {
        const { data: instaConfig } = await supabase
          .from('instagram_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!instaConfig) throw new Error('Instagram config not found');

        const quickReplies = buttons.map((btn, index) => ({
          content_type: 'text',
          title: btn.text || btn.title || `Opción ${index + 1}`,
          payload: btn.id || `btn-${index}`
        }));

        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${instaConfig.instagram_business_account_id}/messages`,
          {
            recipient: { id: to },
            message: {
              text: bodyText,
              quick_replies: quickReplies
            }
          },
          {
            params: { access_token: instaConfig.access_token }
          }
        );

        const buttonMapping: { [key: string]: string } = {};
        buttons.forEach((btn, index) => {
          buttonMapping[(index + 1).toString()] = btn.id || `btn-${index}`;
        });

        return {
          ...response.data,
          buttonMapping,
          isNumericButtons: false
        };
      },

      sendMediaMessage: async (to: string, url: string, options?: any) => {
        const { data: instaConfig } = await supabase
          .from('instagram_configs')
          .select('*')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!instaConfig) throw new Error('Instagram config not found');

        const type = options?.type || 'image';
        const attachmentType = type === 'image' ? 'image' : type === 'video' ? 'video' : 'file';

        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${instaConfig.instagram_business_account_id}/messages`,
          {
            recipient: { id: to },
            message: {
              attachment: {
                type: attachmentType,
                payload: {
                  url: url,
                  is_reusable: true
                }
              }
            }
          },
          {
            params: { access_token: instaConfig.access_token }
          }
        );

        return response.data;
      }
    };
  }

  private async setupWebhook(connection: PlatformConnection, instaConfig: any): Promise<void> {
    try {
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/instagram`;
      
      // Subscribe to webhook
      await axios.post(
        `https://graph.facebook.com/v18.0/${instaConfig.instagram_business_account_id}/subscriptions`,
        null,
        {
          params: {
            access_token: instaConfig.access_token,
            object: 'instagram',
            callback_url: webhookUrl,
            fields: instaConfig.subscribed_fields?.join(',') || 'messages',
            verify_token: instaConfig.webhook_verify_token
          }
        }
      );

      console.log(`[Instagram] Webhook subscribed for ${connection.displayName}`);
    } catch (error) {
      console.error('Error setting Instagram webhook:', error);
    }
  }

  private parseInstagramMessage(messaging: any): PlatformMessage | null {
    const message = messaging.message;
    if (!message) return null;

    const senderId = messaging.sender.id;
    const messageId = messaging.message.mid;

    let platformMessage: PlatformMessage = {
      id: messageId,
      from: senderId,
      type: 'text',
      raw: messaging
    };

    if (message.text) {
      platformMessage.text = message.text;
    } else if (message.attachments) {
      const attachment = message.attachments[0];
      if (attachment.type === 'image') {
        platformMessage.type = 'image';
        platformMessage.media = {
          type: 'image',
          url: attachment.payload.url
        };
      } else if (attachment.type === 'video') {
        platformMessage.type = 'video';
        platformMessage.media = {
          type: 'video',
          url: attachment.payload.url
        };
      } else if (attachment.type === 'file') {
        platformMessage.type = 'document';
        platformMessage.media = {
          type: 'document',
          url: attachment.payload.url
        };
      }
    } else if (message.quick_reply) {
      platformMessage.type = 'interactive';
      platformMessage.interactive = {
        type: 'quick_reply',
        quick_reply: {
          payload: message.quick_reply.payload,
          text: message.quick_reply.payload
        }
      };
    }

    return platformMessage;
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
        platform_type: 'instagram',
        platform_user_id: senderId,
        platform_connection_id: connection.id,
        phone_number: senderId, // Using Instagram ID as phone_number for compatibility
        custom_attributes: {
          instagram_id: senderId
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
      .eq('platform_type', 'instagram')
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
          platform_type: 'instagram',
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
      platform_type: 'instagram',
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

  private findConnectionByPageId(pageId: string): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection.config?.facebook_page_id === pageId) {
        return id;
      }
    }
    return null;
  }

  private findConnectionByVerifyToken(token: string): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection.config?.webhook_verify_token === token) {
        return id;
      }
    }
    return null;
  }
}

export const instagramService = new InstagramService();
