import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { formatRecurrenceRule, validateRecurrenceRule } from '@/lib/recurrence/recurrenceUtils';
import type { RecurrenceRule } from '@/types';

interface RecurrenceEditorProps {
  value: RecurrenceRule | undefined;
  onChange: (rule: RecurrenceRule | undefined) => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const [pattern, setPattern] = useState<RecurrenceRule['pattern']>(value?.pattern || 'daily');
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth);
  const [endDate, setEndDate] = useState<Date | undefined>(
    value?.endDate ? new Date(value.endDate) : undefined
  );

  useEffect(() => {
    if (value) {
      setPattern(value.pattern);
      setInterval(value.interval);
      setDaysOfWeek(value.daysOfWeek || []);
      setDayOfMonth(value.dayOfMonth);
      setEndDate(value.endDate ? new Date(value.endDate) : undefined);
    }
  }, [value]);

  const handleToggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = () => {
    const rule: RecurrenceRule = {
      pattern,
      interval,
      ...(daysOfWeek.length > 0 && { daysOfWeek }),
      ...(dayOfMonth && { dayOfMonth }),
      ...(endDate && { endDate: endDate.getTime() }),
    };

    const validation = validateRecurrenceRule(rule);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    onChange(rule);
  };

  const handleClear = () => {
    onChange(undefined);
    setPattern('daily');
    setInterval(1);
    setDaysOfWeek([]);
    setDayOfMonth(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Recurrence</Label>
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {value && (
        <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
          {formatRecurrenceRule(value)}
        </div>
      )}

      <div className="space-y-3 border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pattern</Label>
            <Select value={pattern} onValueChange={(v) => setPattern(v as RecurrenceRule['pattern'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Interval</Label>
            <Input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {pattern === 'weekly' && (
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-2 gap-2">
              {dayNames.map((day, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={daysOfWeek.includes(index)}
                    onCheckedChange={() => handleToggleDay(index)}
                  />
                  <label
                    htmlFor={`day-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {pattern === 'monthly' && (
          <div className="space-y-2">
            <Label>Day of Month</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth || ''}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value) || undefined)}
              placeholder="1-31"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'No end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
              {endDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEndDate(undefined)}
                  >
                    Clear end date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            {value ? 'Update' : 'Set'} Recurrence
          </Button>
          {value && (
            <Button variant="outline" onClick={handleClear}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
