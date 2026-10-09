import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative relative-group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-white dark:bg-dark-card/50 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2",
              "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
              error 
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50" 
                : "border-slate-200 dark:border-white/5 focus:border-primary-500 focus:ring-primary-500/20",
              leftIcon ? "pl-10" : "pl-4",
              rightIcon ? "pr-10" : "pr-4",
              "py-2.5 h-10", // Default height matching Button md
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn("mt-1.5 text-xs font-medium", error ? "text-red-500" : "text-slate-500")}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
