import type { Task, TaskStatus, Priority } from '@/types';
import type { Filter, FilterOperator } from '@/types/filter';
import { isAfter, isBefore, isToday, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function matchesFilter(task: Task, filter: Filter): boolean {
  const { field, operator, value } = filter;

  switch (field) {
    case 'status':
      return applyOperator(task.status, operator, value as TaskStatus);
    case 'priority':
      return applyOperator(task.priority, operator, value as Priority);
    case 'tags':
      return applyOperator(task.tags, operator, value);
    case 'dueDate':
      return applyDateOperator(task.dueDate, operator, value);
    case 'title':
    case 'description':
      return applyStringOperator(task[field], operator, value as string);
    case 'hasSubtasks':
      return applyOperator(task.subtasks.length > 0, operator, value as boolean);
    case 'hasNotes':
      return applyOperator(task.notes.length > 0, operator, value as boolean);
    case 'hasDependencies':
      return applyOperator(task.dependencies.length > 0 || task.blockedBy.length > 0, operator, value as boolean);
    case 'isRecurring':
      return applyOperator(!!task.recurrence, operator, value as boolean);
    case 'progress':
      return applyNumberOperator(task.progress, operator, value as number);
    default:
      return true;
  }
}

function applyOperator<T>(fieldValue: T, operator: FilterOperator, filterValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === filterValue;
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(filterValue);
      }
      if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
        return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
      }
      return false;
    case 'in':
      if (Array.isArray(filterValue)) {
        return filterValue.includes(fieldValue);
      }
      return false;
    case 'notIn':
      if (Array.isArray(filterValue)) {
        return !filterValue.includes(fieldValue);
      }
      return false;
    case 'isNull':
      return fieldValue === null || fieldValue === undefined;
    case 'isNotNull':
      return fieldValue !== null && fieldValue !== undefined;
    default:
      return true;
  }
}

function applyStringOperator(fieldValue: string, operator: FilterOperator, filterValue: string): boolean {
  if (!fieldValue) return operator === 'isNull';
  if (operator === 'isNotNull') return true;
  if (operator === 'isNull') return false;

  const lowerField = fieldValue.toLowerCase();
  const lowerFilter = filterValue.toLowerCase();

  switch (operator) {
    case 'equals':
      return lowerField === lowerFilter;
    case 'contains':
      return lowerField.includes(lowerFilter);
    default:
      return true;
  }
}

function applyNumberOperator(fieldValue: number, operator: FilterOperator, filterValue: number): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === filterValue;
    case 'greaterThan':
      return fieldValue > filterValue;
    case 'lessThan':
      return fieldValue < filterValue;
    default:
      return true;
  }
}

function applyDateOperator(fieldValue: number | undefined, operator: FilterOperator, filterValue: unknown): boolean {
  if (!fieldValue) {
    return operator === 'isNull';
  }
  if (operator === 'isNotNull') return true;
  if (operator === 'isNull') return false;

  const taskDate = new Date(fieldValue);
  const now = new Date();

  switch (operator) {
    case 'equals':
      if (filterValue === 'today') {
        return isToday(taskDate);
      }
      if (filterValue === 'thisWeek') {
        return taskDate >= startOfWeek(now) && taskDate <= endOfWeek(now);
      }
      if (filterValue === 'thisMonth') {
        return taskDate >= startOfMonth(now) && taskDate <= endOfMonth(now);
      }
      if (typeof filterValue === 'number') {
        return isToday(new Date(filterValue)) && isToday(taskDate);
      }
      return false;
    case 'lessThan':
      if (filterValue === 'today') {
        return isBefore(taskDate, startOfDay(now));
      }
      return isBefore(taskDate, new Date(filterValue as number));
    case 'greaterThan':
      if (filterValue === 'today') {
        return isAfter(taskDate, endOfDay(now));
      }
      return isAfter(taskDate, new Date(filterValue as number));
    default:
      return true;
  }
}

export function applyFilters(tasks: Task[], filters: Filter[]): Task[] {
  if (filters.length === 0) return tasks;

  return tasks.filter((task) => {
    return filters.every((filter) => matchesFilter(task, filter));
  });
}

export function createQuickFilters(): Array<{ id: string; label: string; filters: Filter[] }> {
  const now = Date.now();
  const today = startOfDay(new Date()).getTime();
  const weekEnd = endOfWeek(new Date()).getTime();

  return [
    {
      id: 'today',
      label: 'Due Today',
      filters: [
        { id: 'today-due', field: 'dueDate', operator: 'equals', value: 'today' },
      ],
    },
    {
      id: 'overdue',
      label: 'Overdue',
      filters: [
        { id: 'overdue-due', field: 'dueDate', operator: 'lessThan', value: 'today' },
        { id: 'overdue-not-done', field: 'status', operator: 'notIn', value: ['done', 'archived'] },
      ],
    },
    {
      id: 'thisWeek',
      label: 'Due This Week',
      filters: [
        { id: 'week-due', field: 'dueDate', operator: 'equals', value: 'thisWeek' },
      ],
    },
    {
      id: 'highPriority',
      label: 'High Priority',
      filters: [
        { id: 'high-priority', field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      ],
    },
    {
      id: 'inProgress',
      label: 'In Progress',
      filters: [
        { id: 'status-in-progress', field: 'status', operator: 'equals', value: 'in-progress' },
      ],
    },
    {
      id: 'blocked',
      label: 'Blocked',
      filters: [
        { id: 'status-blocked', field: 'status', operator: 'equals', value: 'blocked' },
      ],
    },
    {
      id: 'noDueDate',
      label: 'No Due Date',
      filters: [
        { id: 'no-due', field: 'dueDate', operator: 'isNull', value: null },
      ],
    },
  ];
}

