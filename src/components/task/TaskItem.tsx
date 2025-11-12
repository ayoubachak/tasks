import { useTaskStore, useSelectionStore } from '@/stores';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DescriptionPreview } from './DescriptionPreview';
import { SubtaskTree } from '@/components/subtask/SubtaskTree';
import { formatRecurrenceRule } from '@/lib/recurrence/recurrenceUtils';
import { format } from 'date-fns';
import { Edit2, Trash2, Link2, Lock, Repeat, Clock, Bell, Play, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils/timeFormat';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onEdit: () => void;
}

export function TaskItem({ task, onEdit }: TaskItemProps) {
  const { toggleTaskStatus, deleteTask, updateTask } = useTaskStore();
  const { isSelectionMode, isSelected, toggleSelection } = useSelectionStore();
  const isTaskSelected = isSelected(task.id);

  const handleToggle = () => {
    toggleTaskStatus(task.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  const handleArchive = () => {
    updateTask(task.id, { status: 'archived' });
  };

  const handleUnarchive = () => {
    updateTask(task.id, { status: 'todo' });
  };

  const priorityColors: Record<string, string> = {
    none: 'bg-gray-500',
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.stopPropagation();
      toggleSelection(task.id);
    }
  };

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-smooth animate-fade-in animate-slide-in-up',
        'hover:shadow-md hover:border-primary/20',
        isSelectionMode && 'hover:bg-accent/50',
        isTaskSelected && 'ring-2 ring-primary bg-accent/30'
      )}
      onClick={handleCardClick}
      role="article"
      aria-label={`Task: ${task.title}`}
      tabIndex={isSelectionMode ? 0 : undefined}
      onKeyDown={(e) => {
        if (isSelectionMode && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          toggleSelection(task.id);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {isSelectionMode ? (
          <Checkbox
            checked={isTaskSelected}
            onCheckedChange={() => toggleSelection(task.id)}
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={handleToggle}
            className="mt-1"
          />
        )}
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
              {!isSelectionMode && (
                <>
                  {task.status === 'archived' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnarchive();
                      }}
                      title="Unarchive"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive();
                      }}
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
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
            {task.startDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {format(task.startDate, 'MMM d')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start: {format(task.startDate, 'MMM d, yyyy')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {task.dueDate && (
              <Badge
                variant={task.dueDate < Date.now() ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {format(task.dueDate, 'MMM d, yyyy')}
              </Badge>
            )}
            {task.reminderDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant={task.reminderDate < Date.now() ? 'destructive' : 'outline'} 
                      className="text-xs flex items-center gap-1"
                    >
                      <Bell className="h-3 w-3" />
                      {format(task.reminderDate, 'MMM d')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reminder: {format(task.reminderDate, 'MMM d, yyyy p')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {task.estimatedTime && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Est: {formatTime(task.estimatedTime)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated: {formatTime(task.estimatedTime)}</p>
                    {task.actualTime && (
                      <p>Actual: {formatTime(task.actualTime)}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {task.actualTime && !task.estimatedTime && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(task.actualTime)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Actual time: {formatTime(task.actualTime)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
            {task.recurrence && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Repeat className="h-3 w-3" />
                      Recurring
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatRecurrenceRule(task.recurrence)}</p>
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

