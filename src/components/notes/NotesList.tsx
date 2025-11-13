import { useMemo, useState } from 'react';
import { useTaskStore, useWorkspaceStore, useNoteFolderStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DescriptionPreview } from '@/components/task/DescriptionPreview';
import { MarkdownViewer } from './MarkdownViewer';
import { NoteHistory } from './NoteHistory';
import { InlineNoteEditor } from './InlineNoteEditor';
import { FolderTree } from './FolderTree';
import { FolderEditor } from './FolderEditor';
import { Plus, FileText, Pin, History, Search, X, Trash2, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { Note } from '@/types';

interface NoteWithTask {
  note: Note;
  taskId: string;
  taskTitle: string;
  noteTitle: string;
}

export function NotesList() {
  const { getActiveWorkspace } = useWorkspaceStore();
  const { getNotesByFolder, getTasksByWorkspace, deleteNote, moveNoteToFolder } = useTaskStore();
  const { getFolder } = useNoteFolderStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [selectedNote, setSelectedNote] = useState<{ noteId: string; taskId?: string } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ noteId: string | null; taskId?: string; folderId?: string } | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ folderId: string | null; parentFolderId?: string } | null>(null);

  const activeWorkspace = getActiveWorkspace();
  const allTasks = activeWorkspace ? getTasksByWorkspace(activeWorkspace.id) : [];
  
  // Get notes for selected folder
  const folderNotes: NoteWithTask[] = useMemo(() => {
    if (!activeWorkspace) return [];
    const notes = getNotesByFolder(selectedFolderId, activeWorkspace.id);
    const taskMap = new Map(allTasks.map((task) => [task.id, task]));
    
    return notes.map((note) => ({
      note,
      taskId: note.taskId || '',
      taskTitle: note.taskId ? taskMap.get(note.taskId)?.title || 'Unknown Task' : 'Standalone',
      noteTitle: note.title || 'Untitled Note',
    }));
  }, [getNotesByFolder, selectedFolderId, allTasks, activeWorkspace]);

  const selectedFolder = selectedFolderId ? getFolder(selectedFolderId) : null;

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return folderNotes;

    const query = searchQuery.toLowerCase();
    return folderNotes.filter(({ note, taskTitle }) => {
      const contentMatch = note.content.toLowerCase().includes(query);
      const taskMatch = taskTitle.toLowerCase().includes(query);
      const tagMatch = note.tags.some((tag) => tag.toLowerCase().includes(query));
      return contentMatch || taskMatch || tagMatch;
    });
  }, [folderNotes, searchQuery]);

  // Sort notes: pinned first, then by updated date
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.note.pinned && !b.note.pinned) return -1;
      if (!a.note.pinned && b.note.pinned) return 1;
      return b.note.updatedAt - a.note.updatedAt;
    });
  }, [filteredNotes]);

  const handleNoteClick = (noteId: string, taskId?: string) => {
    setEditingNote({ noteId, taskId });
  };

  const handleCreateNote = () => {
    // Create a standalone note (no taskId), optionally in selected folder
    setEditingNote({ noteId: null, folderId: selectedFolderId });
  };

  const handleCreateFolder = (parentFolderId?: string) => {
    setFolderEditor({ folderId: null, parentFolderId });
  };

  const handleEditFolder = (folderId: string) => {
    setFolderEditor({ folderId });
  };

  const handleEditorClose = () => {
    setEditingNote(null);
  };

  const handleEditorSave = () => {
    // Refresh the view after saving
    setEditingNote(null);
  };

  // Show editor if editing
  if (editingNote) {
    return (
      <InlineNoteEditor
        taskId={editingNote.taskId}
        noteId={editingNote.noteId}
        folderId={editingNote.folderId}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />
    );
  }

  return (
    <div className="flex h-full gap-2 md:gap-4 min-h-0 overflow-hidden">
      {/* Folder Sidebar - Hidden on mobile, shown via button */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <FolderTree
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              {selectedFolder ? (
                <div className="flex items-center gap-2">
                  <Folder className={cn('h-5 w-5', selectedFolder.color && `text-[${selectedFolder.color}]`)} style={selectedFolder.color ? { color: selectedFolder.color } : undefined} />
                  {selectedFolder.name}
                </div>
              ) : (
                'All Notes'
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          <Button onClick={handleCreateNote} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </Button>
        </div>

      {/* Search */}
      <div className="mb-3 md:mb-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-3 md:mx-0 px-3 md:px-0">
        {sortedNotes.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center px-4">
              <p className="text-base md:text-lg font-medium text-muted-foreground">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first note to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3 pb-2">
            {sortedNotes.map(({ note, taskId, taskTitle, noteTitle }) => (
              <Card
                key={note.id}
                className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => handleNoteClick(note.id, taskId || undefined)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {note.pinned && (
                        <Pin className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <h3 className="text-base font-semibold">{noteTitle}</h3>
                      <Badge variant="outline" className="text-xs">
                        {format(note.updatedAt, 'MMM d, yyyy')}
                      </Badge>
                    </div>
                    {taskId && taskTitle !== 'Standalone' && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Task: {taskTitle}
                      </p>
                    )}
                    <DescriptionPreview
                      content={note.content}
                      maxLines={3}
                      className="mt-2"
                    />
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNote({ noteId: note.id, taskId: taskId || undefined });
                        setIsHistoryOpen(true);
                      }}
                      title="View history"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Use toast for confirmation
                        const confirmed = window.confirm('Are you sure you want to delete this note?');
                        if (confirmed) {
                          toast.promise(
                            Promise.resolve().then(() => {
                              deleteNote(note.id, taskId || undefined);
                            }),
                            {
                              loading: 'Deleting note...',
                              success: 'Note deleted',
                              error: 'Failed to delete note',
                            }
                          );
                        }
                      }}
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Note History */}
      {selectedNote && selectedNote.taskId && (
        <NoteHistory
          taskId={selectedNote.taskId}
          noteId={selectedNote.noteId}
          open={isHistoryOpen}
          onClose={() => {
            setIsHistoryOpen(false);
            setSelectedNote(null);
          }}
        />
      )}

      {/* Folder Editor */}
      {folderEditor && activeWorkspace && (
        <FolderEditor
          folderId={folderEditor.folderId}
          workspaceId={activeWorkspace.id}
          parentFolderId={folderEditor.parentFolderId}
          open={!!folderEditor}
          onClose={() => setFolderEditor(null)}
        />
      )}
      </div>
    </div>
  );
}

