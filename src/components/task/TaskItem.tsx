import { useTaskStore } from '@/stores';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DescriptionPreview } from './DescriptionPreview';
import { SubtaskTree } from '@/components/subtask/SubtaskTree';
import { format } from 'date-fns';
import { Edit2, Trash2, Link2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onEdit: () => void;
}

export function TaskItem({ task, onEdit }: TaskItemProps) {
  const { toggleTaskStatus, deleteTask } = useTaskStore();

  const handleToggle = () => {
    toggleTaskStatus(task.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  const priorityColors: Record<string, string> = {
    none: 'bg-gray-500',
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={handleToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3
                className={`font-medium ${
                  task.status === 'done' ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <div className="mt-1">
                  <DescriptionPreview 
                    content={task.description} 
                    maxLines={2}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {task.priority !== 'none' && (
                <div
                  className={`h-2 w-2 rounded-full ${priorityColors[task.priority]}`}
                  title={task.priority}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {task.subtasks.length > 0 && (
            <div className="mt-3 pl-2">
              <SubtaskTree taskId={task.id} subtasks={task.subtasks} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.dueDate && (
              <Badge
                variant={task.dueDate < Date.now() ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {format(task.dueDate, 'MMM d, yyyy')}
              </Badge>
            )}
            {task.subtasks.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {task.subtasks.filter((st) => st.completed).length}/
                {task.subtasks.length} subtasks
              </Badge>
            )}
            {task.dependencies.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Has {task.dependencies.length} dependencies</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {task.blockedBy.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Blocked
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Blocked by {task.blockedBy.length} task{task.blockedBy.length > 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

