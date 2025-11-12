import type { Task, Workspace } from '@/types';
import type { TaskTemplate, NoteTemplate } from '@/types/template';
import type { StoredImage } from '@/stores/imageStore';

export interface ExportData {
  version: string;
  exportDate: number;
  workspaces: Workspace[];
  tasks: Task[];
  templates: {
    tasks: TaskTemplate[];
    notes: NoteTemplate[];
  };
  images: StoredImage[];
  metadata: {
    totalTasks: number;
    totalWorkspaces: number;
    totalTemplates: number;
  };
}

export function exportToJSON(
  workspaces: Workspace[],
  tasks: Task[],
  taskTemplates: TaskTemplate[],
  noteTemplates: NoteTemplate[],
  images: StoredImage[]
): string {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: Date.now(),
    workspaces,
    tasks,
    templates: {
      tasks: taskTemplates,
      notes: noteTemplates,
    },
    images,
    metadata: {
      totalTasks: tasks.length,
      totalWorkspaces: workspaces.length,
      totalTemplates: taskTemplates.length + noteTemplates.length,
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

