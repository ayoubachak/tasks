import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { buildSubtaskTree, calculateNestedProgress, getSubtaskDescendants } from '@/lib/subtasks/treeUtils';
import { wouldCreateCycle } from '@/lib/dependencies/dependencyUtils';
import { getNextOccurrence } from '@/lib/recurrence/recurrenceUtils';
import { useNoteHistoryStore } from './noteHistoryStore';
import type { Task, TaskStatus, Subtask, Note, ImageData, RecurrenceRule, Checklist, ChecklistItem } from '@/types';

interface TaskState {
  tasks: Task[];
  standaloneNotes: Note[]; // Notes that are not linked to any task
  
  // Actions
  createTask: (
    workspaceId: string,
    title: string,
    description?: string
  ) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  getTasksByWorkspace: (workspaceId: string) => Task[];
  getTask: (id: string) => Task | undefined;
  addSubtask: (taskId: string, title: string, parentSubtaskId?: string) => Subtask;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  calculateTaskProgress: (taskId: string) => number;
  // Note actions (can work with task notes or standalone notes)
  addNote: (workspaceId: string, taskId: string | null, content: string, title?: string, images?: ImageData[], folderId?: string) => Note;
  updateNote: (noteId: string, content: string, title?: string, taskId?: string, folderId?: string) => void;
  deleteNote: (noteId: string, taskId?: string) => void;
  pinNote: (noteId: string, pinned: boolean, taskId?: string) => void;
  linkNoteToTask: (noteId: string, taskId: string) => void;
  unlinkNoteFromTask: (noteId: string, taskId: string) => void;
  moveNoteToFolder: (noteId: string, folderId: string | undefined, taskId?: string) => void;
  getNotesByFolder: (folderId: string | undefined, workspaceId: string) => Note[]; // Get notes in a folder (undefined = root)
  getAllNotes: () => Note[]; // Get all notes (standalone + task notes)
  getNotesByWorkspace: (workspaceId: string) => Note[]; // Get all notes in a workspace
  getNote: (noteId: string) => Note | undefined; // Find note in tasks or standalone
  deleteNotesByWorkspace: (workspaceId: string) => void; // Delete all notes in a workspace
  
  // Dependencies
  addDependency: (taskId: string, dependencyId: string) => void;
  removeDependency: (taskId: string, dependencyId: string) => void;
  addBlockedBy: (taskId: string, blockerId: string) => void;
  removeBlockedBy: (taskId: string, blockerId: string) => void;
  
  // Recurrence
  setRecurrence: (taskId: string, rule: RecurrenceRule | undefined) => void;
  createRecurrenceInstance: (taskId: string) => Task | null;
  getRecurringTasks: () => Task[];
  
