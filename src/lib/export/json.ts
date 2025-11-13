import type { Task, Workspace, Note } from '@/types';
import type { TaskTemplate, NoteTemplate } from '@/types/template';
import type { StoredImage } from '@/stores/imageStore';
import type { StoredAudio } from '@/stores/audioStore';
import type { NoteFolder } from '@/types/task';

export interface ExportData {
  version: string;
  exportDate: number;
  workspaces: Workspace[];
  tasks: Task[]; // Tasks include their notes, subtasks, checklists, dependencies, etc.
  standaloneNotes?: Note[]; // Notes not linked to tasks
  folders?: NoteFolder[]; // Note folders
  templates: {
    tasks: TaskTemplate[];
    notes: NoteTemplate[];
  };
  images: StoredImage[];
  audios?: StoredAudio[];
  noteHistories?: Record<string, Array<{
    noteId: string;
    version: number;
    content: string;
    updatedAt: number;
    isCurrent: boolean;
  }>>; // Note version history
  metadata: {
    totalTasks: number;
    totalWorkspaces: number;
    totalTemplates: number;
    totalNotes?: number;
    totalFolders?: number;
    totalImages?: number;
    totalAudios?: number;
  };
}

/**
 * Export ExportData to JSON string
 * Use collectAllData() from dataCollector.ts to get the ExportData object first
 */
export function exportToJSON(exportData: ExportData): string {
  // Ensure metadata is up to date
  const dataWithMetadata: ExportData = {
    ...exportData,
    exportDate: Date.now(),
    metadata: {
      totalTasks: exportData.tasks.length,
      totalWorkspaces: exportData.workspaces.length,
      totalTemplates: (exportData.templates.tasks?.length || 0) + (exportData.templates.notes?.length || 0),
      totalNotes: exportData.standaloneNotes?.length,
      totalFolders: exportData.folders?.length,
      totalImages: exportData.images.length,
      totalAudios: exportData.audios?.length,
    },
  };

  return JSON.stringify(dataWithMetadata, null, 2);
}

export function importFromJSON(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString) as ExportData;
    
    // Validate structure
    if (!data.workspaces || !data.tasks) {
      throw new Error('Invalid export format: missing workspaces or tasks');
    }

    return data;
  } catch (error) {
    console.error('Failed to import JSON:', error);
    return null;
  }
}

export function downloadJSON(data: string, filename: string = 'tasks-export.json'): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

