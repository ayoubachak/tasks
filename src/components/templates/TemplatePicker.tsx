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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useTemplateStore } from '@/stores';
import { useWorkspaceStore } from '@/stores';
import type { TaskTemplate, NoteTemplate } from '@/types/template';

interface TemplatePickerProps {
  type: 'task' | 'note';
  onSelect: (template: TaskTemplate | NoteTemplate) => void;
  trigger?: React.ReactNode;
}

export function TemplatePicker({ type, onSelect, trigger }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const { getActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = getActiveWorkspace();
  
  const {
    taskTemplates,
    noteTemplates,
    getTaskTemplatesByWorkspace,
    getNoteTemplatesByWorkspace,
    deleteTaskTemplate,
    deleteNoteTemplate,
  } = useTemplateStore();

  const templates = type === 'task'
    ? getTaskTemplatesByWorkspace(activeWorkspace?.id)
    : getNoteTemplatesByWorkspace(activeWorkspace?.id);

  const handleSelect = (template: TaskTemplate | NoteTemplate) => {
    onSelect(template);
    setOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      if (type === 'task') {
        deleteTaskTemplate(id);
      } else {
        deleteNoteTemplate(id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {type === 'task' ? 'Task' : 'Note'} Templates
          </DialogTitle>
          <DialogDescription>
            Select a template to create a new {type === 'task' ? 'task' : 'note'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No templates available. Create one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Used {template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => handleDelete(e, template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

