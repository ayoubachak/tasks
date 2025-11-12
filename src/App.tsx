import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TaskList } from './components/task/TaskList';
import { DescriptionEditorView } from './components/views/DescriptionEditorView';
import { NoteEditorView } from './components/views/NoteEditorView';
import { storage } from './lib/storage/localStorage';
import { useWorkspaceStore, useUIStore } from './stores';

function App() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { currentView } = useUIStore();

  useEffect(() => {
    // Initialize storage
    storage.initialize();

    // If no workspace is active but workspaces exist, select the first one
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces.length, setActiveWorkspace]);

  // Render different views based on current view state
  if (currentView === 'description-editor') {
    return <DescriptionEditorView />;
  }

  if (currentView === 'note-editor') {
    return <NoteEditorView />;
  }

  // Default: List view
  return (
    <AppLayout>
      <TaskList />
    </AppLayout>
  );
}

export default App;
