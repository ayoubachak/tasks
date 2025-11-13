import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { NoteFolder } from '@/types';

interface NoteFolderState {
  folders: NoteFolder[];
  
  // Actions
  createFolder: (workspaceId: string, name: string, parentFolderId?: string, color?: string, icon?: string) => NoteFolder;
  updateFolder: (folderId: string, updates: Partial<NoteFolder>) => void;
  deleteFolder: (folderId: string) => void;
  getFoldersByWorkspace: (workspaceId: string) => NoteFolder[];
  getFolder: (folderId: string) => NoteFolder | undefined;
  getFolderTree: (workspaceId: string) => NoteFolder[]; // Returns folders in tree structure
  moveFolder: (folderId: string, newParentFolderId: string | undefined) => void;
}

export const useNoteFolderStore = create<NoteFolderState>()(
  persist(
    (set, get) => ({
      folders: [],

      createFolder: (workspaceId: string, name: string, parentFolderId?: string, color?: string, icon?: string) => {
        const now = Date.now();
        const folders = get().folders;
        
        // Get max order for siblings (folders with same parent)
        const siblings = folders.filter(
          (f) => f.workspaceId === workspaceId && f.parentFolderId === parentFolderId
        );
        const maxOrder = siblings.length > 0 
          ? Math.max(...siblings.map((f) => f.order))
          : -1;

        const folder: NoteFolder = {
          id: nanoid(),
          workspaceId,
          parentFolderId,
          name,
          color,
          icon,
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          folders: [...state.folders, folder],
        }));

        return folder;
      },

      updateFolder: (folderId: string, updates: Partial<NoteFolder>) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, ...updates, updatedAt: Date.now() }
              : folder
          ),
        }));
      },

      deleteFolder: (folderId: string) => {
        set((state) => {
          // Delete folder and all its children recursively
          const deleteRecursive = (id: string): string[] => {
            const toDelete = [id];
            const children = state.folders.filter((f) => f.parentFolderId === id);
            children.forEach((child) => {
              toDelete.push(...deleteRecursive(child.id));
            });
            return toDelete;
          };

          const idsToDelete = new Set(deleteRecursive(folderId));
          return {
            folders: state.folders.filter((folder) => !idsToDelete.has(folder.id)),
          };
        });
      },

      getFoldersByWorkspace: (workspaceId: string) => {
        return get().folders.filter((folder) => folder.workspaceId === workspaceId);
      },

      getFolder: (folderId: string) => {
        return get().folders.find((folder) => folder.id === folderId);
      },

      getFolderTree: (workspaceId: string) => {
        const folders = get().getFoldersByWorkspace(workspaceId);
        
        // Build tree structure
        const folderMap = new Map<string, NoteFolder & { children?: NoteFolder[] }>();
        const rootFolders: (NoteFolder & { children?: NoteFolder[] })[] = [];

        // First pass: create map
        folders.forEach((folder) => {
          folderMap.set(folder.id, { ...folder, children: [] });
        });

        // Second pass: build tree
        folders.forEach((folder) => {
          const folderWithChildren = folderMap.get(folder.id)!;
          if (folder.parentFolderId) {
            const parent = folderMap.get(folder.parentFolderId);
            if (parent) {
              if (!parent.children) parent.children = [];
              parent.children.push(folderWithChildren);
            }
          } else {
            rootFolders.push(folderWithChildren);
          }
        });

        // Sort by order
        const sortFolders = (folders: (NoteFolder & { children?: NoteFolder[] })[]): (NoteFolder & { children?: NoteFolder[] })[] => {
          return folders
            .sort((a, b) => a.order - b.order)
            .map((folder) => ({
              ...folder,
              children: folder.children ? sortFolders(folder.children) : undefined,
            }));
        };

        return sortFolders(rootFolders);
      },

      moveFolder: (folderId: string, newParentFolderId: string | undefined) => {
        set((state) => {
          // Prevent moving folder into its own descendant
          const isDescendant = (parentId: string, childId: string): boolean => {
            const folder = state.folders.find((f) => f.id === childId);
            if (!folder || !folder.parentFolderId) return false;
            if (folder.parentFolderId === parentId) return true;
            return isDescendant(parentId, folder.parentFolderId);
          };

          if (newParentFolderId && isDescendant(folderId, newParentFolderId)) {
            console.error('Cannot move folder into its own descendant');
            return state;
          }

          // Get siblings of new parent to determine order
          const siblings = state.folders.filter(
            (f) => f.workspaceId === state.folders.find((f) => f.id === folderId)?.workspaceId &&
                   f.parentFolderId === newParentFolderId &&
                   f.id !== folderId
          );
          const maxOrder = siblings.length > 0 
            ? Math.max(...siblings.map((f) => f.order))
            : -1;

          return {
            folders: state.folders.map((folder) =>
              folder.id === folderId
                ? { ...folder, parentFolderId: newParentFolderId, order: maxOrder + 1, updatedAt: Date.now() }
                : folder
            ),
          };
        });
      },
    }),
    {
      name: 'note-folder-storage',
      version: 1,
    }
  )
);

