import { useMemo, useState } from 'react';
import { TaskItem } from '@/components/task/TaskItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Task } from '@/types';
import type { SortOption } from '@/types/filter';
import { sortTasks } from '@/lib/filters/sortUtils';

interface GroupedListViewProps {
  tasks: Task[];
  groupBy: 'status' | 'priority' | 'tag' | 'dueDate' | 'none';
  sortBy: SortOption;
  onEditTask: (taskId: string) => void;
}

export function GroupedListView({ tasks, groupBy, sortBy, onEditTask }: GroupedListViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none' || tasks.length === 0) {
      return { 'All Tasks': sortTasks([...tasks], sortBy) };
    }

    const groups: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      let groupKey = 'Uncategorized';

      switch (groupBy) {
        case 'status':
          groupKey = task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ');
          break;
        case 'priority':
          groupKey = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
          if (groupKey === 'None') groupKey = 'No Priority';
          break;
        case 'tag':
          if (task.tags.length > 0) {
            // Group by first tag, or create multiple entries
            task.tags.forEach((tag) => {
              if (!groups[tag]) {
                groups[tag] = [];
              }
              groups[tag].push(task);
            });
            return; // Skip default grouping for tags
          } else {
            groupKey = 'No Tags';
          }
          break;
        case 'dueDate':
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            if (taskDate.getTime() === today.getTime()) {
              groupKey = 'Today';
            } else if (taskDate < today) {
              groupKey = 'Overdue';
            } else if (taskDate.getTime() <= today.getTime() + 7 * 24 * 60 * 60 * 1000) {
              groupKey = 'This Week';
            } else if (dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()) {
              groupKey = 'This Month';
            } else {
              groupKey = format(dueDate, 'MMMM yyyy');
            }
          } else {
            groupKey = 'No Due Date';
          }
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    // Sort tasks within each group
    Object.keys(groups).forEach((key) => {
      groups[key] = sortTasks(groups[key], sortBy);
    });

    return groups;
  }, [tasks, groupBy, sortBy]);

  // Expand all groups by default
  useMemo(() => {
    const allGroups = Object.keys(groupedTasks);
    setExpandedGroups(new Set(allGroups));
  }, [groupedTasks]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
        </div>
      </div>
    );
  }

  const groupEntries = Object.entries(groupedTasks).sort(([a], [b]) => {
    // Custom sorting for common groups
    const order: Record<string, number> = {
      'Overdue': 0,
      'Today': 1,
      'This Week': 2,
      'This Month': 3,
      'No Due Date': 999,
      'No Tags': 999,
      'No Priority': 999,
    };

    const aOrder = order[a] ?? 100;
    const bOrder = order[b] ?? 100;
    return aOrder - bOrder;
  });

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2">
        {groupEntries.map(([groupKey, groupTasks]) => (
          <Accordion
            key={groupKey}
            type="single"
            collapsible
            value={expandedGroups.has(groupKey) ? groupKey : undefined}
            onValueChange={() => toggleGroup(groupKey)}
          >
            <AccordionItem value={groupKey} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{groupKey}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupTasks.length}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-2 pt-2">
                  {groupTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onEdit={() => onEditTask(task.id)} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </ScrollArea>
  );
}

