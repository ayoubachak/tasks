import { useEffect, useState, useRef } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TaskList } from './components/task/TaskList';
import { NotesList } from './components/notes/NotesList';
import { DescriptionEditorView } from './components/views/DescriptionEditorView';
import { NoteEditorView } from './components/views/NoteEditorView';
import { KeyboardShortcuts } from './components/shared/KeyboardShortcuts';
import { CommandPalette } from './components/shared/CommandPalette';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { storage } from './lib/storage/localStorage';
import { useWorkspaceStore, useUIStore, useSyncStore } from './stores';
import { exchangeCodeForTokens } from './services/google/auth';
import { CheckSquare, StickyNote } from 'lucide-react';

function App() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { currentView } = useUIStore();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { checkConnection, setConnected } = useSyncStore();

  useEffect(() => {
    // Initialize storage
    storage.initialize();

    // If no workspace is active but workspaces exist, select the first one
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }

    // Check existing connection (popup flow doesn't need URL parsing)
    checkConnection();
  }, [activeWorkspaceId, workspaces.length, setActiveWorkspace, checkConnection, setConnected]);

  const handleNewTask = () => {
    // This will be handled by TaskList component
    // For now, we'll trigger it via a custom event
    window.dispatchEvent(new CustomEvent('new-task'));
  };

  const handleFocusSearch = () => {
    // Focus the search input in TaskList
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  const handleNavigateToTask = (taskId: string) => {
    // Dispatch event to open task editor
    window.dispatchEvent(new CustomEvent('edit-task', { detail: { taskId } }));
  };

  // Always render the main layout, modals render on top
  return (
    <ErrorBoundary>
      <KeyboardShortcuts
        onNewTask={handleNewTask}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onFocusSearch={handleFocusSearch}
      />
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onNewTask={handleNewTask}
        onNavigateToTask={handleNavigateToTask}
      />
      <AppLayout>
        <ErrorBoundary>
          <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'notes')} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mb-4 w-fit flex-shrink-0">
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tasks" className="flex-1 mt-0 min-h-0">
                <TaskList />
              </TabsContent>
              <TabsContent value="notes" className="flex-1 mt-0 min-h-0">
                <NotesList />
              </TabsContent>
            </Tabs>
          </div>
        </ErrorBoundary>
      </AppLayout>
      {currentView === 'description-editor' && (
        <ErrorBoundary>
          <DescriptionEditorView />
        </ErrorBoundary>
      )}
      {currentView === 'note-editor' && (
        <ErrorBoundary>
          <NoteEditorView />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  );
}

export default App;
