import { CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 'h-4 w-4', text: 'text-sm' },
  md: { icon: 'h-5 w-5', text: 'text-base' },
  lg: { icon: 'h-6 w-6', text: 'text-lg' },
};

export function AppLogo({ className, size = 'md', showText = true }: AppLogoProps) {
  const sizes = sizeMap[size];
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CheckSquare 
        className={cn(sizes.icon, 'text-primary')} 
        aria-hidden="true"
      />
      {showText && (
        <span className={cn('font-semibold', sizes.text)}>
          Tasks
        </span>
      )}
    </div>
  );
}

