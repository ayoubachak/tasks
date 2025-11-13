import { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useViewStore } from '@/stores/viewStore';
import { useTaskStore, useWorkspaceStore } from '@/stores';
import { useShortcutStore } from '@/stores/shortcutStore';
import { getShortcutDisplay } from '@/constants/shortcuts';
import { List, LayoutGrid, Calendar, Plus, FileText } from 'lucide-react';
import type { ViewType } from '@/types/filter';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNewTask,
  onNavigateToTask,
}: CommandPaletteProps) {
  const { setView, currentView } = useViewStore();
  const { getTasksByWorkspace } = useTaskStore();
  const { getActiveWorkspace } = useWorkspaceStore();
  const { shortcuts } = useShortcutStore();
  const [search, setSearch] = useState('');

  const activeWorkspace = getActiveWorkspace();
  const tasks = activeWorkspace ? getTasksByWorkspace(activeWorkspace.id) : [];

  // Filter tasks based on search
  const filteredTasks = tasks.filter((task) => {
    if (!search) return false;
    const query = search.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (value: string) => {
    if (value.startsWith('task:')) {
      const taskId = value.replace('task:', '');
      onNavigateToTask?.(taskId);
      onOpenChange(false);
    } else if (value === 'new-task') {
      onNewTask?.();
      onOpenChange(false);
    } else if (value.startsWith('view:')) {
      const view = value.replace('view:', '') as ViewType;
      setView(view);
      onOpenChange(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem value="new-task" onSelect={handleSelect}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Task</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {getShortcutDisplay(shortcuts.find((s) => s.id === 'new-task')!)}
            </span>
          </CommandItem>
        </CommandGroup>

        {/* Views */}
        <CommandGroup heading="Views">
          <CommandItem
            value="view:list"
            onSelect={handleSelect}
            className={currentView === 'list' ? 'bg-accent' : ''}
          >
            <List className="mr-2 h-4 w-4" />
            <span>List View</span>
            {currentView === 'list' && (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            )}
          </CommandItem>
          <CommandItem
            value="view:board"
            onSelect={handleSelect}
            className={currentView === 'board' ? 'bg-accent' : ''}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Board View</span>
            {currentView === 'board' && (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            )}
          </CommandItem>
          <CommandItem
            value="view:calendar"
            onSelect={handleSelect}
            className={currentView === 'calendar' ? 'bg-accent' : ''}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendar View</span>
            {currentView === 'calendar' && (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            )}
          </CommandItem>
        </CommandGroup>

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {filteredTasks.slice(0, 10).map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task:${task.id}`}
                  onSelect={handleSelect}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="truncate">{task.title}</span>
                  {task.priority !== 'none' && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {task.priority}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

