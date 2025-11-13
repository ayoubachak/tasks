import { ExportDialog } from '@/components/import-export/ExportDialog';
import { ImportDialog } from '@/components/import-export/ImportDialog';
import { BackupManager } from '@/components/import-export/BackupManager';
import { GoogleSyncButton } from '@/components/sync/GoogleSyncButton';
import { SyncButton } from '@/components/sync/SyncButton';
import { PullButton } from '@/components/sync/PullButton';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { AppLogo } from '@/components/shared/AppLogo';
import { useSyncStore } from '@/stores/syncStore';

export function Header() {
  const { isConnected } = useSyncStore();

  return (
    <header className="border-b bg-background" role="banner">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <AppLogo size="md" className="sm:hidden" />
        <AppLogo size="lg" className="hidden sm:flex" />
        <div className="flex items-center gap-1 sm:gap-2">
          {isConnected && (
            <>
              <SyncStatus />
              <PullButton />
              <SyncButton />
            </>
          )}
          <GoogleSyncButton />
          <ExportDialog />
          <ImportDialog />
          <BackupManager />
        </div>
      </div>
    </header>
  );
}

