import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ExportData } from '@/lib/export/json';
import { estimateDataSize, getAvailableStorage } from '@/lib/storage/storageUtils';

export interface Backup {
  id: string;
  name: string;
  data: ExportData;
  createdAt: number;
  size: number; // bytes
  description?: string;
  storedLocally: boolean; // Whether backup is stored in localStorage or download-only
}

interface BackupState {
  backups: Backup[];
  maxBackups: number;
  
  // Actions
  createBackup: (name: string, data: ExportData, description?: string, forceStore?: boolean) => Backup | null;
  deleteBackup: (id: string) => void;
  getBackup: (id: string) => Backup | undefined;
  getAllBackups: () => Backup[];
  restoreBackup: (id: string) => ExportData | null;
  cleanupOldBackups: () => void;
  canStoreBackup: (size: number) => boolean;
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set, get) => ({
      backups: [],
      maxBackups: 10,

      createBackup: (name, data, description, forceStore = false) => {
        const size = estimateDataSize(data);
        
        // Check if we can store this backup
        const availableStorage = getAvailableStorage();
        const canStore = forceStore || (size < availableStorage * 0.8); // Use 80% of available to be safe

        if (!canStore) {
          // Can't store, return backup object but don't add to store
          // The caller should handle downloading it
          return {
            id: nanoid(),
            name,
            data,
            description,
            createdAt: Date.now(),
            size,
            storedLocally: false,
          };
        }

        // Try to store, but cleanup first if needed
        const state = get();
        let backups = [...state.backups];
        
        // Remove old backups if we're running out of space
        while (backups.length > 0 && size > getAvailableStorage()) {
          // Remove oldest backup
          backups = backups.sort((a, b) => a.createdAt - b.createdAt);
          backups.shift();
        }

        // If still not enough space after cleanup, don't store locally
        if (size > getAvailableStorage()) {
          return {
            id: nanoid(),
            name,
            data,
            description,
            createdAt: Date.now(),
            size,
            storedLocally: false,
          };
        }

        // Create backup and add to store
        const backup: Backup = {
          id: nanoid(),
          name,
          data,
          description,
          createdAt: Date.now(),
          size,
          storedLocally: true,
        };

        backups.push(backup);
        backups = backups.sort((a, b) => b.createdAt - a.createdAt).slice(0, state.maxBackups);
        
        set({ backups });
        return backup;
      },

      deleteBackup: (id: string) => {
        set((state) => ({
          backups: state.backups.filter((b) => b.id !== id),
        }));
      },

      getBackup: (id: string) => {
        return get().backups.find((b) => b.id === id);
      },

      getAllBackups: () => {
        return get().backups;
      },

      restoreBackup: (id: string) => {
        const backup = get().getBackup(id);
        return backup ? backup.data : null;
      },

      cleanupOldBackups: () => {
        const state = get();
        if (state.backups.length <= state.maxBackups) return;
        
        set((s) => {
          const sorted = [...s.backups].sort((a, b) => b.createdAt - a.createdAt);
          return { backups: sorted.slice(0, s.maxBackups) };
        });
      },

      canStoreBackup: (size: number) => {
        return size < getAvailableStorage() * 0.8; // Use 80% of available
      },
    }),
    {
      name: 'backup-storage',
      version: 1,
    }
  )
);

