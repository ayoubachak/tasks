import { useState, useEffect } from 'react';
import { useWorkspaceStore, useTaskStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';

interface WorkspaceEditorProps {
  workspaceId: string | null;
  open: boolean;
  onClose: () => void;
}

const colorPresets = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
];

export function WorkspaceEditor({ workspaceId, open, onClose }: WorkspaceEditorProps) {
  const { workspaces, createWorkspace, updateWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const { getTasksByWorkspace, deleteTask } = useTaskStore();
  const workspace = workspaceId ? workspaces.find((w) => w.id === workspaceId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setColor(workspace.color);
    } else {
      setName('');
      setDescription('');
      setColor('#3b82f6');
    }
    setIsDeleting(false);
  }, [workspace, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    if (workspace) {
      updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    } else {
      const newWorkspace = createWorkspace(name.trim(), color);
      if (description.trim()) {
        updateWorkspace(newWorkspace.id, {
          description: description.trim(),
        });
      }
    }

    onClose();
  };

  const handleDelete = () => {
    if (!workspace) return;

    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    // Get all tasks in this workspace
    const tasks = getTasksByWorkspace(workspace.id);
    
    // Delete all tasks
    tasks.forEach((task) => {
      deleteTask(task.id);
    });

    // If this is the active workspace, switch to another one
    const otherWorkspaces = workspaces.filter((w) => w.id !== workspace.id);
    if (otherWorkspaces.length > 0) {
      setActiveWorkspace(otherWorkspaces[0].id);
    } else {
      setActiveWorkspace(null);
    }

    // Delete the workspace
    deleteWorkspace(workspace.id);
    onClose();
  };

  const handleClose = () => {
    setIsDeleting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workspace ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
          <DialogDescription>
            {workspace
              ? 'Update workspace details and settings'
              : 'Create a new workspace to organize your tasks'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name *</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name..."
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional workspace description..."
              rows={3}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={cn(
                    'h-10 w-10 rounded-full border-2 transition-all',
                    color === presetColor
                      ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground'
                      : 'border-border hover:scale-105'
                  )}
                  style={{ backgroundColor: presetColor }}
                  aria-label={`Select color ${presetColor}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Custom:</span>
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <div
                className="h-10 w-20 rounded border"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {workspace && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className={cn(
                    'transition-all',
                    isDeleting && 'animate-pulse'
                  )}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Click again to confirm deletion' : 'Delete Workspace'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                {workspace ? 'Update' : 'Create'} Workspace
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

