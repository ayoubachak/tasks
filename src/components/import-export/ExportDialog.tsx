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
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useImageStore } from '@/stores/imageStore';
import { exportToJSON, downloadJSON } from '@/lib/export/json';
import { exportTasksToCSV, downloadCSV } from '@/lib/export/csv';
import { exportTasksToMarkdown, downloadMarkdown } from '@/lib/export/markdown';

interface ExportDialogProps {
  trigger?: React.ReactNode;
}

export function ExportDialog({ trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [exporting, setExporting] = useState(false);

  const { workspaces, getActiveWorkspace } = useWorkspaceStore();
  const { tasks } = useTaskStore();
  const { taskTemplates, noteTemplates } = useTemplateStore();
  const imageStore = useImageStore();
  
  const getAllImages = () => {
    const allIds = imageStore.getAllImageIds();
    return allIds.map((id) => imageStore.getImage(id)).filter((img): img is NonNullable<typeof img> => img !== undefined);
  };

  const handleExport = () => {
    setExporting(true);

    try {
      const activeWorkspace = getActiveWorkspace();
      const tasksToExport = activeWorkspace
        ? tasks.filter((t) => t.workspaceId === activeWorkspace.id)
        : tasks;

      let data: string;
      let filename: string;
      let downloadFn: (data: string, filename: string) => void;

      switch (format) {
        case 'json': {
          const allImages = getAllImages();
          data = exportToJSON(
            activeWorkspace ? [activeWorkspace] : workspaces,
            tasksToExport,
            taskTemplates,
            noteTemplates,
            allImages
          );
          filename = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
          downloadFn = downloadJSON;
          break;
        }
        case 'csv': {
          data = exportTasksToCSV(tasksToExport);
          filename = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
          downloadFn = downloadCSV;
          break;
        }
        case 'markdown': {
          data = exportTasksToMarkdown(tasksToExport);
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

