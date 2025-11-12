import { useMemo } from 'react';
import { TaskItem } from '@/components/task/TaskItem';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface BoardViewProps {
  tasks: Task[];
  onEditTask: (taskId: string) => void;
}

const statusColumns: Array<{ status: TaskStatus; label: string; color: string }> = [
  { status: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
  { status: 'in-progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900' },
  { status: 'blocked', label: 'Blocked', color: 'bg-red-100 dark:bg-red-900' },
  { status: 'done', label: 'Done', color: 'bg-green-100 dark:bg-green-900' },
];

export function BoardView({ tasks, onEditTask }: BoardViewProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      blocked: [],
      done: [],
      archived: [],
    };

    tasks.forEach((task) => {
      if (task.status in grouped) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  return (
    <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden">
      {statusColumns.map((column) => {
        const columnTasks = tasksByStatus[column.status];
        return (
          <div
            key={column.status}
            className={cn(
              'flex flex-1 min-w-[320px] max-w-[400px] flex-col rounded-lg border overflow-hidden',
              column.color
            )}
          >
            {/* Column Header - Fixed */}
            <div className="border-b p-4 flex-shrink-0 bg-background/50 backdrop-blur-sm">
              <h3 className="font-semibold">{column.label}</h3>
              <p className="text-sm text-muted-foreground">
                {columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
            
            {/* Column Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-card rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onEditTask(task.id)}
                    >
                      <TaskItem task={task} onEdit={() => onEditTask(task.id)} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
