import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewStore } from '@/stores/viewStore';

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useViewStore();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search tasks, notes, tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 pr-9"
        data-search-input
      />
      {searchQuery && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => setSearchQuery('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

