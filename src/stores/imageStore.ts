import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useTaskStore } from './taskStore';

export interface StoredImage {
  id: string;
  data: string; // base64 data URI
  mimeType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
  lastUsedAt: number;
}

interface ImageStoreState {
  images: Record<string, StoredImage>; // id -> image
  
  // Actions
  storeImage: (data: string, mimeType: string, filename: string, size: number, width?: number, height?: number) => string;
  getImage: (id: string) => StoredImage | undefined;
  getImageData: (id: string) => string | undefined;
  deleteImage: (id: string) => void;
  updateLastUsed: (id: string) => void;
  cleanupUnusedImages: (usedImageIds: Set<string>) => void;
  aggressiveCleanup: (usedImageIds: Set<string>, daysToKeep?: number) => void;
  getAllImageIds: () => string[];
  getStorageSize: () => { used: number; available: number; percentage: number };
}

const IMAGE_REF_PREFIX = 'image:';

export function createImageReference(id: string): string {
  return `${IMAGE_REF_PREFIX}${id}`;
}

export function isImageReference(ref: string): boolean {
  return ref.startsWith(IMAGE_REF_PREFIX);
}

export function extractImageId(ref: string): string | null {
  if (!isImageReference(ref)) return null;
  return ref.replace(IMAGE_REF_PREFIX, '');
}

