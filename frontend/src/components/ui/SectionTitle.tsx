import React from 'react';

interface SectionTitleProps {
  title: string;
  highlightedWord?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  status?: React.ReactNode;
}

export const SectionTitle = ({ title, highlightedWord, subtitle, actions, status }: SectionTitleProps) => {
  return (
    <div className="relative">
      <div className="title-container space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {title.split(' ').map((word, index) => {
              const shouldHighlight = highlightedWord && word.toLowerCase() === highlightedWord.toLowerCase();
              return (
                <span
                  key={index}
                  className={shouldHighlight ? 'text-primary-600 dark:text-primary-400' : ''}
                >
                  {word}{' '}
                </span>
              );
            })}
          </h1>
        </div>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="absolute top-1/2 right-2 lg:right-3 transform -translate-y-1/2 flex items-center gap-3">
        {actions && (
          <div className="flex items-center">
            {actions}
          </div>
        )}
        {status && (
          <div className="flex items-center">
            {status}
          </div>
        )}
      </div>
    </div>
  );
};
