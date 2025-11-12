import type { Subtask } from '@/types';

export interface SubtaskNode extends Subtask {
  children: SubtaskNode[];
  depth: number;
}

/**
 * Build a tree structure from flat subtask array
 */
export function buildSubtaskTree(subtasks: Subtask[]): SubtaskNode[] {
  // Create a map for quick lookup
  const nodeMap = new Map<string, SubtaskNode>();
  
  // Initialize all nodes
  subtasks.forEach((subtask) => {
    nodeMap.set(subtask.id, {
      ...subtask,
      children: [],
      depth: 0,
    });
  });
  
  // Build tree structure
  const roots: SubtaskNode[] = [];
  
  subtasks.forEach((subtask) => {
    const node = nodeMap.get(subtask.id)!;
    
    if (subtask.parentSubtaskId) {
      const parent = nodeMap.get(subtask.parentSubtaskId);
      if (parent) {
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });
  
  // Sort children by order
  const sortChildren = (nodes: SubtaskNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };
  
  sortChildren(roots);
  
  return roots;
}

/**
 * Flatten tree back to array (for storage)
 */
export function flattenSubtaskTree(nodes: SubtaskNode[]): Subtask[] {
  const result: Subtask[] = [];
  
  const traverse = (node: SubtaskNode) => {
    const { children, depth, ...subtask } = node;
    result.push(subtask);
    node.children.forEach(traverse);
  };
  
  nodes.forEach(traverse);
  return result;
}

/**
 * Get all descendant IDs (for deletion)
 */
export function getSubtaskDescendants(
  subtasks: Subtask[],
  parentId: string
): string[] {
  const descendants: string[] = [];
  const children = subtasks.filter((st) => st.parentSubtaskId === parentId);
  
  children.forEach((child) => {
    descendants.push(child.id);
    descendants.push(...getSubtaskDescendants(subtasks, child.id));
  });
  
  return descendants;
}

/**
 * Calculate progress from nested subtasks
 */
export function calculateNestedProgress(nodes: SubtaskNode[]): number {
  if (nodes.length === 0) return 0;
  
  let totalWeight = 0;
  let completedWeight = 0;
  
  const calculateNode = (node: SubtaskNode, weight: number) => {
    totalWeight += weight;
    if (node.completed) {
      completedWeight += weight;
    }
    
    // Distribute weight among children if they exist
    if (node.children.length > 0) {
      const childWeight = weight / node.children.length;
      node.children.forEach((child) => calculateNode(child, childWeight));
    }
  };
  
  const nodeWeight = 1 / nodes.length;
  nodes.forEach((node) => calculateNode(node, nodeWeight));
  
  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
}

