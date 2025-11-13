import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore, useTemplateStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { NoteHistory } from '@/components/notes/NoteHistory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Pin, Trash2, History } from 'lucide-react';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { toast } from '@/lib/toast';
import type { TaskTemplate, NoteTemplate } from '@/types/template';

export function NoteEditorView() {
  const { currentView, editorState, navigateBack } = useUIStore();
  const { getTask, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  const { updateNoteTemplate } = useTemplateStore();
  
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

  const handleApplyNoteTemplate = (template: TaskTemplate | NoteTemplate) => {
    if (!('content' in template)) {
      return;
    }

    setContent(template.content);
    updateNoteTemplate(template.id, {
      usageCount: template.usageCount + 1,
      updatedAt: Date.now(),
    });
    toast.success('Template applied');
  };

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
      updateNote(note.id, content, undefined, task.id);
    } else {
      addNote(task.workspaceId, task.id, content, 'Untitled Note');
    }
    navigateBack();
  };

  const handleClose = () => {
    navigateBack();
  };

  const handleDelete = () => {
    if (note && confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id, task.id);
      navigateBack();
    }
  };

  const handlePin = () => {
    if (note) {
      pinNote(note.id, !note.pinned, task.id);
    }
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] md:!max-w-[90vw] !w-[95vw] md:!w-[90vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden max-md:inset-0 max-md:rounded-none max-md:max-w-full max-md:w-full max-md:h-full">
        <DialogHeader className="px-2 sm:px-6 pt-2 sm:pt-6 pb-2 sm:pb-4 flex-shrink-0 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-xl truncate">{task.title}</DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm hidden sm:block">
                {note ? 'Edit Note' : 'New Note'} - Markdown supported
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
              {note && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    title="View history"
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <History className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-2">History</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePin}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Pin className={`h-3 w-3 sm:h-4 sm:w-4 ${note.pinned ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline ml-2">Pin</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    title="Delete note"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-2">Delete</span>
                  </Button>
                </>
              )}
              <TemplatePicker
                type="note"
                onSelect={handleApplyNoteTemplate}
              />
              <TemplateEditor
                type="note"
                noteContent={content}
                trigger={
                  <Button variant="outline" size="sm" type="button">
                    Save as Template
                  </Button>
                }
              />
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs sm:text-sm">
                <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button size="sm" onClick={handleSave} className="text-xs sm:text-sm">
                <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {note ? 'Update' : 'Create'}
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
            <TabsList className="flex-shrink-0 w-full justify-start px-2 sm:px-6 py-1 sm:py-4 h-auto min-h-[1.75rem] sm:min-h-[2.5rem]">
              <TabsTrigger value="edit" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9">Edit</TabsTrigger>
              <TabsTrigger value="preview" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9">Preview</TabsTrigger>
              <TabsTrigger value="split" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9 hidden sm:inline-flex">Split</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden p-2 sm:p-6 min-h-0">
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
                <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background">
                  <MarkdownViewer content={content || '*No note content yet*'} />
                </div>
              )}

              {viewMode === 'split' && (
                <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 min-h-0 overflow-hidden">
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      rows={25}
                      placeholder="Write your note in Markdown..."
                      showToolbar
                    />
                  </div>
                  <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background">
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
          onRestore={() => {
            // Restore functionality handled by NoteHistory component
          }}
        />
      )}
    </Dialog>
  );
}

