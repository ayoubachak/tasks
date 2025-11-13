import { useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useImageStore } from '@/stores/imageStore';
import { useNoteFolderStore } from '@/stores/noteFolderStore';
import { fullSync } from '@/services/sync/syncService';
import { exportToJSON } from '@/lib/export/json';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncButton() {
  const { 
    isConnected, 
    syncStatus, 
    conflictResolution,
    setSyncStatus, 
    setLastSyncAt, 
    setLastSyncError 
  } = useSyncStore();
  
  const { workspaces } = useWorkspaceStore();
  const { tasks, getAllNotes, standaloneNotes } = useTaskStore();
  const { taskTemplates, noteTemplates } = useTemplateStore();
  const imageStore = useImageStore();
  const { folders } = useNoteFolderStore();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!isConnected || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

    try {
      // Get all images
      const allImageIds = imageStore.getAllImageIds();
      const images = allImageIds
        .map((id) => imageStore.getImage(id))
        .filter((img): img is NonNullable<typeof img> => img !== undefined);

      // Export current data
      const jsonData = exportToJSON(
        workspaces,
        tasks,
        taskTemplates,
        noteTemplates,
        images
      );
      const exportData = JSON.parse(jsonData);

      // Add notes and folders to export (if not already included)
      // Note: We need to update ExportData interface to include these
      const allNotes = getAllNotes();
      const exportDataWithNotes = {
        ...exportData,
        notes: allNotes,
        folders: folders,
      };

      // Perform sync
      const result = await fullSync(exportDataWithNotes as any, {
        conflictResolution,
      });

      if (result.success) {
        setSyncStatus('success');
        setLastSyncAt(Date.now());
        
        // If we downloaded data, we should reload it
        // For now, we'll just mark as synced
        // In a full implementation, we'd import the merged data
      } else {
        setSyncStatus('error');
        setLastSyncError(result.error || 'Sync failed');
      }
    } catch (error) {
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing || syncStatus === 'syncing'}
      variant="outline"
      size="sm"
    >
      {isSyncing || syncStatus === 'syncing' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Now
        </>
      )}
    </Button>
  );
}

