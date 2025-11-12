export interface ChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  order: number;
  dueDate?: number;
  createdAt: number;
  completedAt?: number;
}

export interface Checklist {
  id: string;
  taskId: string;
  title: string;
  items: ChecklistItem[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

