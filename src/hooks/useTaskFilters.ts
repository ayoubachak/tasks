import { useMemo } from 'react';
import type { Task } from '@/types';
import type { Filter, SortOption } from '@/types/filter';
import { applyFilters } from '@/lib/filters/filterUtils';
import { sortTasks } from '@/lib/filters/sortUtils';

export interface UseTaskFiltersOptions {
  tasks: Task[];
  filters: Filter[];
  sortBy: SortOption;
  searchQuery?: string;
}

export function useTaskFilters({
  tasks,
  filters,
  sortBy,
  searchQuery = '',
}: UseTaskFiltersOptions) {
  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descriptionMatch = task.description.toLowerCase().includes(query);
        const tagMatch = task.tags.some((tag) => tag.toLowerCase().includes(query));
        const noteMatch = task.notes.some((note) => note.content.toLowerCase().includes(query));
        return titleMatch || descriptionMatch || tagMatch || noteMatch;
      });
    }

    // Apply filters
    result = applyFilters(result, filters);

    // Apply sorting
    result = sortTasks(result, sortBy);

    return result;
  }, [tasks, filters, sortBy, searchQuery]);

  return {
    filteredTasks: filteredAndSorted,
    count: filteredAndSorted.length,
  };
}

