import { storageAdapter, type StorageAdapter } from './storageAdapter';

export class LocalStorage {
  private adapter: StorageAdapter;
  private prefix: string;

  constructor(adapter: StorageAdapter = storageAdapter, prefix: string = 'todo_app_') {
    this.adapter = adapter;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T>(key: string, defaultValue: T | null = null): T | null {
    const item = this.adapter.getItem(this.getKey(key));
    if (item === null) {
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error parsing JSON for key "${key}":`, error);
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.adapter.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error(`Error serializing data for key "${key}":`, error);
      throw error;
    }
  }

  remove(key: string): void {
    this.adapter.removeItem(this.getKey(key));
  }

  clear(): void {
    // Only clear keys with our prefix
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  initialize(): void {
    // No-op for now; legacy versioning has been removed.
  }

  // Get storage size estimate
  getStorageSize(): number {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            total += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating storage size:', error);
    }
    return total;
  }

  // Get storage size in MB
  getStorageSizeMB(): number {
    return this.getStorageSize() / (1024 * 1024);
  }
}

export const storage = new LocalStorage();

