/**
 * Utility functions for localStorage management
 */

export function getStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

export function getStorageQuota(): number {
  // Most browsers have 5-10MB limit, we'll use 5MB as conservative estimate
  return 5 * 1024 * 1024; // 5MB in bytes
}

export function getAvailableStorage(): number {
  return getStorageQuota() - getStorageSize();
}

export function estimateDataSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

