import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Workspace, WorkspaceSettings } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  
  // Actions
  createWorkspace: (name: string, color?: string) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  getActiveWorkspace: () => Workspace | null;
  getWorkspace: (id: string) => Workspace | undefined;
}

const defaultSettings: WorkspaceSettings = {
  defaultView: 'list',
  defaultPriority: 'none',
  showCompletedTasks: true,
  sortBy: 'created',
  sortOrder: 'desc',
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,

      createWorkspace: (name: string, color = '#3b82f6') => {
        const now = Date.now();
        const workspace: Workspace = {
          id: nanoid(),
          name,
          color,
          createdAt: now,
          updatedAt: now,
          settings: { ...defaultSettings },
          archived: false,
        };

        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: workspace.id,
        }));

        return workspace;
      },

      updateWorkspace: (id: string, updates: Partial<Workspace>) => {
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === id
              ? { ...ws, ...updates, updatedAt: Date.now() }
              : ws
          ),
        }));
      },

      deleteWorkspace: (id: string) => {
        set((state) => ({
          workspaces: state.workspaces.filter((ws) => ws.id !== id),
          activeWorkspaceId:
            state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
        }));
      },

      setActiveWorkspace: (id: string | null) => {
        set({ activeWorkspaceId: id });
      },

      getActiveWorkspace: () => {
        const state = get();
        if (!state.activeWorkspaceId) return null;
        return state.workspaces.find((ws) => ws.id === state.activeWorkspaceId) || null;
      },

      getWorkspace: (id: string) => {
        return get().workspaces.find((ws) => ws.id === id);
      },
    }),
    {
      name: 'workspace-storage',
      version: 1,
    }
  )
);

