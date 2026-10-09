import { BasePlatformService, PlatformConnection } from './basePlatformService';
import { telegramService } from './telegramService';
import { instagramService } from './instagramService';
import { tiktokService } from './tiktokService';
import { facebookMessengerService } from './facebookMessengerService';
import { mercadolibreService } from './mercadolibreService';
import { whatsappCloudService } from './whatsappCloudService';
import { supabase } from '../../../core/config/supabase';

export class MultiPlatformService {
  private services: Map<string, BasePlatformService> = new Map();

  constructor() {
    // Register platform services
    this.services.set('telegram', telegramService);
    this.services.set('instagram', instagramService);
    this.services.set('tiktok', tiktokService);
    this.services.set('facebook_messenger', facebookMessengerService);
    this.services.set('mercadolibre', mercadolibreService);
    this.services.set('whatsapp', whatsappCloudService);
  }

  // Initialize all platform connections for an organization
  async initializeOrganizationConnections(organizationId: string) {
    console.log(`[MultiPlatform] Initializing all platform connections for organization ${organizationId}...`);
    
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching platform connections:', error);
      return;
    }

    // Initialize connections in parallel
    await Promise.allSettled((connections || []).map(conn => {
      const service = this.services.get(conn.platform_type);
      if (service) {
        return service.initializeConnection(conn);
      }
    }));
  }

  // Initialize all platform connections for a user
  async initializeUserConnections(userId: string) {
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user platform connections:', error);
      return;
    }

    for (const conn of connections || []) {
      const service = this.services.get(conn.platform_type);
      if (service) {
        await service.initializeConnection(conn);
      }
    }
  }

  // Initialize all platform connections (for server startup)
  async initializeAllConnections() {
    console.log('[MultiPlatform] Initializing all platform connections...');
    
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('*');

    if (error) {
      console.error('Error fetching all platform connections:', error);
      return;
    }

    // Initialize in parallel to avoid one hang blocking others
    await Promise.allSettled((connections || []).map(conn => {
      const service = this.services.get(conn.platform_type);
      if (service) {
        return service.initializeConnection(conn);
      }
    }));
  }

  // Create a new platform connection
  async createConnection(
    userId: string,
    platformType: 'whatsapp' | 'telegram' | 'instagram' | 'tiktok' | 'facebook_messenger' | 'mercadolibre',
    displayName: string,
    config: Record<string, any>
  ) {
    const service = this.services.get(platformType);
    if (!service) {
      throw new Error(`Platform service not found for ${platformType}`);
    }

    // Get organization ID
    const { data: orgUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!orgUser) {
      throw new Error('Usuario no encontrado en organización');
    }

    // Create connection record
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .insert({
        user_id: userId,
        organization_id: orgUser.organization_id,
        platform_type: platformType,
        display_name: displayName,
        status: 'disconnected',
        config: config
      })
      .select()
      .single();

    if (error) {
      throw new Error('Error creando conexión: ' + error.message);
    }

    // Create platform-specific config
    if (platformType === 'telegram') {
      await supabase.from('telegram_bot_configs').insert({
        platform_connection_id: connection.id,
        bot_token: config.bot_token,
        bot_username: config.bot_username,
        webhook_verify_token: config.webhook_verify_token
      });
    } else if (platformType === 'instagram') {
      await supabase.from('instagram_configs').insert({
        platform_connection_id: connection.id,
        instagram_business_account_id: config.instagram_business_account_id,
        facebook_page_id: config.facebook_page_id,
        access_token: config.access_token,
        webhook_verify_token: config.webhook_verify_token
      });
    } else if (platformType === 'tiktok') {
      await supabase.from('tiktok_configs').insert({
        platform_connection_id: connection.id,
        advertiser_id: config.advertiser_id,
        access_token: config.access_token,
        refresh_token: config.refresh_token,
        webhook_secret: config.webhook_secret
      });
    } else if (platformType === 'facebook_messenger') {
      await supabase.from('facebook_messenger_configs').insert({
        platform_connection_id: connection.id,
        page_id: config.page_id,
        page_access_token: config.page_access_token,
        app_id: config.app_id,
        app_secret: config.app_secret,
        webhook_verify_token: config.webhook_verify_token
      });
    } else if (platformType === 'mercadolibre') {
      await supabase.from('mercadolibre_configs').insert({
        platform_connection_id: connection.id,
        seller_id: config.seller_id,
        access_token: config.access_token,
        refresh_token: config.refresh_token,
        app_id: config.app_id,
        app_secret: config.app_secret
      });
    }

    await service.initializeConnection(connection);
    return connection;
  }

  // Start a platform connection
  async startConnection(connectionId: string) {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Conexión no encontrada');
    }

    const service = this.services.get(connection.platform_type);
    if (!service) {
      throw new Error(`Platform service not found for ${connection.platform_type}`);
    }

    await service.startConnection(connectionId);
  }

  // Delete a platform connection
  async deleteConnection(connectionId: string, userId: string) {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Conexión no encontrada');
    }

    const service = this.services.get(connection.platform_type);
    if (!service) {
      throw new Error(`Platform service not found for ${connection.platform_type}`);
    }

    await service.deleteConnection(connectionId, userId);
  }

  // Get connection status
  async getConnectionStatus(connectionId: string) {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Conexión no encontrada');
    }

    const service = this.services.get(connection.platform_type);
    if (!service) {
      throw new Error(`Platform service not found for ${connection.platform_type}`);
    }

    return await service.getConnectionStatus(connectionId);
  }

  // Handle webhook for a specific platform
  async handleWebhook(platformType: string, req: any, res: any) {
    const service = this.services.get(platformType);
    if (!service) {
      res.status(404).json({ error: 'Platform service not found' });
      return;
    }

    await service.handleWebhook(req, res);
  }

  // Verify webhook for a specific platform
  async verifyWebhook(platformType: string, req: any, res: any) {
    const service = this.services.get(platformType);
    if (!service) {
      res.status(404).json({ error: 'Platform service not found' });
      return;
    }

    await service.verifyWebhook(req, res);
  }

  // Get service adapter for a connection
  async getServiceAdapter(connectionId: string) {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Conexión no encontrada');
    }

    const service = this.services.get(connection.platform_type);
    if (!service) {
      throw new Error(`Platform service not found for ${connection.platform_type}`);
    }

    const platformConnection = service.getConnection(connectionId);
    if (!platformConnection) {
      throw new Error('Platform connection not found in memory');
    }

    return service.createServiceAdapter(platformConnection);
  }

  // Get all connections for an organization
  getOrganizationConnections(organizationId: string): PlatformConnection[] {
    const allConnections: PlatformConnection[] = [];
    
    for (const service of this.services.values()) {
      const connections = service.getOrganizationConnections(organizationId);
      allConnections.push(...connections);
    }
    
    return allConnections;
  }

  // Get all connections for a user
  getUserConnections(userId: string): PlatformConnection[] {
    const allConnections: PlatformConnection[] = [];
    
    for (const service of this.services.values()) {
      const connections = service.getUserConnections(userId);
      allConnections.push(...connections);
    }
    
    return allConnections;
  }

  // Get a specific connection
  getConnection(connectionId: string): PlatformConnection | undefined {
    for (const service of this.services.values()) {
      const connection = service.getConnection(connectionId);
      if (connection) {
        return connection;
      }
    }
    return undefined;
  }
}

export const multiPlatformService = new MultiPlatformService();
