import { useState } from 'react';
import { useWorkspaceStore, useTaskStore } from '@/stores';
import { Plus, Folder, MoreVertical, Edit, Trash2, Palette, ChevronLeft, ChevronRight, CheckSquare, Square, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from '@/lib/toast';

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

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  showAllView?: boolean;
  onToggleAllView?: () => void;
  onExitAllView?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse, mobileOpen = false, onMobileClose, showAllView = false, onToggleAllView, onExitAllView }: SidebarProps) {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, updateWorkspace, deleteWorkspace, setActiveWorkspace: setActive } = useWorkspaceStore();
  const { getTasksByWorkspace, deleteTask } = useTaskStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<Set<string>>(new Set());

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

    deleteWorkspaceWithTasks(workspaceId);
    setIsDeleting(null);
  };

  const deleteWorkspaceWithTasks = (workspaceId: string) => {
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
  };

  const handleToggleSelection = (workspaceId: string) => {
    setSelectedWorkspaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedWorkspaceIds.size === workspaces.length) {
      setSelectedWorkspaceIds(new Set());
    } else {
      setSelectedWorkspaceIds(new Set(workspaces.map((w) => w.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedWorkspaceIds.size === 0) return;

    const count = selectedWorkspaceIds.size;
    const confirmMessage = `Are you sure you want to delete ${count} workspace${count > 1 ? 's' : ''}? This will also delete all tasks and notes in ${count > 1 ? 'these workspaces' : 'this workspace'}.`;

    if (!confirm(confirmMessage)) return;

    const selectedIds = Array.from(selectedWorkspaceIds);
    const activeId = activeWorkspaceId;

    // Delete all selected workspaces
    selectedIds.forEach((id) => {
      deleteWorkspaceWithTasks(id);
    });

    // If active workspace was deleted, switch to another one
    if (activeId && selectedIds.includes(activeId)) {
      const remaining = workspaces.filter((w) => !selectedIds.includes(w.id));
      if (remaining.length > 0) {
        setActive(remaining[0].id);
      } else {
        setActive(null);
      }
    }

    toast.success(
      `Deleted ${count} workspace${count > 1 ? 's' : ''}`,
      `All tasks and notes in ${count > 1 ? 'these workspaces' : 'this workspace'} have been removed`
    );

    // Exit selection mode
    setIsSelectionMode(false);
    setSelectedWorkspaceIds(new Set());
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedWorkspaceIds(new Set());
  };

  const sidebarContent = (
    <>
      <div className={cn(
        "flex h-16 items-center transition-all",
        collapsed ? "px-2 justify-center" : "px-4 justify-between"
      )}>
        {!collapsed && (
          <h2 className="font-semibold">
            {isSelectionMode ? `Selected (${selectedWorkspaceIds.size})` : 'Workspaces'}
          </h2>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && !isSelectionMode && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSelectionMode(true)}
                title="Select workspaces"
                aria-label="Select workspaces"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCreateWorkspace}
          title="Create workspace"
          aria-label="Create new workspace"
        >
          <Plus className="h-4 w-4" />
        </Button>
            </>
          )}
          {!collapsed && isSelectionMode && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSelectAll}
                title={selectedWorkspaceIds.size === workspaces.length ? 'Deselect all' : 'Select all'}
                aria-label={selectedWorkspaceIds.size === workspaces.length ? 'Deselect all' : 'Select all'}
              >
                {selectedWorkspaceIds.size === workspaces.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
              {selectedWorkspaceIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBulkDelete}
                  title="Delete selected"
                  aria-label="Delete selected workspaces"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExitSelectionMode}
                title="Cancel selection"
                aria-label="Cancel selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {onToggleCollapse && (
          <Button
            variant={collapsed ? "default" : "ghost"}
            size="icon"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              "transition-all z-10",
              collapsed && "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 hover:shadow-lg"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          )}
        </div>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className={cn("p-2", collapsed && "px-1")}>
          {/* All View Button */}
          {onToggleAllView && (
            <div
              className={cn(
                'group flex items-center gap-2 rounded-md text-left text-sm transition-smooth mb-2',
                collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                showAllView
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
              onClick={() => {
                if (!collapsed) {
                  onToggleAllView();
                  onMobileClose?.();
                }
              }}
            >
              <Layers className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span className="flex-1">All Tasks & Notes</span>}
            </div>
          )}
          {!collapsed && workspaces.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No workspaces yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1">
              {workspaces.map((workspace, index) => {
                const isSelected = selectedWorkspaceIds.has(workspace.id);
                return (
                  <div
                  key={workspace.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md text-left text-sm transition-smooth animate-fade-in animate-slide-in-right',
                    collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                    activeWorkspaceId === workspace.id && !isSelectionMode
                      ? 'bg-primary text-primary-foreground'
                      : isSelected && isSelectionMode
                      ? 'bg-primary/20 border border-primary'
                      : 'hover:bg-accent'
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleToggleSelection(workspace.id);
                    } else if (!collapsed) {
                      setActiveWorkspace(workspace.id);
                      onExitAllView?.(); // Exit All view when selecting a workspace
                      onMobileClose?.();
                    }
                  }}
                >
                  {collapsed ? (
                    <>
                      {isSelectionMode ? (
                        <div className="w-full flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedWorkspaceIds((prev) => new Set([...prev, workspace.id]));
                              } else {
                                setSelectedWorkspaceIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(workspace.id);
                                  return next;
                                });
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          />
                        </div>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveWorkspace(workspace.id);
                                onMobileClose?.();
                              }}
                              className={cn(
                                'w-full flex items-center justify-center rounded-md p-2 transition-colors',
                                activeWorkspaceId === workspace.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-accent'
                              )}
                  aria-label={`Switch to ${workspace.name} workspace`}
                  aria-pressed={activeWorkspaceId === workspace.id}
                  role="tab"
                >
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{ backgroundColor: workspace.color }}
                              />
                            </button>
                          </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" side="right">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 px-2 py-1.5">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: workspace.color }}
                  />
                            <span className="font-medium text-sm">{workspace.name}</span>
                          </div>
                          <Separator />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditWorkspace(workspace.id, e);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(workspace.id, e);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {isSelectionMode ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelection(workspace.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          />
                        ) : (
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
                        )}
                        {isSelectionMode ? (
                          <div
                            className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelection(workspace.id);
                            }}
                          >
                            <Folder className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 truncate">{workspace.name}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveWorkspace(workspace.id);
                              onMobileClose?.();
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left"
                            aria-label={`Switch to ${workspace.name} workspace`}
                            aria-pressed={activeWorkspaceId === workspace.id}
                            role="tab"
                          >
                            <Folder className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{workspace.name}</span>
                </button>
                        )}
                      </div>
                      {!isSelectionMode && (
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
                      )}
                    </>
                  )}
                  </div>
                );
              })}
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
    </>
  );

  // Mobile: Render as Sheet (drawer)
  if (onMobileClose !== undefined) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Workspace Navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate and manage your workspaces</SheetDescription>
          <aside 
            className="flex border-r bg-muted/40 flex-col h-full"
            aria-label="Workspace navigation"
          >
            {sidebarContent}
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render as regular sidebar
  return (
    <aside 
      className={cn(
        'hidden md:flex border-r bg-muted/40 flex-col transition-all duration-300 relative group',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Workspace navigation"
    >
      {sidebarContent}
    </aside>
  );
}

