// Base interface for all platform services
export interface PlatformMessage {
  id: string;
  from: string;
  text?: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive' | 'media';
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url?: string;
    caption?: string;
  };
  interactive?: {
    type: 'button_reply' | 'quick_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    quick_reply?: {
      payload: string;
      text: string;
    };
  };
  raw?: any; // Platform-specific raw data
}

export interface PlatformConnection {
  id: string;
  userId: string;
  organizationId: string;
  platformType: 'whatsapp' | 'telegram' | 'instagram' | 'tiktok' | 'facebook_messenger' | 'mercadolibre';
  displayName: string;
  platformAccountId?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  config: Record<string, any>;
  lastConnectedAt?: Date;
}

export interface PlatformServiceAdapter {
  sendTextMessage: (to: string, body: string, options?: any) => Promise<any>;
  sendButtonMessage: (to: string, bodyText: string, buttons: any[], options?: any) => Promise<any>;
  sendMediaMessage: (to: string, url: string, options?: any) => Promise<any>;
  /** Sube y envía un media en base64 (data URL) vía Graph API multi-upload. */
  sendMediaBuffer?: (
    to: string,
    base64: string,
    options?: any
  ) => Promise<any>;
  /** Solo disponible en WhatsApp Cloud API. Envía un template aprobado por Meta. */
  sendTemplateMessage?: (
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ) => Promise<any>;
  /** Solo disponible en WhatsApp Cloud API. Envía un mensaje/template de marketing optimizado via MM API (/marketing_messages). */
  sendMarketingMessage?: (
    to: string,
    body: string,
    options?: { messageActivitySharing?: boolean; templateName?: string; languageCode?: string; components?: any[] }
  ) => Promise<any>;
}

export abstract class BasePlatformService {
  protected connections: Map<string, PlatformConnection> = new Map();
  
  abstract getPlatformType(): 'whatsapp' | 'telegram' | 'instagram' | 'tiktok' | 'facebook_messenger' | 'mercadolibre';
  
  // Connection management
  abstract initializeConnection(connectionData: any): Promise<void>;
  abstract startConnection(connectionId: string): Promise<void>;
  abstract deleteConnection(connectionId: string, userId: string): Promise<void>;
  
  // Message handling
  abstract processIncomingMessage(rawMessage: any, connection: PlatformConnection): Promise<void>;
  abstract createServiceAdapter(connection: PlatformConnection): PlatformServiceAdapter;
  
  // Webhook handling
  abstract handleWebhook(req: any, res: any): Promise<void>;
  abstract verifyWebhook(req: any, res: any): Promise<void>;
  
  // Connection status
  abstract getConnectionStatus(connectionId: string): Promise<any>;
  
  // Public getters
  getConnection(connectionId: string): PlatformConnection | undefined {
    return this.connections.get(connectionId);
  }
  
  getUserConnections(userId: string): PlatformConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.userId === userId);
  }
  
  getOrganizationConnections(organizationId: string): PlatformConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.organizationId === organizationId);
  }
  
  // Helper to format message for flow engine
  protected formatMessageForFlow(message: PlatformMessage, senderId: string): any {
    return {
      id: message.id,
      from: senderId,
      type: message.type,
      text: message.text ? { body: message.text } : undefined,
      media: message.media,
      interactive: message.interactive,
      raw: message.raw
    };
  }
}
