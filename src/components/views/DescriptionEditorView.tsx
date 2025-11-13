import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <DialogContent className="!max-w-[95vw] md:!max-w-[90vw] !w-[95vw] md:!w-[90vw] max-h-[95vh] h-[95vh] flex flex-col p-0 overflow-hidden max-md:inset-0 max-md:rounded-none max-md:max-w-full max-md:w-full max-md:h-full">
        <DialogHeader className="px-2 sm:px-6 pt-2 sm:pt-6 pb-2 sm:pb-4 flex-shrink-0 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-xl truncate">{task.title}</DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm hidden sm:block">Edit task description with Markdown support</DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button size="sm" onClick={handleSave} className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3">
                <Save className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
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
                    placeholder="Write your task description in Markdown... You can paste images, add links, format text, and more."
                    showToolbar
                  />
                </div>
              )}

              {viewMode === 'preview' && (
                <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background">
                  <MarkdownViewer content={content || '*No description yet*'} />
                </div>
              )}

              {viewMode === 'split' && (
                <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 min-h-0 overflow-hidden">
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      rows={25}
                      placeholder="Write your task description in Markdown..."
                      showToolbar
                    />
                  </div>
                  <div className="h-full overflow-y-auto rounded-md border p-3 sm:p-6 bg-background">
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

