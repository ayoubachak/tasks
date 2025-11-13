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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { collectAllData } from '@/lib/export/dataCollector';
import { exportToJSON, downloadJSON } from '@/lib/export/json';
import { exportTasksToCSV, downloadCSV } from '@/lib/export/csv';
import { exportTasksToMarkdown, downloadMarkdown } from '@/lib/export/markdown';

interface ExportDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExportDialog({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [format, setFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [exporting, setExporting] = useState(false);

  const { getActiveWorkspace } = useWorkspaceStore();

  const handleExport = () => {
    setExporting(true);

    try {
      // Collect all data
      const allData = collectAllData();
      const activeWorkspace = getActiveWorkspace();
      
      // Filter by active workspace if one is selected
      const filteredData = activeWorkspace
        ? {
            ...allData,
            workspaces: [activeWorkspace],
            tasks: allData.tasks.filter((t) => t.workspaceId === activeWorkspace.id),
            standaloneNotes: allData.standaloneNotes?.filter((n) => n.workspaceId === activeWorkspace.id),
            folders: allData.folders?.filter((f) => f.workspaceId === activeWorkspace.id),
          }
        : allData;

      let data: string;
      let filename: string;
      let downloadFn: (data: string, filename: string) => void;

      switch (format) {
        case 'json': {
          data = exportToJSON(filteredData);
          filename = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
          downloadFn = downloadJSON;
          break;
        }
        case 'csv': {
          data = exportTasksToCSV(filteredData.tasks);
          filename = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
          downloadFn = downloadCSV;
          break;
        }
        case 'markdown': {
          data = exportTasksToMarkdown(filteredData.tasks);
          filename = `tasks-export-${new Date().toISOString().split('T')[0]}.md`;
          downloadFn = downloadMarkdown;
          break;
        }
      }

      downloadFn(data, filename);
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Export your tasks and data in various formats
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="export-format">Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    <span>JSON (Full Data)</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV (Spreadsheet)</span>
                  </div>
                </SelectItem>
                <SelectItem value="markdown">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Markdown (Documentation)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {format === 'json' && (
              <p>Exports all data including workspaces, tasks, templates, and images. Best for backups.</p>
            )}
            {format === 'csv' && (
              <p>Exports tasks in spreadsheet format. Can be opened in Excel, Google Sheets, etc.</p>
            )}
            {format === 'markdown' && (
              <p>Exports tasks as a formatted Markdown document. Great for documentation.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

