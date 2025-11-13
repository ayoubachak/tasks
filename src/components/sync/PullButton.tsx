import { useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { syncFromDrive } from '@/services/sync/syncService';
import { replaceAllDataWithBackup } from '@/lib/import/json';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { ExportData } from '@/lib/export/json';
import { format } from 'date-fns';

export function PullButton() {
  const { isConnected } = useSyncStore();
  const [isPulling, setIsPulling] = useState(false);

  const handlePull = async () => {
    if (!isConnected || isPulling) return;

    setIsPulling(true);
    try {
      // Check for backup on Drive
      const backupResult = await syncFromDrive();
      
      if (!backupResult.success || !backupResult.data) {
        toast.info('No backup found', 'You can create a backup by clicking "Sync Now"');
        setIsPulling(false);
        return;
      }

      const backupData = backupResult.data;
      const backupDate = backupData.exportDate
        ? format(new Date(backupData.exportDate), 'MMM d, yyyy h:mm a')
        : 'Unknown date';

      const backupInfo = `Backup Details:
- Date: ${backupDate}
- Workspaces: ${backupData.metadata?.totalWorkspaces || backupData.workspaces?.length || 0}
- Tasks: ${backupData.metadata?.totalTasks || backupData.tasks?.length || 0}
- Notes: ${(backupData.standaloneNotes?.length || 0) + (backupData.tasks?.reduce((sum, t) => sum + (t.notes?.length || 0), 0) || 0)}`;

      const confirmed = confirm(
        `⚠️ WARNING: This will replace ALL your current data with the backup from Google Drive.\n\n` +
        `${backupInfo}\n\n` +
        `All current workspaces, tasks, and notes will be permanently deleted and replaced with the backup data.\n\n` +
        `Are you sure you want to continue?`
      );

      if (!confirmed) {
        setIsPulling(false);
        return;
      }

      // Load the backup with toast promise
      await toast.promise(
        replaceAllDataWithBackup(backupData),
        {
          loading: 'Loading backup...',
          success: 'Backup loaded successfully',
          error: (error) => `Failed to load backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      );
    } catch (error) {
      console.error('Failed to pull backup:', error);
      toast.error('Failed to load backup', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPulling(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      onClick={handlePull}
      disabled={isPulling}
      variant="outline"
      size="sm"
    >
      {isPulling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Pulling...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Pull from Drive
        </>
      )}
    </Button>
  );
}

