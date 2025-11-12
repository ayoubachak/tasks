import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

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
  getAllImageIds: () => string[];
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
    }
  )
);

