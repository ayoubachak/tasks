import { useMemo, useState } from 'react';
import { useTaskStore, useWorkspaceStore } from '@/stores';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, StickyNote } from 'lucide-react';
import { TaskItem } from '@/components/task/TaskItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task, Note } from '@/types';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';
import { format } from 'date-fns';
import { SearchBar } from '@/components/filters/SearchBar';
import { useViewStore } from '@/stores/viewStore';

interface TaskWithWorkspace extends Task {
  workspaceName: string;
  workspaceColor?: string;
}

interface NoteWithWorkspace extends Note {
  workspaceName: string;
  workspaceColor?: string;
  taskTitle?: string;
}

export function AllView() {
  const { workspaces } = useWorkspaceStore();
  const { tasks, standaloneNotes } = useTaskStore();
  const { searchQuery } = useViewStore();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');

  // Get workspace map for quick lookup
  const workspaceMap = useMemo(() => {
    return new Map(workspaces.map((w) => [w.id, w]));
  }, [workspaces]);

  // Combine all tasks with workspace info
  const allTasksWithWorkspace: TaskWithWorkspace[] = useMemo(() => {
    return tasks.map((task) => {
      const workspace = workspaceMap.get(task.workspaceId);
      return {
        ...task,
        workspaceName: workspace?.name || 'Unknown Workspace',
        workspaceColor: workspace?.color,
      };
    });
  }, [tasks, workspaceMap]);

  // Combine all notes with workspace info
  const allNotesWithWorkspace: NoteWithWorkspace[] = useMemo(() => {
    const taskNotes = tasks.flatMap((task) =>
      task.notes.map((note) => {
        const workspace = workspaceMap.get(task.workspaceId);
        return {
          ...note,
          workspaceName: workspace?.name || 'Unknown Workspace',
          workspaceColor: workspace?.color,
          taskTitle: task.title,
        };
      })
    );

    const standalone = standaloneNotes.map((note) => {
      const workspace = workspaceMap.get(note.workspaceId);
      return {
        ...note,
        workspaceName: workspace?.name || 'Unknown Workspace',
        workspaceColor: workspace?.color,
      };
    });

    return [...standalone, ...taskNotes];
  }, [tasks, standaloneNotes, workspaceMap]);

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return allTasksWithWorkspace;
    const query = searchQuery.toLowerCase();
    return allTasksWithWorkspace.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.workspaceName.toLowerCase().includes(query)
    );
  }, [allTasksWithWorkspace, searchQuery]);

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allNotesWithWorkspace;
    const query = searchQuery.toLowerCase();
    return allNotesWithWorkspace.filter(
      (note) =>
        (note.title || '').toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.workspaceName.toLowerCase().includes(query) ||
        (note.taskTitle || '').toLowerCase().includes(query)
    );
  }, [allNotesWithWorkspace, searchQuery]);

  // Group tasks by workspace
  const tasksByWorkspace = useMemo(() => {
    const grouped = new Map<string, TaskWithWorkspace[]>();
    filteredTasks.forEach((task) => {
      const key = task.workspaceId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      const nameA = workspaceMap.get(a)?.name || '';
      const nameB = workspaceMap.get(b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredTasks, workspaceMap]);

  // Group notes by workspace
  const notesByWorkspace = useMemo(() => {
    const grouped = new Map<string, NoteWithWorkspace[]>();
    filteredNotes.forEach((note) => {
      const key = note.workspaceId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(note);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      const nameA = workspaceMap.get(a)?.name || '';
      const nameB = workspaceMap.get(b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredNotes, workspaceMap]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">All Tasks & Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View all tasks and notes across {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <SearchBar />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'notes')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 w-fit flex-shrink-0">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>Tasks</span>
            <span className="ml-1 text-xs text-muted-foreground">({filteredTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            <span>Notes</span>
            <span className="ml-1 text-xs text-muted-foreground">({filteredNotes.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full">
            {tasksByWorkspace.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tasksByWorkspace.map(([workspaceId, workspaceTasks]) => {
                  const workspace = workspaceMap.get(workspaceId);
                  return (
                    <div key={workspaceId} className="space-y-3">
                      <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 border-b">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: workspace?.color || '#3b82f6' }}
                        />
                        <h2 className="font-semibold text-lg">{workspace?.name || 'Unknown Workspace'}</h2>
                        <span className="text-sm text-muted-foreground">({workspaceTasks.length})</span>
                      </div>
                      <div className="space-y-2 pl-5">
                        {workspaceTasks.map((task) => (
                          <TaskItem 
                            key={task.id} 
                            task={task}
                            onEdit={() => {
                              // Dispatch event to open task editor
                              window.dispatchEvent(new CustomEvent('edit-task', { detail: { taskId: task.id } }));
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full">
            {notesByWorkspace.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notes found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {notesByWorkspace.map(([workspaceId, workspaceNotes]) => {
                  const workspace = workspaceMap.get(workspaceId);
                  return (
                    <div key={workspaceId} className="space-y-4">
                      <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 border-b">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: workspace?.color || '#3b82f6' }}
                        />
                        <h2 className="font-semibold text-lg">{workspace?.name || 'Unknown Workspace'}</h2>
                        <span className="text-sm text-muted-foreground">({workspaceNotes.length})</span>
                      </div>
                      <div className="space-y-3 pl-5">
                        {workspaceNotes.map((note) => (
                          <div
                            key={note.id}
                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium">
                                  {note.title || 'Untitled Note'}
                                  {note.taskTitle && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                      (Task: {note.taskTitle})
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                                  {note.pinned && <span className="text-primary">📌 Pinned</span>}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm">
                              <MarkdownViewer
                                content={note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '')}
                                className="markdown-preview"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

