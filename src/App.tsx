import { useEffect, useState, useRef } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TaskList } from './components/task/TaskList';
import { DescriptionEditorView } from './components/views/DescriptionEditorView';
import { NoteEditorView } from './components/views/NoteEditorView';
import { KeyboardShortcuts } from './components/shared/KeyboardShortcuts';
import { CommandPalette } from './components/shared/CommandPalette';
import { storage } from './lib/storage/localStorage';
import { useWorkspaceStore, useUIStore } from './stores';

function App() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { currentView } = useUIStore();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize storage
    storage.initialize();

    // If no workspace is active but workspaces exist, select the first one
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces.length, setActiveWorkspace]);

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
    <>
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
        <TaskList />
      </AppLayout>
      {currentView === 'description-editor' && <DescriptionEditorView />}
      {currentView === 'note-editor' && <NoteEditorView />}
    </>
  );
}

export default App;
