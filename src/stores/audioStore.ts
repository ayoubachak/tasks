import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useTaskStore } from './taskStore';

export interface StoredAudio {
  id: string;
  data: string; // base64 data URI
  mimeType: string; // e.g., 'audio/webm', 'audio/mp4', 'audio/ogg'
  filename: string;
  size: number; // bytes
  duration?: number; // seconds (optional, can be calculated)
  createdAt: number;
  lastUsedAt: number;
}

interface AudioStoreState {
  audios: Record<string, StoredAudio>; // id -> audio
  
  // Actions
  storeAudio: (data: string, mimeType: string, filename: string, size: number, duration?: number) => string;
  getAudio: (id: string) => StoredAudio | undefined;
  getAudioData: (id: string) => string | undefined;
  deleteAudio: (id: string) => void;
  updateLastUsed: (id: string) => void;
  cleanupUnusedAudios: (usedAudioIds: Set<string>) => void;
  aggressiveCleanup: (usedAudioIds: Set<string>, daysToKeep?: number) => void;
  getAllAudioIds: () => string[];
  getStorageSize: () => { used: number; available: number; percentage: number };
}

const AUDIO_REF_PREFIX = 'audio:';

export function createAudioReference(id: string): string {
  return `${AUDIO_REF_PREFIX}${id}`;
}

export function isAudioReference(ref: string): boolean {
  return ref.startsWith(AUDIO_REF_PREFIX);
}

