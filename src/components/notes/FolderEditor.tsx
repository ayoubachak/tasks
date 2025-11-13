import { useState, useEffect } from 'react';
import { useNoteFolderStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderEditorProps {
  folderId: string | null;
  workspaceId: string;
  parentFolderId?: string;
  open: boolean;
  onClose: () => void;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function FolderEditor({
  folderId,
  workspaceId,
  parentFolderId,
  open,
  onClose,
}: FolderEditorProps) {
  const { createFolder, updateFolder, getFolder } = useNoteFolderStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const folder = folderId ? getFolder(folderId) : null;
  const isEditing = !!folder;

  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name);
        setColor(folder.color);
      } else {
        setName('');
        setColor(undefined);
      }
      setIsSubmitting(false);
    }
  }, [open, folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    if (isEditing) {
      updateFolder(folderId!, { name: name.trim(), color });
    } else {
      createFolder(workspaceId, name.trim(), parentFolderId, color);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Folder' : 'New Folder'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update folder name and color'
              : 'Create a new folder to organize your notes'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color (Optional)</Label>
            <div className="flex gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Folder
                      className={cn('mr-2 h-4 w-4', color && `text-[${color}]`)}
                      style={color ? { color } : undefined}
                    />
                    {color ? (
                      <span className="flex-1 text-left">Custom Color</span>
                    ) : (
                      <span className="flex-1 text-left text-muted-foreground">No color</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setColor(undefined)}
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      No color
                    </Button>
                    {FOLDER_COLORS.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setColor(c)}
                      >
                        <Folder className="mr-2 h-4 w-4" style={{ color: c }} />
                        <span className="flex-1 text-left">Color</span>
                        <div
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: c }}
                        />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

