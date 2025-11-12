import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TaskList } from './components/task/TaskList';
import { storage } from './lib/storage/localStorage';
import { useWorkspaceStore } from './stores';

function App() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    // Initialize storage
    storage.initialize();

    // If no workspace is active but workspaces exist, select the first one
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces.length, setActiveWorkspace]);

  return (
    <AppLayout>
      <TaskList />
    </AppLayout>
  );
}

export default App;
