import { useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { fullSync } from '@/services/sync/syncService';
import { collectAllData } from '@/lib/export/dataCollector';
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

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!isConnected || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

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

