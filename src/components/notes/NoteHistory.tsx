import { useState, useEffect } from 'react';
import { useTaskStore, useNoteHistoryStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MarkdownViewer } from './MarkdownViewer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';

interface NoteHistoryProps {
  taskId: string;
  noteId: string;
  open: boolean;
  onClose: () => void;
  onRestore?: (version: number) => void;
}

export function NoteHistory({ taskId, noteId, open, onClose, onRestore }: NoteHistoryProps) {
  const { getTask, updateNote } = useTaskStore();
  const { getHistory } = useNoteHistoryStore();
  const task = getTask(taskId);
  const note = task?.notes.find((n) => n.id === noteId);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Get history from store
  const historyVersions = note ? getHistory(noteId) : [];
  
  // Combine current note with history
  const allVersions = note
    ? [
    {
      version: note.version,
      content: note.content,
      updatedAt: note.updatedAt,
      isCurrent: true,
    },
        ...historyVersions.filter((v) => v.version !== note.version),
      ].sort((a, b) => b.version - a.version)
    : [];

  // Select current version by default
  useEffect(() => {
    if (open && note && selectedVersion === null) {
      setSelectedVersion(note.version);
    }
  }, [open, note, selectedVersion]);

  if (!note) return null;

  const handleRestore = () => {
    if (selectedVersion === null) return;
    
    const versionToRestore = allVersions.find((v) => v.version === selectedVersion);
    if (versionToRestore && versionToRestore.version !== note.version) {
      // Restore the content
      updateNote(noteId, versionToRestore.content, undefined, taskId);
      onClose();
      if (onRestore) {
      onRestore(selectedVersion);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Note History
          </DialogTitle>
          <DialogDescription>
            View and restore previous versions of this note
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Version List */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-muted">
              <h3 className="font-medium text-sm">Versions</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {allVersions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 text-center">
                    No history available
                  </div>
                ) : (
                  allVersions.map((v) => (
                  <button
                    key={v.version}
                    onClick={() => setSelectedVersion(v.version)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedVersion === v.version
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          Version {v.version}
                          {v.isCurrent && (
                            <span className="ml-2 text-xs opacity-75">(Current)</span>
                          )}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          {format(v.updatedAt, 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Version Content */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-muted flex items-center justify-between">
              <h3 className="font-medium text-sm">
                {selectedVersion !== null
                  ? `Version ${selectedVersion}`
                  : 'Select a version'}
              </h3>
              {selectedVersion !== null && selectedVersion !== note.version && (
                <Button size="sm" onClick={handleRestore}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {selectedVersion !== null ? (
                  <>
                  <MarkdownViewer
                      content={allVersions.find((v) => v.version === selectedVersion)?.content || ''}
                  />
                    {selectedVersion !== note.version && (
                      <div className="mt-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                        This is an older version. Click "Restore" to make it the current version.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a version to view its content
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
