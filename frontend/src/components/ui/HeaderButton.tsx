import React from 'react';

interface HeaderButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

export const HeaderButton: React.FC<HeaderButtonProps> = ({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  icon,
  className = '',
  title,
}) => {
  const base =
    'inline-flex items-center gap-2 px-4 h-10 text-[13px] font-semibold rounded-xl transition-all duration-150 select-none';

  const variants = {
    primary:
      'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-[0.98]',
    secondary:
      'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-accent-500/50 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-500/5 active:scale-[0.98]',
    ghost:
      'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variants[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};
