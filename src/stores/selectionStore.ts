import { create } from 'zustand';
import type { Task } from '@/types';

interface SelectionState {
  selectedTaskIds: Set<string>;
  isSelectionMode: boolean;
  
  // Actions
  toggleSelection: (taskId: string) => void;
  selectTask: (taskId: string) => void;
  deselectTask: (taskId: string) => void;
  selectAll: (taskIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (taskId: string) => boolean;
  getSelectedCount: () => number;
  setSelectionMode: (enabled: boolean) => void;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedTaskIds: new Set(),
  isSelectionMode: false,

  toggleSelection: (taskId: string) => {
    set((state) => {
      const newSet = new Set(state.selectedTaskIds);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return { selectedTaskIds: newSet };
    });
  },

  selectTask: (taskId: string) => {
    set((state) => {
      const newSet = new Set(state.selectedTaskIds);
      newSet.add(taskId);
      return { selectedTaskIds: newSet };
    });
  },

  deselectTask: (taskId: string) => {
    set((state) => {
      const newSet = new Set(state.selectedTaskIds);
      newSet.delete(taskId);
      return { selectedTaskIds: newSet };
    });
  },

  selectAll: (taskIds: string[]) => {
    set({ selectedTaskIds: new Set(taskIds) });
  },

  clearSelection: () => {
    set({ selectedTaskIds: new Set() });
  },

  isSelected: (taskId: string) => {
    return get().selectedTaskIds.has(taskId);
  },

  getSelectedCount: () => {
    return get().selectedTaskIds.size;
  },

  setSelectionMode: (enabled: boolean) => {
    set({ isSelectionMode: enabled });
    if (!enabled) {
      get().clearSelection();
    }
  },
}));

