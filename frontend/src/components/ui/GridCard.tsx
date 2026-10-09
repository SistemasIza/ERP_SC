import React from 'react';
import { cn } from '../../utils/cn';

export interface GridCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GridCard = ({ icon, title, subtitle, status, actions, children, className, onClick }: GridCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-slate-50 dark:bg-black/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-accent-500/10 rounded-xl text-accent-500">{icon}</div>
        {status}
      </div>
      <h3 className="font-black text-slate-900 dark:text-white text-sm mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{subtitle}</p>}
      {children && <div className="mb-3">{children}</div>}
      {actions && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/30">
          {actions}
        </div>
      )}
    </div>
  );
};
