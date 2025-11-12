import type { ExportData } from '@/lib/export/json';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useImageStore } from '@/stores/imageStore';
import { getAvailableStorage } from '@/lib/storage/storageUtils';
import { nanoid } from 'nanoid';

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

    // Import workspaces
    if (data.workspaces) {
      const existingWorkspaces = workspaceStore.workspaces;
      const existingWorkspaceIds = new Set(existingWorkspaces.map((w) => w.id));

      for (const workspace of data.workspaces) {
        if (options.skipDuplicates && existingWorkspaceIds.has(workspace.id)) {
          continue;
        }

        if (options.mergeWorkspaces) {
          // Try to find by name
          const existing = existingWorkspaces.find((w) => w.name === workspace.name);
          if (existing) {
            // Update existing workspace
            workspaceStore.updateWorkspace(existing.id, workspace);
            result.imported.workspaces++;
            continue;
          }
        }

        // Create new workspace with new ID to avoid conflicts
        const newWorkspace = workspaceStore.createWorkspace(workspace.name, workspace.color);
        if (workspace.description) {
          workspaceStore.updateWorkspace(newWorkspace.id, {
            description: workspace.description,
          });
        }
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

    // Import tasks
    if (data.tasks) {
      const existingTasks = taskStore.tasks;
      const existingTaskIds = new Set(existingTasks.map((t) => t.id));

      for (const task of data.tasks) {
        if (options.skipDuplicates && existingTaskIds.has(task.id)) {
          continue;
        }

        // Find or create workspace for this task
        const workspaces = workspaceStore.workspaces;
        let targetWorkspace = workspaces.find((w) => w.id === task.workspaceId);
        
        if (!targetWorkspace) {
          // Create a default workspace if it doesn't exist
          targetWorkspace = workspaceStore.createWorkspace('Imported Workspace', '#3b82f6');
        }

        // Create task with new ID to avoid conflicts
        const newTask = taskStore.createTask(targetWorkspace.id, task.title, task.description);
        
        // Update task with all other properties
        taskStore.updateTask(newTask.id, {
          status: task.status,
          priority: task.priority,
          tags: Array.isArray(task.tags) ? [...task.tags] : [],
          dueDate: task.dueDate,
          recurrence: task.recurrence,
          subtasks: Array.isArray(task.subtasks) 
            ? task.subtasks.map((st) => ({ ...st, id: nanoid() }))
            : [],
          notes: Array.isArray(task.notes)
            ? task.notes.map((note) => ({ ...note, id: nanoid() }))
            : [],
          checklists: Array.isArray(task.checklists)
            ? task.checklists.map((cl) => ({
                ...cl,
                id: nanoid(),
                items: Array.isArray(cl.items)
                  ? cl.items.map((item) => ({ ...item, id: nanoid() }))
                  : [],
              }))
            : [],
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

    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
}

