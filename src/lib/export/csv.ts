import type { Task } from '@/types';
import { format } from 'date-fns';

export function exportTasksToCSV(tasks: Task[]): string {
  if (tasks.length === 0) {
    return 'No tasks to export';
  }

  // CSV Headers
  const headers = [
    'ID',
    'Title',
    'Status',
    'Priority',
    'Description',
    'Due Date',
    'Created At',
    'Updated At',
    'Progress',
    'Tags',
    'Subtasks Count',
    'Notes Count',
    'Dependencies Count',
    'Recurring',
  ];

  // CSV Rows
  const rows = tasks.map((task) => {
    return [
      task.id,
      escapeCSV(task.title),
      task.status,
      task.priority,
      escapeCSV(task.description || ''),
      task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      format(new Date(task.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      task.progress.toString(),
      task.tags.join('; '),
      task.subtasks.length.toString(),
      task.notes.length.toString(),
      (task.dependencies.length + task.blockedBy.length).toString(),
      task.recurrence ? 'Yes' : 'No',
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

export function downloadCSV(data: string, filename: string = 'tasks-export.csv'): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

