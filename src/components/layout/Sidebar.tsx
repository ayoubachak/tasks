import { useState } from 'react';
import { useWorkspaceStore, useTaskStore } from '@/stores';
import { Plus, Folder, MoreVertical, Edit, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';

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

export function Sidebar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, updateWorkspace, deleteWorkspace, setActiveWorkspace: setActive } = useWorkspaceStore();
  const { getTasksByWorkspace, deleteTask } = useTaskStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreateWorkspace = () => {
    setEditingWorkspaceId(null);
    setIsEditorOpen(true);
  };

  const handleEditWorkspace = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspaceId(workspaceId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingWorkspaceId(null);
  };

  const handleColorChange = (workspaceId: string, newColor: string) => {
    updateWorkspace(workspaceId, { color: newColor });
    setColorPickerOpen(null);
  };

  const handleDeleteWorkspace = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;

    if (isDeleting !== workspaceId) {
      setIsDeleting(workspaceId);
      return;
    }

    // Get all tasks in this workspace
    const tasks = getTasksByWorkspace(workspaceId);
    
    // Delete all tasks
    tasks.forEach((task) => {
      deleteTask(task.id);
    });

    // If this is the active workspace, switch to another one
    const otherWorkspaces = workspaces.filter((w) => w.id !== workspaceId);
    if (otherWorkspaces.length > 0) {
      setActive(otherWorkspaces[0].id);
    } else {
      setActive(null);
    }

    // Delete the workspace
    deleteWorkspace(workspaceId);
    setIsDeleting(null);
  };

  return (
    <aside 
      className="hidden md:flex w-64 border-r bg-muted/40 flex-col"
      aria-label="Workspace navigation"
    >
      <div className="flex h-16 items-center justify-between px-4">
        <h2 className="font-semibold">Workspaces</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCreateWorkspace}
          title="Create workspace"
          aria-label="Create new workspace"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-2">
          {workspaces.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No workspaces yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1">
              {workspaces.map((workspace, index) => (
                <div
                  key={workspace.id}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-smooth animate-fade-in animate-slide-in-right ${
                    activeWorkspaceId === workspace.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <button
                    onClick={() => setActiveWorkspace(workspace.id)}
                    className="flex-1 flex items-center gap-2 min-w-0"
                    aria-label={`Switch to ${workspace.name} workspace`}
                    aria-pressed={activeWorkspaceId === workspace.id}
                    role="tab"
                  >
                    <Popover
                      open={colorPickerOpen === workspace.id}
                      onOpenChange={(open) => setColorPickerOpen(open ? workspace.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorPickerOpen(workspace.id);
                          }}
                          className="h-3 w-3 rounded-full flex-shrink-0 border-2 border-transparent hover:border-foreground/20 transition-all hover:scale-125"
                          style={{ backgroundColor: workspace.color }}
                          title="Change color"
                          aria-label="Change workspace color"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Choose Color</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {colorPresets.map((presetColor) => (
                              <button
                                key={presetColor}
                                type="button"
                                onClick={() => handleColorChange(workspace.id, presetColor)}
                                className={cn(
                                  'h-8 w-8 rounded-full border-2 transition-all hover:scale-110',
                                  workspace.color === presetColor
                                    ? 'border-foreground scale-110 ring-2 ring-offset-1 ring-offset-background ring-foreground'
                                    : 'border-border'
                                )}
                                style={{ backgroundColor: presetColor }}
                                aria-label={`Select color ${presetColor}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Custom:</span>
                            <input
                              type="color"
                              value={workspace.color}
                              onChange={(e) => handleColorChange(workspace.id, e.target.value)}
                              className="h-8 w-16 cursor-pointer rounded border"
                            />
                            <div
                              className="h-8 w-16 rounded border"
                              style={{ backgroundColor: workspace.color }}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{workspace.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                          activeWorkspaceId === workspace.id && 'opacity-100'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleEditWorkspace(workspace.id, e)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Workspace
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveWorkspace(workspace.id);
                        }}
                        disabled={activeWorkspaceId === workspace.id}
                      >
                        Switch to Workspace
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                        className={cn(
                          'text-destructive focus:text-destructive',
                          isDeleting === workspace.id && 'animate-pulse font-semibold'
                        )}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting === workspace.id ? 'Click again to confirm' : 'Delete Workspace'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Workspace Editor */}
      <WorkspaceEditor
        workspaceId={editingWorkspaceId}
        open={isEditorOpen}
        onClose={handleCloseEditor}
      />
    </aside>
  );
}

