export interface WorkspaceSettings {
  defaultView: 'list' | 'board' | 'calendar';
  defaultPriority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  showCompletedTasks: boolean;
  sortBy: 'created' | 'updated' | 'dueDate' | 'priority' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  settings: WorkspaceSettings;
  archived: boolean;
}

