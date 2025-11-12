import type { Task } from '@/types';

/**
 * Check if adding a dependency would create a circular reference
 */
export function wouldCreateCycle(
  tasks: Task[],
  taskId: string,
  dependencyId: string
): boolean {
  // A task cannot depend on itself
  if (taskId === dependencyId) {
    return true;
  }

  // Check if dependencyId is in taskId's dependency chain
  const visited = new Set<string>();
  
  const hasPath = (from: string, to: string): boolean => {
    if (from === to) return true;
    if (visited.has(from)) return false;
    
    visited.add(from);
    const task = tasks.find((t) => t.id === from);
    if (!task) return false;
    
    // Check all dependencies
    for (const depId of task.dependencies) {
      if (hasPath(depId, to)) {
        return true;
      }
    }
    
    // Check blockedBy (reverse dependencies)
    for (const blockerId of task.blockedBy) {
      if (hasPath(blockerId, to)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Check if dependencyId would create a cycle by checking if there's a path
  // from dependencyId back to taskId
  return hasPath(dependencyId, taskId);
}

/**
 * Get all tasks that can be dependencies (excluding current task and those that would create cycles)
 */
export function getAvailableDependencies(
  tasks: Task[],
  currentTaskId: string,
  workspaceId: string
): Task[] {
  return tasks.filter((task) => {
    // Must be in same workspace
    if (task.workspaceId !== workspaceId) return false;
    
    // Cannot be the same task
    if (task.id === currentTaskId) return false;
    
    // Cannot create a cycle
    if (wouldCreateCycle(tasks, currentTaskId, task.id)) return false;
    
    return true;
  });
}

/**
 * Get all tasks that depend on this task (reverse dependencies)
 */
export function getDependentTasks(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) => 
    task.dependencies.includes(taskId) || task.blockedBy.includes(taskId)
  );
}

/**
 * Get all tasks that this task depends on
 */
export function getDependencyTasks(tasks: Task[], task: Task): Task[] {
  const dependencyIds = [...task.dependencies, ...task.blockedBy];
  return tasks.filter((t) => dependencyIds.includes(t.id));
}

