import { useState, useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { fullSync, syncToDrive, syncFromDrive } from '@/services/sync/syncService';
import { authenticateWithPopup } from '@/services/google/auth';
import { collectAllData } from '@/lib/export/dataCollector';
import { replaceAllDataWithBackup } from '@/lib/import/json';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, ChevronDown, GitMerge, Upload, Download, Cloud, CloudOff, CheckCircle2, XCircle, FolderOpen } from 'lucide-react';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { getFolderUrl } from '@/services/google/drive';

export function SyncButton() {
  const { 
    isConnected, 
    syncStatus, 
    conflictResolution,
    setSyncStatus, 
    setLastSyncAt, 
    setLastSyncError,
    checkConnection,
    disconnect,
    setConnected,
    lastSyncAt,
    lastSyncError,
  } = useSyncStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  const [remoteDataInfo, setRemoteDataInfo] = useState<{
    date: string;
    workspaces: number;
    tasks: number;
    notes: number;
  } | null>(null);

  useEffect(() => {
    if (isConnected) {
      getFolderUrl().then(setFolderUrl);
    }
  }, [isConnected]);

  useEffect(() => {
    // Check connection status on mount
    const check = async () => {
      setIsChecking(true);
      await checkConnection();
      setIsChecking(false);
    };
    check();
  }, [checkConnection]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await authenticateWithPopup();
      setConnected(true);
    } catch (error) {
      console.error('Authentication failed:', error);
      toast.error('Connection failed', error instanceof Error ? error.message : 'Failed to connect Google account');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      await disconnect();
    }
  };

  const handleMergeSync = async () => {
    if (!isConnected || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

    const toastId = toast.loading('Syncing with Google Drive...');

    try {
      const exportData = collectAllData();
      const result = await fullSync(exportData, {
        conflictResolution,
      });

      if (result.success) {
        setSyncStatus('success');
        setLastSyncAt(Date.now());
        toast.dismiss(toastId);
        toast.success('Sync completed', 'Your data has been synced with Google Drive');
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

  const handlePullFromDriveClick = async () => {
    if (!isConnected || isSyncing) return;

    // First, fetch remote data to show info in dialog
    try {
      const backupResult = await syncFromDrive();
      
      if (!backupResult.success || !backupResult.data) {
        toast.info('No backup found', 'You can create a backup by clicking "Sync Now"');
        return;
      }

      const backupData = backupResult.data;
      const backupDate = backupData.exportDate
        ? format(new Date(backupData.exportDate), 'MMM d, yyyy h:mm a')
        : 'Unknown date';

      setRemoteDataInfo({
        date: backupDate,
        workspaces: backupData.metadata?.totalWorkspaces || backupData.workspaces?.length || 0,
        tasks: backupData.metadata?.totalTasks || backupData.tasks?.length || 0,
        notes: (backupData.standaloneNotes?.length || 0) + (backupData.tasks?.reduce((sum, t) => sum + (t.notes?.length || 0), 0) || 0),
      });

      setShowPullDialog(true);
    } catch (error) {
      toast.error('Failed to fetch backup info', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePullConfirm = async () => {
    if (!isConnected || isSyncing) return;

    setShowPullDialog(false);
    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

    const toastId = toast.loading('Pulling from Drive...');

    try {
      const backupResult = await syncFromDrive();
      
      if (!backupResult.success || !backupResult.data) {
        toast.dismiss(toastId);
        toast.error('Pull failed', 'Could not download backup from Drive');
        setIsSyncing(false);
        return;
      }

      const importResult = await replaceAllDataWithBackup(backupResult.data);

      if (importResult.success) {
        setSyncStatus('success');
        setLastSyncAt(Date.now());
        toast.dismiss(toastId);
        toast.success(
          'Pull completed',
          `Replaced local data with ${remoteDataInfo?.tasks || 0} tasks from Drive`
        );
      } else {
        setSyncStatus('error');
        const errorMsg = importResult.errors?.[0] || 'Pull failed';
        setLastSyncError(errorMsg);
        toast.dismiss(toastId);
        toast.error('Pull failed', errorMsg);
      }
    } catch (error) {
      setSyncStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMsg);
      toast.dismiss(toastId);
      toast.error('Pull failed', errorMsg);
    } finally {
      setIsSyncing(false);
      setRemoteDataInfo(null);
    }
  };

  const handleOverrideDriveClick = () => {
    if (!isConnected || isSyncing) return;
    setShowOverrideDialog(true);
  };

  const handleOverrideDriveConfirm = async () => {
    if (!isConnected || isSyncing) return;

    setShowOverrideDialog(false);
    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastSyncError(null);

    const toastId = toast.loading('Overriding Drive backup...');

    try {
      const exportData = collectAllData();
      
      // Force upload local data to Drive, replacing whatever is there
      const result = await syncToDrive(exportData, {
        forceUpload: true,
      });

      if (result.success) {
        setSyncStatus('success');
        setLastSyncAt(Date.now());
        toast.dismiss(toastId);
        toast.success(
          'Drive overridden',
          `Drive backup has been replaced with your local data (${exportData.metadata?.totalTasks || 0} tasks)`
        );
      } else {
        setSyncStatus('error');
        const errorMsg = result.error || 'Override failed';
        setLastSyncError(errorMsg);
        toast.dismiss(toastId);
        toast.error('Override failed', errorMsg);
      }
    } catch (error) {
      setSyncStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastSyncError(errorMsg);
      toast.dismiss(toastId);
      toast.error('Override failed', errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const isProcessing = isSyncing || syncStatus === 'syncing';
  const localData = collectAllData();

  const getStatusIcon = () => {
    if (!isConnected) return null;
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Cloud className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return null;
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return lastSyncAt ? format(new Date(lastSyncAt), 'MMM d, h:mm a') : 'Synced';
      case 'error':
        return lastSyncError || 'Sync error';
      default:
        return lastSyncAt ? format(new Date(lastSyncAt), 'MMM d, h:mm a') : 'Not synced';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isProcessing || isChecking || isConnecting}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {isProcessing || isChecking || isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">
                  {isChecking ? 'Checking...' : isConnecting ? 'Connecting...' : 'Syncing...'}
                </span>
              </>
            ) : (
              <>
                {isConnected ? (
                  <Cloud className="h-4 w-4" />
                ) : (
                  <CloudOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Sync</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {!isConnected ? (
            <>
              <DropdownMenuLabel>Google Drive Sync</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={handleConnect}
                disabled={isConnecting || isChecking}
                className="cursor-pointer"
              >
                <Cloud className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Connect Google Account</span>
                  <span className="text-xs text-muted-foreground">Enable Drive sync</span>
                </div>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Sync Status</span>
                {getStatusIcon()}
              </DropdownMenuLabel>
              {getStatusText() && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {getStatusText()}
                </div>
              )}
              {folderUrl && (
                <DropdownMenuItem 
                  onClick={() => window.open(folderUrl, '_blank')}
                  className="cursor-pointer"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>Open Drive Folder</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleMergeSync}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                <GitMerge className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Merge Sync</span>
                  <span className="text-xs text-muted-foreground">Combine local & remote</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handlePullFromDriveClick}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Pull from Drive</span>
                  <span className="text-xs text-muted-foreground">Replace local with Drive</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleOverrideDriveClick}
                disabled={isProcessing}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Upload className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Override Drive</span>
                  <span className="text-xs text-muted-foreground">Replace Drive backup</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDisconnect}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <CloudOff className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Disconnect Google</span>
                  <span className="text-xs text-muted-foreground">Disable Drive sync</span>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-destructive" />
              Override Drive Backup?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">
                ⚠️ This will permanently replace the backup on Google Drive with your current local data.
              </p>
              
              <div className="bg-muted/50 border rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium">Current Local Data:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Workspaces: {localData.metadata?.totalWorkspaces || localData.workspaces?.length || 0}</li>
                  <li>• Tasks: {localData.metadata?.totalTasks || localData.tasks?.length || 0}</li>
                  <li>• Notes: {(localData.standaloneNotes?.length || 0) + (localData.tasks?.reduce((sum, t) => sum + (t.notes?.length || 0), 0) || 0)}</li>
                </ul>
              </div>

              <p className="text-destructive font-medium">
                The existing backup on Drive will be permanently deleted and replaced with your local data.
              </p>
              
              <p className="text-sm">
                This is useful when you want to start fresh or clean up old data. Make sure you want to lose the Drive backup before proceeding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleOverrideDriveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Override Drive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPullDialog} onOpenChange={setShowPullDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-destructive" />
              Pull from Drive?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">
                ⚠️ This will permanently replace ALL your local data with the backup from Google Drive.
              </p>
              
              {remoteDataInfo && (
                <div className="bg-muted/50 border rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium">Drive Backup Details:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Date: {remoteDataInfo.date}</li>
                    <li>• Workspaces: {remoteDataInfo.workspaces}</li>
                    <li>• Tasks: {remoteDataInfo.tasks}</li>
                    <li>• Notes: {remoteDataInfo.notes}</li>
                  </ul>
                </div>
              )}

              <p className="text-destructive font-medium">
                All current workspaces, tasks, and notes will be permanently deleted and replaced with the Drive backup.
              </p>
              
              <p className="text-sm">
                This action cannot be undone. Make sure you have a backup if you want to recover your current data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePullConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Pull from Drive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
