import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X } from 'lucide-react';

export function DescriptionEditorView() {
  const { currentView, editorState, navigateBack } = useUIStore();
  const { getTask, updateTask } = useTaskStore();
  
  const taskId = editorState?.taskId;
  const task = taskId ? getTask(taskId) : null;
  
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  useEffect(() => {
    if (task) {
      setContent(task.description);
    }
  }, [task]);

  if (!task || currentView !== 'description-editor') {
    return null;
  }

  const handleSave = () => {
    updateTask(task.id, { description: content });
    navigateBack();
  };

  const handleClose = () => {
    navigateBack();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <DialogDescription>Edit task description with Markdown support</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
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
                    placeholder="Write your task description in Markdown... You can paste images, add links, format text, and more."
                    showToolbar
                  />
                </div>
              )}

              {viewMode === 'preview' && (
                <div className="h-full overflow-y-auto rounded-md border p-6 bg-background">
                  <MarkdownViewer content={content || '*No description yet*'} />
                </div>
              )}

              {viewMode === 'split' && (
                <div className="grid h-full grid-cols-2 gap-6 min-h-0 overflow-hidden">
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      rows={25}
                      placeholder="Write your task description in Markdown..."
                      showToolbar
                    />
                  </div>
                  <div className="h-full overflow-y-auto rounded-md border p-6 bg-background">
                    <MarkdownViewer content={content || '*No description yet*'} />
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

