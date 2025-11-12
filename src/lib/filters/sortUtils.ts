import type { Task } from '@/types';
import type { SortOption } from '@/types/filter';

const priorityOrder: Record<string, number> = {
  urgent: 5,
  high: 4,
  medium: 3,
  low: 2,
  none: 1,
};

const statusOrder: Record<string, number> = {
  'in-progress': 3,
  todo: 2,
  blocked: 1,
  done: 0,
  archived: -1,
};

export function sortTasks(tasks: Task[], sortOption: SortOption): Task[] {
  const { field, order } = sortOption;
  const sorted = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'status':
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      case 'created':
        comparison = a.createdAt - b.createdAt;
        break;
      case 'updated':
        comparison = a.updatedAt - b.updatedAt;
        break;
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1; // No due date goes to end
        else if (!b.dueDate) comparison = -1;
        else comparison = a.dueDate - b.dueDate;
        break;
      default:
        comparison = 0;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

