import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nanoid } from 'nanoid';
import { useViewStore } from '@/stores/viewStore';
import type { Filter, FilterOperator } from '@/types/filter';
import type { TaskStatus, Priority } from '@/types';

interface FilterBuilderProps {
  onClose: () => void;
}

const filterFields = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'tags', label: 'Tags' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'hasSubtasks', label: 'Has Subtasks' },
  { value: 'hasNotes', label: 'Has Notes' },
  { value: 'hasDependencies', label: 'Has Dependencies' },
  { value: 'isRecurring', label: 'Is Recurring' },
  { value: 'progress', label: 'Progress' },
];

const operators: Array<{ value: FilterOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'in', label: 'In' },
  { value: 'notIn', label: 'Not In' },
  { value: 'isNull', label: 'Is Empty' },
  { value: 'isNotNull', label: 'Is Not Empty' },
];

export function FilterBuilder({ onClose }: FilterBuilderProps) {
  const { addFilter } = useViewStore();
  const [field, setField] = useState<string>('status');
  const [operator, setOperator] = useState<FilterOperator>('equals');
  const [value, setValue] = useState<string>('');

  const handleAdd = () => {
    if (!field || !operator) return;

    let filterValue: unknown = value;

    // Convert value based on field type
    if (field === 'status') {
      filterValue = value as TaskStatus;
    } else if (field === 'priority') {
      filterValue = value as Priority;
    } else if (field === 'tags') {
      filterValue = value.split(',').map((v) => v.trim());
    } else if (field === 'progress' || field === 'dueDate') {
      filterValue = value ? Number(value) : null;
    } else if (field === 'hasSubtasks' || field === 'hasNotes' || field === 'hasDependencies' || field === 'isRecurring') {
      filterValue = value === 'true';
    } else if (operator === 'isNull' || operator === 'isNotNull') {
      filterValue = null;
    }

    const filter: Filter = {
      id: nanoid(),
      field,
      operator,
      value: filterValue,
    };

    addFilter(filter);
    onClose();
  };

  const getValueInput = () => {
    if (operator === 'isNull' || operator === 'isNotNull') {
      return null;
    }

    if (field === 'status') {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (field === 'priority') {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (field === 'hasSubtasks' || field === 'hasNotes' || field === 'hasDependencies' || field === 'isRecurring') {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={field === 'progress' || field === 'dueDate' ? 'number' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Field</Label>
        <Select value={field} onValueChange={setField}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterFields.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Operator</Label>
        <Select value={operator} onValueChange={(v) => setOperator(v as FilterOperator)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {getValueInput() && (
        <div className="space-y-2">
          <Label>Value</Label>
          {getValueInput()}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleAdd}>
          Add Filter
        </Button>
      </div>
    </div>
  );
}

