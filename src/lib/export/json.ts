import type { Task, Workspace, Note } from '@/types';
import type { TaskTemplate, NoteTemplate } from '@/types/template';
import type { StoredMedia, MediaType } from '@/stores/mediaStore';
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
  media: StoredMedia[];
  images?: StoredMedia[]; // Legacy compatibility
  audios?: StoredMedia[]; // Legacy compatibility
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
    totalMedia?: number;
    mediaBreakdown?: Partial<Record<MediaType, number>>;
  };
}

/**
 * Export ExportData to JSON string
 * Use collectAllData() from dataCollector.ts to get the ExportData object first
 */
export function exportToJSON(exportData: ExportData): string {
  // Ensure metadata is up to date
  const media = exportData.media ?? [];
  const mediaBreakdown = media.reduce<Record<MediaType, number>>((acc, asset) => {
    acc[asset.type] = (acc[asset.type] ?? 0) + 1;
    return acc;
  }, {} as Record<MediaType, number>);

  const dataWithMetadata: ExportData = {
    ...exportData,
    media,
    images: exportData.images ?? media.filter((asset) => asset.type === 'image' || asset.type === 'photo'),
    audios: exportData.audios ?? media.filter((asset) => asset.type === 'audio'),
    exportDate: Date.now(),
    metadata: {
      totalTasks: exportData.tasks.length,
      totalWorkspaces: exportData.workspaces.length,
      totalTemplates: (exportData.templates.tasks?.length || 0) + (exportData.templates.notes?.length || 0),
      totalNotes: exportData.standaloneNotes?.length,
      totalFolders: exportData.folders?.length,
      totalMedia: media.length,
      mediaBreakdown,
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

    if (!Array.isArray(data.media)) {
      data.media = [];
    }

    if (Array.isArray(data.images) && data.images.length > 0) {
      data.images.forEach((legacy) => {
        if (!legacy) return;
        const normalized: StoredMedia = {
          ...legacy,
          type: legacy.type ?? 'image',
        };
        if (!data.media.find((item) => item.id === normalized.id)) {
          data.media.push(normalized);
        }
      });
    }

    if (Array.isArray(data.audios) && data.audios.length > 0) {
      data.audios.forEach((legacy) => {
        if (!legacy) return;
        const normalized: StoredMedia = {
          ...legacy,
          type: legacy.type ?? 'audio',
        };
        if (!data.media.find((item) => item.id === normalized.id)) {
          data.media.push(normalized);
        }
      });
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

