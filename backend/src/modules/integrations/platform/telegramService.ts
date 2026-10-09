import axios from 'axios';
import { supabase } from '../../../core/config/supabase';
import { handleIncomingMessage } from '../../bots/engine/flow-core';
import { BasePlatformService, PlatformConnection, PlatformMessage, PlatformServiceAdapter } from './basePlatformService';

export class TelegramService extends BasePlatformService {
  private botInstances: Map<string, any> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollingOffsets: Map<string, number> = new Map();
  
  getPlatformType(): 'telegram' {
    return 'telegram';
  }

  async initializeConnection(connectionData: any): Promise<void> {
    const connection: PlatformConnection = {
      id: connectionData.id,
      userId: connectionData.user_id,
      organizationId: connectionData.organization_id,
      platformType: 'telegram',
      displayName: connectionData.display_name,
      platformAccountId: connectionData.platform_account_id,
      status: connectionData.status || 'disconnected',
      config: connectionData.config || {},
      lastConnectedAt: connectionData.last_connected_at ? new Date(connectionData.last_connected_at) : undefined
    };

    this.connections.set(connectionData.id, connection);

    // Get Telegram bot config
    const { data: botConfig } = await supabase
      .from('telegram_bot_configs')
      .select('*')
      .eq('platform_connection_id', connectionData.id)
      .single();

    if (botConfig && connection.status === 'connected') {
      await this.setupWebhook(connection, botConfig);
    }
  }

  async startConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Telegram connection not found');

    const { data: botConfig } = await supabase
      .from('telegram_bot_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    if (!botConfig) {
      throw new Error('Telegram bot config not found');
    }

