import { create } from 'zustand';

export type ViewType = 'list' | 'description-editor' | 'note-editor';

interface EditorState {
  taskId?: string;
  noteId?: string;
  workspaceId?: string;
}

interface UIState {
  currentView: ViewType;
  editorState: EditorState | null;
  
  // Navigation
  navigateToView: (view: ViewType, state?: EditorState) => void;
  navigateBack: () => void;
  openDescriptionEditor: (taskId: string, workspaceId: string) => void;
  openNoteEditor: (taskId: string, noteId: string, workspaceId: string) => void;
}

const viewHistory: Array<{ view: ViewType; state: EditorState | null }> = [];

export const useUIStore = create<UIState>((set) => ({
  currentView: 'list',
  editorState: null,

  navigateToView: (view: ViewType, state?: EditorState) => {
    set((current) => {
      // Save current state to history
      viewHistory.push({
        view: current.currentView,
        state: current.editorState,
      });
      
      return {
        currentView: view,
        editorState: state || null,
      };
    });
  },

  navigateBack: () => {
    const previous = viewHistory.pop();
    if (previous) {
      set({
        currentView: previous.view,
        editorState: previous.state,
      });
    } else {
      set({
        currentView: 'list',
        editorState: null,
      });
    }
  },

  openDescriptionEditor: (taskId: string, workspaceId: string) => {
    set({
      currentView: 'description-editor',
      editorState: { taskId, workspaceId },
    });
  },

  openNoteEditor: (taskId: string, noteId: string | null, workspaceId: string) => {
    set({
      currentView: 'note-editor',
      editorState: { taskId, noteId: noteId || undefined, workspaceId },
    });
  },
}));

