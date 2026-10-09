import React from 'react';
import { cn } from '../../utils/cn';

export interface TagChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'slate' | 'purple' | 'pink' | 'cyan';
  size?: 'xs' | 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  href?: string;
}

const colorStyles: Record<string, string> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  primary: 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-[8px]',
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
};

export const TagChip = React.forwardRef<HTMLSpanElement, TagChipProps>(
  ({ className, color = 'default', size = 'sm', removable, onRemove, icon, href, children, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center gap-1 font-black uppercase tracking-wider leading-none rounded-lg',
      sizeStyles[size],
      colorStyles[color],
      removable && 'pr-1',
      className
    );

    const content = (
      <>
        {icon}
        {children}
        {removable && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="ml-0.5 hover:opacity-60 transition-opacity"
          >
            &times;
          </button>
        )}
      </>
    );

    if (href) {
      return (
        <a ref={ref as any} href={href} className={classes} {...props as any}>
          {content}
        </a>
      );
    }

    return (
      <span ref={ref} className={classes} {...props}>
        {content}
      </span>
    );
  }
);

TagChip.displayName = 'TagChip';
