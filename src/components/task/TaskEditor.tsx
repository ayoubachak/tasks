import { useState, useEffect, useRef } from 'react';
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
import { DescriptionPreview } from './DescriptionPreview';
import { SubtaskTree } from '@/components/subtask/SubtaskTree';
import { DependencyPicker } from '@/components/dependencies/DependencyPicker';
import { RecurrenceEditor } from '@/components/recurrence/RecurrenceEditor';
import { ChecklistList } from '@/components/checklist/ChecklistList';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TagPicker } from '@/components/tags/TagPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, FileText, Calendar as CalendarIcon, ExternalLink, Repeat, ListChecks, Link2, ListTree, StickyNote, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { nanoid } from 'nanoid';
import type { TaskStatus, Priority, RecurrenceRule, Subtask, Checklist, ChecklistItem, Note } from '@/types';

interface TaskEditorProps {
  taskId: string | null;
  workspaceId: string;
  onClose: () => void;
}

export function TaskEditor({ taskId, workspaceId, onClose }: TaskEditorProps) {
  const { 
    createTask, 
    updateTask, 
    getTask, 
    getTasksByWorkspace,
    addSubtask,
    addNote,
    addChecklist,
    addChecklistItem,
    addDependency,
    addBlockedBy
  } = useTaskStore();
  const { openDescriptionEditor, openNoteEditor } = useUIStore();
  const task = taskId ? getTask(taskId) : null;
  
  // Get all tags from tasks in this workspace for autocomplete
  const workspaceTasks = getTasksByWorkspace(workspaceId);
  const allTags = Array.from(
    new Set(workspaceTasks.flatMap((t) => t.tags))
  ).sort();

  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);

  // Get the current task (either existing or draft)
  const currentTask = task || (draftTaskId ? getTask(draftTaskId) : null);

  // Create draft task immediately when opening for new task
  useEffect(() => {
    if (task) {
      // Existing task - load its data
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setTaskTags(task.tags);
      setRecurrence(task.recurrence);
      setDraftTaskId(null);
    } else if (!draftTaskId) {
      // New task - create draft immediately
      const draftTask = createTask(workspaceId, 'Untitled', '');
      setDraftTaskId(draftTask.id);
      setTitle('Untitled');
      setDescription('');
      setStatus('todo');
      setPriority('none');
      setDueDate(undefined);
      setTaskTags([]);
      setRecurrence(undefined);
    }
  }, [task, draftTaskId, workspaceId, createTask]);

  // Auto-update draft task as user types (only for drafts, not existing tasks)
  useEffect(() => {
    if (!draftTaskId || task) return; // Only update drafts, not existing tasks
    
    const timeoutId = setTimeout(() => {
      const taskToUpdate = getTask(draftTaskId);
      if (!taskToUpdate) return;
      
      // Only update if values have actually changed to prevent infinite loops
      const hasChanges = 
        (taskToUpdate.title !== (title || 'Untitled')) ||
        (taskToUpdate.description !== description) ||
        (taskToUpdate.status !== status) ||
        (taskToUpdate.priority !== priority) ||
        (JSON.stringify(taskToUpdate.tags || []) !== JSON.stringify(taskTags)) ||
        (taskToUpdate.dueDate !== (dueDate ? dueDate.getTime() : undefined)) ||
        (JSON.stringify(taskToUpdate.recurrence || null) !== JSON.stringify(recurrence || null));
      
      if (hasChanges) {
        updateTask(draftTaskId, {
          title: title || 'Untitled',
          description,
          status,
          priority,
          tags: taskTags,
          dueDate: dueDate ? dueDate.getTime() : undefined,
          recurrence,
        });
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [title, description, status, priority, taskTags, dueDate, recurrence, draftTaskId, task, getTask, updateTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTask) return;

    // Update the task (draft or existing)
    const finalTitle = title.trim() || 'Untitled';
    updateTask(currentTask.id, {
      title: finalTitle,
      description: description.trim(),
      status,
      priority,
      tags: taskTags,
      dueDate: dueDate ? dueDate.getTime() : undefined,
      recurrence,
    });

    // If it's a draft with just "Untitled" and no content, delete it
    if (draftTaskId && finalTitle === 'Untitled' && !description.trim() && 
        currentTask.subtasks.length === 0 && currentTask.notes.length === 0 && 
        currentTask.checklists.length === 0) {
      deleteTask(currentTask.id);
    }

    onClose();
  };

  // Handle closing - delete draft if empty
  const handleClose = () => {
    if (draftTaskId && currentTask) {
      const isEmpty = (currentTask.title === 'Untitled' || !currentTask.title.trim()) &&
                      !currentTask.description.trim() &&
                      currentTask.subtasks.length === 0 &&
                      currentTask.notes.length === 0 &&
                      currentTask.checklists.length === 0 &&
                      currentTask.dependencies.length === 0 &&
                      currentTask.blockedBy.length === 0;
      
      if (isEmpty) {
        deleteTask(currentTask.id);
      }
    }
    onClose();
  };

  if (!currentTask) {
    // Still creating draft, show loading or return null
    return null;
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and settings' : 'Create a new task with title, description, and metadata'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
            <TabsList className="flex-shrink-0 w-full justify-start">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <ListTree className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6">
              {/* Title and Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title..."
                    required
                    autoFocus
                    className="text-base"
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
                        if (description !== currentTask.description) {
                          updateTask(currentTask.id, { description });
                        }
                        handleClose();
                        openDescriptionEditor(currentTask.id, workspaceId);
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Full Editor
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Quick description (use 'Full Editor' for Markdown with images)..."
                    rows={4}
                  />
                  {description && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (description !== currentTask.description) {
                          updateTask(currentTask.id, { description });
                        }
                        handleClose();
                        openDescriptionEditor(currentTask.id, workspaceId);
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Full Editor
                    </Button>
                  )}
                </div>
              </div>

              {/* Status and Priority */}
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

              {/* Due Date and Tags */}
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

              {/* Recurrence */}
              <div className="space-y-2">
                {recurrence && (
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Recurrence is active</span>
                  </div>
                )}
                <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
              </div>
            </TabsContent>

            <TabsContent value="details" className="flex-1 overflow-y-auto pr-2 mt-4">
              {!currentTask ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={[]} className="w-full space-y-2">
                <AccordionItem value="subtasks">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ListTree className="h-4 w-4" />
                      <span>Subtasks</span>
                      {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({currentTask.subtasks.length})
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <SubtaskTree taskId={currentTask.id} subtasks={currentTask.subtasks || []} />
                  </AccordionContent>
                </AccordionItem>

                  <AccordionItem value="notes">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4" />
                        <span>Notes</span>
                        {currentTask.notes && currentTask.notes.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({currentTask.notes.length})
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            handleClose();
                            openNoteEditor(currentTask.id, null, workspaceId);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Note
                        </Button>
                        {!currentTask.notes || currentTask.notes.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {(currentTask.notes || []).map((note) => (
                              <div
                                key={note.id}
                                className="flex items-start justify-between rounded-md border p-3 text-sm hover:bg-accent/50 cursor-pointer transition-colors"
                                onClick={() => {
                                  handleClose();
                                  openNoteEditor(currentTask.id, note.id, workspaceId);
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
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
                                  className="ml-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClose();
                                    openNoteEditor(currentTask.id, note.id, workspaceId);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="checklists">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        <span>Checklists</span>
                        {currentTask.checklists && currentTask.checklists.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({currentTask.checklists.length})
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ChecklistList taskId={currentTask.id} checklists={currentTask.checklists || []} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dependencies">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        <span>Dependencies</span>
                        {(currentTask.dependencies?.length > 0 || currentTask.blockedBy?.length > 0) && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({currentTask.dependencies?.length || 0} deps, {currentTask.blockedBy?.length || 0} blockers)
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <DependencyPicker task={currentTask} workspaceId={workspaceId} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">{task ? 'Update' : 'Save'}</Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}

