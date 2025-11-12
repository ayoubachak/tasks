import type { RecurrenceRule } from '@/types';

/**
 * Calculate the next occurrence date based on recurrence rule
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  lastOccurrence: number,
  startDate: number
): number | null {
  const lastDate = new Date(lastOccurrence);
  const start = new Date(startDate);
  const next = new Date(lastDate);

  switch (rule.pattern) {
    case 'daily':
      next.setDate(next.getDate() + rule.interval);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 7 * rule.interval);
      // If specific days of week are specified, find next matching day
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const targetDays = rule.daysOfWeek;
        let daysToAdd = 1;
        let attempts = 0;
        while (attempts < 14) {
          const checkDate = new Date(next);
          checkDate.setDate(checkDate.getDate() + daysToAdd);
          if (targetDays.includes(checkDate.getDay())) {
            next.setTime(checkDate.getTime());
            break;
          }
          daysToAdd++;
          attempts++;
        }
      }
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + rule.interval);
      // If specific day of month is specified
      if (rule.dayOfMonth) {
        next.setDate(rule.dayOfMonth);
      }
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + rule.interval);
      // Preserve month and day
      if (start.getMonth() !== undefined) {
        next.setMonth(start.getMonth());
        next.setDate(start.getDate());
      }
      break;

    case 'custom':
      // For custom, just add interval days (simplified)
      next.setDate(next.getDate() + rule.interval);
      break;
  }

  // Check if we've exceeded end date
  if (rule.endDate && next.getTime() > rule.endDate) {
    return null;
  }

  return next.getTime();
}

/**
 * Check if a task should be created based on recurrence
 */
export function shouldCreateRecurrence(
  rule: RecurrenceRule,
  lastCreated: number | undefined,
  dueDate: number | undefined
): boolean {
  if (!dueDate) return false;

  const now = Date.now();
  const due = new Date(dueDate);
  
  // If task is overdue and we haven't created the next occurrence
  if (now >= due.getTime()) {
    if (!lastCreated || lastCreated < due.getTime()) {
      return true;
    }
  }

  return false;
}

/**
 * Format recurrence rule as human-readable string
 */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  switch (rule.pattern) {
    case 'daily':
      return rule.interval === 1 
        ? 'Daily' 
        : `Every ${rule.interval} days`;
    
    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const days = rule.daysOfWeek.map((d) => dayNames[d]).join(', ');
        return rule.interval === 1 
          ? `Weekly on ${days}` 
          : `Every ${rule.interval} weeks on ${days}`;
      }
      return rule.interval === 1 
        ? 'Weekly' 
        : `Every ${rule.interval} weeks`;
    
    case 'monthly':
      if (rule.dayOfMonth) {
        return rule.interval === 1 
          ? `Monthly on day ${rule.dayOfMonth}` 
          : `Every ${rule.interval} months on day ${rule.dayOfMonth}`;
      }
      return rule.interval === 1 
        ? 'Monthly' 
        : `Every ${rule.interval} months`;
    
    case 'yearly':
      return rule.interval === 1 
        ? 'Yearly' 
        : `Every ${rule.interval} years`;
    
    case 'custom':
      return `Custom (every ${rule.interval} days)`;
  }
}

/**
 * Validate recurrence rule
 */
export function validateRecurrenceRule(rule: RecurrenceRule): { valid: boolean; error?: string } {
  if (rule.interval < 1) {
    return { valid: false, error: 'Interval must be at least 1' };
  }

  if (rule.pattern === 'weekly' && rule.daysOfWeek) {
    if (rule.daysOfWeek.length === 0) {
      return { valid: false, error: 'At least one day must be selected for weekly recurrence' };
    }
    if (rule.daysOfWeek.some((d) => d < 0 || d > 6)) {
      return { valid: false, error: 'Invalid day of week' };
    }
  }

  if (rule.pattern === 'monthly' && rule.dayOfMonth) {
    if (rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
      return { valid: false, error: 'Day of month must be between 1 and 31' };
    }
  }

  if (rule.endDate && rule.endDate < Date.now()) {
    return { valid: false, error: 'End date must be in the future' };
  }

  return { valid: true };
}
