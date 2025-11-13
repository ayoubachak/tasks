export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done' | 'archived';
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  id: string;
  taskId: string;
  parentSubtaskId?: string;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
  subtasks?: Subtask[];
  createdAt: number;
  completedAt?: number;
}

export interface ImageData {
  id: string;
  data: string; // base64
  thumbnail?: string; // compressed thumbnail
  mimeType: string;
  filename: string;
  size: number; // bytes
  width?: number;
  height?: number;
  alt?: string;
  createdAt: number;
}

export interface NoteFolder {
  id: string;
  workspaceId: string;
  parentFolderId?: string; // For nested folders
  name: string;
  color?: string; // Optional folder color
  icon?: string; // Optional folder icon
  order: number; // For sorting
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  workspaceId: string; // Notes belong to a workspace, just like tasks
  folderId?: string; // Optional - notes can be in a folder
  taskId?: string; // Optional - notes can be standalone or linked to a task
  title: string; // Note title (separate from task title)
  content: string; // Markdown
  version: number;
  previousVersionId?: string;
  images: ImageData[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  tags: string[];
}

export interface RecurrenceRule {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  endDate?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface Task {
  id: string;
  workspaceId: string;
  parentTaskId?: string;

  // Basic Info
  title: string;
  description: string; // Markdown
  status: TaskStatus;

  // Organization
  priority: Priority;
  tags: string[];
  labels: string[];

  // Time Management
  dueDate?: number;
  startDate?: number;
  estimatedTime?: number; // minutes
  actualTime?: number; // minutes
  reminderDate?: number;

  // Recurrence
  recurrence?: RecurrenceRule;

  // Dependencies
  dependencies: string[]; // task IDs
  blockedBy: string[]; // task IDs

  // Progress Tracking
  progress: number; // 0-100
  completedAt?: number;

  // Rich Content
  notes: Note[];
  attachments: ImageData[];
  subtasks: Subtask[];
  checklists: Checklist[];

  // Metadata
  createdAt: number;
  updatedAt: number;
  templateId?: string;

  // Custom Fields
  customFields: Record<string, unknown>;
}

