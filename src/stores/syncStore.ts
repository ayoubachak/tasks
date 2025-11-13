import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isAuthenticated, disconnectGoogle } from '@/services/sync/syncService';
import type { ConflictResolution } from '@/services/sync/syncService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  isConnected: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  autoSyncEnabled: boolean;
  conflictResolution: ConflictResolution;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncAt: (timestamp: number) => void;
  setLastSyncError: (error: string | null) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setConflictResolution: (resolution: ConflictResolution) => void;
  checkConnection: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isConnected: false,
      syncStatus: 'idle',
      lastSyncAt: null,
      lastSyncError: null,
      autoSyncEnabled: true,
      conflictResolution: 'merge',

      setConnected: (connected: boolean) => {
        set({ isConnected: connected });
      },

      setSyncStatus: (status: SyncStatus) => {
        set({ syncStatus: status });
      },

      setLastSyncAt: (timestamp: number) => {
        set({ lastSyncAt: timestamp });
      },

      setLastSyncError: (error: string | null) => {
        set({ lastSyncError: error });
      },

      setAutoSyncEnabled: (enabled: boolean) => {
        set({ autoSyncEnabled: enabled });
      },

      setConflictResolution: (resolution: ConflictResolution) => {
        set({ conflictResolution: resolution });
      },

      checkConnection: async () => {
        const connected = await isAuthenticated();
        set({ isConnected: connected });
      },

      disconnect: async () => {
        await disconnectGoogle();
        set({
          isConnected: false,
          lastSyncAt: null,
          lastSyncError: null,
        });
      },
    }),
    {
      name: 'sync-storage',
      version: 1,
    }
  )
);

