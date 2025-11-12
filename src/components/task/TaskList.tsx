import { useTaskStore, useWorkspaceStore, useViewStore, useSelectionStore } from '@/stores';
import { useEffect } from 'react';
import { TaskItem } from './TaskItem';
import { TaskEditor } from './TaskEditor';
import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { SearchBar } from '@/components/filters/SearchBar';
import { FilterBar } from '@/components/filters/FilterBar';
import { SortMenu } from '@/components/filters/SortMenu';
import { ViewSwitcher } from '@/components/filters/ViewSwitcher';
import { BoardView } from '@/components/views/BoardView';
import { CalendarView } from '@/components/views/CalendarView';
import { SortableListView } from '@/components/views/SortableListView';
import { BulkActionsBar } from '@/components/bulk/BulkActionsBar';

export function TaskList() {
  const { getActiveWorkspace } = useWorkspaceStore();
  const { getTasksByWorkspace } = useTaskStore();
  const { currentView, filters, sortBy, searchQuery } = useViewStore();
  const { isSelectionMode, setSelectionMode, selectAll, getSelectedCount } = useSelectionStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const activeWorkspace = getActiveWorkspace();

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No workspace selected
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create or select a workspace to get started
          </p>
        </div>
      </div>
    );
  }

  const allTasks = getTasksByWorkspace(activeWorkspace.id);
  const { filteredTasks, count } = useTaskFilters({
    tasks: allTasks,
    filters,
    sortBy,
    searchQuery,
  });

  const handleCreateTask = () => {
    setEditingTaskId(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsEditorOpen(true);
  };

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleNewTaskEvent = () => {
      handleCreateTask();
    };

    const handleEditTaskEvent = (event: CustomEvent<{ taskId: string }>) => {
      handleEditTask(event.detail.taskId);
    };

    const handleSelectAll = (e: KeyboardEvent) => {
      // Only trigger on CTRL+A or CMD+A, not other CTRL combinations
      if (e.key !== 'a' && e.key !== 'A') return;
      
      // Only if not in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!isSelectionMode) {
          setSelectionMode(true);
        }
        selectAll(filteredTasks.map((t) => t.id));
      }
    };

    window.addEventListener('new-task', handleNewTaskEvent as EventListener);
    window.addEventListener('edit-task', handleEditTaskEvent as EventListener);
    window.addEventListener('keydown', handleSelectAll);

    return () => {
      window.removeEventListener('new-task', handleNewTaskEvent as EventListener);
      window.removeEventListener('edit-task', handleEditTaskEvent as EventListener);
      window.removeEventListener('keydown', handleSelectAll);
    };
  }, [filteredTasks, isSelectionMode, selectAll, setSelectionMode]);

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingTaskId(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'board':
        return <BoardView tasks={filteredTasks} onEditTask={handleEditTask} />;
      case 'calendar':
        return <CalendarView tasks={filteredTasks} onEditTask={handleEditTask} />;
      case 'list':
      default:
        // Use sortable list when no filters/search are active for drag & drop reordering
        if (filters.length === 0 && !searchQuery) {
          return <SortableListView tasks={filteredTasks} onEditTask={handleEditTask} />;
        }
        // Use regular list when filters/search are active (preserves sort order)
        return (
          <ScrollArea className="flex-1">
            {filteredTasks.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    No tasks found
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filters.length > 0 || searchQuery
                      ? 'Try adjusting your filters or search query'
                      : 'Create your first task to get started'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={() => handleEditTask(task.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{activeWorkspace.name}</h2>
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? 'task' : 'tasks'}
            {count !== allTasks.length && ` of ${allTasks.length} total`}
            {isSelectionMode && ` • ${getSelectedCount()} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isSelectionMode ? 'default' : 'outline'}
            onClick={() => setSelectionMode(!isSelectionMode)}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            {isSelectionMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <Button onClick={handleCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar />
          </div>
          <ViewSwitcher />
          <SortMenu />
        </div>
        <FilterBar />
      </div>

      <Separator className="mb-4" />

      {/* View Content */}
      <div className="flex-1 min-h-0">
        {renderView()}
      </div>

      {/* Task Editor */}
      {isEditorOpen && (
        <TaskEditor
          key={editingTaskId || 'new-task'}
          taskId={editingTaskId}
          workspaceId={activeWorkspace.id}
          onClose={handleCloseEditor}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar />
    </div>
  );
}
