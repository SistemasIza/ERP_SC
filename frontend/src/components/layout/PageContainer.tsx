import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standard container for a page.
 * Wraps the PageHeader and PageBody.
 */
export const PageContainer = ({ children, className = "" }: PageContainerProps) => {
  return (
    <div className={`h-full min-w-0 w-full animate-in fade-in duration-500 flex flex-col ${className}`}>
      {children}
    </div>
  );
};
