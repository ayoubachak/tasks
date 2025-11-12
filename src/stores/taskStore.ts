import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Task, TaskStatus, Priority, Subtask } from '@/types';

interface TaskState {
  tasks: Task[];
  
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
  addSubtask: (taskId: string, title: string) => Subtask;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  calculateTaskProgress: (taskId: string) => number;
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
    createdAt: now,
    updatedAt: now,
    customFields: {},
  };
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

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
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
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

      addSubtask: (taskId: string, title: string) => {
        const subtask: Subtask = {
          id: nanoid(),
          taskId,
          title,
          completed: false,
          order: 0,
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
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = task.subtasks.filter((st) => st.id !== subtaskId);
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
        if (!task || task.subtasks.length === 0) {
          return task?.status === 'done' ? 100 : 0;
        }

        const completedCount = task.subtasks.filter((st) => st.completed).length;
        return Math.round((completedCount / task.subtasks.length) * 100);
      },
    }),
    {
      name: 'task-storage',
      version: 1,
    }
  )
);