    // Verify bot token
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botConfig.bot_token}/getMe`);
      if (response.data.ok) {
        connection.status = 'connected';
        connection.lastConnectedAt = new Date();
        connection.platformAccountId = response.data.result.username;
        
        await this.updateConnectionStatus(connectionId, 'connected', response.data.result.username);
        await this.setupWebhook(connection, botConfig);
      } else {
        connection.status = 'error';
        await this.updateConnectionStatus(connectionId, 'error');
        throw new Error(
          `Telegram rechazó el token (${response.data.error_code || 'error'}). ${response.data.description || 'Token inválido o revocado.'}`
        );
      }
    } catch (error: any) {
      console.error('Error verifying Telegram bot:', error);
      const detail = error?.response?.data?.description
        || error?.response?.data?.error_code
        ? `Telegram: ${error.response.data.error_code} ${error.response.data.description}`
        : (error?.message || 'Error verificando el token de Telegram');

      connection.status = 'error';
      await this.updateConnectionStatus(connectionId, 'error');
      if (error instanceof Error && /Telegram rechazó|Token inválido/.test(error.message)) {
        throw error;
      }
      throw new Error(detail);
    }
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      // Delete webhook if exists
      const { data: botConfig } = await supabase
        .from('telegram_bot_configs')
        .select('bot_token')
        .eq('platform_connection_id', connectionId)
        .single();

      if (botConfig) {
        try {
          await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/deleteWebhook`);
        } catch (error) {
          console.error('Error deleting Telegram webhook:', error);
        }
      }
      
      this.stopPolling(connectionId);
      this.connections.delete(connectionId);
    }

    // Delete from database
    await supabase
      .from('platform_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    // Delete bot config
    await supabase
      .from('telegram_bot_configs')
      .delete()
      .eq('platform_connection_id', connectionId);
  }

  async processIncomingMessage(rawMessage: any, connection: PlatformConnection): Promise<void> {
    try {
      const telegramMessage = this.parseTelegramMessage(rawMessage);
      if (!telegramMessage) return;

      const senderId = telegramMessage.from.toString();
      const senderUsername = rawMessage.message?.from?.username || '';
      const senderName = rawMessage.message?.from?.first_name || '';

      console.log(`[Telegram] Incoming message from ${senderId} (${senderUsername}) on connection ${connection.displayName}`);

      // Save to database
      const { contact, conversation } = await this.saveMessageData(
        telegramMessage,
        senderId,
        connection,
        senderUsername,
        senderName
      );

      // Delegate to flow engine
      const organizationConfig = {
        organizationId: connection.organizationId,
        conversationId: conversation?.id || undefined,
        contactId: contact?.id || undefined,
        platformConnectionId: connection.id,
        platformType: 'telegram',
        senderId
      };

      const formattedMessage = this.formatMessageForFlow(telegramMessage, senderId);
      await handleIncomingMessage(formattedMessage, senderId, organizationConfig, this.createServiceAdapter(connection));

    } catch (error) {
      console.error(`Error processing Telegram message for connection ${connection.id}:`, error);
    }
  }

  async handleWebhook(req: any, res: any): Promise<void> {
    const update = req.body;
    
    if (update.message) {
      const connectionId = this.findConnectionByBotToken(req.query.token);
      if (!connectionId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const connection = this.connections.get(connectionId);
      if (connection) {
        await this.processIncomingMessage(update, connection);
      }
    } else if (update.callback_query) {
      // Handle button callbacks
      const connectionId = this.findConnectionByBotToken(req.query.token);
      if (!connectionId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const connection = this.connections.get(connectionId);
      if (connection) {
        await this.processCallbackQuery(update.callback_query, connection);
      }
    }

    res.status(200).json({ ok: true });
  }

  async verifyWebhook(req: any, res: any): Promise<void> {
    // Telegram doesn't use webhook verification like Instagram/Facebook
    // Webhook is set via API call
    res.status(200).json({ message: 'Telegram webhook verification not required' });
  }

  async getConnectionStatus(connectionId: string): Promise<any> {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    const { data: botConfig } = await supabase
      .from('telegram_bot_configs')
      .select('*')
      .eq('platform_connection_id', connectionId)
      .single();

    return {
      id: connection.id,
      platformType: connection.platformType,
      status: connection.status,
      displayName: connection.displayName,
      platformAccountId: connection.platformAccountId,
      botUsername: botConfig?.bot_username,
      lastConnectedAt: connection.lastConnectedAt
    };
  }

  createServiceAdapter(connection: PlatformConnection): PlatformServiceAdapter {
    return {
      sendTextMessage: async (to: string, body: string, options?: any) => {
        const { data: botConfig } = await supabase
          .from('telegram_bot_configs')
          .select('bot_token')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!botConfig) throw new Error('Bot config not found');

        const response = await axios.post(
          `https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`,
          {
            chat_id: to,
            text: body,
            parse_mode: 'Markdown'
          }
        );

        return response.data;
      },

      sendButtonMessage: async (to: string, bodyText: string, buttons: any[], options?: any) => {
        const { data: botConfig } = await supabase
          .from('telegram_bot_configs')
          .select('bot_token')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!botConfig) throw new Error('Bot config not found');

        const keyboard = buttons.map((btn, index) => [{
          text: btn.text || btn.title || `Opción ${index + 1}`,
          callback_data: btn.id || `btn-${index}`
        }]);

        const response = await axios.post(
          `https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`,
          {
            chat_id: to,
            text: bodyText,
            reply_markup: {
              inline_keyboard: keyboard
            },
            parse_mode: 'Markdown'
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
        const { data: botConfig } = await supabase
          .from('telegram_bot_configs')
          .select('bot_token')
          .eq('platform_connection_id', connection.id)
          .single();

        if (!botConfig) throw new Error('Bot config not found');

        const type = options?.type || 'photo';
        const endpoint = type === 'photo' ? 'sendPhoto' : 'sendDocument';

        const response = await axios.post(
          `https://api.telegram.org/bot${botConfig.bot_token}/${endpoint}`,
          {
            chat_id: to,
            [type]: url,
            caption: options?.caption
          }
        );

        return response.data;
      }
    };
  }

  private async setupWebhook(connection: PlatformConnection, botConfig: any): Promise<void> {
    try {
      const backendUrl = process.env.BACKEND_URL;
      const isLocal = !backendUrl || backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');

      if (isLocal) {
        console.log(`[Telegram] Backend URL is local — using polling mode for ${connection.displayName}`);
        this.startPolling(connection, botConfig.bot_token);
        return;
      }

      const webhookUrl = `${backendUrl}/api/webhooks/telegram?token=${botConfig.bot_token}`;
      
      await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: botConfig.allowed_updates || ['message', 'callback_query']
      });

      console.log(`[Telegram] Webhook set for ${connection.displayName}: ${webhookUrl}`);
    } catch (error) {
      console.error('[Telegram] Webhook setup failed, falling back to polling:', (error as Error).message || error);
      this.startPolling(connection, botConfig.bot_token);
    }
  }

  private startPolling(connection: PlatformConnection, botToken: string): void {
    if (this.pollingIntervals.has(connection.id)) return;

    console.log(`[Telegram] Starting polling for ${connection.displayName} (bot: ${connection.platformAccountId})`);

    const poll = async () => {
      try {
        const offset = this.pollingOffsets.get(connection.id) || 0;
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
          params: {
            offset,
            timeout: 10,
            allowed_updates: JSON.stringify(['message', 'callback_query'])
          }
        });

        if (response.data.ok && response.data.result?.length > 0) {
          for (const update of response.data.result) {
            this.pollingOffsets.set(connection.id, update.update_id + 1);
            await this.processIncomingMessage(update, connection);
          }
        }
      } catch (error: any) {
        if (error?.code !== 'ECONNABORTED') {
          console.error(`[Telegram] Polling error for ${connection.displayName}:`, error.message);
        }
      }
    };

    // Initial poll
    poll();

    // Poll every 3 seconds
    const interval = setInterval(poll, 3000);
    this.pollingIntervals.set(connection.id, interval);
  }

  private stopPolling(connectionId: string): void {
    const interval = this.pollingIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(connectionId);
      this.pollingOffsets.delete(connectionId);
    }
  }

  private parseTelegramMessage(update: any): PlatformMessage | null {
    const message = update.message;
    if (!message) return null;

    const text = message.text || message.caption || '';
    const userId = message.from.id.toString();

    let platformMessage: PlatformMessage = {
      id: update.update_id.toString(),
      from: userId,
      type: 'text',
      raw: update
    };

    if (message.photo) {
      platformMessage.type = 'image';
      platformMessage.media = {
        type: 'image',
        url: message.photo[message.photo.length - 1]?.file_id,
        caption: message.caption
      };
    } else if (message.video) {
      platformMessage.type = 'video';
      platformMessage.media = {
        type: 'video',
        url: message.video.file_id,
        caption: message.caption
      };
    } else if (message.document) {
      platformMessage.type = 'document';
      platformMessage.media = {
        type: 'document',
        url: message.document.file_id,
        caption: message.caption
      };
    } else if (message.audio) {
      platformMessage.type = 'audio';
      platformMessage.media = {
        type: 'audio',
        url: message.audio.file_id
      };
    } else if (text) {
      platformMessage.text = text;
    }

    return platformMessage;
  }

  private async processCallbackQuery(callbackQuery: any, connection: PlatformConnection): Promise<void> {
    const senderId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;

    // Acknowledge callback
    const { data: botConfig } = await supabase
      .from('telegram_bot_configs')
      .select('bot_token')
      .eq('platform_connection_id', connection.id)
      .single();

    if (botConfig) {
      await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id
      });
    }

    // Process as button reply
    const platformMessage: PlatformMessage = {
      id: callbackQuery.id.toString(),
      from: senderId,
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: data,
          title: data
        }
      },
      raw: callbackQuery
    };

    await this.processIncomingMessage({ message: { ...platformMessage, from: callbackQuery.from } }, connection);
  }

  private async saveMessageData(
    message: PlatformMessage,
    senderId: string,
    connection: PlatformConnection,
    username: string,
    name: string
  ): Promise<{ contact: any, conversation: any }> {
    const { data: contact } = await supabase
      .from('contacts')
      .upsert({
        organization_id: connection.organizationId,
        platform_type: 'telegram',
        platform_user_id: senderId,
        platform_connection_id: connection.id,
        phone_number: senderId, // Using telegram user_id as phone_number for compatibility
        profile_name: name || username,
        custom_attributes: {
          telegram_username: username,
          telegram_user_id: senderId
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
      .eq('platform_type', 'telegram')
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
          platform_type: 'telegram',
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
      platform_type: 'telegram',
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

  private findConnectionByBotToken(token: string): string | null {
    for (const [id, connection] of this.connections.entries()) {
      if (connection.config?.bot_token === token) {
        return id;
      }
    }
    return null;
  }
}

export const telegramService = new TelegramService();
