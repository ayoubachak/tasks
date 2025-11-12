import { useTaskStore, useWorkspaceStore } from '@/stores';
import { TaskItem } from './TaskItem';
import { TaskEditor } from './TaskEditor';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TaskList() {
  const { getActiveWorkspace } = useWorkspaceStore();
  const { getTasksByWorkspace } = useTaskStore();
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

  const tasks = getTasksByWorkspace(activeWorkspace.id);

  const handleCreateTask = () => {
    setEditingTaskId(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingTaskId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{activeWorkspace.name}</h2>
          <p className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <Button onClick={handleCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No tasks yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first task to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={() => handleEditTask(task.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {isEditorOpen && (
        <TaskEditor
          taskId={editingTaskId}
          workspaceId={activeWorkspace.id}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}

