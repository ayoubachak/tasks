import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from '@/components/task/TaskItem';
import { useTaskStore, useSelectionStore } from '@/stores';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface SortableListViewProps {
  tasks: Task[];
  onEditTask: (taskId: string) => void;
}

interface SortableTaskItemProps {
  task: Task;
  onEdit: () => void;
}

function SortableTaskItem({ task, onEdit }: SortableTaskItemProps) {
  const { isSelectionMode } = useSelectionStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: isSelectionMode, // Disable drag when in selection mode
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
      {...(!isSelectionMode ? { ...attributes, ...listeners } : {})}
    >
      <div className={cn(isDragging && 'ring-2 ring-primary rounded-lg')}>
        <TaskItem task={task} onEdit={onEdit} />
      </div>
    </div>
  );
}

export function SortableListView({ tasks, onEditTask }: SortableListViewProps) {
  const { updateTask } = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = taskIds.indexOf(active.id as string);
    const newIndex = taskIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      
      // Update order for all affected tasks
      reorderedTasks.forEach((task, index) => {
        // We'll use a simple order field - if tasks don't have it, we'll add it
        // For now, we'll update the updatedAt timestamp to reflect the change
        updateTask(task.id, { updatedAt: Date.now() });
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-3 md:mx-0 px-3 md:px-0">
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center px-4">
              <p className="text-base md:text-lg font-medium text-muted-foreground">
                No tasks found
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first task to get started
              </p>
            </div>
          </div>
        ) : (
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 py-2">
              {tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onEdit={() => onEditTask(task.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
}

