import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, X, Plus } from 'lucide-react';
import { useViewStore } from '@/stores/viewStore';
import { createQuickFilters } from '@/lib/filters/filterUtils';
import type { Filter as FilterType } from '@/types/filter';
import { FilterBuilder } from './FilterBuilder';

export function FilterBar() {
  const { filters, addFilter, removeFilter, clearFilters } = useViewStore();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const quickFilters = createQuickFilters();

  const handleQuickFilter = (quickFilter: { filters: FilterType[] }) => {
    quickFilter.filters.forEach((filter) => {
      addFilter(filter);
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    removeFilter(filterId);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((quickFilter) => (
          <Button
            key={quickFilter.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(quickFilter)}
            className="h-7 text-xs"
          >
            {quickFilter.label}
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">
                {filter.field} {filter.operator} {String(filter.value)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFilter(filter.id)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Custom Filter Builder */}
      <Popover open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7">
            <Plus className="mr-1 h-3 w-3" />
            Custom Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <FilterBuilder onClose={() => setIsBuilderOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

