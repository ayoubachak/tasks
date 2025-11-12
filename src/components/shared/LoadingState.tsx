import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  message = 'Loading...', 
  className,
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}



