import { useWorkspaceStore } from '@/stores';
import { Plus, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, createWorkspace } =
    useWorkspaceStore();

  const handleCreateWorkspace = () => {
    const name = prompt('Workspace name:');
    if (name) {
      createWorkspace(name);
    }
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
                <button
                  key={workspace.id}
                  onClick={() => setActiveWorkspace(workspace.id)}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-smooth animate-fade-in animate-slide-in-right ${
                    activeWorkspaceId === workspace.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  aria-label={`Switch to ${workspace.name} workspace`}
                  aria-pressed={activeWorkspaceId === workspace.id}
                  role="tab"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: workspace.color }}
                  />
                  <Folder className="h-4 w-4" />
                  <span className="flex-1 truncate">{workspace.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

