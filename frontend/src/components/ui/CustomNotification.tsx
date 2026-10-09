import React, { useEffect, useState, useRef } from 'react';
import { Notification as NotificationType } from 'reapop';
import { CheckCircle, AlertTriangle, Info, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Loader } from './Loader';

type CustomNotificationProps = {
  notification: NotificationType;
  dismissNotification: (id: string) => void;
};

export const CustomNotification = ({
  notification,
  dismissNotification,
}: CustomNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const dismissAfter = typeof notification.dismissAfter === 'number' ? notification.dismissAfter : 5000;
  const shouldAutoDismiss = dismissAfter > 0;

  // Barra de progreso
  const progressRef = useRef<HTMLDivElement>(null);

  // Animación de entrada
  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  // Auto-dismiss + barra de progreso
  useEffect(() => {
    if (!shouldAutoDismiss) return;

    // Esperar a que el navegador pinte el ancho inicial (100%) antes de animar
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${dismissAfter}ms linear`;
          progressRef.current.style.width = '0%';
        }
      });
    });

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, dismissAfter);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    // Animación de salida antes de eliminar
    setIsLeaving(true);
    setTimeout(() => {
      dismissNotification(notification.id);
    }, 400);
  };

  const accentStyles: Record<string, { border: string; progressColor: string }> = {
    success: { border: 'border-l-accent-500', progressColor: 'bg-accent-500' },
    error:   { border: 'border-l-red-500',     progressColor: 'bg-red-500'     },
    warning: { border: 'border-l-amber-500',   progressColor: 'bg-amber-500'   },
    info:    { border: 'border-l-blue-500',     progressColor: 'bg-blue-500'    },
    loading: { border: 'border-l-gray-400',    progressColor: 'bg-gray-400'    },
    none:    { border: 'border-l-gray-300',    progressColor: 'bg-gray-300'    },
  };

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-accent-500" />,
    error:   <ShieldAlert className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info:    <Sparkles className="w-5 h-5 text-blue-500" />,
    loading: <Loader size="sm" />,
    none:    <Info className="w-5 h-5 text-gray-400" />,
  };

  const status = notification.status || 'info';
  const accent = accentStyles[status] || accentStyles.info;
  const Icon = icons[status] || icons.info;

  const isShown = isVisible && !isLeaving;

  return (
    <div
      className={`
        mb-3 w-80 sm:w-96 rounded-xl overflow-hidden
        border border-gray-200 dark:border-gray-700 border-l-4
        bg-white dark:bg-gray-900
        shadow-lg dark:shadow-black/30
        pointer-events-auto
        transition-all duration-400 ease-out transform
        ${isShown ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
        ${accent.border}
      `}
    >
      {/* Contenido principal */}
      <div className="flex items-center gap-3 p-4 text-gray-800 dark:text-gray-100">
        {/* Icono */}
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800">
          {Icon}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className="text-sm font-bold leading-snug text-gray-900 dark:text-gray-50">
              {notification.title}
            </h4>
          )}
          {notification.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
              {notification.message}
            </p>
          )}
          {notification.buttons && notification.buttons.length > 0 && (
            <div className="mt-3 flex gap-2">
              {notification.buttons.map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                >
                  {btn.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón cerrar */}
        {notification.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-1 p-1 rounded-md opacity-40 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      {shouldAutoDismiss && (
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800 w-full">
          <div
            ref={progressRef}
            className={`h-full w-full ${accent.progressColor} opacity-60`}
            style={{ transition: 'none' }}
          />
        </div>
      )}
    </div>
  );
};
