import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Group } from 'lucide-react';
import { useViewStore } from '@/stores/viewStore';

const groupByOptions: Array<{ value: 'status' | 'priority' | 'tag' | 'dueDate' | 'none'; label: string }> = [
  { value: 'none', label: 'No Grouping' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'tag', label: 'Tag' },
  { value: 'dueDate', label: 'Due Date' },
];

export function GroupByMenu() {
  const { groupBy, setGroupBy } = useViewStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Group className="mr-2 h-4 w-4" />
          Group: {groupByOptions.find((g) => g.value === groupBy)?.label || 'None'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Group By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groupByOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setGroupBy(option.value)}
            className={groupBy === option.value ? 'bg-accent' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

