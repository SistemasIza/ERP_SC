import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  getPlatformConnections, 
  createPlatformConnection, 
  startPlatformConnection, 
  deletePlatformConnection,
  getQRStatus,
  logoutQR
} from '../services/api';

export type PlatformType = 'whatsapp' | 'telegram' | 'instagram' | 'facebook_messenger' | 'tiktok';

export interface PlatformConnection {
  id: string;
  platform_type: PlatformType;
  display_name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'pending' | 'error_sync';
  phone_number?: string;
  username?: string;
  connected_at?: string;
  last_sync_at?: string;
}

interface ConnectionsContextType {
  connections: PlatformConnection[];
  addConnection: (platform: PlatformType, data: any) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  getConnectionByPlatform: (platform: PlatformType) => PlatformConnection | undefined;
  isConnecting: (platform: PlatformType) => boolean;
  refreshConnections: () => Promise<void>;
  loading: boolean;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections must be used within ConnectionsProvider');
  }
  return context;
};

export const ConnectionsProvider = ({ children }: { children: ReactNode }) => {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshConnections = async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch platform connections from backend
      const platformConns = await getPlatformConnections();
      
      // 2. Fetch WhatsApp QR status from backend
      let whatsappConn: PlatformConnection | null = null;
      try {
        const qrStatus = await getQRStatus();
        if (qrStatus && qrStatus.status) {
          whatsappConn = {
            id: qrStatus.id || 'whatsapp_session',
            platform_type: 'whatsapp',
            display_name: qrStatus.displayName || 'WhatsApp Business',
            status: qrStatus.status === 'connected' ? 'connected' : 'disconnected',
            phone_number: qrStatus.phoneNumber,
            connected_at: qrStatus.lastConnectedAt
          };
        }
      } catch (err) {
        console.error('Error fetching WhatsApp status in ConnectionsContext:', err);
      }

      // Map backend connections to the format expected by the frontend
      const mappedPlatformConns: PlatformConnection[] = (Array.isArray(platformConns) ? platformConns : []).map((conn: any) => ({
        id: conn.id,
        platform_type: (conn.platformType || conn.platform_type || '') === 'facebook_messenger' ? 'facebook_messenger' : (conn.platformType || conn.platform_type) as PlatformType,
        display_name: conn.displayName || conn.display_name || 'Conexión',
        status: conn.status,
        phone_number: conn.phone_number || conn.config?.phone_number || undefined,
        username: conn.botUsername || conn.username || conn.platformAccountId || conn.platform_account_id,
        connected_at: conn.lastConnectedAt || conn.connected_at
      }));

      // Combine both lists
      const combined: PlatformConnection[] = [];

      // 1. Add all platform connections (including WhatsApp Cloud)
      mappedPlatformConns.forEach(conn => {
        combined.push(conn);
      });

      // 2. If no WhatsApp Cloud connection exists, fallback to QR status
      const hasCloudWhatsApp = combined.some(c => c.platform_type === 'whatsapp');
      if (!hasCloudWhatsApp && whatsappConn) {
        combined.push(whatsappConn);
      }

      setConnections(combined);
    } catch (error) {
      console.error('Error refreshing connections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Poll for status updates, pausado cuando la pestaña no está visible
  useEffect(() => {
    refreshConnections();

    const startPolling = () => {
      return setInterval(() => {
        refreshConnections();
      }, 30000);
    };

    let interval: ReturnType<typeof setInterval> | undefined = startPolling();

    const onVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = undefined;
      } else if (!interval) {
        refreshConnections();
        interval = startPolling();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  const addConnection = async (platform: PlatformType, data: any) => {
    // If it's WhatsApp, it's initialized via QR flow
    if (platform === 'whatsapp') {
      const newConnection: PlatformConnection = {
        id: 'whatsapp_session',
        platform_type: 'whatsapp',
        display_name: data.displayName || 'WhatsApp Business',
        status: 'connected',
        phone_number: data.phoneNumber,
        connected_at: new Date().toISOString()
      };
      setConnections(prev => {
        const filtered = prev.filter(c => c.platform_type !== 'whatsapp');
        return [...filtered, newConnection];
      });
      return;
    }

    // Set connection status to connecting locally
    setConnections(prev => 
      prev.map(c => 
        c.platform_type === platform 
          ? { ...c, status: 'connecting' as const }
          : c
      )
    );

    // Prepare config payload based on the platform type
    let config: any = {};
    if (platform === 'telegram') {
      config = {
        bot_token: data.botToken,
        bot_username: data.botUsername
      };
    } else if (platform === 'instagram') {
      config = {
        instagram_business_account_id: data.instagramBusinessAccountId,
        facebook_page_id: data.facebookPageId,
        access_token: data.accessToken,
        webhook_verify_token: `sparktree_ig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      };
    } else if (platform === 'tiktok') {
      config = {
        access_token: data.accessToken,
        advertiser_id: data.advertiserId,
        refresh_token: data.refreshToken,
        webhook_secret: data.webhookSecret
      };
    } else if (platform === 'facebook_messenger') {
      config = {
        page_id: data.pageId,
        page_access_token: data.pageAccessToken,
        app_id: data.appId,
        app_secret: data.appSecret
      };
    }

    try {
      // 1. Create connection on the backend
      const response = await createPlatformConnection({
        platformType: platform,
        displayName: data.displayName || (platform === 'telegram' ? `@${data.botUsername}` : platform),
        config
      });

      const connectionId = response.connection.id;
      
      // 2. Start the connection on the backend
      await startPlatformConnection(connectionId);

      // 3. Refresh connections
      await refreshConnections();
    } catch (error) {
      console.error(`Error connecting to platform ${platform}:`, error);
      throw error;
    }
  };

  const removeConnection = async (id: string) => {
    const conn = connections.find(c => c.id === id);

    // QR session (Baileys) — in-memory logout
    if (conn && conn.platform_type === 'whatsapp' && id === 'whatsapp_session') {
      try {
        await logoutQR();
      } catch (error) {
        console.error('Error logging out WhatsApp:', error);
      }
      setConnections(prev => prev.filter(c => c.id !== id));
      return;
    }

    // Cloud API WhatsApp or any other platform — delete from DB
    if (id) {
      try {
        await deletePlatformConnection(id);
        await refreshConnections();
      } catch (error) {
        console.error('Error deleting platform connection:', error);
        throw error;
      }
    }
  };

  const getConnectionByPlatform = (platform: PlatformType) => {
    return connections.find(c => c.platform_type === platform);
  };

  const isConnecting = (platform: PlatformType) => {
    const conn = getConnectionByPlatform(platform);
    return conn?.status === 'connecting';
  };

  const contextValue = useMemo<ConnectionsContextType>(
    () => ({
      connections,
      addConnection,
      removeConnection,
      getConnectionByPlatform,
      isConnecting,
      refreshConnections,
      loading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, loading, user]
  );

  return (
    <ConnectionsContext.Provider value={contextValue}>
      {children}
    </ConnectionsContext.Provider>
  );
};
