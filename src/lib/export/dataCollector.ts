/**
 * Centralized Data Collection
 * Collects ALL data from all stores for backup/sync
 * This ensures nothing is missed and data is consistent
 */

import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useImageStore } from '@/stores/imageStore';
import { useNoteFolderStore } from '@/stores/noteFolderStore';
import { useNoteHistoryStore } from '@/stores/noteHistoryStore';
import type { ExportData } from './json';

/**
 * Collect all application data from all stores
 * This is the single source of truth for what gets backed up/synced
 */
export function collectAllData(): ExportData {
  // Get all stores
  const workspaceStore = useWorkspaceStore.getState();
  const taskStore = useTaskStore.getState();
  const templateStore = useTemplateStore.getState();
  const imageStore = useImageStore.getState();
  const noteFolderStore = useNoteFolderStore.getState();
  const noteHistoryStore = useNoteHistoryStore.getState();

  // Collect all images
  const allImageIds = imageStore.getAllImageIds();
  const images = allImageIds
    .map((id) => imageStore.getImage(id))
    .filter((img): img is NonNullable<typeof img> => img !== undefined);

  // Collect all notes (standalone + task notes)
  const allNotes = taskStore.getAllNotes();

  // Collect all folders
  const folders = noteFolderStore.folders;

  // Collect note history
  const noteHistories = noteHistoryStore.histories;
  
  console.log('Data collection summary:', {
    workspaces: workspaceStore.workspaces.length,
    tasks: taskStore.tasks.length,
    standaloneNotes: allNotes.filter((n) => !n.taskId).length,
    folders: folders.length,
    images: images.length,
    taskTemplates: templateStore.taskTemplates.length,
    noteTemplates: templateStore.noteTemplates.length,
    noteHistories: Object.keys(noteHistories).length,
  });

  // Build export data
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: Date.now(),
    workspaces: workspaceStore.workspaces,
    tasks: taskStore.tasks, // Tasks already include their notes, subtasks, checklists, etc.
    standaloneNotes: allNotes.filter((note) => !note.taskId), // Only standalone notes
    folders: folders,
    templates: {
      tasks: templateStore.taskTemplates,
      notes: templateStore.noteTemplates,
    },
    images: images,
    noteHistories: noteHistories, // Include note version history
    metadata: {
      totalTasks: taskStore.tasks.length,
      totalWorkspaces: workspaceStore.workspaces.length,
      totalTemplates: templateStore.taskTemplates.length + templateStore.noteTemplates.length,
      totalNotes: allNotes.length,
      totalFolders: folders.length,
      totalImages: images.length,
    },
  };

  return exportData;
}

