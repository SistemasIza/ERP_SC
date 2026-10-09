import { supabase } from '../../core/config/supabase';
import fs from 'fs';
import path from 'path';

interface AuthState {
  creds: any;
  keys: any;
}

interface WhatsAppSession {
  id: string;
  whatsapp_connection_id: string;
  organization_id: string;
  auth_state: AuthState;
  user_jid?: string;
  phone_number?: string;
  device_id?: string;
  is_active: boolean;
  last_restored_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Session Persistence Service
 * 
 * Handles storage and retrieval of WhatsApp session credentials in the database
 * instead of local files, enabling containerized deployments and automatic
 * session restoration.
 */
class SessionPersistenceService {
  /**
   * Save session credentials to database
   */
  async saveSession(
    connectionId: string,
    organizationId: string,
    authState: AuthState,
    metadata?: {
      userJid?: string;
      phoneNumber?: string;
      deviceId?: string;
    }
  ): Promise<WhatsAppSession> {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        whatsapp_connection_id: connectionId,
        organization_id: organizationId,
        auth_state: authState as any,
        user_jid: metadata?.userJid,
        phone_number: metadata?.phoneNumber,
        device_id: metadata?.deviceId,
        is_active: true,
        last_restored_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (error) {
      console.error('[SessionPersistence] Error saving session:', error);
      throw new Error(`Failed to save session: ${error.message}`);
    }

    console.log(`[SessionPersistence] Session saved for connection ${connectionId}`);
    return data;
  }

  /**
   * Retrieve session credentials from database
   */
  async getSession(connectionId: string): Promise<WhatsAppSession | null> {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('whatsapp_connection_id', connectionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No session found
        return null;
      }
      console.error('[SessionPersistence] Error retrieving session:', error);
      throw new Error(`Failed to retrieve session: ${error.message}`);
    }

    // Check if session is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log(`\x1b[33m⚠️  [Sesión]\x1b[0m Sesión expirada para la conexión ${connectionId}`);
      await this.deleteSession(connectionId);
      return null;
    }

    console.log(`\x1b[32m✅ [Sesión]\x1b[0m Sesión restaurada para la conexión ${connectionId}`);
    return data;
  }

  /**
   * Delete session from database
   */
  async deleteSession(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .eq('whatsapp_connection_id', connectionId);

    if (error) {
      console.error('[SessionPersistence] Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    console.log(`[SessionPersistence] Session deleted for connection ${connectionId}`);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    connectionId: string,
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({
        is_active: isActive,
        last_restored_at: isActive ? new Date().toISOString() : null,
      })
      .eq('whatsapp_connection_id', connectionId);

    if (error) {
      console.error('[SessionPersistence] Error updating session status:', error);
      throw new Error(`Failed to update session status: ${error.message}`);
    }

    console.log(`[SessionPersistence] Session status updated for connection ${connectionId}: ${isActive}`);
  }

  /**
   * Convert local auth_info folder to database storage
   * This is a migration utility to move existing sessions to the database
   */
  async migrateLocalSession(
    connectionId: string,
    organizationId: string,
    localAuthPath: string
  ): Promise<boolean> {
    try {
      if (!fs.existsSync(localAuthPath)) {
        console.log(`[SessionPersistence] No local auth folder found at ${localAuthPath}`);
        return false;
      }

      // Read the creds.json file
      const credsPath = path.join(localAuthPath, 'creds.json');
      if (!fs.existsSync(credsPath)) {
        console.log(`[SessionPersistence] No creds.json found at ${credsPath}`);
        return false;
      }

      const credsContent = fs.readFileSync(credsPath, 'utf-8');
      const creds = JSON.parse(credsContent);

      // Read all key files
      const keys: any = {};
      const keyFiles = fs.readdirSync(localAuthPath).filter(f => f.endsWith('.json') && f !== 'creds.json');
      
      for (const keyFile of keyFiles) {
        const keyPath = path.join(localAuthPath, keyFile);
        const keyContent = fs.readFileSync(keyPath, 'utf-8');
        keys[keyFile.replace('.json', '')] = JSON.parse(keyContent);
      }

      const authState: AuthState = {
        creds,
        keys,
      };

      // Save to database
      await this.saveSession(connectionId, organizationId, authState);

      // Clean up local files
      fs.rmSync(localAuthPath, { recursive: true, force: true });
      console.log(`[SessionPersistence] Local session migrated and cleaned up for connection ${connectionId}`);

      return true;
    } catch (error) {
      console.error(`[SessionPersistence] Error migrating local session:`, error);
      return false;
    }
  }

  /**
   * Restore session from database to local files (for Baileys compatibility)
   * Baileys requires local files, so we restore from DB to a temp directory
   */
  async restoreSessionToLocal(
    connectionId: string,
    localAuthPath: string
  ): Promise<boolean> {
    try {
      const session = await this.getSession(connectionId);
      
      if (!session) {
        // Dim color for not found
        console.log(`\x1b[2m   ↳ [Sesión] No hay sesión previa en BD para la conexión ${connectionId.substring(0, 8)}\x1b[0m`);
        return false;
      }

      // Create local directory if it doesn't exist
      if (!fs.existsSync(localAuthPath)) {
        fs.mkdirSync(localAuthPath, { recursive: true });
      }

      // Write creds.json
      const credsPath = path.join(localAuthPath, 'creds.json');
      fs.writeFileSync(credsPath, JSON.stringify(session.auth_state.creds, null, 2));

      // Write key files
      if (session.auth_state.keys) {
        for (const [keyName, keyValue] of Object.entries(session.auth_state.keys)) {
          const keyPath = path.join(localAuthPath, `${keyName}.json`);
          fs.writeFileSync(keyPath, JSON.stringify(keyValue, null, 2));
        }
      }

      // Update session status
      await this.updateSessionStatus(connectionId, true);

      // console.log(`[SessionPersistence] Session restored to local files for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error(`\x1b[31m❌ [Sesión]\x1b[0m Error al restaurar sesión a disco:`, error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[SessionPersistence] Error cleaning up expired sessions:', error);
    } else {
      console.log('[SessionPersistence] Expired sessions cleaned up');
    }
  }
}

export const sessionPersistenceService = new SessionPersistenceService();
