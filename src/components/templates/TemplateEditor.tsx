import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus } from 'lucide-react';
import { useTemplateStore } from '@/stores';
import { useWorkspaceStore } from '@/stores';
import type { Task } from '@/types';

interface TemplateEditorProps {
  type: 'task' | 'note';
  task?: Task; // For creating task template from existing task
  noteContent?: string; // For creating note template from existing note
  trigger?: React.ReactNode;
}

export function TemplateEditor({ type, task, noteContent, trigger }: TemplateEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { getActiveWorkspace } = useWorkspaceStore();
  const { createTaskTemplate, createNoteTemplate } = useTemplateStore();
  const activeWorkspace = getActiveWorkspace();

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (type === 'task' && task) {
      // Create task template from existing task
      const taskStructure: Partial<Task> = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: [...task.tags],
        dueDate: task.dueDate,
        recurrence: task.recurrence,
        // Don't include id, workspaceId, timestamps, etc.
      };
      createTaskTemplate(name, description, taskStructure, activeWorkspace?.id);
    } else if (type === 'note' && noteContent) {
      createNoteTemplate(name, description, noteContent, activeWorkspace?.id);
    }

    setName('');
    setDescription('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Save as Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {type === 'task' ? 'Task' : 'Note'} Template</DialogTitle>
          <DialogDescription>
            Save this {type === 'task' ? 'task' : 'note'} as a template for future use
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Review Task"
            />
          </div>
          <div>
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
              Create Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

