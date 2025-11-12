import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ViewType, Filter, SortOption, SavedView } from '@/types/filter';

interface ViewState {
  currentView: ViewType;
  filters: Filter[];
  sortBy: SortOption;
  groupBy: 'status' | 'priority' | 'tag' | 'dueDate' | 'none';
  savedViews: SavedView[];
  searchQuery: string;

  // Actions
  setView: (view: ViewType) => void;
  addFilter: (filter: Filter) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  setSortBy: (sort: SortOption) => void;
  setGroupBy: (groupBy: 'status' | 'priority' | 'tag' | 'dueDate' | 'none') => void;
  setSearchQuery: (query: string) => void;
  saveView: (name: string, workspaceId?: string) => SavedView;
  deleteSavedView: (viewId: string) => void;
  loadSavedView: (viewId: string) => void;
}

const defaultSort: SortOption = {
  field: 'updated',
  order: 'desc',
};

export const useViewStore = create<ViewState>()(
  persist(
    (set, get) => ({
      currentView: 'list',
      filters: [],
      sortBy: defaultSort,
      groupBy: 'none',
      savedViews: [],
      searchQuery: '',

      setView: (view: ViewType) => {
        set({ currentView: view });
      },

      addFilter: (filter: Filter) => {
        set((state) => ({
          filters: [...state.filters.filter((f) => f.id !== filter.id), filter],
        }));
      },

      removeFilter: (filterId: string) => {
        set((state) => ({
          filters: state.filters.filter((f) => f.id !== filterId),
        }));
      },

      clearFilters: () => {
        set({ filters: [] });
      },

      setSortBy: (sort: SortOption) => {
        set({ sortBy: sort });
      },

      setGroupBy: (groupBy: 'status' | 'priority' | 'tag' | 'dueDate' | 'none') => {
        set({ groupBy });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      saveView: (name: string, workspaceId?: string) => {
        const state = get();
        const savedView: SavedView = {
          id: nanoid(),
          name,
          workspaceId,
          filters: state.filters,
          sortBy: state.sortBy,
          groupBy: state.groupBy,
          viewType: state.currentView,
          createdAt: Date.now(),
        };

        set((s) => ({
          savedViews: [...s.savedViews, savedView],
        }));

        return savedView;
      },

      deleteSavedView: (viewId: string) => {
        set((state) => ({
          savedViews: state.savedViews.filter((v) => v.id !== viewId),
        }));
      },

      loadSavedView: (viewId: string) => {
        const state = get();
        const view = state.savedViews.find((v) => v.id === viewId);
        if (view) {
          set({
            currentView: view.viewType,
            filters: view.filters,
            sortBy: view.sortBy,
            groupBy: view.groupBy || 'none',
          });
        }
      },
    }),
    {
      name: 'view-storage',
      version: 1,
    }
  )
);

