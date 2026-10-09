import React from 'react';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'accent' | 'white' | 'ghost';
  title?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  variant = 'accent',
  title,
}) => {
  const variantStyles = {
    accent: 'bg-accent-600 hover:bg-accent-700 text-white',
    white: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-accent-400 dark:hover:border-accent-500',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`animated-btn ${variantStyles[variant]} ${className}`}
    >
      <span className="anim-circle circle1" />
      <span className="anim-circle circle2" />
      <span className="anim-circle circle3" />
      <span className="anim-circle circle4" />
      <span className="anim-circle circle5" />
      <span className="anim-text">{children}</span>
    </button>
  );
};
