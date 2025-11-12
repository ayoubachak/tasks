import { CheckSquare } from 'lucide-react';
import { ExportDialog } from '@/components/import-export/ExportDialog';
import { ImportDialog } from '@/components/import-export/ImportDialog';
import { BackupManager } from '@/components/import-export/BackupManager';

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog />
          <ImportDialog />
          <BackupManager />
        </div>
      </div>
    </header>
  );
}

