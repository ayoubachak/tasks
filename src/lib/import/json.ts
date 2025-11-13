import type { ExportData } from '@/lib/export/json';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useMediaStore } from '@/stores/mediaStore';
import type { StoredMedia, MediaType } from '@/stores/mediaStore';
import { useNoteFolderStore } from '@/stores/noteFolderStore';
import { useNoteHistoryStore } from '@/stores/noteHistoryStore';
import { getAvailableStorage } from '@/lib/storage/storageUtils';
import { getAllStorageKeys } from '@/lib/storage/storageRegistry';
import { nanoid } from 'nanoid';
import type { Task } from '@/types';

export interface ImportResult {
  success: boolean;
  imported: {
    workspaces: number;
    tasks: number;
    templates: number;
    media: number;
    images: number;
    audios: number;
    videos: number;
    photos: number;
  };
  errors: string[];
}

type MediaStoreState = ReturnType<typeof useMediaStore.getState>;

function collectMediaReferences(data: ExportData): Set<string> {
  const refs = new Set<string>();
  const mediaRefRegex = /media:([a-zA-Z0-9_-]+)/g;

  const scanContent = (content?: string) => {
    if (!content) return;
    let match: RegExpExecArray | null;
    while ((match = mediaRefRegex.exec(content)) !== null) {
      refs.add(match[1]);
    }
  };

  if (Array.isArray(data.tasks)) {
    for (const task of data.tasks) {
      scanContent(task.description);
      if (Array.isArray(task.notes)) {
        for (const note of task.notes) {
          scanContent(note.content);
        }
      }
    }
  }

  if (Array.isArray(data.standaloneNotes)) {
    for (const note of data.standaloneNotes) {
      scanContent(note.content);
    }
  }

  return refs;
}

function cleanupMediaBeforeImport(mediaStore: MediaStoreState, data: ExportData): void {
  try {
    const usedMediaIds = collectMediaReferences(data);
    mediaStore.cleanupUnusedMedia(usedMediaIds, 45);
  } catch (error) {
    console.warn('Media cleanup failed:', error);
  }
}

function normalizeMediaAsset(
  asset: Partial<StoredMedia>,
  fallbackType: MediaType
): StoredMedia | null {
  if (!asset || !asset.data) {
    return null;
  }

  const id = asset.id ?? nanoid();
  const type = (asset.type ?? fallbackType) as MediaType;
  const mimeType = asset.mimeType ?? guessMimeType(type);
  const size = asset.size ?? estimateBase64Size(asset.data);
  const filename = asset.filename ?? `${type}-${id}.${mimeType.split('/')[1] ?? 'bin'}`;
  const createdAt = asset.createdAt ?? Date.now();
  const legacyUpdatedAt =
    typeof (asset as { updatedAt?: number }).updatedAt === 'number'
      ? (asset as { updatedAt?: number }).updatedAt
      : undefined;
  const lastUsedAt = asset.lastUsedAt ?? legacyUpdatedAt ?? createdAt;

  return {
    id,
    type,
    data: asset.data,
    mimeType,
    filename,
    size,
    width: asset.width ?? (asset as any).metadata?.width,
    height: asset.height ?? (asset as any).metadata?.height,
    duration: asset.duration ?? (asset as any).metadata?.duration,
    metadata: asset.metadata,
    createdAt,
    lastUsedAt,
  };
}

function buildMediaListFromExport(data: ExportData) {
  const deduped = new Map<string, StoredMedia>();

  const push = (asset: any, fallbackType: MediaType) => {
    const normalized = normalizeMediaAsset(asset, fallbackType);
    if (!normalized) return;
    const existing = deduped.get(normalized.id);
    if (!existing || (normalized.lastUsedAt ?? 0) > (existing.lastUsedAt ?? 0)) {
      deduped.set(normalized.id, normalized);
    }
  };

  if (Array.isArray(data.media)) {
    for (const mediaAsset of data.media) {
      push(mediaAsset, (mediaAsset.type as any) ?? 'image');
    }
  }
  if (Array.isArray(data.images)) {
    for (const image of data.images) {
      push(image, 'image');
    }
  }
  if (Array.isArray(data.audios)) {
    for (const audio of data.audios) {
      push(audio, 'audio');
    }
  }

  return Array.from(deduped.values());
}

