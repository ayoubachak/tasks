import { useState } from 'react';
import { useTaskStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Checklist, ChecklistItem } from '@/types';

interface ChecklistListProps {
  taskId: string;
  checklists: Checklist[] | undefined;
}

export function ChecklistList({ taskId, checklists }: ChecklistListProps) {
  const {
    addChecklist,
    updateChecklist,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    calculateChecklistProgress,
  } = useTaskStore();

  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');

  const handleAddChecklist = () => {
    if (newChecklistTitle.trim()) {
      addChecklist(taskId, newChecklistTitle.trim());
      setNewChecklistTitle('');
      setAddingChecklist(false);
    }
  };

  const handleAddItem = (checklistId: string) => {
    if (newItemText.trim()) {
      addChecklistItem(taskId, checklistId, newItemText.trim());
      setNewItemText('');
      setAddingItemTo(null);
    }
  };

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const handleSaveEdit = (checklistId: string, itemId: string) => {
    if (editingItemText.trim()) {
      updateChecklistItem(taskId, checklistId, itemId, { text: editingItemText.trim() });
    }
    setEditingItemId(null);
    setEditingItemText('');
  };

  const safeChecklists = checklists || [];
  
  if (safeChecklists.length === 0) {
    return (
      <div className="space-y-4">
        {addingChecklist ? (
          <div className="border rounded-lg p-4 space-y-2">
            <Input
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklist();
                } else if (e.key === 'Escape') {
                  setAddingChecklist(false);
                  setNewChecklistTitle('');
                }
              }}
              placeholder="Checklist title..."
              className="h-8"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAddChecklist}>
                Add Checklist
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingChecklist(false);
                  setNewChecklistTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setAddingChecklist(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Checklist
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeChecklists.map((checklist) => {
        if (!checklist) return null;
        const items = checklist.items || [];
        const progress = calculateChecklistProgress(taskId, checklist.id);
        const completedCount = items.filter((i) => i.completed).length;

        return (
          <div key={checklist.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 group">
                {editingChecklistId === checklist.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editingChecklistTitle}
                      onChange={(e) => setEditingChecklistTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateChecklist(taskId, checklist.id, { title: editingChecklistTitle.trim() || checklist.title });
                          setEditingChecklistId(null);
                          setEditingChecklistTitle('');
                        } else if (e.key === 'Escape') {
                          setEditingChecklistId(null);
                          setEditingChecklistTitle('');
                        }
                      }}
                      onBlur={() => {
                        updateChecklist(taskId, checklist.id, { title: editingChecklistTitle.trim() || checklist.title });
                        setEditingChecklistId(null);
                        setEditingChecklistTitle('');
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingChecklistId(null);
                        setEditingChecklistTitle('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h4 className="font-medium text-sm">{checklist.title}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditingChecklistId(checklist.id);
                        setEditingChecklistTitle(checklist.title);
                      }}
                      title="Rename checklist"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{checklist.items.length}
                </Badge>
                {progress > 0 && (
                  <div className="flex-1 max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => {
                  if (confirm('Delete this checklist?')) {
                    deleteChecklist(taskId, checklist.id);
                  }
                }}
                title="Delete checklist"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(taskId, checklist.id, item.id)}
                    />
                    {editingItemId === item.id ? (
                      <Input
                        value={editingItemText}
                        onChange={(e) => setEditingItemText(e.target.value)}
                        onBlur={() => handleSaveEdit(checklist.id, item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(checklist.id, item.id);
                          } else if (e.key === 'Escape') {
                            setEditingItemId(null);
                            setEditingItemText('');
                          }
                        }}
                        className="h-7 flex-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span
                          className={`flex-1 text-sm ${
                            item.completed
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                          onDoubleClick={() => handleEditItem(item)}
                        >
                          {item.text}
                        </span>
                        {item.dueDate && (
                          <Badge
                            variant={item.dueDate < Date.now() ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {format(item.dueDate, 'MMM d')}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEditItem(item)}
                            title="Edit item"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteChecklistItem(taskId, checklist.id, item.id)}
                            title="Delete item"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}

              {addingItemTo === checklist.id ? (
                <div className="flex gap-2">
                  <Input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem(checklist.id);
                      } else if (e.key === 'Escape') {
                        setAddingItemTo(null);
                        setNewItemText('');
                      }
                    }}
                    placeholder="Item text..."
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={() => handleAddItem(checklist.id)}>
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddingItemTo(checklist.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {addingChecklist ? (
        <div className="border rounded-lg p-4 space-y-2">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddChecklist();
              } else if (e.key === 'Escape') {
                setAddingChecklist(false);
                setNewChecklistTitle('');
              }
            }}
            placeholder="Checklist title..."
            className="h-8"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAddChecklist}>
              Add Checklist
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAddingChecklist(false);
                setNewChecklistTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setAddingChecklist(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Checklist
        </Button>
      )}
    </div>
  );
}

