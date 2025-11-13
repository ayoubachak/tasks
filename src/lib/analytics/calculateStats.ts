import type { Task, TaskStatus, Priority } from '@/types';
import { startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<Priority, number>;
  completionRate: number;
  averageCompletionTime: number; // days
  tasksCreatedThisWeek: number;
  tasksCompletedThisWeek: number;
  tasksDueThisWeek: number;
  tasksCreatedThisMonth: number;
  tasksCompletedThisMonth: number;
  tasksDueThisMonth: number;
  tasksByTag: Record<string, number>;
  streakDays: number;
  lastUpdated: number;
}

export function calculateTaskStats(tasks: Task[]): TaskStats {
  const now = Date.now();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const stats: TaskStats = {
    totalTasks: tasks.length,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    tasksByStatus: {
      todo: 0,
      'in-progress': 0,
      blocked: 0,
      done: 0,
      archived: 0,
    },
    tasksByPriority: {
      none: 0,
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
    completionRate: 0,
    averageCompletionTime: 0,
    tasksCreatedThisWeek: 0,
    tasksCompletedThisWeek: 0,
    tasksDueThisWeek: 0,
    tasksCreatedThisMonth: 0,
    tasksCompletedThisMonth: 0,
    tasksDueThisMonth: 0,
    tasksByTag: {},
    streakDays: 0,
    lastUpdated: now,
  };

  const completedTasksWithTime: Task[] = [];
  const completionTimes: number[] = [];

  tasks.forEach((task) => {
    // Count by status
    stats.tasksByStatus[task.status]++;
    
    if (task.status === 'done') {
      stats.completedTasks++;
      if (task.completedAt && task.createdAt) {
        const completionTime = differenceInDays(task.completedAt, task.createdAt);
        completionTimes.push(completionTime);
        completedTasksWithTime.push(task);
      }
    } else if (task.status === 'in-progress') {
      stats.inProgressTasks++;
    } else if (task.status === 'blocked') {
      stats.blockedTasks++;
    }

    // Count by priority
    stats.tasksByPriority[task.priority]++;

    // Overdue tasks
    if (task.dueDate && task.dueDate < now && task.status !== 'done') {
      stats.overdueTasks++;
    }

    // Tasks created this week
    if (task.createdAt >= weekStart.getTime() && task.createdAt <= weekEnd.getTime()) {
      stats.tasksCreatedThisWeek++;
    }
    if (task.createdAt >= monthStart.getTime() && task.createdAt <= monthEnd.getTime()) {
      stats.tasksCreatedThisMonth++;
    }

    // Tasks completed this week
    if (task.completedAt && task.completedAt >= weekStart.getTime() && task.completedAt <= weekEnd.getTime()) {
      stats.tasksCompletedThisWeek++;
    }
    if (task.completedAt && task.completedAt >= monthStart.getTime() && task.completedAt <= monthEnd.getTime()) {
      stats.tasksCompletedThisMonth++;
    }

    // Tasks due this week
    if (task.dueDate && task.dueDate >= weekStart.getTime() && task.dueDate <= weekEnd.getTime()) {
      stats.tasksDueThisWeek++;
    }
    if (task.dueDate && task.dueDate >= monthStart.getTime() && task.dueDate <= monthEnd.getTime()) {
      stats.tasksDueThisMonth++;
    }

    // Count by tags
    task.tags.forEach((tag) => {
      stats.tasksByTag[tag] = (stats.tasksByTag[tag] || 0) + 1;
    });
  });

  // Calculate completion rate
  if (stats.totalTasks > 0) {
    stats.completionRate = (stats.completedTasks / stats.totalTasks) * 100;
  }

  // Calculate average completion time
  if (completionTimes.length > 0) {
    stats.averageCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
  }

  // Calculate streak (consecutive days with at least one completed task)
  const completedTasks = tasks.filter((t) => t.status === 'done' && t.completedAt);
  if (completedTasks.length > 0) {
    const sortedByCompletion = [...completedTasks].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    let streak = 0;
    let currentDate = startOfDay(new Date());
    
    for (const task of sortedByCompletion) {
      if (!task.completedAt) continue;
      const taskDate = startOfDay(new Date(task.completedAt));
      const daysDiff = differenceInDays(currentDate, taskDate);
      
      if (daysDiff === streak) {
        streak++;
        currentDate = taskDate;
      } else if (daysDiff > streak) {
        break;
      }
    }
    
    stats.streakDays = streak;
  }

  return stats;
}

