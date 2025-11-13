import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { BackupManager } from './BackupManager';
import { Database, ChevronDown, Download, Upload, HardDrive } from 'lucide-react';

export function DataMenu() {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => setExportOpen(true)}
            className="cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Export</span>
              <span className="text-xs text-muted-foreground">Download as JSON/CSV/MD</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setImportOpen(true)}
            className="cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Import</span>
              <span className="text-xs text-muted-foreground">Load from JSON file</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setBackupOpen(true)}
            className="cursor-pointer"
          >
            <HardDrive className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>Backup Manager</span>
              <span className="text-xs text-muted-foreground">Manage local backups</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog 
        open={exportOpen}
        onOpenChange={setExportOpen}
        trigger={<div style={{ display: 'none' }} />}
      />

      <ImportDialog 
        open={importOpen}
        onOpenChange={setImportOpen}
        trigger={<div style={{ display: 'none' }} />}
      />

      <BackupManager 
        open={backupOpen}
        onOpenChange={setBackupOpen}
        trigger={<div style={{ display: 'none' }} />}
      />
    </>
  );
}