export function extractAudioId(ref: string): string | null {
  if (!isAudioReference(ref)) return null;
  return ref.replace(AUDIO_REF_PREFIX, '');
}

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => ({
      audios: {},

      storeAudio: (data: string, mimeType: string, filename: string, size: number, duration?: number) => {
        const id = nanoid(12); // Short ID (12 chars)
        const now = Date.now();
        
        const audio: StoredAudio = {
          id,
          data,
          mimeType,
          filename,
          size,
          duration,
          createdAt: now,
          lastUsedAt: now,
        };

        // Proactive cleanup: Check storage size and clean up if needed before storing
        const currentState = get();
        const currentSize = JSON.stringify(currentState.audios).length;
        const newAudioSize = JSON.stringify(audio).length;
        const estimatedTotalSize = currentSize + newAudioSize;
        
        // If we're approaching the limit (estimated 5MB), do proactive cleanup
        if (estimatedTotalSize > 4 * 1024 * 1024) { // 4MB threshold
          console.warn('Audio storage approaching limit, performing proactive cleanup...');
          
          // Get all currently used audio IDs from notes and tasks
          const taskStore = useTaskStore.getState();
          const allNotes = taskStore.getAllNotes();
          const allTasks = taskStore.tasks;
          
          // Collect all audio references from notes and tasks
          const usedAudioIds = new Set<string>();
          const audioRefRegex = /audio:([a-zA-Z0-9_-]+)/g;
          
          // Check all notes
          allNotes.forEach((note) => {
            if (note.content) {
              let match;
              while ((match = audioRefRegex.exec(note.content)) !== null) {
                usedAudioIds.add(match[1]);
              }
            }
          });
          
          // Check all task descriptions
          allTasks.forEach((task) => {
            if (task.description) {
              let match;
              while ((match = audioRefRegex.exec(task.description)) !== null) {
                usedAudioIds.add(match[1]);
              }
            }
          });
          
          // Aggressive cleanup: remove audios unused for 7+ days
          const audios = { ...currentState.audios };
          let cleaned = false;
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          
          Object.keys(audios).forEach((audioId) => {
            const audio = audios[audioId];
            const isUsed = usedAudioIds.has(audioId);
            const isRecent = audio.lastUsedAt > sevenDaysAgo;
            
            // Delete if not used AND not recently accessed
            if (!isUsed && !isRecent) {
              delete audios[audioId];
              cleaned = true;
            }
          });
          
          // If still not enough space, delete oldest unused audios
          if (cleaned) {
            set({ audios });
          } else {
            // More aggressive: delete oldest 30% of unused audios
            const sortedAudios = Object.entries(audios)
              .filter(([audioId]) => !usedAudioIds.has(audioId))
              .sort(([, a], [, b]) => a.lastUsedAt - b.lastUsedAt);
            
            const toDelete = Math.ceil(sortedAudios.length * 0.3);
            for (let i = 0; i < toDelete && i < sortedAudios.length; i++) {
              delete audios[sortedAudios[i][0]];
              cleaned = true;
            }
            
            if (cleaned) {
              set({ audios });
            }
          }
        }

        // Try to store the audio
        set((state) => ({
          audios: {
            ...state.audios,
            [id]: audio,
          },
        }));

        return id;
      },

      getAudio: (id: string) => {
        return get().audios[id];
      },

      getAudioData: (id: string) => {
        const audio = get().audios[id];
        return audio?.data;
      },

      deleteAudio: (id: string) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.audios;
          return { audios: rest };
        });
      },

      updateLastUsed: (id: string) => {
        set((state) => {
          const audio = state.audios[id];
          if (audio) {
            return {
              audios: {
                ...state.audios,
                [id]: {
                  ...audio,
                  lastUsedAt: Date.now(),
                },
              },
            };
          }
          return state;
        });
      },

      cleanupUnusedAudios: (usedAudioIds: Set<string>) => {
        set((state) => {
          const audios = { ...state.audios };
          let cleaned = false;

          Object.keys(audios).forEach((id) => {
            if (!usedAudioIds.has(id)) {
              // Audio not used anywhere, can be deleted
              // But maybe keep recently used ones (within 30 days)?
              const audio = audios[id];
              const daysSinceLastUse = (Date.now() - audio.lastUsedAt) / (1000 * 60 * 60 * 24);
              
              if (daysSinceLastUse > 30) {
                delete audios[id];
                cleaned = true;
              }
            }
          });

          return cleaned ? { audios } : state;
        });
      },

      aggressiveCleanup: (usedAudioIds: Set<string>, daysToKeep: number = 7) => {
        set((state) => {
          const audios = { ...state.audios };
          let cleaned = false;
          const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

          Object.keys(audios).forEach((id) => {
            const audio = audios[id];
            const isUsed = usedAudioIds.has(id);
            const isRecent = audio.lastUsedAt > cutoffTime;
            
            if (!isUsed && !isRecent) {
              delete audios[id];
              cleaned = true;
            }
          });

          return cleaned ? { audios } : state;
        });
      },

      getAllAudioIds: () => {
        return Object.keys(get().audios);
      },

      getStorageSize: () => {
        const audios = get().audios;
        const used = JSON.stringify(audios).length;
        // Estimate available (5MB typical localStorage limit, but varies)
        const available = 5 * 1024 * 1024; // 5MB
        const percentage = (used / available) * 100;
        
        return { used, available, percentage };
      },
    }),
    {
      name: 'audio-storage',
      version: 1,
      storage: createJSONStorage(() => {
        // Custom storage with error handling for quota exceeded
        return {
          getItem: (name: string): string | null => {
            try {
              return localStorage.getItem(name);
            } catch (error) {
              console.error('Error reading from localStorage:', error);
              return null;
            }
          },
          setItem: (name: string, value: string): void => {
            try {
              localStorage.setItem(name, value);
            } catch (error) {
              if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.warn('Audio storage quota exceeded, attempting cleanup...');
                
                // Get all currently used audio IDs from notes and tasks
                const taskStore = useTaskStore.getState();
                const allNotes = taskStore.getAllNotes();
                const allTasks = taskStore.tasks;
                
                // Collect all audio references
                const usedAudioIds = new Set<string>();
                const audioRefRegex = /audio:([a-zA-Z0-9_-]+)/g;
                
                allNotes.forEach((note) => {
                  if (note.content) {
                    let match;
                    while ((match = audioRefRegex.exec(note.content)) !== null) {
                      usedAudioIds.add(match[1]);
                    }
                  }
                });
                
                allTasks.forEach((task) => {
                  if (task.description) {
                    let match;
                    while ((match = audioRefRegex.exec(task.description)) !== null) {
                      usedAudioIds.add(match[1]);
                    }
                  }
                });
                
                // Try to parse current data and clean it
                try {
                  const currentData = localStorage.getItem(name);
                  if (currentData) {
                    const parsed = JSON.parse(currentData);
                    const state = parsed.state || parsed;
                    const audios = state.audios || {};
                    
                    // Delete oldest 50% of unused audios
                    const sortedAudios = Object.entries(audios)
                      .filter(([audioId]) => !usedAudioIds.has(audioId))
                      .sort(([, a]: any, [, b]: any) => a.lastUsedAt - b.lastUsedAt);
                    
                    const toDelete = Math.ceil(sortedAudios.length * 0.5);
                    for (let i = 0; i < toDelete && i < sortedAudios.length; i++) {
                      delete audios[sortedAudios[i][0]];
                    }
                    
                    // Try to save cleaned version
                    const cleanedData = JSON.stringify({ ...parsed, state: { ...state, audios } });
                    localStorage.setItem(name, cleanedData);
                    
                    // Now try to save the original value again
                    localStorage.setItem(name, value);
                    return;
                  }
                } catch (cleanupError) {
                  console.error('Cleanup failed:', cleanupError);
                }
                
                // If cleanup didn't work, throw user-friendly error
                throw new Error('Storage is full. Please delete some old audio recordings or clear your browser storage.');
              }
              throw error;
            }
          },
          removeItem: (name: string): void => {
            try {
              localStorage.removeItem(name);
            } catch (error) {
              console.error('Error removing from localStorage:', error);
            }
          },
        };
      }),
    }
  )
);

