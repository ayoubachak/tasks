import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Tag, Archive, ArchiveRestore, X } from 'lucide-react';
import { useSelectionStore } from '@/stores/selectionStore';
import { useTaskStore } from '@/stores';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsBarProps {
  onBatchEdit?: () => void;
}

export function BulkActionsBar({ onBatchEdit }: BulkActionsBarProps) {
  const { selectedTaskIds, getSelectedCount, clearSelection, setSelectionMode } =
    useSelectionStore();
  const { deleteTask, updateTask } = useTaskStore();
  const selectedCount = getSelectedCount();

  if (selectedCount === 0) return null;

  const handleDelete = () => {
    selectedTaskIds.forEach((taskId) => {
      deleteTask(taskId);
    });
    clearSelection();
  };

  const handleArchive = () => {
    selectedTaskIds.forEach((taskId) => {
      updateTask(taskId, { status: 'archived' });
    });
    clearSelection();
  };

  const handleUnarchive = () => {
    selectedTaskIds.forEach((taskId) => {
      updateTask(taskId, { status: 'todo' });
    });
    clearSelection();
  };

  const handleMarkDone = () => {
    selectedTaskIds.forEach((taskId) => {
      updateTask(taskId, { status: 'done', progress: 100 });
    });
    clearSelection();
  };

  const handleExitSelection = () => {
    clearSelection();
    setSelectionMode(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
      <Badge variant="secondary" className="mr-2">
        {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
      </Badge>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onBatchEdit}
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Tag className="mr-2 h-4 w-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleMarkDone}>
            Mark as Done
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUnarchive}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Unarchive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleExitSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

