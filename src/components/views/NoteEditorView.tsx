import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { NoteHistory } from '@/components/notes/NoteHistory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Pin, Trash2, History } from 'lucide-react';

export function NoteEditorView() {
  const { currentView, editorState, navigateBack } = useUIStore();
  const { getTask, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  
  const taskId = editorState?.taskId;
  const noteId = editorState?.noteId;
  const task = taskId ? getTask(taskId) : null;
  const note = task && noteId ? task.notes.find((n) => n.id === noteId) : undefined;
  
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (note) {
      setContent(note.content);
    } else {
      setContent('');
    }
  }, [note]);

  if (!task || currentView !== 'note-editor') {
    return null;
  }

  const handleSave = () => {
    if (!content.trim()) {
      if (!note) {
        // Don't create empty notes
        navigateBack();
        return;
      }
    }

    if (note) {
      updateNote(task.id, note.id, content);
    } else {
      addNote(task.id, content);
    }
    navigateBack();
  };

  const handleClose = () => {
    navigateBack();
  };

  const handleDelete = () => {
    if (note && confirm('Are you sure you want to delete this note?')) {
      deleteNote(task.id, note.id);
      navigateBack();
    }
  };

  const handlePin = () => {
    if (note) {
      pinNote(task.id, note.id, !note.pinned);
    }
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <DialogDescription>
                {note ? 'Edit Note' : 'New Note'} - Markdown supported
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {note && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    title="View history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePin}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    <Pin className={`h-4 w-4 ${note.pinned ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {note ? 'Update' : 'Create'} Note
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <Tabs 
            value={viewMode} 
            onValueChange={(v) => setViewMode(v as typeof viewMode)} 
            className="flex flex-col flex-1 min-h-0"
          >
            <TabsList className="flex-shrink-0 w-full justify-start px-6 py-4 h-auto min-h-[2.5rem]">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden p-6 min-h-0">
              {viewMode === 'edit' && (
                <div className="h-full flex flex-col min-h-0 overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    rows={25}
                    placeholder="Write your note in Markdown... You can paste images, add links, format text, and more."
                    showToolbar
                  />
                </div>
              )}

              {viewMode === 'preview' && (
                <div className="h-full overflow-y-auto rounded-md border p-6 bg-background">
                  <MarkdownViewer content={content || '*No note content yet*'} />
                </div>
              )}

              {viewMode === 'split' && (
                <div className="grid h-full grid-cols-2 gap-6 min-h-0 overflow-hidden">
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      rows={25}
                      placeholder="Write your note in Markdown..."
                      showToolbar
                    />
                  </div>
                  <div className="h-full overflow-y-auto rounded-md border p-6 bg-background">
                    <MarkdownViewer content={content || '*No note content yet*'} />
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>

      {note && task && (
        <NoteHistory
          taskId={task.id}
          noteId={note.id}
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={(version) => {
            // Restore functionality handled by NoteHistory component
          }}
        />
      )}
    </Dialog>
  );
}

