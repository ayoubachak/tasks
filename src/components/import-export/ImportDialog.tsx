import { useState, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { importFromJSON } from '@/lib/export/json';
import { importFromJSONData, type ImportResult } from '@/lib/import/json';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ImportDialog({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = importFromJSON(text);

      if (!data) {
        setResult({
          success: false,
          imported: {
            workspaces: 0,
            tasks: 0,
            templates: 0,
            media: 0,
            images: 0,
            audios: 0,
            videos: 0,
            photos: 0,
          },
          errors: ['Invalid JSON format or corrupted file'],
        });
        setImporting(false);
        return;
      }

      // Show confirmation dialog with image count
      const mediaCount =
        data.media?.length ??
        (data.images?.length || 0) +
          (data.audios?.length || 0);
      const mediaWarning = mediaCount > 0
        ? `\n\nNote: This export contains ${mediaCount} media asset(s). Large files may be skipped if storage is limited.`
        : '';
      const confirmed = confirm(
        `Import ${data.metadata.totalTasks} tasks, ${data.metadata.totalWorkspaces} workspaces, and ${data.metadata.totalTemplates} templates?${mediaWarning}`
      );

      if (!confirmed) {
        setImporting(false);
        return;
      }

      const importResult = await importFromJSONData(data, {
        mergeWorkspaces: false,
        mergeTasks: false,
        skipDuplicates: false,
      });

      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: false,
        imported: {
          workspaces: 0,
          tasks: 0,
          templates: 0,
          media: 0,
          images: 0,
          audios: 0,
          videos: 0,
          photos: 0,
        },
        errors: [`Import failed: ${error}`],
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import tasks and data from a JSON export file
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-file">Select JSON File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={importing}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Select a JSON file exported from this app
            </p>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p className="font-semibold">Import successful!</p>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      <li>{result.imported.workspaces} workspaces</li>
                      <li>{result.imported.tasks} tasks</li>
                      <li>{result.imported.templates} templates</li>
                      <li>
                        {result.imported.media} media assets
                        <span className="block text-muted-foreground text-xs">
                          images/photos: {result.imported.images}, audio: {result.imported.audios}, video: {result.imported.videos}
                        </span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">Import failed</p>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {result.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

