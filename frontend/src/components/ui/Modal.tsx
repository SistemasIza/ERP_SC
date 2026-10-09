import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  decorated?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export const Modal = ({ open, onClose, title, subtitle, icon, children, footer, size = 'md', className, decorated = true }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn(
        'relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full flex flex-col max-h-[90vh] overflow-hidden',
        sizeClasses[size],
        className,
      )}>
        {/* === DECORATIVE BACKGROUND === */}
        {decorated && (
          <>
            {/* Big blur orbs */}
            <div className="absolute -top-32 -right-32 w-72 h-72 bg-accent-500/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

            {/* Top light flare */}
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-accent-500/40 to-transparent pointer-events-none" />
          </>
        )}

        {/* === TOP ACCENT STRIP === */}
        <div className="relative z-10 shrink-0">
          <div className="h-2 w-full bg-gradient-to-r from-accent-500 via-accent-400 to-accent-500 shadow-[0_0_20px_rgba(250,204,21,0.15)]" />
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />
        </div>

        {/* === HEADER === */}
        {title && (
          <div className="relative z-10">
            {/* Subtle header background */}
            <div className="absolute inset-0 bg-gradient-to-b from-accent-500/[0.02] to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative flex items-start justify-between gap-4 px-6 pt-5 pb-0">
              <div className="flex items-start gap-3 min-w-0">
                {icon && (
                  <div className="shrink-0 mt-0.5 relative">
                    {/* Icon glow */}
                    <div className="absolute inset-0 bg-accent-500/20 blur-xl rounded-full" />
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">{title}</h3>
                  {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-accent-500/10 to-transparent rounded-bl-full" />
            </div>
          </div>
        )}

        {/* === SEPARATOR === */}
        {title && <div className="relative z-10 mx-6 mt-4 mb-0 h-px bg-gradient-to-r from-accent-500/10 via-slate-200 dark:via-slate-700 to-accent-500/10" />}

        {/* === BODY === */}
        <div className="relative z-10 p-6 overflow-y-auto custom-scrollbar flex-1 pt-5">
          {children}
        </div>

        {/* === FOOTER === */}
        {footer && (
          <div className="relative z-10">
            {title && <div className="mx-6 h-px bg-gradient-to-r from-accent-500/10 via-slate-200 dark:via-slate-700 to-accent-500/10" />}
            <div className="p-6 pt-4">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
