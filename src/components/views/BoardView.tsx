import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from '@/components/task/TaskItem';
import { useTaskStore } from '@/stores';
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

interface DraggableTaskProps {
  task: Task;
  onEdit: () => void;
}

function DraggableTask({ task, onEdit }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card rounded-lg border p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
      onClick={(e) => {
        // Prevent edit dialog when dragging
        if (!isDragging) {
          e.stopPropagation();
          onEdit();
        }
      }}
    >
      <TaskItem task={task} onEdit={onEdit} />
    </div>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onEditTask: (taskId: string) => void;
}

function DroppableColumn({ status, label, color, tasks, onEditTask }: DroppableColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-1 min-w-[320px] max-w-[400px] flex-col rounded-lg border overflow-hidden transition-colors',
        color,
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Column Header - Fixed */}
      <div className="border-b p-4 flex-shrink-0 bg-background/50 backdrop-blur-sm">
        <h3 className="font-semibold">{label}</h3>
        <p className="text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </div>

      {/* Column Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div
                className={cn(
                  'py-12 text-center text-sm rounded-lg border-2 border-dashed transition-colors',
                  isOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 text-muted-foreground'
                )}
              >
                {isOver ? 'Drop task here' : 'No tasks'}
              </div>
            ) : (
              tasks.map((task) => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  onEdit={() => onEditTask(task.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export function BoardView({ tasks, onEditTask }: BoardViewProps) {
  const { updateTask } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const overId = over.id as string;

    // Check if dropped on a column (column-{status} format)
    let targetStatus: TaskStatus | undefined;
    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '') as TaskStatus;
    } else {
      // Check if dropped on another task (get its status)
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // Update task status if it changed
    if (targetStatus && targetStatus !== task.status) {
      updateTask(taskId, { status: targetStatus });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Visual feedback could be added here if needed
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden">
        {statusColumns.map((column) => {
          const columnTasks = tasksByStatus[column.status];
          return (
            <DroppableColumn
              key={column.status}
              status={column.status}
              label={column.label}
              color={column.color}
              tasks={columnTasks}
              onEditTask={onEditTask}
            />
          );
        })}
      </div>

      {/* Drag Overlay - Shows the task being dragged */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-card rounded-lg border p-3 shadow-2xl ring-2 ring-primary rotate-3 opacity-95 max-w-[350px]">
            <TaskItem task={activeTask} onEdit={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
