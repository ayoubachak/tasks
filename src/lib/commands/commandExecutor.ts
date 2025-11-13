import { useTaskStore } from '@/stores/taskStore';
import type { TaskStatus, Priority, RecurrenceRule } from '@/types';
import type { ParsedCommand } from './commandParser';

export interface CommandResult {
  success: boolean;
  type: 'task' | 'note';
  title: string;
  error?: string;
  lineNumber?: number;
}

function parseDate(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  
  // Try ISO format first: YYYY-MM-DDTHH:mm
  let date = new Date(dateStr.replace(' ', 'T'));
  
  // If that fails, try YYYY-MM-DD
  if (isNaN(date.getTime())) {
    date = new Date(dateStr);
  }
  
  return isNaN(date.getTime()) ? undefined : date.getTime();
}

function parseRecurrence(recurrenceStr: string): RecurrenceRule | undefined {
  if (!recurrenceStr) return undefined;
  
  // Format: pattern:interval[:endDate] or pattern:interval:daysOfWeek
  const parts = recurrenceStr.split(':');
  if (parts.length < 2) return undefined;
  
  const pattern = parts[0] as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  const interval = parseInt(parts[1], 10);
  
  if (isNaN(interval) || interval < 1) return undefined;
  
  const rule: RecurrenceRule = {
    pattern,
    interval,
  };
  
  // Check if third part is endDate (YYYY-MM-DD) or daysOfWeek (comma-separated numbers)
  if (parts.length >= 3) {
    const thirdPart = parts[2];
    
    // Check if it's a date (contains dashes)
    if (thirdPart.includes('-')) {
      const endDate = parseDate(thirdPart);
      if (endDate) {
        rule.endDate = endDate;
      }
    } else {
      // It's daysOfWeek (comma-separated numbers)
      const days = thirdPart.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
      if (days.length > 0) {
        rule.daysOfWeek = days;
      }
    }
    
    // Check if there's a fourth part (could be day of month for monthly)
    if (parts.length >= 4 && pattern === 'monthly') {
      const dayOfMonth = parseInt(parts[3], 10);
      if (!isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
        rule.dayOfMonth = dayOfMonth;
      }
    }
  }
  
  return rule;
}

export function executeCommands(
  commands: ParsedCommand[],
  workspaceId: string
): CommandResult[] {
  const taskStore = useTaskStore.getState();
  const results: CommandResult[] = [];
  
  for (const command of commands) {
    try {
      if (command.type === 'task') {
        // Create task
        const task = taskStore.createTask(workspaceId, command.title, command.options?.description);
        
        // Build update object
        const updates: Partial<typeof task> = {};
        
        if (command.options?.status) {
          updates.status = command.options.status as TaskStatus;
        }
        
        if (command.options?.priority) {
          updates.priority = command.options.priority as Priority;
        }
        
        if (command.options?.tags) {
          updates.tags = command.options.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        
        if (command.options?.labels) {
          updates.labels = command.options.labels.split(',').map(l => l.trim()).filter(Boolean);
        }
        
        if (command.options?.due) {
          const dueDate = parseDate(command.options.due);
          if (dueDate) updates.dueDate = dueDate;
        }
        
        if (command.options?.start) {
          const startDate = parseDate(command.options.start);
          if (startDate) updates.startDate = startDate;
        }
        
        if (command.options?.reminder) {
          const reminderDate = parseDate(command.options.reminder);
          if (reminderDate) updates.reminderDate = reminderDate;
        }
        
        if (command.options?.progress) {
          const progress = parseInt(command.options.progress, 10);
          if (!isNaN(progress) && progress >= 0 && progress <= 100) {
            updates.progress = progress;
          }
        }
        
        if (command.options?.estimated) {
          const estimated = parseInt(command.options.estimated, 10);
          if (!isNaN(estimated) && estimated >= 0) {
            updates.estimatedTime = estimated;
          }
        }
        
        if (command.options?.actual) {
          const actual = parseInt(command.options.actual, 10);
          if (!isNaN(actual) && actual >= 0) {
            updates.actualTime = actual;
          }
        }
        
        if (command.options?.recurrence) {
          const recurrence = parseRecurrence(command.options.recurrence);
          if (recurrence) {
            updates.recurrence = recurrence;
          }
        }
        
        // Apply all updates
        if (Object.keys(updates).length > 0) {
          taskStore.updateTask(task.id, updates);
        }
        
        results.push({
          success: true,
          type: 'task',
          title: task.title,
          lineNumber: command.lineNumber,
        });
      } else if (command.type === 'note') {
        // Create note
        const note = taskStore.addNote(
          workspaceId,
          null, // standalone note
          command.content || '',
          command.title
        );
        
        results.push({
          success: true,
          type: 'note',
          title: note.title,
          lineNumber: command.lineNumber,
        });
      }
    } catch (error) {
      results.push({
        success: false,
        type: command.type,
        title: command.title,
        error: error instanceof Error ? error.message : 'Unknown error',
        lineNumber: command.lineNumber,
      });
    }
  }
  
  return results;
}

export interface ExecutionSummary {
  successful: number;
  failed: number;
  tasks: number;
  notes: number;
}

export function getExecutionSummary(results: CommandResult[]): ExecutionSummary {
  const summary: ExecutionSummary = {
    successful: 0,
    failed: 0,
    tasks: 0,
    notes: 0,
  };
  
  for (const result of results) {
    if (result.success) {
      summary.successful++;
      if (result.type === 'task') {
        summary.tasks++;
      } else {
        summary.notes++;
      }
    } else {
      summary.failed++;
    }
  }
  
  return summary;
}