  // Checklists
  addChecklist: (taskId: string, title: string) => Checklist;
  updateChecklist: (taskId: string, checklistId: string, updates: Partial<Checklist>) => void;
  deleteChecklist: (taskId: string, checklistId: string) => void;
  addChecklistItem: (taskId: string, checklistId: string, text: string) => ChecklistItem;
  updateChecklistItem: (taskId: string, checklistId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  toggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  calculateChecklistProgress: (taskId: string, checklistId: string) => number;
}

const createDefaultTask = (
  workspaceId: string,
  title: string,
  description = ''
): Task => {
  const now = Date.now();
  return {
    id: nanoid(),
    workspaceId,
    title,
    description,
    status: 'todo',
    priority: 'none',
    tags: [],
    labels: [],
    dependencies: [],
    blockedBy: [],
    progress: 0,
    notes: [],
    attachments: [],
    subtasks: [],
    checklists: [],
    createdAt: now,
    updatedAt: now,
    customFields: {},
  };
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      standaloneNotes: [],

      createTask: (workspaceId: string, title: string, description = '') => {
        const task = createDefaultTask(workspaceId, title, description);
        set((state) => ({
          tasks: [...state.tasks, task],
        }));
        return task;
      },

      updateTask: (id: string, updates: Partial<Task>) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: Date.now() }
              : task
          ),
        }));

        // Recalculate progress if subtasks changed
        if (updates.subtasks !== undefined) {
          const updatedTask = get().tasks.find((t) => t.id === id);
          if (updatedTask) {
            const progress = get().calculateTaskProgress(id);
            set((state) => ({
              tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, progress } : task
              ),
            }));
          }
        }
      },

      deleteTask: (id: string) => {
        set((state) => {
          // Find the task being deleted (for potential cleanup)
          state.tasks.find((task) => task.id === id);
          
          // Notes that are linked to this task will be deleted with the task
          // (they're stored in task.notes, so they'll be removed when the task is removed)
          // Standalone notes are unaffected
          
          return {
          tasks: state.tasks.filter((task) => task.id !== id),
          };
        });
      },

      toggleTaskStatus: (id: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === id) {
              const newStatus: TaskStatus =
                task.status === 'done' ? 'todo' : 'done';
              return {
                ...task,
                status: newStatus,
                completedAt: newStatus === 'done' ? Date.now() : undefined,
                progress: newStatus === 'done' ? 100 : task.progress,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      getTasksByWorkspace: (workspaceId: string) => {
        return get().tasks.filter((task) => task.workspaceId === workspaceId);
      },

      getTask: (id: string) => {
        return get().tasks.find((task) => task.id === id);
      },

      addSubtask: (taskId: string, title: string, parentSubtaskId?: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        // Calculate order (max order + 1 for siblings, or 0 if root)
        const siblings = task.subtasks.filter(
          (st) => st.parentSubtaskId === parentSubtaskId
        );
        const maxOrder = siblings.length > 0 
          ? Math.max(...siblings.map((st) => st.order))
          : -1;

        const subtask: Subtask = {
          id: nanoid(),
          taskId,
          parentSubtaskId,
          title,
          completed: false,
          order: maxOrder + 1,
          createdAt: Date.now(),
        };

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = [...task.subtasks, subtask];
              return {
                ...task,
                subtasks,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        // Recalculate progress
        const progress = get().calculateTaskProgress(taskId);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, progress } : task
          ),
        }));

        return subtask;
      },

      updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = task.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, ...updates } : st
              );
              return {
                ...task,
                subtasks,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        // Recalculate progress
        const progress = get().calculateTaskProgress(taskId);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, progress } : task
          ),
        }));
      },

      deleteSubtask: (taskId: string, subtaskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        // Get all descendant IDs to delete
        const descendants = getSubtaskDescendants(task.subtasks, subtaskId);
        const idsToDelete = new Set([subtaskId, ...descendants]);

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = task.subtasks.filter((st) => !idsToDelete.has(st.id));
              return {
                ...task,
                subtasks,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        // Recalculate progress
        const progress = get().calculateTaskProgress(taskId);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, progress } : task
          ),
        }));
      },

      toggleSubtask: (taskId: string, subtaskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = task.subtasks.map((st) => {
                if (st.id === subtaskId) {
                  return {
                    ...st,
                    completed: !st.completed,
                    completedAt: !st.completed ? Date.now() : undefined,
                  };
                }
                return st;
              });
              return {
                ...task,
                subtasks,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        // Recalculate progress
        const progress = get().calculateTaskProgress(taskId);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, progress } : task
          ),
        }));
      },

      calculateTaskProgress: (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          return 0;
        }

        // If task is done, progress is 100%
        if (task.status === 'done') {
          return 100;
        }

        // If no subtasks, return 0
        if (task.subtasks.length === 0) {
          return 0;
        }

        // Build tree and calculate nested progress
        const tree = buildSubtaskTree(task.subtasks);
        return calculateNestedProgress(tree);
      },

      addNote: (workspaceId: string, taskId: string | null, content: string, title: string = 'Untitled Note', images: ImageData[] = [], folderId?: string) => {
        const now = Date.now();
        const note: Note = {
          id: nanoid(),
          workspaceId,
          ...(taskId && { taskId }),
          ...(folderId && { folderId }),
          title,
          content,
          version: 1,
          images,
          createdAt: now,
          updatedAt: now,
          pinned: false,
          tags: [],
        };

        set((state) => {
          if (taskId) {
            // Add to task
            return {
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                notes: [...task.notes, note],
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
            };
          } else {
            // Add as standalone note
            return {
              standaloneNotes: [...state.standaloneNotes, note],
            };
          }
        });

        return note;
      },

      updateNote: (noteId: string, content: string, title?: string, _taskId?: string, folderId?: string) => {
        set((state) => {
          // Try to find note in tasks first
          let foundNote: Note | undefined;
          let foundInTask = false;

          const updatedTasks = state.tasks.map((task) => {
            const note = task.notes.find((n) => n.id === noteId);
            if (note) {
              foundNote = note;
              foundInTask = true;
              // Save current version to history before updating
              const historyStore = useNoteHistoryStore.getState();
              historyStore.saveVersion(note);
              
              const updatedNotes = task.notes.map((n) => {
                if (n.id === noteId) {
                  return {
                    ...n,
                    content,
                    ...(title !== undefined && { title }),
                    ...(folderId !== undefined && { folderId }),
                    version: n.version + 1,
                    previousVersionId: n.id,
                    updatedAt: Date.now(),
                  };
                }
                return n;
              });
              
              return {
                ...task,
                notes: updatedNotes,
                updatedAt: Date.now(),
              };
            }
            return task;
          });

          if (foundInTask && foundNote) {
            // Save new version to history
            const task = updatedTasks.find((t) => t.id === foundNote?.taskId);
            if (task) {
              const note = task.notes.find((n) => n.id === noteId);
              if (note) {
                const historyStore = useNoteHistoryStore.getState();
                historyStore.saveVersion(note);
              }
            }
            return { tasks: updatedTasks };
          }

          // Note not found in tasks, try standalone notes
          const note = state.standaloneNotes.find((n) => n.id === noteId);
          if (note) {
            // Save current version to history before updating
            const historyStore = useNoteHistoryStore.getState();
            historyStore.saveVersion(note);
            
            const updatedNote = {
              ...note,
              content,
              ...(title !== undefined && { title }),
              ...(folderId !== undefined && { folderId }),
              version: note.version + 1,
              previousVersionId: note.id,
              updatedAt: Date.now(),
            };

            // Save new version to history
            historyStore.saveVersion(updatedNote);

            return {
              standaloneNotes: state.standaloneNotes.map((n) =>
                n.id === noteId ? updatedNote : n
              ),
            };
          }

          return state;
        });
      },

      deleteNote: (noteId: string, taskId?: string) => {
        set((state) => {
          if (taskId) {
            // Delete from specific task
            return {
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                notes: task.notes.filter((note) => note.id !== noteId),
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
            };
          } else {
            // Try to find and delete from tasks first
            let foundInTask = false;
            const updatedTasks = state.tasks.map((task) => {
              const hasNote = task.notes.some((note) => note.id === noteId);
              if (hasNote) {
                foundInTask = true;
                return {
                  ...task,
                  notes: task.notes.filter((note) => note.id !== noteId),
                  updatedAt: Date.now(),
                };
              }
              return task;
            });

            if (foundInTask) {
              return { tasks: updatedTasks };
            }

            // Delete from standalone notes
            return {
              standaloneNotes: state.standaloneNotes.filter((note) => note.id !== noteId),
            };
          }
        });
      },

      pinNote: (noteId: string, pinned: boolean, taskId?: string) => {
        set((state) => {
          if (taskId) {
            // Pin/unpin in specific task
            return {
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const notes = task.notes.map((note) =>
                note.id === noteId ? { ...note, pinned } : note
              );
              // Sort: pinned notes first
              notes.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return b.createdAt - a.createdAt;
              });
              return {
                ...task,
                notes,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
            };
          } else {
            // Try to find in tasks first
            let foundInTask = false;
            const updatedTasks = state.tasks.map((task) => {
              const note = task.notes.find((n) => n.id === noteId);
              if (note) {
                foundInTask = true;
                const notes = task.notes.map((n) =>
                  n.id === noteId ? { ...n, pinned } : n
                );
                notes.sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return b.createdAt - a.createdAt;
                });
                return {
                  ...task,
                  notes,
                  updatedAt: Date.now(),
                };
              }
              return task;
            });

            if (foundInTask) {
              return { tasks: updatedTasks };
            }

            // Pin/unpin standalone note
            return {
              standaloneNotes: state.standaloneNotes.map((note) =>
                note.id === noteId ? { ...note, pinned } : note
              ),
            };
          }
        });
      },

      linkNoteToTask: (noteId: string, taskId: string) => {
        set((state) => {
          // Find note in standalone notes
          const note = state.standaloneNotes.find((n) => n.id === noteId);
          if (note) {
            // Remove from standalone and add to task
            const linkedNote = { ...note, taskId };
            return {
              standaloneNotes: state.standaloneNotes.filter((n) => n.id !== noteId),
              tasks: state.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    notes: [...task.notes, linkedNote],
                    updatedAt: Date.now(),
                  };
                }
                return task;
              }),
            };
          }
          return state;
        });
      },

      unlinkNoteFromTask: (noteId: string, taskId: string) => {
        set((state) => {
          // Find note in task
          let noteToUnlink: Note | undefined;
          const updatedTasks = state.tasks.map((task) => {
            if (task.id === taskId) {
              const note = task.notes.find((n) => n.id === noteId);
              if (note) {
                noteToUnlink = note;
                return {
                  ...task,
                  notes: task.notes.filter((n) => n.id !== noteId),
                  updatedAt: Date.now(),
                };
              }
            }
            return task;
          });

          if (noteToUnlink) {
            // Remove taskId and add to standalone
            const { taskId: _, ...standaloneNote } = noteToUnlink;
            return {
              tasks: updatedTasks,
              standaloneNotes: [...state.standaloneNotes, standaloneNote],
            };
          }

          return state;
        });
      },

      moveNoteToFolder: (noteId: string, folderId: string | undefined, taskId?: string) => {
        set((state) => {
          if (taskId) {
            // Move note in task
            return {
              tasks: state.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    notes: task.notes.map((note) =>
                      note.id === noteId
                        ? { ...note, folderId, updatedAt: Date.now() }
                        : note
                    ),
                    updatedAt: Date.now(),
                  };
                }
                return task;
              }),
            };
          } else {
            // Move standalone note
            return {
              standaloneNotes: state.standaloneNotes.map((note) =>
                note.id === noteId
                  ? { ...note, folderId, updatedAt: Date.now() }
                  : note
              ),
            };
          }
        });
      },

      getNotesByFolder: (folderId: string | undefined, workspaceId: string) => {
        const allNotes = get().getNotesByWorkspace(workspaceId);
        return allNotes.filter((note) => {
          if (folderId === undefined) {
            // Root folder: notes without folderId
            return !note.folderId;
          }
          return note.folderId === folderId;
        });
      },

      getAllNotes: () => {
        const state = get();
        const taskNotes = state.tasks.flatMap((task) => task.notes);
        return [...state.standaloneNotes, ...taskNotes];
      },

      getNotesByWorkspace: (workspaceId: string) => {
        const state = get();
        const taskNotes = state.tasks
          .filter((task) => task.workspaceId === workspaceId)
          .flatMap((task) => task.notes);
        const standaloneNotes = state.standaloneNotes.filter((note) => note.workspaceId === workspaceId);
        return [...standaloneNotes, ...taskNotes];
      },

      getNote: (noteId: string) => {
        const state = get();
        // Check standalone notes first
        const standaloneNote = state.standaloneNotes.find((n) => n.id === noteId);
        if (standaloneNote) return standaloneNote;
        
        // Check task notes
        for (const task of state.tasks) {
          const note = task.notes.find((n) => n.id === noteId);
          if (note) return note;
        }
        
        return undefined;
      },

      deleteNotesByWorkspace: (workspaceId: string) => {
        set((state) => {
          // Delete standalone notes in this workspace
          const remainingStandaloneNotes = state.standaloneNotes.filter(
            (note) => note.workspaceId !== workspaceId
          );

          // Delete task notes in this workspace (they're stored in task.notes, so we need to remove them from tasks)
          const updatedTasks = state.tasks.map((task) => {
            if (task.workspaceId === workspaceId) {
              // Remove all notes from tasks in this workspace
              return {
                ...task,
                notes: [],
                updatedAt: Date.now(),
              };
            }
            // For tasks in other workspaces, remove notes that belong to the deleted workspace
            return {
              ...task,
              notes: task.notes.filter((note) => note.workspaceId !== workspaceId),
              updatedAt: Date.now(),
            };
          });

          return {
            tasks: updatedTasks,
            standaloneNotes: remainingStandaloneNotes,
          };
        });
      },

      addDependency: (taskId: string, dependencyId: string) => {
        const tasks = get().tasks;
        
        // Check for circular dependencies
        if (wouldCreateCycle(tasks, taskId, dependencyId)) {
          console.warn('Cannot add dependency: would create circular reference');
          return;
        }

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const dependencies = task.dependencies.includes(dependencyId)
                ? task.dependencies
                : [...task.dependencies, dependencyId];
              return {
                ...task,
                dependencies,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      removeDependency: (taskId: string, dependencyId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                dependencies: task.dependencies.filter((id) => id !== dependencyId),
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      addBlockedBy: (taskId: string, blockerId: string) => {
        const tasks = get().tasks;
        
        // Check for circular dependencies
        if (wouldCreateCycle(tasks, taskId, blockerId)) {
          console.warn('Cannot add blocker: would create circular reference');
          return;
        }

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const blockedBy = task.blockedBy.includes(blockerId)
                ? task.blockedBy
                : [...task.blockedBy, blockerId];
              return {
                ...task,
                blockedBy,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      removeBlockedBy: (taskId: string, blockerId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                blockedBy: task.blockedBy.filter((id) => id !== blockerId),
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      setRecurrence: (taskId: string, rule: RecurrenceRule | undefined) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                recurrence: rule,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      createRecurrenceInstance: (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task || !task.recurrence) {
          return null;
        }

        const lastOccurrence = task.completedAt || task.createdAt;
        const nextOccurrence = getNextOccurrence(task.recurrence, lastOccurrence, task.createdAt);
        
        if (!nextOccurrence) {
          return null; // Recurrence ended
        }

        // Create new task instance
        const instance: Task = {
          ...task,
          id: nanoid(),
          status: 'todo',
          progress: 0,
          completedAt: undefined,
          createdAt: nextOccurrence,
          updatedAt: nextOccurrence,
          // Reset completion-related fields
          subtasks: task.subtasks.map((st) => ({
            ...st,
            completed: false,
            completedAt: undefined,
          })),
        };

        set((state) => ({
          tasks: [...state.tasks, instance],
        }));

        return instance;
      },

      getRecurringTasks: () => {
        return get().tasks.filter((task) => task.recurrence !== undefined);
      },

      addChecklist: (taskId: string, title: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const maxOrder = task.checklists.length > 0
          ? Math.max(...task.checklists.map((c) => c.order))
          : -1;

        const checklist: Checklist = {
          id: nanoid(),
          taskId,
          title,
          items: [],
          order: maxOrder + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                checklists: [...task.checklists, checklist],
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        return checklist;
      },

      updateChecklist: (taskId: string, checklistId: string, updates: Partial<Checklist>) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const checklists = task.checklists.map((c) =>
                c.id === checklistId ? { ...c, ...updates, updatedAt: Date.now() } : c
              );
              return {
                ...task,
                checklists,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      deleteChecklist: (taskId: string, checklistId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                checklists: task.checklists.filter((c) => c.id !== checklistId),
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      addChecklistItem: (taskId: string, checklistId: string, text: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        const checklist = task.checklists.find((c) => c.id === checklistId);
        if (!checklist) {
          throw new Error(`Checklist ${checklistId} not found`);
        }

        const maxOrder = checklist.items.length > 0
          ? Math.max(...checklist.items.map((i: ChecklistItem) => i.order))
          : -1;

        const item: ChecklistItem = {
          id: nanoid(),
          checklistId,
          text,
          completed: false,
          order: maxOrder + 1,
          createdAt: Date.now(),
        };

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const checklists = task.checklists.map((c) => {
                if (c.id === checklistId) {
                  return {
                    ...c,
                    items: [...c.items, item],
                    updatedAt: Date.now(),
                  };
                }
                return c;
              });
              return {
                ...task,
                checklists,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));

        return item;
      },

      updateChecklistItem: (taskId: string, checklistId: string, itemId: string, updates: Partial<ChecklistItem>) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const checklists = task.checklists.map((c) => {
                if (c.id === checklistId) {
                  const items = c.items.map((i: ChecklistItem) =>
                    i.id === itemId ? { ...i, ...updates } : i
                  );
                  return {
                    ...c,
                    items,
                    updatedAt: Date.now(),
                  };
                }
                return c;
              });
              return {
                ...task,
                checklists,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      deleteChecklistItem: (taskId: string, checklistId: string, itemId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const checklists = task.checklists.map((c) => {
                if (c.id === checklistId) {
                  return {
                    ...c,
                    items: c.items.filter((i: ChecklistItem) => i.id !== itemId),
                    updatedAt: Date.now(),
                  };
                }
                return c;
              });
              return {
                ...task,
                checklists,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      toggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const checklists = task.checklists.map((c) => {
                if (c.id === checklistId) {
                  const items = c.items.map((i: ChecklistItem) => {
                    if (i.id === itemId) {
                      return {
                        ...i,
                        completed: !i.completed,
                        completedAt: !i.completed ? Date.now() : undefined,
                      };
                    }
                    return i;
                  });
                  return {
                    ...c,
                    items,
                    updatedAt: Date.now(),
                  };
                }
                return c;
              });
              return {
                ...task,
                checklists,
                updatedAt: Date.now(),
              };
            }
            return task;
          }),
        }));
      },

      calculateChecklistProgress: (taskId: string, checklistId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return 0;

        const checklist = task.checklists.find((c) => c.id === checklistId);
        if (!checklist || checklist.items.length === 0) return 0;

        const completedCount = checklist.items.filter((i: ChecklistItem) => i.completed).length;
        return Math.round((completedCount / checklist.items.length) * 100);
      },
    }),
    {
      name: 'task-storage',
      version: 1,
    }
  )
);

