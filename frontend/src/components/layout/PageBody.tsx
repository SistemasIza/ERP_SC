import { ReactNode } from 'react';

interface PageBodyProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

/**
 * Standard body container for a page.
 * Usually contains the scrollable content area below the PageHeader.
 */
export const PageBody = ({ children, className = "", scrollable = true }: PageBodyProps) => {
  return (
    <div className={`flex-1 flex flex-col min-h-0 relative ${className}`}>

      <div className={`flex-1 px-3 md:px-4 pb-6 ${scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'} relative z-10`}>
        {children}
      </div>
    </div>
  );
};
