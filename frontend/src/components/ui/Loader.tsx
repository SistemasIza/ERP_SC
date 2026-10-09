import { cn } from '../../utils/cn';

interface LoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'loader-xs',
  sm: 'loader-sm',
  md: 'loader-md',
  lg: 'loader',
} as const;

export const Loader = ({ size = 'md', className }: LoaderProps) => {
  return <div className={cn(sizeClasses[size], className)} />;
};