function importMediaFromData(
  data: ExportData,
  result: ImportResult,
  mediaStore: MediaStoreState
): void {
  const mediaAssets = buildMediaListFromExport(data);
  if (mediaAssets.length === 0) {
    return;
  }

  cleanupMediaBeforeImport(mediaStore, data);

  const absoluteMaxSize = 5 * 1024 * 1024; // 5MB per asset safeguard

  for (const asset of mediaAssets) {
    try {
      const assetSize = asset.size ?? estimateBase64Size(asset.data);
      const currentAvailable = getAvailableStorage();

      if (assetSize > currentAvailable * 0.9 && assetSize > absoluteMaxSize) {
        result.errors.push(
          `Skipped ${asset.filename}: too large (${(assetSize / 1024 / 1024).toFixed(2)}MB). ` +
            `Available storage: ${(currentAvailable / 1024 / 1024).toFixed(2)}MB`
        );
        continue;
      }

      mediaStore.storeMedia({
        ...asset,
        id: asset.id,
        createdAt: asset.createdAt,
        lastUsedAt: asset.lastUsedAt,
      });

      result.imported.media += 1;
      if (asset.type === 'audio') {
        result.imported.audios += 1;
      } else if (asset.type === 'video') {
        result.imported.videos += 1;
      } else if (asset.type === 'photo') {
        result.imported.photos += 1;
      } else {
        result.imported.images += 1;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          mediaStore.aggressiveCleanup(new Set<string>(), 7);
          mediaStore.storeMedia({
            ...asset,
            id: asset.id,
            createdAt: asset.createdAt,
            lastUsedAt: asset.lastUsedAt,
          });

          result.imported.media += 1;
          if (asset.type === 'audio') {
            result.imported.audios += 1;
          } else if (asset.type === 'video') {
            result.imported.videos += 1;
          } else if (asset.type === 'photo') {
            result.imported.photos += 1;
          } else {
            result.imported.images += 1;
          }
        } catch (retryError) {
          result.errors.push(
            `Skipped ${asset.filename}: storage quota exceeded after cleanup. Please free up space or import without media.`
          );
        }
      } else {
        result.errors.push(`Failed to import ${asset.filename}: ${String(error)}`);
      }
    }
  }
}

