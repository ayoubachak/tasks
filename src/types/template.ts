import type { Task, Note } from './task';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  workspaceId?: string;
  
  // Template structure mirrors Task but with placeholders
  taskStructure: Partial<Task>;
  
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  workspaceId?: string;
  
  // Template content
  content: string;
  
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

