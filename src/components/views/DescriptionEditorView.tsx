import { useState, useEffect } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
import { MarkdownEditor } from '@/components/notes/MarkdownEditor';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';

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
              <p className="text-sm text-muted-foreground">Edit Description</p>
            </div>
          </div>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
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
                  placeholder="Write your task description in Markdown... You can paste images, add links, format text, and more."
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="h-full overflow-y-auto rounded-md border p-6">
                <MarkdownViewer content={content || '*No description yet*'} />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="grid h-full grid-cols-2 gap-6">
                <div className="h-full overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    rows={30}
                    placeholder="Write your task description in Markdown..."
                  />
                </div>
                <div className="h-full overflow-y-auto rounded-md border p-6">
                  <MarkdownViewer content={content || '*No description yet*'} />
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

