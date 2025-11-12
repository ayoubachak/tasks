import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Note } from '@/types';

interface NoteVersion {
  noteId: string;
  version: number;
  content: string;
  updatedAt: number;
  isCurrent: boolean;
}

interface NoteHistoryState {
  // Map of noteId -> array of versions
  histories: Record<string, NoteVersion[]>;
  
  // Actions
  saveVersion: (note: Note) => void;
  getHistory: (noteId: string) => NoteVersion[];
  clearHistory: (noteId: string) => void;
}

export const useNoteHistoryStore = create<NoteHistoryState>()(
  persist(
    (set, get) => ({
      histories: {},

      saveVersion: (note: Note) => {
        set((state) => {
          const existingHistory = state.histories[note.id] || [];
          
          // Check if this version already exists
          const versionExists = existingHistory.some((v) => v.version === note.version);
          if (versionExists) {
            return state; // Don't duplicate
          }

          // Mark all previous versions as not current
          const updatedHistory = existingHistory.map((v) => ({
            ...v,
            isCurrent: false,
          }));

          // Add new version
          const newVersion: NoteVersion = {
            noteId: note.id,
            version: note.version,
            content: note.content,
            updatedAt: note.updatedAt,
            isCurrent: true,
          };

          return {
            histories: {
              ...state.histories,
              [note.id]: [...updatedHistory, newVersion].sort((a, b) => b.version - a.version), // Sort by version desc
            },
          };
        });
      },

      getHistory: (noteId: string) => {
        return get().histories[noteId] || [];
      },

      clearHistory: (noteId: string) => {
        set((state) => {
          const { [noteId]: _, ...rest } = state.histories;
          return { histories: rest };
        });
      },
    }),
    {
      name: 'note-history-storage',
      version: 1,
    }
  )
);

