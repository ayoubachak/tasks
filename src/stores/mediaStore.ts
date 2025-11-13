import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useTaskStore } from './taskStore';

export type MediaType = 'image' | 'audio' | 'video' | 'photo';

export interface StoredMedia {
  id: string;
  type: MediaType;
  data: string; // base64 data URI
  mimeType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: number;
  lastUsedAt: number;
  metadata?: Record<string, unknown>;
}

interface MediaStoreState {
  media: Record<string, StoredMedia>;
  storeMedia: (
    input: Omit<StoredMedia, 'id' | 'createdAt' | 'lastUsedAt'> & {
      id?: string;
      createdAt?: number;
      lastUsedAt?: number;
    }
  ) => string;
  getMedia: (id: string) => StoredMedia | undefined;
  getMediaData: (id: string) => string | undefined;
  deleteMedia: (id: string) => void;
  updateMedia: (id: string, updates: Partial<StoredMedia>) => void;
  updateLastUsed: (id: string) => void;
  getAllMediaIds: () => string[];
  getAllMedia: () => StoredMedia[];
  getMediaByType: (type: MediaType) => StoredMedia[];
  cleanupUnusedMedia: (usedIds: Set<string>, daysToKeep?: number) => void;
  aggressiveCleanup: (usedIds: Set<string>, daysToKeep?: number) => void;
  getStorageSize: () => { used: number; available: number; percentage: number };
}

const MEDIA_REF_PREFIX = 'media:';

export const useMediaStore = create<MediaStoreState>()(
  persist(
    (set, get) => ({
      media: {},

      storeMedia: (input) => {
        const id = input.id ?? nanoid(12);
        const now = Date.now();

        const mediaItem: StoredMedia = {
          ...input,
          id,
          createdAt: input.createdAt ?? now,
          lastUsedAt: input.lastUsedAt ?? now,
        };

        // Proactive cleanup when approaching storage limit (~5MB)
        const currentState = get();
        const currentSize = JSON.stringify(currentState.media).length;
        const newItemSize = JSON.stringify(mediaItem).length;
        const estimatedTotal = currentSize + newItemSize;

        if (estimatedTotal > 4 * 1024 * 1024) {
          console.warn('Media storage approaching limit, attempting cleanup...');

          const usedIds = collectUsedMediaIds();
          get().aggressiveCleanup(usedIds, 7);
        }

        set((state) => ({
          media: {
            ...state.media,
            [id]: mediaItem,
          },
        }));

        return id;
      },

      getMedia: (id) => get().media[id],

      getMediaData: (id) => get().media[id]?.data,

      deleteMedia: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.media;
          return { media: rest };
        });
      },

      updateMedia: (id, updates) => {
        set((state) => {
          const item = state.media[id];
          if (!item) return state;
          return {
            media: {
              ...state.media,
              [id]: { ...item, ...updates },
            },
          };
        });
      },

      updateLastUsed: (id) => {
        set((state) => {
          const item = state.media[id];
          if (!item) return state;
          return {
            media: {
              ...state.media,
              [id]: {
                ...item,
                lastUsedAt: Date.now(),
              },
            },
          };
        });
      },

      getAllMediaIds: () => Object.keys(get().media),

      getAllMedia: () => Object.values(get().media),

      getMediaByType: (type) =>
        Object.values(get().media).filter((item) => item.type === type),

      cleanupUnusedMedia: (usedIds, daysToKeep = 30) => {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
        set((state) => {
          const media = { ...state.media };
          let cleaned = false;

          Object.values(media).forEach((item) => {
            if (!usedIds.has(item.id) && item.lastUsedAt < cutoff) {
              delete media[item.id];
              cleaned = true;
            }
          });

          return cleaned ? { media } : state;
        });
      },

      aggressiveCleanup: (usedIds, daysToKeep = 7) => {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
        set((state) => {
          const media = { ...state.media };
          let cleaned = false;

          Object.values(media)
            .sort((a, b) => a.lastUsedAt - b.lastUsedAt)
            .forEach((item, index, array) => {
              if (
                !usedIds.has(item.id) &&
                (item.lastUsedAt < cutoff || index < Math.ceil(array.length * 0.2))
              ) {
                delete media[item.id];
                cleaned = true;
              }
            });

          return cleaned ? { media } : state;
        });
      },

      getStorageSize: () => {
        const serialized = JSON.stringify(get().media);
        const used = serialized.length;
        const available = 5 * 1024 * 1024; // approx 5MB per origin
        return {
          used,
          available,
          percentage: Math.min(100, (used / available) * 100),
        };
      },
    }),
    {
      name: 'media-storage',
      version: 2,
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            return window.localStorage.getItem(name);
          } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            window.localStorage.setItem(name, value);
          } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              console.warn('Media storage quota exceeded, attempting aggressive cleanup...');
              const usedIds = collectUsedMediaIds();
              useMediaStore.getState().aggressiveCleanup(usedIds, 7);

              const cleaned = JSON.stringify(useMediaStore.getState().media);
              window.localStorage.setItem(name, JSON.stringify({ state: { media: JSON.parse(cleaned) }, version: 1 }));
            } else {
              throw error;
            }
          }
        },
        removeItem: (name: string) => {
          try {
            window.localStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing localStorage item:', error);
          }
        },
      })),
    }
  )
);

function collectUsedMediaIds(): Set<string> {
  const usedIds = new Set<string>();
  const taskStore = useTaskStore.getState();
  const mediaRefRegex = /media:([a-zA-Z0-9_-]+)/g;

  const scanContent = (content?: string) => {
    if (!content) return;
    let match;
    while ((match = mediaRefRegex.exec(content)) !== null) {
      usedIds.add(match[1]);
    }
  };

  taskStore.tasks.forEach((task) => {
    scanContent(task.description);
    task.notes?.forEach((note) => scanContent(note.content));
  });

  taskStore.standaloneNotes?.forEach((note) => scanContent(note.content));

  return usedIds;
}

export function createMediaReference(id: string): string {
  return `${MEDIA_REF_PREFIX}${id}`;
}

export function isMediaReference(ref: string): boolean {
  return ref.startsWith(MEDIA_REF_PREFIX);
}

export function extractMediaId(ref: string): string | null {
  if (!isMediaReference(ref)) return null;
  return ref.replace(MEDIA_REF_PREFIX, '');
}
