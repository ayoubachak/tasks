import { useState } from 'react';
import { useTaskStore } from '@/stores';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildSubtaskTree } from '@/lib/subtasks/treeUtils';
import type { SubtaskNode } from '@/lib/subtasks/treeUtils';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2 } from 'lucide-react';
import type { Subtask } from '@/types';

interface SubtaskTreeProps {
  taskId: string;
  subtasks: Subtask[];
  maxDepth?: number;
}

export function SubtaskTree({ taskId, subtasks, maxDepth = 10 }: SubtaskTreeProps) {
  const { toggleSubtask, addSubtask, deleteSubtask, updateSubtask } = useTaskStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [addingToParent, setAddingToParent] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const tree = buildSubtaskTree(subtasks);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggle = (subtaskId: string) => {
    toggleSubtask(taskId, subtaskId);
  };

  const handleAdd = (parentId?: string) => {
    if (!newSubtaskTitle.trim()) return;
    addSubtask(taskId, newSubtaskTitle.trim(), parentId);
    setNewSubtaskTitle('');
    setAddingToParent(null);
    // Expand parent if adding nested
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
    }
  };

  const handleDelete = (subtaskId: string) => {
    if (confirm('Delete this subtask and all its children?')) {
      deleteSubtask(taskId, subtaskId);
    }
  };

  const handleEdit = (node: SubtaskNode) => {
    setEditingId(node.id);
    setEditingTitle(node.title);
  };

  const handleSaveEdit = (subtaskId: string) => {
    if (editingTitle.trim()) {
      updateSubtask(taskId, subtaskId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const renderNode = (node: SubtaskNode, depth: number = 0): React.ReactNode => {
    if (depth > maxDepth) return null;

    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isEditing = editingId === node.id;
    const isAdding = addingToParent === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 group ${
            depth > 0 ? 'ml-6' : ''
          }`}
          style={{ paddingLeft: `${depth * 1.5}rem` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Checkbox */}
          <Checkbox
            checked={node.completed}
            onCheckedChange={() => handleToggle(node.id)}
            className="mt-0"
          />

          {/* Title */}
          {isEditing ? (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => handleSaveEdit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(node.id);
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditingTitle('');
                }
              }}
              className="h-7 flex-1"
              autoFocus
            />
          ) : (
            <span
              className={`flex-1 text-sm ${
                node.completed
                  ? 'line-through text-muted-foreground'
                  : ''
              }`}
              onDoubleClick={() => handleEdit(node)}
            >
              {node.title}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setAddingToParent(node.id);
                  setExpanded((prev) => new Set(prev).add(node.id));
                }}
                title="Add nested subtask"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleEdit(node)}
                title="Edit subtask"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => handleDelete(node.id)}
                title="Delete subtask"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Add nested subtask input */}
        {isAdding && (
          <div className="ml-6 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}>
            <div className="flex gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd(node.id);
                  } else if (e.key === 'Escape') {
                    setAddingToParent(null);
                    setNewSubtaskTitle('');
                  }
                }}
                placeholder="Subtask title..."
                className="h-7 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => handleAdd(node.id)}
                disabled={!newSubtaskTitle.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground px-2 py-4 text-center">
          No subtasks yet
        </p>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}

      {/* Add root subtask */}
      {addingToParent === null && (
        <div className="px-2 py-1">
          <div className="flex gap-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                } else if (e.key === 'Escape') {
                  setNewSubtaskTitle('');
                }
              }}
              placeholder="Add subtask..."
              className="h-7 text-sm"
            />
            <Button
              size="sm"
              onClick={() => handleAdd()}
              disabled={!newSubtaskTitle.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

