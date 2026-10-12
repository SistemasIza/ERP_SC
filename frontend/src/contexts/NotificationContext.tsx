/* =============================================================================
   NOTIFICATION CONTEXT - Sistema de notificaciones en tiempo real
   =============================================================================
   
   Propósito:
   - Gestionar notificaciones del sistema en tiempo real
   - Detectar nuevos mensajes de clientes potenciales
   - Proporcionar interfaz unificada para alertas
   - Mantener estado de lectura/no lectura
   
   Características:
   - Verificación automática cada 15 segundos
   - Filtrado por clientes potenciales (leads)
   - Componente de campana con contador
   - Dropdown con lista de notificaciones
   - Acciones directas desde notificaciones
   - Persistencia de estado de lectura
   
   Dependencies:
   - API services: Para obtener conversaciones y leads
   - React hooks: Para gestión de estado y efectos
   - Lucide icons: Para iconografía
   ============================================================================= */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getConversations, getLeads } from '../services/api';
import { useNotifications as useReapopNotifications } from 'reapop';
import { useAuth } from './AuthContext';

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

/**
 * Interfaz para una notificación individual
 */
export interface Notification {
  id: string; // Identificador único
  type: 'info' | 'success' | 'warning' | 'error'; // Tipo de notificación
  title: string; // Título breve y descriptivo
  message: string; // Mensaje detallado
  timestamp: Date; // Fecha y hora de creación
  read: boolean; // Estado de lectura
  action?: { // Acción opcional al hacer click
    label: string;
    onClick: () => void;
  };
}

/**
 * Interfaz para el contexto de notificaciones
 */
interface NotificationContextType {
  notifications: Notification[]; // Lista de todas las notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification; // Añadir notificación
  markAsRead: (id: string) => void; // Marcar como leída
  markAllAsRead: () => void; // Marcar todas como leídas
  removeNotification: (id: string) => void; // Eliminar una notificación
  clearNotifications: () => void; // Limpiar todas
  dismissHandoffAlert: (conversationId: string) => void; // Eliminar alerta de asistente humano por conversación
  unreadCount: number; // Contador de no leídas
}