export const useImageStore = create<ImageStoreState>()(
  persist(
    (set, get) => ({
      images: {},

      storeImage: (data: string, mimeType: string, filename: string, size: number, width?: number, height?: number) => {
        const id = nanoid(12); // Short ID (12 chars)
        const now = Date.now();
        
        const image: StoredImage = {
          id,
          data,
          mimeType,
          filename,
          size,
          width,
          height,
          createdAt: now,
          lastUsedAt: now,
        };

        // Proactive cleanup: Check storage size and clean up if needed before storing
        const currentState = get();
        const currentSize = JSON.stringify(currentState.images).length;
        const newImageSize = JSON.stringify(image).length;
        const estimatedTotalSize = currentSize + newImageSize;
        
        // If we're approaching the limit (estimated 5MB), do proactive cleanup
        if (estimatedTotalSize > 4 * 1024 * 1024) { // 4MB threshold
          console.warn('Storage approaching limit, performing proactive cleanup...');
          
          // Get all currently used image IDs from notes and tasks
          const taskStore = useTaskStore.getState();
          const allNotes = taskStore.getAllNotes();
          const allTasks = taskStore.tasks;
          
          // Collect all image references from notes and tasks
          const usedImageIds = new Set<string>();
          const imageRefRegex = /image:([a-zA-Z0-9_-]+)/g;
          
          // Check all notes
          allNotes.forEach((note) => {
            if (note.content) {
              let match;
              while ((match = imageRefRegex.exec(note.content)) !== null) {
                usedImageIds.add(match[1]);
              }
            }
          });
          
          // Check all task descriptions
          allTasks.forEach((task) => {
            if (task.description) {
              let match;
              while ((match = imageRefRegex.exec(task.description)) !== null) {
                usedImageIds.add(match[1]);
              }
            }
          });
          
          // Aggressive cleanup: remove images unused for 7+ days (instead of 30)
          const images = { ...currentState.images };
          let cleaned = false;
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          
          Object.keys(images).forEach((imgId) => {
            const img = images[imgId];
            const isUsed = usedImageIds.has(imgId);
            const isRecent = img.lastUsedAt > sevenDaysAgo;
            
            // Delete if not used AND not recently accessed
            if (!isUsed && !isRecent) {
              delete images[imgId];
              cleaned = true;
            }
          });
          
          // If still not enough space, delete oldest unused images
          if (cleaned) {
            set({ images });
          } else {
            // More aggressive: delete oldest 30% of unused images
            const sortedImages = Object.entries(images)
              .filter(([imgId]) => !usedImageIds.has(imgId))
              .sort(([, a], [, b]) => a.lastUsedAt - b.lastUsedAt);
            
            const toDelete = Math.ceil(sortedImages.length * 0.3);
            for (let i = 0; i < toDelete && i < sortedImages.length; i++) {
              delete images[sortedImages[i][0]];
              cleaned = true;
            }
            
            if (cleaned) {
              set({ images });
            }
          }
        }

        // Try to store the image
        // Note: Zustand persist errors happen asynchronously, so we can't catch them here
        // But we've done proactive cleanup, so it should work
        set((state) => ({
          images: {
            ...state.images,
            [id]: image,
          },
        }));

        return id;
      },

      getImage: (id: string) => {
        return get().images[id];
      },

      getImageData: (id: string) => {
        const image = get().images[id];
        return image?.data;
      },

      deleteImage: (id: string) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.images;
          return { images: rest };
        });
      },

      updateLastUsed: (id: string) => {
        set((state) => {
          const image = state.images[id];
          if (image) {
            return {
              images: {
                ...state.images,
                [id]: {
                  ...image,
                  lastUsedAt: Date.now(),
                },
              },
            };
          }
          return state;
        });
      },

      cleanupUnusedImages: (usedImageIds: Set<string>) => {
        set((state) => {
          const images = { ...state.images };
          let cleaned = false;

          Object.keys(images).forEach((id) => {
            if (!usedImageIds.has(id)) {
              // Image not used anywhere, can be deleted
              // But maybe keep recently used ones (within 30 days)?
              const image = images[id];
              const daysSinceLastUse = (Date.now() - image.lastUsedAt) / (1000 * 60 * 60 * 24);
              
              if (daysSinceLastUse > 30) {
                delete images[id];
                cleaned = true;
              }
            }
          });

          return cleaned ? { images } : state;
        });
      },

      getAllImageIds: () => {
        return Object.keys(get().images);
      },
    }),
    {
      name: 'image-storage',
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
                console.warn('Storage quota exceeded, attempting cleanup...');
                
                // Get all currently used image IDs from notes and tasks
                const taskStore = useTaskStore.getState();
                const allNotes = taskStore.getAllNotes();
                const allTasks = taskStore.tasks;
                
                // Collect all image references
                const usedImageIds = new Set<string>();
                const imageRefRegex = /image:([a-zA-Z0-9_-]+)/g;
                
                allNotes.forEach((note) => {
                  if (note.content) {
                    let match;
                    while ((match = imageRefRegex.exec(note.content)) !== null) {
                      usedImageIds.add(match[1]);
                    }
                  }
                });
                
                allTasks.forEach((task) => {
                  if (task.description) {
                    let match;
                    while ((match = imageRefRegex.exec(task.description)) !== null) {
                      usedImageIds.add(match[1]);
                    }
                  }
                });
                
                // Try to parse current data and clean it
                try {
                  const currentData = localStorage.getItem(name);
                  if (currentData) {
                    const parsed = JSON.parse(currentData);
                    const state = parsed.state || parsed;
                    const images = state.images || {};
                    
                    // Delete oldest 50% of unused images
                    const sortedImages = Object.entries(images)
                      .filter(([imgId]) => !usedImageIds.has(imgId))
                      .sort(([, a]: any, [, b]: any) => a.lastUsedAt - b.lastUsedAt);
                    
                    const toDelete = Math.ceil(sortedImages.length * 0.5);
                    for (let i = 0; i < toDelete && i < sortedImages.length; i++) {
                      delete images[sortedImages[i][0]];
                    }
                    
                    // Try to save cleaned version
                    const cleanedData = JSON.stringify({ ...parsed, state: { ...state, images } });
                    localStorage.setItem(name, cleanedData);
                    
                    // Now try to save the original value again
                    localStorage.setItem(name, value);
                    return;
                  }
                } catch (cleanupError) {
                  console.error('Cleanup failed:', cleanupError);
                }
                
                // If cleanup didn't work, throw user-friendly error
                throw new Error('Storage is full. Please delete some old images or clear your browser storage.');
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

