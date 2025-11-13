import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

// Pre-built skeleton components for common use cases
export function TaskSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded mt-0.5" variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" variant="text" />
          <Skeleton className="h-4 w-full" variant="text" />
          <Skeleton className="h-4 w-2/3" variant="text" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" variant="rectangular" />
        <Skeleton className="h-6 w-20" variant="rectangular" />
      </div>
    </div>
  );
}

export function NoteSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-6 w-1/2" variant="text" />
      <Skeleton className="h-4 w-full" variant="text" />
      <Skeleton className="h-4 w-5/6" variant="text" />
      <Skeleton className="h-4 w-4/6" variant="text" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  );
}

