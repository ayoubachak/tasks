import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTaskStore, useWorkspaceStore } from '@/stores';
import { MarkdownEditor, type MarkdownEditorRef } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { NoteHistory } from '@/components/notes/NoteHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Pin, Trash2, History, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineNoteEditorProps {
  taskId?: string; // Optional - for standalone notes
  noteId: string | null;
  onClose: () => void;
  onSave?: () => void;
}

export function InlineNoteEditor({ taskId, noteId, onClose, onSave }: InlineNoteEditorProps) {
  const { getTask, getNote, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  const { getActiveWorkspace } = useWorkspaceStore();
  
  // Memoize task and note lookups to prevent unnecessary re-renders
  const task = useMemo(() => taskId ? getTask(taskId) : null, [taskId, getTask]);
  const note = useMemo(() => {
    if (noteId) {
      // Try to get note from task first, then from standalone notes
      if (task) {
        return task.notes.find((n) => n.id === noteId);
      }
      return getNote(noteId);
    }
    return undefined;
  }, [task?.notes, noteId, getNote]);
  
  const [content, setContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [debouncedContent, setDebouncedContent] = useState('');
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<MarkdownEditorRef>(null);

  // Initialize note title and content when note changes
  useEffect(() => {
    if (note) {
      const noteContent = note.content;
      const noteTitleValue = note.title || 'Untitled Note';
      // Only update if content is different (prevents overwriting user input)
      if (content !== noteContent) {
        setContent(noteContent);
        setDebouncedContent(noteContent);
      }
      if (noteTitle !== noteTitleValue) {
        setNoteTitle(noteTitleValue);
      }
    } else if (noteId === null) {
      // New note - start with empty content and default title
      setContent('');
      setDebouncedContent('');
      setNoteTitle('Untitled Note');
    }
  }, [noteId, note?.title, note?.content]); // Only depend on noteId and note fields to avoid re-renders on typing


  // Debounce content for preview rendering (only update preview after user stops typing)
  useEffect(() => {
    // Show updating indicator if content changed
    if (content !== debouncedContent) {
      setIsPreviewUpdating(true);
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to update debounced content after 300ms of no typing
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedContent(content);
      setIsPreviewUpdating(false);
    }, 300);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, debouncedContent]);

  const handleSave = useCallback(() => {
    // Get current value from editor (uncontrolled component)
    const currentContent = editorRef.current?.getValue() || content;
    const currentTitle = noteTitle.trim() || 'Untitled Note';
    
    // Save note content and title
    // Allow empty notes - user might want to create a placeholder
    if (note) {
      // Update existing note (can be in task or standalone)
      updateNote(note.id, currentContent, currentTitle, note.taskId);
    } else {
      // Create new note (standalone if no taskId, or linked to task if taskId provided)
      // Get workspaceId from task if available, otherwise from active workspace
      const workspaceId = task?.workspaceId || (taskId ? getTask(taskId)?.workspaceId : getActiveWorkspace()?.id);
      if (!workspaceId) {
        console.error('Cannot create note: workspaceId is required');
        return;
      }
      addNote(workspaceId, taskId || null, currentContent || '', currentTitle);
    }
    onSave?.();
    onClose();
  }, [content, noteTitle, note, taskId, task, getTask, getActiveWorkspace, addNote, updateNote, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (note && confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id, note.taskId);
      onClose();
    }
  }, [note, deleteNote, onClose]);

  const handlePin = useCallback(() => {
    if (note) {
      pinNote(note.id, !note.pinned, note.taskId);
    }
  }, [note, pinNote]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-2xl font-semibold h-auto py-2 px-0 border-0 border-b-2 border-transparent hover:border-border focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent transition-colors"
              placeholder="Note title..."
            />
            <p className="text-sm text-muted-foreground mt-2">
              {note ? 'Edit Note' : 'New Note'} - Markdown supported
              {task && ` (Linked to: ${task.title})`}
            </p>
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
                  <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} />
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
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {note ? 'Update' : 'Create'} Note
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Tabs 
          value={viewMode} 
          onValueChange={(v) => setViewMode(v as typeof viewMode)} 
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="flex-shrink-0 w-full justify-start px-6 py-4 h-auto min-h-[2.5rem] border-b">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden p-6 min-h-0" style={{ height: '100%' }}>
            {viewMode === 'edit' && (
              <div className="h-full flex flex-col min-h-0" style={{ height: '100%', maxHeight: '100%' }}>
                <MarkdownEditor
                  ref={editorRef}
                  value={content}
                  onChange={(newValue) => {
                    setContent(newValue);
                    // Update debounced content for preview
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                    }
                    debounceTimerRef.current = setTimeout(() => {
                      setDebouncedContent(newValue);
                      setIsPreviewUpdating(false);
                    }, 300);
                    setIsPreviewUpdating(true);
                  }}
                  rows={25}
                  placeholder="Write your note in Markdown... You can paste images, add links, format text, and more."
                  showToolbar
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full overflow-y-auto rounded-md border p-6 bg-background relative">
                {isPreviewUpdating && (
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Updating...
                  </div>
                )}
                <MarkdownViewer content={debouncedContent || '*No note content yet*'} />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid h-full grid-cols-2 gap-6 min-h-0 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
                <div className="h-full flex flex-col min-h-0" style={{ height: '100%', maxHeight: '100%' }}>
                  <MarkdownEditor
                    ref={editorRef}
                    value={content}
                    onChange={(newValue) => {
                      setContent(newValue);
                      // Update debounced content for preview
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                      }
                      debounceTimerRef.current = setTimeout(() => {
                        setDebouncedContent(newValue);
                        setIsPreviewUpdating(false);
                      }, 300);
                      setIsPreviewUpdating(true);
                    }}
                    rows={25}
                    placeholder="Write your note in Markdown..."
                    showToolbar
                  />
                </div>
                <div className="h-full overflow-y-auto rounded-md border p-6 bg-background relative">
                  {isPreviewUpdating && (
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1 z-10">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Updating...
                    </div>
                  )}
                  <MarkdownViewer content={debouncedContent || '*No note content yet*'} />
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Note History */}
      {note && note.taskId && (
        <NoteHistory
          taskId={note.taskId}
          noteId={note.id}
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={(version) => {
            // Restore functionality handled by NoteHistory component
          }}
        />
      )}
    </div>
  );
}

