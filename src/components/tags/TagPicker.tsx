import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagPickerProps {
  tags: string[];
  availableTags?: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  placeholder?: string;
}

const DEFAULT_TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
];

function getTagColor(tag: string): string {
  // Simple hash function to get consistent color for a tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_TAG_COLORS[Math.abs(hash) % DEFAULT_TAG_COLORS.length];
}

export function TagPicker({
  tags,
  availableTags = [],
  onChange,
  className,
  placeholder = 'Add tag...',
}: TagPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(false);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setIsInputOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Escape') {
      setIsInputOpen(false);
      setInputValue('');
    }
  };

  const filteredAvailableTags = availableTags.filter(
    (tag) => !tags.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
            style={{ backgroundColor: `${getTagColor(tag)}20`, borderColor: getTagColor(tag) }}
          >
            <span style={{ color: getTagColor(tag) }}>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" style={{ color: getTagColor(tag) }} />
            </button>
          </Badge>
        ))}

        {!isInputOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInputOpen(true)}
            className="h-6"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Tag
          </Button>
        )}

        {isInputOpen && (
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => {
                // Delay to allow clicking on suggestions
                setTimeout(() => setIsInputOpen(false), 200);
              }}
              placeholder={placeholder}
              className="h-6 w-32 text-sm"
              autoFocus
            />
            {filteredAvailableTags.length > 0 && (
              <div className="absolute top-full left-0 z-10 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                {filteredAvailableTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-accent"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