function guessMimeType(type: MediaType): string {
  switch (type) {
    case 'audio':
      return 'audio/webm';
    case 'video':
      return 'video/webm';
    case 'photo':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
}

function estimateBase64Size(dataUri: string): number {
  const base64 = dataUri.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Import data with merge/skip options
 * Use this for importing data and merging with existing data
 * 
 * For complete replacement (wipe and restore), use replaceAllDataWithBackup() instead
 */
export async function importFromJSONData(
  data: ExportData,
  options: {
    mergeWorkspaces?: boolean;
    mergeTasks?: boolean;
    skipDuplicates?: boolean;
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: {
      workspaces: 0,
      tasks: 0,
      templates: 0,
      media: 0,
      images: 0,
      audios: 0,
      videos: 0,
      photos: 0,
    },
    errors: [],
  };

  try {
    const workspaceStore = useWorkspaceStore.getState();
    const taskStore = useTaskStore.getState();
    const templateStore = useTemplateStore.getState();
    const mediaStore = useMediaStore.getState();
    const noteFolderStore = useNoteFolderStore.getState();

    // Import workspaces FIRST (before tasks)
    // Create a mapping of old workspace IDs to new workspace IDs
    const workspaceIdMap = new Map<string, string>();
    
    if (data.workspaces) {
      const existingWorkspaces = workspaceStore.workspaces;
      const existingWorkspaceIds = new Set(existingWorkspaces.map((w) => w.id));
      const existingWorkspaceNames = new Map(existingWorkspaces.map((w) => [w.name.toLowerCase(), w]));

      for (const workspace of data.workspaces) {
        if (options.skipDuplicates && existingWorkspaceIds.has(workspace.id)) {
          // Workspace already exists, map to itself
          workspaceIdMap.set(workspace.id, workspace.id);
          continue;
        }

        if (options.mergeWorkspaces) {
          // Try to find by name (case-insensitive)
          const existing = existingWorkspaceNames.get(workspace.name.toLowerCase());
          if (existing) {
            // Update existing workspace and map old ID to existing ID
            workspaceStore.updateWorkspace(existing.id, {
              ...workspace,
              id: existing.id, // Keep existing ID
            });
            workspaceIdMap.set(workspace.id, existing.id);
            result.imported.workspaces++;
            continue;
          }
        }

        // Create new workspace - try to preserve original ID if not conflicting
        let newWorkspaceId = workspace.id;
        if (existingWorkspaceIds.has(newWorkspaceId)) {
          // ID conflict, create with new ID
          const newWorkspace = workspaceStore.createWorkspace(workspace.name, workspace.color);
          newWorkspaceId = newWorkspace.id;
        } else {
          // No conflict, create workspace with original ID
          const now = Date.now();
          const newWorkspace = {
            ...workspace,
            id: newWorkspaceId,
            createdAt: workspace.createdAt || now,
            updatedAt: workspace.updatedAt || now,
          };
          // Add workspace directly to store using internal state update
          const currentWorkspaces = workspaceStore.workspaces;
          useWorkspaceStore.setState({
            workspaces: [...currentWorkspaces, newWorkspace],
          });
          if (!workspaceStore.activeWorkspaceId) {
            workspaceStore.setActiveWorkspace(newWorkspaceId);
          }
        }
        
        workspaceIdMap.set(workspace.id, newWorkspaceId);
        
        // Update workspace properties
        workspaceStore.updateWorkspace(newWorkspaceId, {
          name: workspace.name,
          color: workspace.color,
          description: workspace.description,
          settings: workspace.settings,
          archived: workspace.archived,
        });
        
        result.imported.workspaces++;
      }
    }

    // Import media assets (images, audio, video, photo)
    importMediaFromData(data, result, mediaStore);

    // Import tasks AFTER workspaces (so workspace mapping is ready)
    // Import tasks AFTER workspaces (so workspace mapping is ready)
    if (data.tasks) {
      const existingTasks = taskStore.tasks;
      const existingTaskIds = new Set(existingTasks.map((t) => t.id));

      for (const task of data.tasks) {
        if (options.skipDuplicates && existingTaskIds.has(task.id)) {
          continue;
        }

        // Map workspace ID using the mapping we created
        const mappedWorkspaceId = workspaceIdMap.get(task.workspaceId) || task.workspaceId;
        const workspaces = workspaceStore.workspaces;
        let targetWorkspace = workspaces.find((w) => w.id === mappedWorkspaceId);
        
        if (!targetWorkspace) {
          // Workspace still doesn't exist (shouldn't happen if import order is correct)
          // Create a default workspace as fallback
          const fallbackWorkspace = workspaceStore.createWorkspace('Imported Workspace', '#3b82f6');
          targetWorkspace = fallbackWorkspace;
          workspaceIdMap.set(task.workspaceId, fallbackWorkspace.id);
        }

        // Preserve original task ID if not conflicting, otherwise generate new one
        let taskId = task.id;
        if (existingTaskIds.has(taskId)) {
          taskId = nanoid();
        }

        // Create task with ALL properties preserved (including nested structures)
        // This preserves subtasks, notes, checklists, dependencies, etc. with their original structure
        const importedTask: Task = {
          ...task,
          id: taskId,
          workspaceId: targetWorkspace.id,
          // Preserve all nested structures as-is (they already have their IDs)
          subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
          notes: Array.isArray(task.notes) ? task.notes : [],
          checklists: Array.isArray(task.checklists) ? task.checklists : [],
          dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
          blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
          attachments: Array.isArray(task.attachments) ? task.attachments : [],
          tags: Array.isArray(task.tags) ? task.tags : [],
          labels: Array.isArray(task.labels) ? task.labels : [],
          customFields: task.customFields || {},
        };

        // Add task directly to store using internal state update
        // We need to use the store's internal set method
        const currentState = useTaskStore.getState();
        useTaskStore.setState({
          tasks: [...currentState.tasks, importedTask],
        });

        result.imported.tasks++;
      }
    }

    // Import templates
    if (data.templates) {
      // Import task templates
      if (data.templates.tasks) {
        for (const template of data.templates.tasks) {
          try {
            templateStore.createTaskTemplate(
              template.name,
              template.description,
              template.taskStructure,
              template.workspaceId
            );
            result.imported.templates++;
          } catch (error) {
            result.errors.push(`Failed to import task template ${template.name}: ${error}`);
          }
        }
      }

      // Import note templates
      if (data.templates.notes) {
        for (const template of data.templates.notes) {
          try {
            templateStore.createNoteTemplate(
              template.name,
              template.description,
              template.content,
              template.workspaceId
            );
            result.imported.templates++;
          } catch (error) {
            result.errors.push(`Failed to import note template ${template.name}: ${error}`);
          }
        }
      }
    }

    // Import standalone notes AFTER workspaces (so workspace mapping is ready)
    if (data.standaloneNotes) {
      for (const note of data.standaloneNotes) {
        try {
          // Map workspace ID using the mapping we created
          const mappedWorkspaceId = workspaceIdMap.get(note.workspaceId) || note.workspaceId;
          const workspaces = workspaceStore.workspaces;
          let targetWorkspace = workspaces.find((w) => w.id === mappedWorkspaceId);
          
          if (!targetWorkspace) {
            // Workspace doesn't exist, create fallback
            const fallbackWorkspace = workspaceStore.createWorkspace('Imported Workspace', '#3b82f6');
            targetWorkspace = fallbackWorkspace;
            workspaceIdMap.set(note.workspaceId, fallbackWorkspace.id);
          }

          // Add note with preserved properties
          const importedNote = {
            ...note,
            workspaceId: targetWorkspace.id,
          };
          
          // Add directly to standalone notes using internal state update
          const currentStandaloneNotes = taskStore.standaloneNotes;
          useTaskStore.setState({
            standaloneNotes: [...currentStandaloneNotes, importedNote],
          });
        } catch (error) {
          result.errors.push(`Failed to import standalone note: ${error}`);
        }
      }
    }

    // Import note folders AFTER workspaces (so workspace mapping is ready)
    if (data.folders) {
      // Create folder ID mapping for nested folders
      const folderIdMap = new Map<string, string>();
      
      // Sort folders by depth (root folders first, then nested)
      const sortedFolders = [...data.folders].sort((a, b) => {
        if (!a.parentFolderId && b.parentFolderId) return -1;
        if (a.parentFolderId && !b.parentFolderId) return 1;
        return 0;
      });
      
      for (const folder of sortedFolders) {
        try {
          // Map workspace ID using the mapping we created
          const mappedWorkspaceId = workspaceIdMap.get(folder.workspaceId) || folder.workspaceId;
          const workspaces = workspaceStore.workspaces;
          let targetWorkspace = workspaces.find((w) => w.id === mappedWorkspaceId);
          
          if (!targetWorkspace) {
            // Workspace doesn't exist, create fallback
            const fallbackWorkspace = workspaceStore.createWorkspace('Imported Workspace', '#3b82f6');
            targetWorkspace = fallbackWorkspace;
            workspaceIdMap.set(folder.workspaceId, fallbackWorkspace.id);
          }

          // Map parent folder ID if it exists
          const mappedParentFolderId = folder.parentFolderId 
            ? folderIdMap.get(folder.parentFolderId) || folder.parentFolderId
            : undefined;

          // Create folder and map old ID to new ID
          const newFolder = noteFolderStore.createFolder(
            targetWorkspace.id,
            folder.name,
            mappedParentFolderId,
            folder.color,
            folder.icon
          );
          
          folderIdMap.set(folder.id, newFolder.id);
        } catch (error) {
          result.errors.push(`Failed to import folder ${folder.name}: ${error}`);
        }
      }
    }

    // Import note histories
    if (data.noteHistories) {
      const noteHistoryStore = useNoteHistoryStore.getState();
      // Merge imported histories with existing ones
      useNoteHistoryStore.setState({
        histories: {
          ...noteHistoryStore.histories,
          ...data.noteHistories,
        },
      });
    }

    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
}

/**
 * Replace all data with backup data (clears existing and imports)
 * This performs a COMPLETE replacement - all existing data is wiped and replaced
 */
export async function replaceAllDataWithBackup(data: ExportData): Promise<ImportResult> {
  console.log('Starting complete data replacement...');
  
  // STEP 1: Directly clear ALL localStorage keys using storage registry
  // This is more reliable than using delete methods which might have side effects
  const storageKeys = getAllStorageKeys();
  
  // Only clear core data stores (preserve UI state like views, sync, backups)
  const coreDataKeys = storageKeys.filter((key) => 
    key === 'workspace-storage' ||
    key === 'task-storage' ||
    key === 'template-storage' ||
    key === 'media-storage' ||
    key === 'note-folder-storage' ||
    key === 'note-history-storage'
  );
  
  for (const key of coreDataKeys) {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  }
  
  // STEP 2: Reset all stores to empty state
  // This ensures Zustand's internal state matches localStorage
  useWorkspaceStore.setState({
    workspaces: [],
    activeWorkspaceId: null,
  });
  
  useTaskStore.setState({
    tasks: [],
    standaloneNotes: [],
  });
  
  useTemplateStore.setState({
    taskTemplates: [],
    noteTemplates: [],
  });
  
  useMediaStore.setState({
    media: {},
  });
  
  useNoteFolderStore.setState({
    folders: [],
  });
  
  useNoteHistoryStore.setState({
    histories: {},
  });
  
  // STEP 3: Import backup data directly into stores
  // We'll bypass the normal import logic and directly set state
  const result: ImportResult = {
    success: true,
    imported: {
      workspaces: 0,
      tasks: 0,
      templates: 0,
      media: 0,
      images: 0,
      audios: 0,
      videos: 0,
      photos: 0,
    },
    errors: [],
  };
  
  try {
    // Import workspaces
    if (data.workspaces && data.workspaces.length > 0) {
      useWorkspaceStore.setState({
        workspaces: data.workspaces,
        activeWorkspaceId: data.workspaces[0]?.id || null,
      });
      result.imported.workspaces = data.workspaces.length;
      console.log(`Imported ${data.workspaces.length} workspaces`);
    }
    
    // Import tasks
    if (data.tasks && data.tasks.length > 0) {
      useTaskStore.setState((state) => ({
        ...state,
        tasks: data.tasks,
      }));
      result.imported.tasks = data.tasks.length;
      console.log(`Imported ${data.tasks.length} tasks`);
    }
    
    // Import standalone notes
    if (data.standaloneNotes && data.standaloneNotes.length > 0) {
      useTaskStore.setState((state) => ({
        ...state,
        standaloneNotes: data.standaloneNotes || [],
      }));
      console.log(`Imported ${data.standaloneNotes.length} standalone notes`);
    }
    
    // Import templates
    if (data.templates) {
      const taskTemplates = data.templates.tasks || [];
      const noteTemplates = data.templates.notes || [];
      
      useTemplateStore.setState({
        taskTemplates,
        noteTemplates,
      });
      result.imported.templates = taskTemplates.length + noteTemplates.length;
      console.log(`Imported ${taskTemplates.length} task templates and ${noteTemplates.length} note templates`);
    }
    
    // Import media assets (images, audio, video, photo)
    const mediaAssets = buildMediaListFromExport(data);
    if (mediaAssets.length > 0) {
      const mediaMap: Record<string, StoredMedia> = {};
      let imageCount = 0;
      let photoCount = 0;
      let audioCount = 0;
      let videoCount = 0;

      for (const asset of mediaAssets) {
        mediaMap[asset.id] = asset;
        switch (asset.type) {
          case 'audio':
            audioCount += 1;
            break;
          case 'video':
            videoCount += 1;
            break;
          case 'photo':
            photoCount += 1;
            break;
          default:
            imageCount += 1;
            break;
        }
      }

      useMediaStore.setState({
        media: mediaMap,
      });

      try {
        const mediaStorageData = {
          state: { media: mediaMap },
          version: 1,
        };
        localStorage.setItem('media-storage', JSON.stringify(mediaStorageData));
        console.log(`Directly wrote ${mediaAssets.length} media assets to localStorage`);
      } catch (error) {
        console.error('Failed to directly write media to localStorage:', error);
      }

      result.imported.media = mediaAssets.length;
      result.imported.images = imageCount + photoCount;
      result.imported.photos = photoCount;
      result.imported.videos = videoCount;
      result.imported.audios = audioCount;

      console.log(
        `Imported media → total: ${mediaAssets.length}, images: ${imageCount}, photos: ${photoCount}, videos: ${videoCount}, audios: ${audioCount}`
      );
    }
    
    // Import note folders
    if (data.folders && data.folders.length > 0) {
      useNoteFolderStore.setState({
        folders: data.folders,
      });
      console.log(`Imported ${data.folders.length} note folders`);
    }
    
    // Import note histories
    if (data.noteHistories) {
      useNoteHistoryStore.setState({
        histories: data.noteHistories,
      });
      console.log(`Imported note histories for ${Object.keys(data.noteHistories).length} notes`);
    }
    
    // STEP 4: Force persist middleware to write to localStorage
    // Give Zustand a moment to process the state changes
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verify data was written by checking localStorage
    const verification = {
      workspaces: localStorage.getItem('workspace-storage') ? '✓' : '✗',
      tasks: localStorage.getItem('task-storage') ? '✓' : '✗',
      media: localStorage.getItem('media-storage') ? '✓' : '✗',
      templates: localStorage.getItem('template-storage') ? '✓' : '✗',
      folders: localStorage.getItem('note-folder-storage') ? '✓' : '✗',
      histories: localStorage.getItem('note-history-storage') ? '✓' : '✗',
    };
    
    console.log('Storage verification:', verification);
    
    // If any critical data wasn't written, log a warning
    if (verification.workspaces === '✗' || verification.tasks === '✗') {
      console.warn('WARNING: Some data may not have been persisted to localStorage');
      result.errors.push('Warning: Some data may not have been fully persisted');
    }
    
    console.log('Data replacement completed successfully');
  } catch (error) {
    result.success = false;
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Data replacement failed:', error);
  }
  
  return result;
}

