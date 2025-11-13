import { useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { fullSync } from '@/services/sync/syncService';
import { collectAllData } from '@/lib/export/dataCollector';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

export function SyncButton() {
  const { 
    isConnected, 
    syncStatus, 
    conflictResolution,
    setSyncStatus, 
    setLastSyncAt, 
    setLastSyncError 
  } = useSyncStore();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!isConnected || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

    const toastId = toast.loading('Syncing with Google Drive...');

    try {
      // Collect ALL data from all stores using centralized function
      const exportData = collectAllData();

      // Perform sync
      const result = await fullSync(exportData, {
        conflictResolution,
      });

      if (result.success) {
        setSyncStatus('success');
        setLastSyncAt(Date.now());
        toast.dismiss(toastId);
        toast.success('Sync completed', 'Your data has been synced with Google Drive');
        
        // If we downloaded data, we should reload it
        // For now, we'll just mark as synced
        // In a full implementation, we'd import the merged data
      } else {
        setSyncStatus('error');
        const errorMsg = result.error || 'Sync failed';
        setLastSyncError(errorMsg);
        toast.dismiss(toastId);
        toast.error('Sync failed', errorMsg);
      }
    } catch (error) {
      setSyncStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMsg);
      toast.dismiss(toastId);
      toast.error('Sync failed', errorMsg);
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

