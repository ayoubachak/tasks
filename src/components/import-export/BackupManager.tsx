import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Plus, 
  Trash2, 
  Download, 
  RotateCcw,
  Calendar,
  HardDrive,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useBackupStore } from '@/stores/backupStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { importFromJSONData } from '@/lib/import/json';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { exportToJSON, downloadJSON } from '@/lib/export/json';
import { formatBytes, estimateDataSize } from '@/lib/storage/storageUtils';
import { collectAllData } from '@/lib/export/dataCollector';

interface BackupManagerProps {
  trigger?: React.ReactNode;
}

export function BackupManager({ trigger }: BackupManagerProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

  const { backups, createBackup, deleteBackup, restoreBackup } = useBackupStore();
  const { getActiveWorkspace } = useWorkspaceStore();

  const handleCreateBackup = async () => {
    if (!backupName.trim()) return;

    setIsCreating(true);
    try {
      // Collect all data
      const allData = collectAllData();
      const activeWorkspace = getActiveWorkspace();
      
      // Filter by active workspace if one is selected
      const exportData = activeWorkspace
        ? {
            ...allData,
            workspaces: [activeWorkspace],
            tasks: allData.tasks.filter((t) => t.workspaceId === activeWorkspace.id),
            standaloneNotes: allData.standaloneNotes?.filter((n) => n.workspaceId === activeWorkspace.id),
            folders: allData.folders?.filter((f) => f.workspaceId === activeWorkspace.id),
            metadata: {
              ...allData.metadata,
              totalTasks: allData.tasks.filter((t) => t.workspaceId === activeWorkspace.id).length,
              totalWorkspaces: 1,
            },
          }
        : allData;

      const estimatedSize = estimateDataSize(exportData);
      const canStore = useBackupStore.getState().canStoreBackup(estimatedSize);

      if (!canStore) {
        // Backup is too large, offer to download instead
        const confirmed = confirm(
          `This backup is ${formatBytes(estimatedSize)} and is too large to store locally.\n\n` +
          `Would you like to download it as a file instead?`
        );

        if (confirmed) {
          const jsonData = exportToJSON(exportData);
          downloadJSON(jsonData, `backup-${backupName}-${new Date().toISOString().split('T')[0]}.json`);
          setBackupName('');
          setBackupDescription('');
          setIsCreating(false);
          return;
        } else {
          setIsCreating(false);
          return;
        }
      }

      const backup = createBackup(backupName, exportData, backupDescription);
      
      if (backup) {
        if (!backup.storedLocally) {
          // Backup created but not stored, download it
          const jsonData = exportToJSON(exportData);
          downloadJSON(jsonData, `backup-${backupName}-${new Date().toISOString().split('T')[0]}.json`);
          alert('Backup is too large to store locally. It has been downloaded to your computer.');
        }
        setBackupName('');
        setBackupDescription('');
      } else {
        alert('Failed to create backup. Storage may be full.');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete old backups or download this backup as a file.');
      } else {
        alert('Failed to create backup. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    const confirmed = confirm(
      'Are you sure you want to restore this backup? This will import all data from the backup.'
    );

    if (!confirmed) return;

    setRestoringId(backupId);
    setRestoreResult(null);

    try {
      const data = restoreBackup(backupId);
      if (!data) {
        setRestoreResult({ success: false, message: 'Backup not found' });
        return;
      }

      const result = await importFromJSONData(data, {
        mergeWorkspaces: false,
        mergeTasks: false,
        skipDuplicates: false,
      });

      if (result.success) {
        setRestoreResult({
          success: true,
          message: `Restored ${result.imported.tasks} tasks, ${result.imported.workspaces} workspaces, ${result.imported.templates} templates, ${result.imported.images} images, and ${result.imported.audios} audio recordings`,
        });
        setTimeout(() => {
          setOpen(false);
          setRestoreResult(null);
        }, 3000);
      } else {
        setRestoreResult({
          success: false,
          message: `Restore failed: ${result.errors.join(', ')}`,
        });
      }
    } catch (error) {
      setRestoreResult({
        success: false,
        message: `Restore failed: ${error}`,
      });
    } finally {
      setRestoringId(null);
    }
  };

  const formatFileSize = formatBytes;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Backups
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Backup Manager</DialogTitle>
          <DialogDescription>
            Create and restore backups of your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create Backup */}
          <div className="space-y-3 border rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Backup
            </h3>
            <div>
              <Label htmlFor="backup-name">Backup Name</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., Weekly Backup"
              />
            </div>
            <div>
              <Label htmlFor="backup-description">Description (optional)</Label>
              <Textarea
                id="backup-description"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                placeholder="Add a description for this backup..."
                rows={2}
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateBackup}
              disabled={!backupName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>

          {/* Restore Result */}
          {restoreResult && (
            <Alert variant={restoreResult.success ? 'default' : 'destructive'}>
              {restoreResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{restoreResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Backups List */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Saved Backups ({backups.length})
            </h3>
            <ScrollArea className="max-h-[300px]">
              {backups.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No backups yet. Create one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{backup.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(backup.size)}
                          </Badge>
                          {!backup.storedLocally && (
                            <Badge variant="secondary" className="text-xs">
                              Download Only
                            </Badge>
                          )}
                        </div>
                        {backup.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {backup.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(backup.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                          <span>
                            {backup.data.metadata.totalTasks} tasks,{' '}
                            {backup.data.metadata.totalWorkspaces} workspaces
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backup.storedLocally ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(backup.id)}
                            disabled={restoringId === backup.id}
                            title="Restore backup"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const jsonData = JSON.stringify(backup.data, null, 2);
                              downloadJSON(jsonData, `backup-${backup.name}-${format(new Date(backup.createdAt), 'yyyy-MM-dd')}.json`);
                            }}
                            title="Download backup"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this backup?')) {
                              deleteBackup(backup.id);
                            }
                          }}
                          title="Delete backup"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