// =============================================================================
// CONTEXT Y PROVIDER
// =============================================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Hook personalizado para acceder al contexto de notificaciones
 * @throws Error si no se encuentra el provider
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider principal del sistema de notificaciones
 * - Configura verificación automática de mensajes
 * - Gestiona estado de notificaciones
 * - Filtra por clientes potenciales
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { notify } = useReapopNotifications();
  // Rastrea qué alertas de asistente humano se han disparado por conversación
  // (conversationId -> id de la notificación) para poder eliminarlas al resolverse.
  const handoffAlertIds = useRef<Map<string, string>>(new Map());

  /**
   * Añade una nueva notificación al sistema
   * @param notification Datos de la notificación (sin id, timestamp ni read)
   * @returns La notificación creada (para poder rastrearla)
   */
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification => {
    const newNotification: Notification = {
      ...notification,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Disparar toast global usando Reapop
    notify({
      title: notification.title,
      message: notification.message,
      status: notification.type as 'success' | 'error' | 'warning' | 'info',
      dismissible: true,
      dismissAfter: 6000,
      buttons: notification.action ? [
        {
          name: notification.action.label,
          primary: true,
          onClick: notification.action.onClick
        }
      ] : []
    });

    return newNotification;
  };

  /**
   * Marca una notificación específica como leída
   * @param id ID de la notificación a marcar
   */
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  /**
   * Marca todas las notificaciones como leídas
   */
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  /**
   * Elimina una notificación del sistema
   * @param id ID de la notificación a eliminar
   */
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * Elimina todas las notificaciones del sistema
   */
  const clearNotifications = () => {
    setNotifications([]);
  };

  /**
   * Elimina la alerta de "asistente humano" de una conversación concreta.
   * Se usa cuando la conversación se atiende, reactiva el bot o se elimina.
   */
  const dismissHandoffAlert = (conversationId: string) => {
    const notificationId = handoffAlertIds.current.get(conversationId);
    if (notificationId) {
      removeNotification(notificationId);
      handoffAlertIds.current.delete(conversationId);
    }
  };

  /**
   * Contador de notificaciones no leídas
   */
  const unreadCount = notifications.filter(n => !n.read).length;

  // =============================================================================
  // VERIFICACIÓN AUTOMÁTICA DE MENSAJES
  // =============================================================================

  /**
   * Efecto para verificar nuevos mensajes periódicamente
   * - Se ejecuta cada 30 segundos
   * - Filtra por clientes potenciales
   * - Genera notificaciones automáticamente
   */
  useEffect(() => {
    // Solo verificamos mientras haya sesión iniciada: con el usuario deslogueado
    // (pantalla de login) se evita bombardear la API con 401 y contribuir al rate-limit.
    if (!user) return;

    let lastLatestMessageTime: string | null = null;
    let interval: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const stopPolling = () => {
      stopped = true;
      if (interval) clearInterval(interval);
      interval = undefined;
    };

    const startPolling = (ms = 30000) => setInterval(checkNewMessages, ms);

    /**
     * Verifica si hay nuevos mensajes de leads
     * - Obtiene lista de leads actuales
     * - Compara con última verificación
     * - Crea notificaciones para nuevos mensajes
     */
    const checkNewMessages = async () => {
      if (stopped || !user) return;
      try {
        // Obtener leads para filtrado
        const responseLeads = await getLeads().catch(() => []);
        const leads = Array.isArray(responseLeads) ? responseLeads : [];
        const leadPhones = new Set(leads.map((l: any) => l.phone_number || l.phone));

        // Obtener conversaciones
        const convs = await getConversations();

        if (convs && convs.length > 0) {
          const latestConv = convs[0];
          const latestTime = latestConv.lastMessageAt;

          // Verificar si hay mensaje más reciente que la última verificación
          if (lastLatestMessageTime && latestTime && new Date(latestTime) > new Date(lastLatestMessageTime)) {
            const phoneNumber = latestConv.contactId?.phoneNumber;
            
            // Solo notificar si es de un cliente potencial
            if (phoneNumber && leadPhones.has(phoneNumber)) {
              const hasName = latestConv.contactId?.name && latestConv.contactId.name !== 'Sin nombre';
              const contactInfo = hasName
                ? latestConv.contactId.name
                : phoneNumber;

              // Crear notificación
              addNotification({
                type: 'info',
                title: 'Interacción de Cliente Potencial',
                message: `${contactInfo} ha enviado un nuevo mensaje.`,
                action: {
                  label: 'Ver Chat',
                  onClick: () => {
                    window.location.href = `/conversations/${latestConv._id}`;
                  }
                }
              });
            }
          }

          // Actualizar timestamp de última verificación
          if (latestTime) {
            lastLatestMessageTime = latestTime;
          }
        }

        // ── Alerta de asistente humano ──────────────────────────────────────────
        // Cuando un cliente solicita un humano, el bot fija contacts.bot_state='handoff'
        // (devuelto como conv.botState). Se dispara una alerta en la campana (una sola vez
        // por conversación) para que un agente atienda el chat.
        const convList = Array.isArray(convs) ? convs : [];
        const handoffConvs = convList.filter(
          (c: any) => c.botState === 'handoff' && c._id && !handoffAlertIds.current.has(c._id)
        );
        for (const hc of handoffConvs) {
          const phoneNumber = hc.contactId?.phoneNumber;
          const hasName = hc.contactId?.name && hc.contactId.name !== 'Sin nombre';
          const contactInfo = hasName ? hc.contactId.name : (phoneNumber || 'Un cliente');
          const alert = addNotification({
            type: 'warning',
            title: 'Solicitud de asistente humano',
            message: `${contactInfo} pide hablar con un agente.`,
            action: {
              label: 'Atender',
              onClick: () => {
                window.location.href = `/conversations/${hc._id}`;
              }
            }
          });
          handoffAlertIds.current.set(hc._id, alert.id);
        }

        // ── Limpieza: si la conversación dejó de estar en handoff (se atendió,
        // se reactivó el bot o se eliminó), la alerta desaparece automáticamente.
        for (const [convId, notificationId] of handoffAlertIds.current.entries()) {
          const conv = convList.find((c: any) => c._id === convId);
          if (conv && conv.botState !== 'handoff') {
            removeNotification(notificationId);
            handoffAlertIds.current.delete(convId);
          }
        }
      } catch (error: any) {
        const status = error?.response?.status;
        // Sesión no válida/expirada: dejamos de consultar para no bombardear la API con 401.
        if (status === 401 || status === 403) {
          stopPolling();
        } else if (status === 429) {
          // Rate limit: espaciamos el siguiente intento a 60 segundos.
          if (interval) clearInterval(interval);
          interval = startPolling(60000);
        } else {
          console.error('Error checking new messages:', error);
        }
      }
    };

    // Configurar verificación periódica (cada 30 segundos para reducir carga del servidor)
    interval = startPolling();
    checkNewMessages(); // Verificación inicial

    const onVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = undefined;
      } else if (!stopped && !interval) {
        checkNewMessages();
        interval = startPolling();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Cleanup al desmontar o al cambiar el usuario (login/logout)
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotifications,
      dismissHandoffAlert,
      unreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// =============================================================================
// COMPONENTE DE CAMPANA DE NOTIFICACIONES
// =============================================================================

/**
 * Componente de campana de notificaciones para el header
 * - Muestra contador de notificaciones no leídas
 * - Despliega dropdown con lista de notificaciones
 * - Permite interactuar con notificaciones individuales
 */
export const NotificationBell: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /**
   * Maneja el click en una notificación
   * - Marca como leída
   * - Ejecuta acción si existe
   * - Cierra el dropdown
   */
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.action) {
      notification.action.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Botón de la campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-[#242424] hover:text-slate-700 dark:hover:text-slate-300 transition-all relative"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse"
            aria-label={`${unreadCount} notificaciones no leídas`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Cabecera del dropdown */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 dark:text-white text-sm">
                Notificaciones
              </h3>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {unreadCount} no leídas
              </span>
            </div>
          </div>
          
          {/* Lista de notificaciones */}
          {notifications.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono según tipo */}
                    <div className="mt-0.5">
                      {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-accent-500" />}
                      {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {notification.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    
                    {/* Contenido de la notificación */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 dark:text-white text-sm">
                        {notification.title}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                        {notification.message}
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                        {notification.timestamp.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      
                      {/* Botón de acción si existe */}
                      {notification.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            notification.action!.onClick();
                          }}
                          className="mt-2 text-xs font-black text-accent-500 hover:text-accent-600 transition-colors"
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                No tienes notificaciones
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Las notificaciones aparecerán aquí
              </p>
            </div>
          )}
          
          {/* Acción global */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <button
                onClick={() => {
                  markAllAsRead();
                }}
                className="flex-1 py-2 text-xs font-black text-accent-500 hover:text-accent-600 transition-colors"
              >
                Marcar todas como leídas
              </button>
              <button
                onClick={() => {
                  clearNotifications();
                  setIsOpen(false);
                }}
                className="flex-1 py-2 text-xs font-black text-red-500 hover:text-red-600 transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* =============================================================================
   FIN DEL NOTIFICATION CONTEXT
   ============================================================================= */
