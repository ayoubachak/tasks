import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PasteImageResult } from '@/hooks/useImagePaste';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  taskTitle?: string;
}

export function DescriptionEditor({
  value,
  onChange,
  onClose,
  taskTitle,
}: DescriptionEditorProps) {
  const [content, setContent] = useState(value);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Only sync from parent on initial mount or if value changes externally
    // Don't overwrite user edits
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setContent(value);
    } else if (value !== content && !content) {
      // Only update if our content is empty (external update)
      setContent(value);
    }
  }, [value]);

  const handleSave = () => {
    onChange(content);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent 
        className="max-h-[98vh] flex flex-col z-[100]" 
        style={{ 
          zIndex: 100,
          maxWidth: '99vw',
          width: '99vw',
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {taskTitle ? `Edit Description: ${taskTitle}` : 'Edit Description'}
          </DialogTitle>
          <DialogDescription>
            Write a detailed description with Markdown support. Paste images directly or upload them.
          </DialogDescription>
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
                  rows={20}
                  placeholder="Write your task description in Markdown... You can paste images, add links, format text, and more."
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full overflow-y-auto p-4 border rounded-md">
                <MarkdownViewer content={content || '*No description yet*'} />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="h-full overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    rows={20}
                    placeholder="Write your task description in Markdown..."
                  />
                </div>
                <div className="h-full overflow-y-auto p-4 border rounded-md">
                  <MarkdownViewer content={content || '*No description yet*'} />
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
            Save Description
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

