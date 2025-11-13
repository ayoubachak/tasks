/**
 * Storage Registry
 * Central registry of ALL localStorage keys used by the application
 * This ensures we can track, clear, and restore everything properly
 */

export const STORAGE_KEYS = {
  // Core data stores
  WORKSPACES: 'workspace-storage',
  TASKS: 'task-storage',
  TEMPLATES: 'template-storage',
  MEDIA: 'media-storage',
  NOTE_FOLDERS: 'note-folder-storage',
  NOTE_HISTORIES: 'note-history-storage',
  
  // UI/App state (optional - may want to preserve these)
  VIEWS: 'view-storage',
  SYNC: 'sync-storage',
  BACKUPS: 'backup-storage',
} as const;

/**
 * Get all storage keys used by the application
 */
export function getAllStorageKeys(): string[] {
  return Object.values(STORAGE_KEYS);
}

/**
 * Clear ALL application data from localStorage
 * This is a complete wipe - use with caution!
 */
export function clearAllAppData(): void {
  const keys = getAllStorageKeys();
  
  console.log('Clearing all app data from localStorage:', keys);
  
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared: ${key}`);
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  });
  
  // Also clear any legacy keys that might exist
  const allKeys = Object.keys(localStorage);
  const legacyKeys = allKeys.filter((key) => 
    key.startsWith('task-') || 
    key.startsWith('workspace-') || 
    key.startsWith('note-') ||
    key.startsWith('image-')
  );
  
  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared legacy key: ${key}`);
    } catch (error) {
      console.error(`Failed to clear legacy key ${key}:`, error);
    }
  });
}

/**
 * Get storage size information for debugging
 */
export function getStorageInfo(): {
  keys: string[];
  totalSize: number;
  sizes: Record<string, number>;
} {
  const keys = getAllStorageKeys();
  const sizes: Record<string, number> = {};
  let totalSize = 0;
  
  keys.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        sizes[key] = size;
        totalSize += size;
      } else {
        sizes[key] = 0;
      }
    } catch (error) {
      console.error(`Failed to get size for ${key}:`, error);
      sizes[key] = 0;
    }
  });
  
  return {
    keys,
    totalSize,
    sizes,
  };
}

