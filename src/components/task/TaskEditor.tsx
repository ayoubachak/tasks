import { useState, useEffect, useRef } from 'react';
import { useTaskStore, useUIStore } from '@/stores';
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
import { Plus, FileText, Calendar as CalendarIcon, ExternalLink, Repeat, ListChecks, Link2, ListTree, StickyNote, Info, Clock, Bell, Play } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatTime, parseTime, formatTimeForInput } from '@/lib/utils/timeFormat';
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
    deleteTask,
    getTask, 
    getTasksByWorkspace
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
  const draftCreatedRef = useRef(false);
  const isSavingRef = useRef(false);
  const savedTaskIdRef = useRef<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('none');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [actualTime, setActualTime] = useState<string>('');
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
      setStartDate(task.startDate ? new Date(task.startDate) : undefined);
      setReminderDate(task.reminderDate ? new Date(task.reminderDate) : undefined);
      setEstimatedTime(task.estimatedTime ? formatTimeForInput(task.estimatedTime) : '');
      setActualTime(task.actualTime ? formatTimeForInput(task.actualTime) : '');
      setTaskTags(task.tags);
      setRecurrence(task.recurrence);
      setDraftTaskId(null);
      draftCreatedRef.current = false;
      return;
    }
    
    // For new tasks, check if we've already created/assigned a draft
    if (draftTaskId) {
      // Already have a draft ID, verify it still exists
      const existingDraft = getTask(draftTaskId);
      if (existingDraft) {
        return; // Draft exists, nothing to do
      }
      // Draft was deleted, reset
      setDraftTaskId(null);
      draftCreatedRef.current = false;
    }
    
    // If ref is set, we've already attempted creation (prevent StrictMode double-call)
    if (draftCreatedRef.current) {
      return;
    }
    
    // New task - check if draft already exists in store first
    const currentWorkspaceTasks = getTasksByWorkspace(workspaceId);
    const existingDrafts = currentWorkspaceTasks.filter(
      t => t.title === 'Untitled' && 
      !t.description.trim() && 
      (t.subtasks?.length || 0) === 0 && 
      (t.notes?.length || 0) === 0 && 
      (t.checklists?.length || 0) === 0 &&
      (t.dependencies?.length || 0) === 0 &&
      (t.blockedBy?.length || 0) === 0
    );
    
    if (existingDrafts.length > 0) {
      // Reuse existing draft
      const existingDraft = existingDrafts[0];
      draftCreatedRef.current = true;
      setDraftTaskId(existingDraft.id);
      setTitle('Untitled');
      setDescription('');
      setStatus(existingDraft.status);
      setPriority(existingDraft.priority);
      setDueDate(existingDraft.dueDate ? new Date(existingDraft.dueDate) : undefined);
      setStartDate(existingDraft.startDate ? new Date(existingDraft.startDate) : undefined);
      setReminderDate(existingDraft.reminderDate ? new Date(existingDraft.reminderDate) : undefined);
      setEstimatedTime(existingDraft.estimatedTime ? formatTimeForInput(existingDraft.estimatedTime) : '');
      setActualTime(existingDraft.actualTime ? formatTimeForInput(existingDraft.actualTime) : '');
      setTaskTags(existingDraft.tags);
      setRecurrence(existingDraft.recurrence);
    } else {
      // Create new draft - set ref FIRST to prevent duplicate creation
      draftCreatedRef.current = true;
      const draftTask = createTask(workspaceId, 'Untitled', '');
      setDraftTaskId(draftTask.id);
      setTitle('Untitled');
      setDescription('');
      setStatus('todo');
      setPriority('none');
      setDueDate(undefined);
      setStartDate(undefined);
      setReminderDate(undefined);
      setEstimatedTime('');
      setActualTime('');
      setTaskTags([]);
      setRecurrence(undefined);
    }
  }, [task, workspaceId, draftTaskId, createTask, getTask, getTasksByWorkspace]);

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
        (taskToUpdate.startDate !== (startDate ? startDate.getTime() : undefined)) ||
        (taskToUpdate.reminderDate !== (reminderDate ? reminderDate.getTime() : undefined)) ||
        (taskToUpdate.estimatedTime !== (estimatedTime ? parseTime(estimatedTime) : undefined)) ||
        (taskToUpdate.actualTime !== (actualTime ? parseTime(actualTime) : undefined)) ||
        (JSON.stringify(taskToUpdate.recurrence || null) !== JSON.stringify(recurrence || null));
      
      if (hasChanges) {
        updateTask(draftTaskId, {
          title: title || 'Untitled',
          description,
          status,
          priority,
          tags: taskTags,
          dueDate: dueDate ? dueDate.getTime() : undefined,
          startDate: startDate ? startDate.getTime() : undefined,
          reminderDate: reminderDate ? reminderDate.getTime() : undefined,
          estimatedTime: estimatedTime ? parseTime(estimatedTime) : undefined,
          actualTime: actualTime ? parseTime(actualTime) : undefined,
          recurrence,
        });
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [title, description, status, priority, taskTags, dueDate, startDate, reminderDate, estimatedTime, actualTime, recurrence, draftTaskId, task, getTask, updateTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTask) return;

    // Mark that we're saving, not canceling - do this FIRST
    isSavingRef.current = true;
    const taskIdToSave = currentTask.id;
    savedTaskIdRef.current = taskIdToSave; // Track which task we're saving

    // Update the task (draft or existing)
    // If user clicks "Save", they want to keep the task even if it's still "Untitled"
    const finalTitle = title.trim() || 'Untitled';
    
    updateTask(taskIdToSave, {
      title: finalTitle,
      description: description.trim(),
      status,
      priority,
      tags: taskTags,
      dueDate: dueDate ? dueDate.getTime() : undefined,
      startDate: startDate ? startDate.getTime() : undefined,
      reminderDate: reminderDate ? reminderDate.getTime() : undefined,
      estimatedTime: estimatedTime ? parseTime(estimatedTime) : undefined,
      actualTime: actualTime ? parseTime(actualTime) : undefined,
      recurrence,
    });

    // Reset draft tracking since we're saving
    draftCreatedRef.current = false;
    setDraftTaskId(null);
    
    // Close the dialog by calling handleClose, which will see isSavingRef and skip deletion
    handleClose(false);
  };

  // Handle closing - delete draft if empty (only when canceling, not saving)
  const handleClose = (open?: boolean) => {
    // If dialog is being opened, do nothing
    if (open === true) return;
    
    // If we're saving, don't delete the task - just close
    // Also check if this is the task we just saved (even if isSavingRef was reset)
    const currentDraftId = draftTaskId;
    const savedId = savedTaskIdRef.current;
    const isSaving = isSavingRef.current || (savedId !== null && currentDraftId === savedId);
    
    if (isSaving) {
      // Don't reset refs yet - keep them until component unmounts to prevent deletion on subsequent calls
      draftCreatedRef.current = false;
      setDraftTaskId(null);
      onClose();
      return;
    }

    // Only delete empty drafts when canceling (and not the task we just saved)
    if (currentDraftId && currentDraftId !== savedId) {
      const taskToDelete = getTask(currentDraftId);
      if (taskToDelete) {
        const isEmpty = (taskToDelete.title === 'Untitled' || !taskToDelete.title.trim()) &&
                        !taskToDelete.description.trim() &&
                        (taskToDelete.subtasks?.length || 0) === 0 &&
                        (taskToDelete.notes?.length || 0) === 0 &&
                        (taskToDelete.checklists?.length || 0) === 0 &&
                        (taskToDelete.dependencies?.length || 0) === 0 &&
                        (taskToDelete.blockedBy?.length || 0) === 0;
        
        if (isEmpty) {
          deleteTask(taskToDelete.id);
        }
      }
    }
    draftCreatedRef.current = false;
    setDraftTaskId(null);
    // Only reset savedTaskIdRef if we're not saving
    if (!isSaving) {
      savedTaskIdRef.current = null;
    }
    onClose();
  };

  // Cleanup on unmount - delete empty draft if component unmounts (only if not saving)
  useEffect(() => {
    const currentDraftId = draftTaskId;
    const savedId = savedTaskIdRef.current;
    return () => {
      // Don't delete if we're saving or if this is the task we just saved
      if (isSavingRef.current || (savedId !== null && currentDraftId === savedId)) {
        isSavingRef.current = false;
        savedTaskIdRef.current = null;
        return;
      }
      
      if (currentDraftId && !task && currentDraftId !== savedId) {
        const taskToDelete = getTask(currentDraftId);
        if (taskToDelete) {
          const isEmpty = (taskToDelete.title === 'Untitled' || !taskToDelete.title.trim()) &&
                          !taskToDelete.description.trim() &&
                          (taskToDelete.subtasks?.length || 0) === 0 &&
                          (taskToDelete.notes?.length || 0) === 0 &&
                          (taskToDelete.checklists?.length || 0) === 0 &&
                          (taskToDelete.dependencies?.length || 0) === 0 &&
                          (taskToDelete.blockedBy?.length || 0) === 0;
          
          if (isEmpty) {
            deleteTask(taskToDelete.id);
          }
        }
      }
      draftCreatedRef.current = false;
    };
  }, [draftTaskId, task, getTask, deleteTask]);

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
                        openDescriptionEditor(currentTask.id, workspaceId);
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Editor
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Quick description (click 'Open Editor' for full Markdown editor with formatting toolbar)..."
                    rows={4}
                    className="resize-none overflow-y-auto"
                    style={{ 
                      fieldSizing: 'fixed',
                      height: '6rem',
                      maxHeight: '6rem',
                      minHeight: '6rem'
                    } as React.CSSProperties}
                  />
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

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                      {startDate && (
                        <div className="p-3 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setStartDate(undefined)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

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
              </div>

              {/* Reminder */}
              <div className="space-y-2">
                <Label>Reminder</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !reminderDate && 'text-muted-foreground'
                      )}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      {reminderDate ? format(reminderDate, 'PPP p') : <span>Set reminder</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reminderDate}
                      onSelect={setReminderDate}
                      initialFocus
                    />
                    {reminderDate && (
                      <div className="p-3 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setReminderDate(undefined)}
                        >
                          Clear reminder
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Tracking */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime">Estimated Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="estimatedTime"
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="e.g., 2h 30m, 45m, 1d"
                      className="pl-9"
                    />
                  </div>
                  {estimatedTime && (
                    <p className="text-xs text-muted-foreground">
                      {formatTime(parseTime(estimatedTime))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualTime">Actual Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="actualTime"
                      type="text"
                      value={actualTime}
                      onChange={(e) => setActualTime(e.target.value)}
                      placeholder="e.g., 2h 30m, 45m"
                      className="pl-9"
                    />
                  </div>
                  {actualTime && (
                    <p className="text-xs text-muted-foreground">
                      {formatTime(parseTime(actualTime))}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagPicker
                  tags={taskTags}
                  availableTags={allTags}
                  onChange={setTaskTags}
                />
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

