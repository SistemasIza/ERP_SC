import React from 'react';
import { cn } from '../../utils/cn';

export interface TableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const TableCard = React.forwardRef<HTMLDivElement, TableCardProps>(
  ({ className, noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden",
          !noPadding && "p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TableCard.displayName = 'TableCard';
