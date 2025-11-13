/**
 * Sync Service
 * Orchestrates data synchronization with Google Drive
 */

import { getOrCreateAppFolder, uploadBackup, downloadBackup, saveSyncMetadata, getSyncMetadata } from '../google/drive';
import { getValidAccessToken, clearTokens } from '../google/auth';
import type { ExportData } from '@/lib/export/json';
import type { Note } from '@/types';
import type { NoteFolder } from '@/types/task';
import { importFromJSON } from '@/lib/export/json';
import { nanoid } from 'nanoid';

export type ConflictResolution = 'local' | 'remote' | 'merge';

export interface SyncResult {
  success: boolean;
  error?: string;
  conflicts?: boolean;
  localNewer?: boolean;
  remoteNewer?: boolean;
}

export interface SyncOptions {
  conflictResolution?: ConflictResolution;
  forceUpload?: boolean;
}

const DEVICE_ID_KEY = 'sync_device_id';

/**
 * Get or create device ID
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${nanoid()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Sync data to Google Drive
 */
export async function syncToDrive(
  exportData: ExportData,
  options: SyncOptions = {}
): Promise<SyncResult> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get or create app folder
    const folderId = await getOrCreateAppFolder();

    // Get existing metadata
    const existingMetadata = await getSyncMetadata(folderId);
    const localTimestamp = exportData.exportDate;
    const remoteTimestamp = existingMetadata?.lastSyncAt || 0;

    // Check for conflicts
    if (!options.forceUpload && existingMetadata && remoteTimestamp > localTimestamp) {
      // Remote is newer - need to handle conflict
      return {
        success: false,
        conflicts: true,
        remoteNewer: true,
        error: 'Remote data is newer than local data',
      };
    }

    // Upload backup
    const jsonData = JSON.stringify(exportData, null, 2);
    const fileId = await uploadBackup(jsonData, folderId);

    // Save metadata
    const metadata = {
      lastSyncAt: Date.now(),
      deviceId: getDeviceId(),
      version: exportData.version,
      fileId,
    };
    await saveSyncMetadata(metadata, folderId);

    return { success: true };
  } catch (error) {
    console.error('Sync to drive failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync data from Google Drive
 */
export async function syncFromDrive(
  _options: SyncOptions = {}
): Promise<{ success: boolean; data?: ExportData; error?: string }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get app folder
    const folderId = await getOrCreateAppFolder();

    // Download backup
    const backupData = await downloadBackup(folderId);
    if (!backupData) {
      return { success: false, error: 'No backup found on Drive' };
    }

    // Parse data
    const data = importFromJSON(backupData);
    if (!data) {
      return { success: false, error: 'Failed to parse backup data' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Sync from drive failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Full sync (download, merge if needed, upload)
 */
export async function fullSync(
  localData: ExportData,
  options: SyncOptions = {}
): Promise<SyncResult> {
  try {
    // First, try to download remote data
    const downloadResult = await syncFromDrive(options);
    
    if (!downloadResult.success || !downloadResult.data) {
      // No remote data or download failed - just upload local
      return await syncToDrive(localData, { ...options, forceUpload: true });
    }

    const remoteData = downloadResult.data;
    const localTimestamp = localData.exportDate;
    const remoteTimestamp = remoteData.exportDate;

    // If timestamps are equal, no sync needed
    if (localTimestamp === remoteTimestamp) {
      return { success: true };
    }

    // Determine conflict resolution
    let mergedData: ExportData;

    if (options.conflictResolution === 'local') {
      mergedData = localData;
    } else if (options.conflictResolution === 'remote') {
      mergedData = remoteData;
    } else {
      // Merge strategy: combine both, prefer newer items
      mergedData = mergeData(localData, remoteData);
    }

    // Upload merged data
    return await syncToDrive(mergedData, { ...options, forceUpload: true });
  } catch (error) {
    console.error('Full sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merge local and remote data
 * Simple merge: prefer items with newer updatedAt timestamps
 */
function mergeData(local: ExportData, remote: ExportData): ExportData {
  // Merge workspaces - prefer newer
  const workspaceMap = new Map<string, typeof local.workspaces[0]>();
  for (const ws of [...local.workspaces, ...remote.workspaces]) {
    const existing = workspaceMap.get(ws.id);
    if (!existing || ws.updatedAt > existing.updatedAt) {
      workspaceMap.set(ws.id, ws);
    }
  }

  // Merge tasks - prefer newer
  const taskMap = new Map<string, typeof local.tasks[0]>();
  for (const task of [...local.tasks, ...remote.tasks]) {
    const existing = taskMap.get(task.id);
    if (!existing || task.updatedAt > existing.updatedAt) {
      taskMap.set(task.id, task);
    }
  }

  // Merge templates
  const taskTemplateMap = new Map<string, typeof local.templates.tasks[0]>();
  for (const t of [...local.templates.tasks, ...remote.templates.tasks]) {
    const existing = taskTemplateMap.get(t.id);
    if (!existing || (t.updatedAt || 0) > (existing.updatedAt || 0)) {
      taskTemplateMap.set(t.id, t);
    }
  }

  const noteTemplateMap = new Map<string, typeof local.templates.notes[0]>();
  for (const t of [...local.templates.notes, ...remote.templates.notes]) {
    const existing = noteTemplateMap.get(t.id);
    if (!existing || (t.updatedAt || 0) > (existing.updatedAt || 0)) {
      noteTemplateMap.set(t.id, t);
    }
  }

  // Merge images - prefer newer
  const imageMap = new Map<string, typeof local.images[number]>();
  for (const img of [...(local.images || []), ...(remote.images || [])]) {
    const existing = imageMap.get(img.id);
    if (!existing || img.lastUsedAt > existing.lastUsedAt) {
      imageMap.set(img.id, img);
    }
  }

  // Merge audios - prefer newer
  const audioMap = new Map<string, NonNullable<ExportData['audios']>[number]>();
  for (const audio of [...(local.audios || []), ...(remote.audios || [])]) {
    const existing = audioMap.get(audio.id);
    if (!existing || audio.lastUsedAt > existing.lastUsedAt) {
      audioMap.set(audio.id, audio);
    }
  }

  // Merge standalone notes - prefer newer
  const noteMap = new Map<string, Note>();
  const localNotes = local.standaloneNotes || [];
  const remoteNotes = remote.standaloneNotes || [];
  for (const note of [...localNotes, ...remoteNotes]) {
    const existing = noteMap.get(note.id);
    if (!existing || note.updatedAt > existing.updatedAt) {
      noteMap.set(note.id, note);
    }
  }

  // Merge folders - prefer newer
  const folderMap = new Map<string, NoteFolder>();
  const localFolders = local.folders || [];
  const remoteFolders = remote.folders || [];
  for (const folder of [...localFolders, ...remoteFolders]) {
    const existing = folderMap.get(folder.id);
    if (!existing || folder.updatedAt > existing.updatedAt) {
      folderMap.set(folder.id, folder);
    }
  }

  // Merge note histories - combine both
  const noteHistories: ExportData['noteHistories'] = {
    ...(local.noteHistories || {}),
    ...(remote.noteHistories || {}),
  };

  return {
    version: local.version,
    exportDate: Date.now(),
    workspaces: Array.from(workspaceMap.values()),
    tasks: Array.from(taskMap.values()),
    standaloneNotes: Array.from(noteMap.values()),
    folders: Array.from(folderMap.values()),
    templates: {
      tasks: Array.from(taskTemplateMap.values()),
      notes: Array.from(noteTemplateMap.values()),
    },
    images: Array.from(imageMap.values()),
    audios: Array.from(audioMap.values()),
    noteHistories: noteHistories,
    metadata: {
      totalTasks: taskMap.size,
      totalWorkspaces: workspaceMap.size,
      totalTemplates: taskTemplateMap.size + noteTemplateMap.size,
      totalNotes: noteMap.size,
      totalFolders: folderMap.size,
      totalImages: imageMap.size,
      totalAudios: audioMap.size,
    },
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  return !!token;
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogle(): Promise<void> {
  clearTokens();
  // Optionally revoke token on Google's side
  // This would require making a request to Google's revoke endpoint
}

