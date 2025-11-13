import type { Task, Workspace, Note } from '@/types';
import type { TaskTemplate, NoteTemplate } from '@/types/template';
import type { StoredImage } from '@/stores/imageStore';
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
  };
}

/**
 * Export data to JSON string
 * @deprecated Use collectAllData() from dataCollector.ts instead for complete data collection
 */
export function exportToJSON(
  workspaces: Workspace[],
  tasks: Task[],
  taskTemplates: TaskTemplate[],
  noteTemplates: NoteTemplate[],
  images: StoredImage[],
  standaloneNotes?: Note[],
  folders?: NoteFolder[]
): string {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: Date.now(),
    workspaces,
    tasks,
    standaloneNotes,
    folders,
    templates: {
      tasks: taskTemplates,
      notes: noteTemplates,
    },
    images,
    metadata: {
      totalTasks: tasks.length,
      totalWorkspaces: workspaces.length,
      totalTemplates: taskTemplates.length + noteTemplates.length,
      totalNotes: standaloneNotes?.length,
      totalFolders: folders?.length,
      totalImages: images.length,
    },
  };

  return JSON.stringify(exportData, null, 2);
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

