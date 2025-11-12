import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Pin, Trash2 } from 'lucide-react';

export function NoteEditorView() {
  const { currentView, editorState, navigateBack } = useUIStore();
  const { getTask, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  
  const taskId = editorState?.taskId;
  const noteId = editorState?.noteId;
  const task = taskId ? getTask(taskId) : null;
  const note = task && noteId ? task.notes.find((n) => n.id === noteId) : undefined;
  
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateBack}
              title="Back to tasks"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{task.title}</h1>
              <p className="text-sm text-muted-foreground">
                {note ? 'Edit Note' : 'New Note'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {note && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  title={note.pinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className={`h-4 w-4 ${note.pinned ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-destructive"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {note ? 'Update' : 'Create'} Note
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          value={viewMode} 
          onValueChange={(v) => setViewMode(v as typeof viewMode)} 
          className="flex h-full flex-col"
        >
          <div className="border-b px-6">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden p-6">
            {viewMode === 'edit' && (
              <div className="h-full">
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  rows={30}
                  placeholder="Write your note in Markdown... You can paste images, add links, format text, and more."
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full overflow-y-auto rounded-md border p-6">
                <MarkdownViewer content={content || '*No note content yet*'} />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid h-full grid-cols-2 gap-6">
                <div className="h-full overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    rows={30}
                    placeholder="Write your note in Markdown..."
                  />
                </div>
                <div className="h-full overflow-y-auto rounded-md border p-6">
                  <MarkdownViewer content={content || '*No note content yet*'} />
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

