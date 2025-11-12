import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { TaskTemplate, NoteTemplate } from '@/types/template';
import type { Task, Note } from '@/types';

interface TemplateState {
  taskTemplates: TaskTemplate[];
  noteTemplates: NoteTemplate[];
  
  // Task Template Actions
  createTaskTemplate: (
    name: string,
    description: string,
    taskStructure: Partial<Task>,
    workspaceId?: string
  ) => TaskTemplate;
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTaskTemplate: (id: string) => void;
  getTaskTemplate: (id: string) => TaskTemplate | undefined;
  getTaskTemplatesByWorkspace: (workspaceId?: string) => TaskTemplate[];
  createTaskFromTemplate: (templateId: string, workspaceId: string) => Task | null;
  
  // Note Template Actions
  createNoteTemplate: (
    name: string,
    description: string,
    content: string,
    workspaceId?: string
  ) => NoteTemplate;
  updateNoteTemplate: (id: string, updates: Partial<NoteTemplate>) => void;
  deleteNoteTemplate: (id: string) => void;
  getNoteTemplate: (id: string) => NoteTemplate | undefined;
  getNoteTemplatesByWorkspace: (workspaceId?: string) => NoteTemplate[];
  createNoteFromTemplate: (templateId: string, taskId: string) => Note | null;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      taskTemplates: [],
      noteTemplates: [],

      createTaskTemplate: (name, description, taskStructure, workspaceId) => {
        const now = Date.now();
        const template: TaskTemplate = {
          id: nanoid(),
          name,
          description,
          workspaceId,
          taskStructure,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };

        set((state) => ({
          taskTemplates: [...state.taskTemplates, template],
        }));

        return template;
      },

      updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => {
        set((state) => ({
          taskTemplates: state.taskTemplates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: Date.now() }
              : template
          ),
        }));
      },

      deleteTaskTemplate: (id: string) => {
        set((state) => ({
          taskTemplates: state.taskTemplates.filter((t) => t.id !== id),
        }));
      },

      getTaskTemplate: (id: string) => {
        return get().taskTemplates.find((t) => t.id === id);
      },

      getTaskTemplatesByWorkspace: (workspaceId?: string) => {
        const templates = get().taskTemplates;
        if (!workspaceId) {
          return templates.filter((t) => !t.workspaceId);
        }
        return templates.filter(
          (t) => !t.workspaceId || t.workspaceId === workspaceId
        );
      },

      createTaskFromTemplate: (templateId: string, workspaceId: string) => {
        const template = get().getTaskTemplate(templateId);
        if (!template) return null;

        // Increment usage count
        get().updateTaskTemplate(templateId, {
          usageCount: template.usageCount + 1,
        });

        // Return the task structure (will be used by taskStore to create the task)
        return template.taskStructure as Task;
      },

      createNoteTemplate: (name, description, content, workspaceId) => {
        const now = Date.now();
        const template: NoteTemplate = {
          id: nanoid(),
          name,
          description,
          workspaceId,
          content,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };

        set((state) => ({
          noteTemplates: [...state.noteTemplates, template],
        }));

        return template;
      },

      updateNoteTemplate: (id: string, updates: Partial<NoteTemplate>) => {
        set((state) => ({
          noteTemplates: state.noteTemplates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: Date.now() }
              : template
          ),
        }));
      },

      deleteNoteTemplate: (id: string) => {
        set((state) => ({
          noteTemplates: state.noteTemplates.filter((t) => t.id !== id),
        }));
      },

      getNoteTemplate: (id: string) => {
        return get().noteTemplates.find((t) => t.id === id);
      },

      getNoteTemplatesByWorkspace: (workspaceId?: string) => {
        const templates = get().noteTemplates;
        if (!workspaceId) {
          return templates.filter((t) => !t.workspaceId);
        }
        return templates.filter(
          (t) => !t.workspaceId || t.workspaceId === workspaceId
        );
      },

      createNoteFromTemplate: (templateId: string, taskId: string) => {
        const template = get().getNoteTemplate(templateId);
        if (!template) return null;

        // Increment usage count
        get().updateNoteTemplate(templateId, {
          usageCount: template.usageCount + 1,
        });

        // Return note structure
        return {
          id: nanoid(),
          taskId,
          content: template.content,
          version: 1,
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pinned: false,
          tags: [],
        } as Note;
      },
    }),
    {
      name: 'template-storage',
      version: 1,
    }
  )
);

