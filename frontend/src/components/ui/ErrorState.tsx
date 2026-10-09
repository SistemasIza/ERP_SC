import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = 'Ha ocurrido un error',
  message,
  retryLabel = 'Reintentar',
  onRetry,
  className,
  ...props
}: ErrorStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-red-100 dark:border-red-500/10 rounded-2xl bg-red-50/30 dark:bg-red-500/5",
        className
      )}
      {...props}
    >
      <div className="p-4 bg-red-100 dark:bg-red-500/10 rounded-2xl text-red-500 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-red-600/80 dark:text-red-400/80 max-w-sm mb-5">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
