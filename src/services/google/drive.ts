/**
 * Google Drive API Service
 * Handles file operations on Google Drive
 */

import { getValidAccessToken } from './auth';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'Task Manager Sync';
const BACKUP_FILE_NAME = 'backup.json';
const METADATA_FILE_NAME = 'metadata.json';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export interface SyncMetadata {
  lastSyncAt: number;
  deviceId: string;
  version: string;
  fileId: string;
}

/**
 * Get or create app folder in user's Drive
 */
export async function getOrCreateAppFolder(): Promise<string> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // First, try to find existing folder
  const existingFolder = await findFolder(APP_FOLDER_NAME, accessToken);
  if (existingFolder) {
    return existingFolder.id;
  }

  // Create new folder
  const folderMetadata = {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const response = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderMetadata),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create folder: ${error.error?.message || 'Unknown error'}`);
  }

  const folder = await response.json();
  return folder.id;
}

/**
 * Get the Drive folder URL
 */
export async function getFolderUrl(): Promise<string | null> {
  try {
    const folderId = await getOrCreateAppFolder();
    return `https://drive.google.com/drive/folders/${folderId}`;
  } catch {
    return null;
  }
}

/**
 * Find folder by name
 */
async function findFolder(name: string, accessToken: string): Promise<DriveFile | null> {
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
  const response = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Upload backup file to Drive
 */
export async function uploadBackup(data: string, folderId: string): Promise<string> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Check if backup file already exists
  const existingFile = await findFileInFolder(BACKUP_FILE_NAME, folderId, accessToken);

  // For new files, include parents. For updates, don't include parents (not writable in PATCH)
  const metadata = existingFile
    ? { name: BACKUP_FILE_NAME } // Update: don't include parents
    : { name: BACKUP_FILE_NAME, parents: [folderId] }; // Create: include parents

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([data], { type: 'application/json' }));

  const url = existingFile
    ? `${DRIVE_UPLOAD_BASE}/files/${existingFile.id}?uploadType=multipart`
    : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;

  const method = existingFile ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload backup: ${error.error?.message || 'Unknown error'}`);
  }

  const file = await response.json();
  return file.id;
}

/**
 * Download backup file from Drive
 */
export async function downloadBackup(folderId: string): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const file = await findFileInFolder(BACKUP_FILE_NAME, folderId, accessToken);
  if (!file) {
    return null;
  }

  const response = await fetch(`${DRIVE_API_BASE}/files/${file.id}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(`Failed to download backup: ${error.error?.message || 'Unknown error'}`);
  }

  return await response.text();
}

/**
 * Find file in folder
 */
async function findFileInFolder(
  fileName: string,
  folderId: string,
  accessToken: string
): Promise<DriveFile | null> {
  const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  
  const response = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,size)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime,size`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

/**
 * Save sync metadata
 */
export async function saveSyncMetadata(
  metadata: SyncMetadata,
  folderId: string
): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const existingFile = await findFileInFolder(METADATA_FILE_NAME, folderId, accessToken);

  // For new files, include parents. For updates, don't include parents (not writable in PATCH)
  const fileMetadata = existingFile
    ? { name: METADATA_FILE_NAME } // Update: don't include parents
    : { name: METADATA_FILE_NAME, parents: [folderId] }; // Create: include parents

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

  const url = existingFile
    ? `${DRIVE_UPLOAD_BASE}/files/${existingFile.id}?uploadType=multipart`
    : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;

  const method = existingFile ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to save metadata: ${error.error?.message || 'Unknown error'}`);
  }
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(folderId: string): Promise<SyncMetadata | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const file = await findFileInFolder(METADATA_FILE_NAME, folderId, accessToken);
  if (!file) {
    return null;
  }

  const response = await fetch(`${DRIVE_API_BASE}/files/${file.id}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

