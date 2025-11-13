import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { TaskItem } from './TaskItem';
import type { Task } from '@/types';

interface VirtualizedTaskListProps {
  tasks: Task[];
  onEdit: (taskId: string) => void;
  className?: string;
}

/**
 * Virtualized task list for performance with large datasets (1000+ tasks)
 * Only renders visible items, dramatically improving performance
 */
export function VirtualizedTaskList({ tasks, onEdit, className }: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height of each task item
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
      }}
      role="list"
      aria-label={`Task list with ${tasks.length} tasks`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const task = tasks[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TaskItem task={task} onEdit={() => onEdit(task.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

