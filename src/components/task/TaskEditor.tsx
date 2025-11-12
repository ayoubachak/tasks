import { useState, useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DescriptionPreview } from './DescriptionPreview';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TagPicker } from '@/components/tags/TagPicker';
import { Plus, FileText, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import type { TaskStatus, Priority } from '@/types';

interface TaskEditorProps {
  taskId: string | null;
  workspaceId: string;
  onClose: () => void;
}

export function TaskEditor({ taskId, workspaceId, onClose }: TaskEditorProps) {
  const { createTask, updateTask, getTask, getTasksByWorkspace } = useTaskStore();
  const { openDescriptionEditor, openNoteEditor } = useUIStore();
  const task = taskId ? getTask(taskId) : null;
  
  // Get all tags from tasks in this workspace for autocomplete
  const workspaceTasks = getTasksByWorkspace(workspaceId);
  const allTags = Array.from(
    new Set(workspaceTasks.flatMap((t) => t.tags))
  ).sort();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [taskTags, setTaskTags] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setTaskTags(task.tags);
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('none');
      setDueDate(undefined);
      setTaskTags([]);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        tags: taskTags,
        dueDate: dueDate ? dueDate.getTime() : undefined,
      });
    } else {
      const newTask = createTask(workspaceId, title.trim(), description.trim());
      // Update status, priority, tags, and due date after creation
      updateTask(newTask.id, {
        status,
        priority,
        tags: taskTags,
        dueDate: dueDate ? dueDate.getTime() : undefined,
      });
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and settings' : 'Create a new task with title, description, and metadata'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (task) {
                    // Existing task: Save current description first, then open editor
                    if (description !== task.description) {
                      updateTask(task.id, { description });
                    }
                    onClose();
                    openDescriptionEditor(task.id, workspaceId);
                  } else {
                    // New task: Create task first, then open editor
                    // We need to create the task first
                    const newTask = createTask({
                      workspaceId,
                      title: title || 'Untitled Task',
                      description,
                      status,
                      priority,
                      dueDate,
                      tags: taskTags,
                    });
                    onClose();
                    openDescriptionEditor(newTask.id, workspaceId);
                  }
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Editor
              </Button>
            </div>
            {description ? (
              <div className="rounded-md border p-3">
                <DescriptionPreview content={description} maxLines={3} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    if (task) {
                      updateTask(task.id, { description });
                      onClose();
                      openDescriptionEditor(task.id, workspaceId);
                    } else {
                      // Create task first
                      const newTask = createTask({
                        workspaceId,
                        title: title || 'Untitled Task',
                        description,
                        status,
                        priority,
                        dueDate,
                        tags: taskTags,
                      });
                      onClose();
                      openDescriptionEditor(newTask.id, workspaceId);
                    }
                  }}
                >
                  <FileText className="mr-1 h-3 w-3" />
                  Edit in Full Editor
                </Button>
              </div>
            ) : (
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quick description (use 'Open Full Editor' for Markdown with images)..."
                rows={4}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                  {dueDate && (
                    <div className="p-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setDueDate(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker
                tags={taskTags}
                availableTags={allTags}
                onChange={setTaskTags}
              />
            </div>
          </div>

          {task && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Notes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      openNoteEditor(task.id, null, workspaceId);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
                </div>
                {task.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {task.notes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start justify-between rounded-md border p-2 text-sm hover:bg-accent/50 cursor-pointer"
                        onClick={() => {
                          onClose();
                          openNoteEditor(task.id, note.id, workspaceId);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {note.pinned && <span className="text-xs">📌</span>}
                            <span className="text-xs text-muted-foreground">
                              {format(note.updatedAt, 'MMM d, yyyy')}
                            </span>
                          </div>
                          <DescriptionPreview 
                            content={note.content} 
                            maxLines={2}
                            className="mt-1"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            openNoteEditor(task.id, note.id, workspaceId);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{task ? 'Update' : 'Create'}</Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}

