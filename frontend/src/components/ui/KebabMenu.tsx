import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface KebabAction {
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface KebabMenuProps {
  actions: KebabAction[];
  className?: string;
  align?: 'left' | 'right';
}

export const KebabMenu = ({ actions, className, align = 'right' }: KebabMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-1 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                action.onClick(e);
                setOpen(false);
              }}
              disabled={action.disabled}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-all',
                action.disabled && 'opacity-40 cursor-not-allowed',
                action.variant === 'danger'
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
