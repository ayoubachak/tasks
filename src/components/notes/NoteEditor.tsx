import { useState, useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownViewer } from './MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pin, Trash2 } from 'lucide-react';
import type { Note, ImageData } from '@/types';
import type { PasteImageResult } from '@/hooks/useImagePaste';

interface NoteEditorProps {
  taskId: string;
  noteId: string | null;
  onClose: () => void;
}

export function NoteEditor({ taskId, noteId, onClose }: NoteEditorProps) {
  const { getTask, addNote, updateNote, deleteNote, pinNote } = useTaskStore();
  const task = getTask(taskId);
  const note = noteId ? task?.notes.find((n) => n.id === noteId) : null;

  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [images, setImages] = useState<PasteImageResult[]>([]);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      // Convert Note images to PasteImageResult format if needed
      setImages(
        note.images.map((img) => ({
          data: img.data,
          mimeType: img.mimeType,
          filename: img.filename,
          size: img.size,
          width: img.width,
          height: img.height,
        }))
      );
    } else {
      setContent('');
      setImages([]);
    }
  }, [note]);

  const handleImagePaste = (image: PasteImageResult) => {
    setImages((prev) => [...prev, image]);
  };

  const handleSave = () => {
    if (!content.trim()) {
      return;
    }

    // Convert PasteImageResult to ImageData
    const imageData: ImageData[] = images.map((img) => ({
      id: `img-${Date.now()}-${Math.random()}`,
      data: img.data,
      mimeType: img.mimeType,
      filename: img.filename,
      size: img.size,
      width: img.width,
      height: img.height,
      createdAt: Date.now(),
    }));

    if (note) {
      updateNote(taskId, noteId!, content);
    } else {
      addNote(taskId, content, imageData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (note && confirm('Are you sure you want to delete this note?')) {
      deleteNote(taskId, noteId!);
      onClose();
    }
  };

  const handlePin = () => {
    if (note) {
      pinNote(taskId, noteId!, !note.pinned);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[95vh] flex flex-col w-[98vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{note ? 'Edit Note' : 'New Note'}</DialogTitle>
              <DialogDescription>
                {note ? 'Edit your note with Markdown support and images' : 'Create a new note with Markdown support and images'}
              </DialogDescription>
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
            </div>
          </div>
        </DialogHeader>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            {viewMode === 'edit' && (
              <div className="h-full">
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  onImagePaste={handleImagePaste}
                  rows={15}
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full overflow-y-auto p-4 border rounded-md">
                <MarkdownViewer content={content} />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="h-full overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    onImagePaste={handleImagePaste}
                    rows={15}
                  />
                </div>
                <div className="h-full overflow-y-auto p-4 border rounded-md">
                  <MarkdownViewer content={content} />
                </div>
              </div>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {note ? 'Update' : 'Create'} Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

