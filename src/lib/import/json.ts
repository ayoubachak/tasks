import type { ExportData } from '@/lib/export/json';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useImageStore } from '@/stores/imageStore';
import { useNoteFolderStore } from '@/stores/noteFolderStore';
import { useNoteHistoryStore } from '@/stores/noteHistoryStore';
import { getAvailableStorage } from '@/lib/storage/storageUtils';
import { nanoid } from 'nanoid';
import type { Task } from '@/types';

export interface ImportResult {
  success: boolean;
  imported: {
    workspaces: number;
    tasks: number;
    templates: number;
    images: number;
  };
  errors: string[];
}

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
      images: 0,
    },
    errors: [],
  };

  try {
    const workspaceStore = useWorkspaceStore.getState();
    const taskStore = useTaskStore.getState();
    const templateStore = useTemplateStore.getState();
    const imageStore = useImageStore.getState();
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

    // Import images (with size checking and cleanup)
    if (data.images && Array.isArray(data.images)) {
      // First, try to cleanup unused images to free up space
      try {
        const allImageIds = imageStore.getAllImageIds();
        const usedImageIds = new Set<string>();
        
        // Collect all image IDs used in tasks, notes, and descriptions
        if (data.tasks) {
          for (const task of data.tasks) {
            // Check description for image references
            if (task.description) {
              const imageRefRegex = /image:([a-zA-Z0-9_-]+)/g;
              let match;
              while ((match = imageRefRegex.exec(task.description)) !== null) {
                usedImageIds.add(match[1]);
              }
            }
            
            // Check notes for image references
            if (Array.isArray(task.notes)) {
              for (const note of task.notes) {
                if (note.content) {
                  const imageRefRegex = /image:([a-zA-Z0-9_-]+)/g;
                  let match;
                  while ((match = imageRefRegex.exec(note.content)) !== null) {
                    usedImageIds.add(match[1]);
                  }
                }
              }
            }
          }
        }
        
        // Cleanup unused images (older than 30 days)
        imageStore.cleanupUnusedImages(usedImageIds);
      } catch (error) {
        // If cleanup fails, continue anyway
        console.warn('Image cleanup failed:', error);
      }

      const availableStorage = getAvailableStorage();
      // Use up to 90% of available storage for images (more permissive)
      const maxImageSize = availableStorage * 0.9;
      // Allow images up to 2MB even if storage is tight
      const absoluteMaxSize = 2 * 1024 * 1024; // 2MB
      const effectiveMaxSize = Math.min(maxImageSize, absoluteMaxSize);
      
      for (const image of data.images) {
        try {
          // Check if image size is reasonable
          const imageSize = image.size || new Blob([image.data]).size;
          
          // Check available storage before storing
          const currentAvailable = getAvailableStorage();
          
          // Only skip if image is larger than 90% of current available storage
          // and larger than 2MB
          if (imageSize > currentAvailable * 0.9 && imageSize > absoluteMaxSize) {
            result.errors.push(
              `Skipped image ${image.filename}: too large (${(imageSize / 1024 / 1024).toFixed(2)}MB). ` +
              `Available storage: ${(currentAvailable / 1024 / 1024).toFixed(2)}MB`
            );
            continue;
          }

          // Try to store the image
          imageStore.storeImage(
            image.data,
            image.mimeType,
            image.filename,
            imageSize,
            image.width,
            image.height
          );
          result.imported.images++;
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            // Try cleanup one more time and retry
            try {
              const allImageIds = imageStore.getAllImageIds();
              imageStore.cleanupUnusedImages(new Set<string>()); // Clean all unused
              
              // Retry storing the image
              const imageSize = image.size || new Blob([image.data]).size;
              imageStore.storeImage(
                image.data,
                image.mimeType,
                image.filename,
                imageSize,
                image.width,
                image.height
              );
              result.imported.images++;
            } catch (retryError) {
              result.errors.push(
                `Skipped image ${image.filename}: storage quota exceeded after cleanup. ` +
                `Please free up space manually or import without images.`
              );
            }
          } else {
            result.errors.push(`Failed to import image ${image.filename}: ${error}`);
          }
        }
      }
    }

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
  
  // STEP 1: Directly clear ALL localStorage keys
  // This is more reliable than using delete methods which might have side effects
  const STORAGE_KEYS = [
    'workspace-storage',
    'task-storage',
    'template-storage',
    'image-storage',
    'note-folder-storage',
    'note-history-storage',
  ];
  
  STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  });
  
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
  
  useImageStore.setState({
    images: {},
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
      images: 0,
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
    
    // Import images - CRITICAL: Must restore images properly
    // The image store uses a custom storage handler, so we need to ensure it's written correctly
    if (data.images && data.images.length > 0) {
      const imagesMap: Record<string, typeof data.images[0]> = {};
      data.images.forEach((img) => {
        imagesMap[img.id] = img;
      });
      
      // Set state - Zustand persist middleware will handle writing to localStorage
      useImageStore.setState({
        images: imagesMap,
      });
      
      // Force immediate write to localStorage for images (bypassing custom handler temporarily)
      // This ensures images are definitely saved even if the custom handler has issues
      try {
        const imageStorageKey = 'image-storage';
        const imageStorageData = {
          state: { images: imagesMap },
          version: 1,
        };
        localStorage.setItem(imageStorageKey, JSON.stringify(imageStorageData));
        console.log(`Directly wrote ${data.images.length} images to localStorage`);
      } catch (error) {
        console.error('Failed to directly write images to localStorage:', error);
        // Continue anyway - Zustand persist should handle it
      }
      
      result.imported.images = data.images.length;
      console.log(`Imported ${data.images.length} images`);
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
      images: localStorage.getItem('image-storage') ? '✓' : '✗',
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

