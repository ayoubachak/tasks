import { useState, useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { format } from 'date-fns';
import { Cloud, CheckCircle2, XCircle, Loader2, FolderOpen } from 'lucide-react';
import { getFolderUrl } from '@/services/google/drive';
import { Button } from '@/components/ui/button';

export function SyncStatus() {
  const { isConnected, syncStatus, lastSyncAt, lastSyncError } = useSyncStore();
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      getFolderUrl().then(setFolderUrl);
    }
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return lastSyncAt ? `Last synced: ${format(lastSyncAt, 'MMM d, h:mm a')}` : 'Synced';
      case 'error':
        return lastSyncError || 'Sync error';
      default:
        return lastSyncAt ? `Last synced: ${format(lastSyncAt, 'MMM d, h:mm a')}` : 'Not synced yet';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {folderUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-muted-foreground hover:text-foreground"
          onClick={() => window.open(folderUrl, '_blank')}
          title="Open backup folder in Google Drive"
        >
          <FolderOpen className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

