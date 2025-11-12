import type { Task } from '@/types';
import { format } from 'date-fns';

export function exportTasksToMarkdown(tasks: Task[]): string {
  if (tasks.length === 0) {
    return '# Tasks Export\n\nNo tasks to export.';
  }

  const lines: string[] = [
    '# Tasks Export',
    '',
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    `Total Tasks: ${tasks.length}`,
    '',
    '---',
    '',
  ];

  tasks.forEach((task, index) => {
    lines.push(`## ${index + 1}. ${task.title}`);
    lines.push('');

    // Metadata
    lines.push('**Metadata:**');
    lines.push(`- Status: ${task.status}`);
    lines.push(`- Priority: ${task.priority}`);
    if (task.dueDate) {
      lines.push(`- Due Date: ${format(new Date(task.dueDate), 'yyyy-MM-dd')}`);
    }
    lines.push(`- Progress: ${task.progress}%`);
    if (task.tags.length > 0) {
      lines.push(`- Tags: ${task.tags.join(', ')}`);
    }
    lines.push('');

    // Description
    if (task.description) {
      lines.push('**Description:**');
      lines.push('');
      lines.push(task.description);
      lines.push('');
    }

    // Subtasks
    if (task.subtasks.length > 0) {
      lines.push('**Subtasks:**');
      lines.push('');
      task.subtasks.forEach((subtask) => {
        const checkbox = subtask.completed ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${subtask.title}`);
      });
      lines.push('');
    }

    // Notes
    if (task.notes.length > 0) {
      lines.push('**Notes:**');
      lines.push('');
      task.notes.forEach((note, noteIndex) => {
        lines.push(`### Note ${noteIndex + 1}`);
        if (note.pinned) {
          lines.push('*Pinned*');
        }
        lines.push('');
        lines.push(note.content);
        lines.push('');
      });
    }

    // Dependencies
    if (task.dependencies.length > 0 || task.blockedBy.length > 0) {
      lines.push('**Dependencies:**');
      if (task.dependencies.length > 0) {
        lines.push(`- Depends on: ${task.dependencies.length} task(s)`);
      }
      if (task.blockedBy.length > 0) {
        lines.push(`- Blocked by: ${task.blockedBy.length} task(s)`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadMarkdown(data: string, filename: string = 'tasks-export.md'): void {
  const blob = new Blob([data], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

