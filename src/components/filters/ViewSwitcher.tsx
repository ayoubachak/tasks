import { Button } from '@/components/ui/button';
import { List, LayoutGrid, Calendar, BarChart3 } from 'lucide-react';
import { useViewStore } from '@/stores/viewStore';
import type { ViewType } from '@/types/filter';
import { cn } from '@/lib/utils';

const views: Array<{ value: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'list', label: 'List', icon: List },
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function ViewSwitcher() {
  const { currentView, setView } = useViewStore();

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {views.map((view) => {
        const Icon = view.icon;
        return (
          <Button
            key={view.value}
            type="button"
            variant={currentView === view.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView(view.value)}
            className={cn(
              'flex items-center gap-2',
              currentView === view.value && 'bg-primary text-primary-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

