import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useViewStore } from '@/stores/viewStore';
import type { SortField } from '@/types/filter';

const sortFields: Array<{ value: SortField; label: string }> = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Created Date' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
];

export function SortMenu() {
  const { sortBy, setSortBy } = useViewStore();

  const handleSort = (field: SortField) => {
    const newOrder = sortBy.field === field && sortBy.order === 'asc' ? 'desc' : 'asc';
    setSortBy({ field, order: newOrder });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sort: {sortFields.find((f) => f.value === sortBy.field)?.label || 'Custom'}
          {sortBy.order === 'asc' ? (
            <ArrowUp className="ml-2 h-3 w-3" />
          ) : (
            <ArrowDown className="ml-2 h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortFields.map((field) => (
          <DropdownMenuItem
            key={field.value}
            onClick={() => handleSort(field.value)}
            className="flex items-center justify-between"
          >
            <span>{field.label}</span>
            {sortBy.field === field.value && (
              <span className="text-xs text-muted-foreground">
                {sortBy.order === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

