import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTaskStore, useWorkspaceStore, useTemplateStore } from '@/stores';
import { MarkdownEditor, type MarkdownEditorRef } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { NoteHistory } from '@/components/notes/NoteHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Pin, Trash2, History, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { toast } from '@/lib/toast';
import type { NoteTemplate, TaskTemplate } from '@/types/template';

interface InlineNoteEditorProps {
  taskId?: string; // Optional - for standalone notes
  noteId: string | null;
  folderId?: string; // Optional - for folder assignment
  onClose: () => void;
  onSave?: () => void;
}

export function InlineNoteEditor({ taskId, noteId, folderId, onClose, onSave }: InlineNoteEditorProps) {
  const { getTask, getNote, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  const { getActiveWorkspace } = useWorkspaceStore();
  const { updateNoteTemplate } = useTemplateStore();
  
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<MarkdownEditorRef>(null);

  const handleApplyNoteTemplate = useCallback((template: TaskTemplate | NoteTemplate) => {
    if (!('content' in template)) {
      return;
    }

    setNoteTitle(template.name || 'Untitled Note');
    setContent(template.content);
    setDebouncedContent(template.content);
    editorRef.current?.setValue(template.content);

    updateNoteTemplate(template.id, {
      usageCount: template.usageCount + 1,
      updatedAt: Date.now(),
    });

    toast.success('Template applied');
  }, [updateNoteTemplate]);

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
      // Preserve folderId if note already has one, or use provided folderId
      const noteFolderId = note.folderId !== undefined ? note.folderId : folderId;
      updateNote(note.id, currentContent, currentTitle, note.taskId, noteFolderId);
    } else {
      // Create new note (standalone if no taskId, or linked to task if taskId provided)
      // Get workspaceId from task if available, otherwise from active workspace
      const workspaceId = task?.workspaceId || (taskId ? getTask(taskId)?.workspaceId : getActiveWorkspace()?.id);
      if (!workspaceId) {
        console.error('Cannot create note: workspaceId is required');
        return;
      }
      addNote(workspaceId, taskId || null, currentContent || '', currentTitle, [], folderId);
    }
    onSave?.();
    onClose();
  }, [content, noteTitle, note, taskId, folderId, task, getTask, getActiveWorkspace, addNote, updateNote, onSave, onClose]);

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
      <div className="flex-shrink-0 border-b px-2 sm:px-6 py-2 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-sm sm:text-2xl font-semibold h-auto py-1 sm:py-2 px-0 border-0 border-b-2 border-transparent hover:border-border focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent transition-colors"
              placeholder="Note title..."
            />
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2 hidden sm:block">
              {note ? 'Edit Note' : 'New Note'} - Markdown supported
              {task && <span className="hidden sm:inline"> (Linked to: {task.title})</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
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
                  <Pin className={cn("h-3 w-3 sm:h-4 sm:w-4", note.pinned && "fill-current")} />
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
              noteContent={editorRef.current?.getValue() ?? content}
              trigger={
                <Button variant="outline" size="sm" type="button">
                  Save as Template
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs sm:text-sm">
              <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs sm:text-sm">
              <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {note ? 'Update' : 'Create'}
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
          <TabsList className="flex-shrink-0 w-full justify-start px-2 sm:px-6 py-1 sm:py-4 h-auto min-h-[1.75rem] sm:min-h-[2.5rem] border-b">
            <TabsTrigger value="edit" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9">Edit</TabsTrigger>
            <TabsTrigger value="preview" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9">Preview</TabsTrigger>
            <TabsTrigger value="split" className="text-[11px] sm:text-sm px-2 sm:px-4 py-0.5 sm:py-2 h-6 sm:h-9 hidden sm:inline-flex">Split</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden p-2 sm:p-6 min-h-0">
            {viewMode === 'edit' && (
              <div className="h-full flex flex-col min-h-0">
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
              <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background relative">
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
              <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 min-h-0 overflow-hidden">
                <div className="h-full flex flex-col min-h-0">
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
                <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background relative">
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
          onRestore={() => {
            // Restore functionality handled by NoteHistory component
          }}
        />
      )}
    </div>
  );
}

