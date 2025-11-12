import { CheckSquare } from 'lucide-react';
import { ExportDialog } from '@/components/import-export/ExportDialog';
import { ImportDialog } from '@/components/import-export/ImportDialog';
import { BackupManager } from '@/components/import-export/BackupManager';

export function Header() {
  return (
    <header className="border-b bg-background" role="banner">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          <h1 className="text-lg sm:text-xl font-semibold">Tasks</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ExportDialog />
          <ImportDialog />
          <BackupManager />
        </div>
      </div>
    </header>
  );
}

