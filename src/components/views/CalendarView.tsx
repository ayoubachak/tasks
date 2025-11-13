import { useMemo, useState } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import type { Task } from '@/types';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (taskId: string) => void;
}

export function CalendarView({ tasks, onEditTask }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  const daysWithTasks = useMemo(() => {
    const days: Date[] = [];
    Object.keys(tasksByDate).forEach((dateKey) => {
      if (tasksByDate[dateKey].length > 0) {
        days.push(new Date(dateKey));
      }
    });
    return days;
  }, [tasksByDate]);

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{
            hasTasks: daysWithTasks,
          }}
          modifiersClassNames={{
            hasTasks: 'bg-primary/10 font-semibold',
          }}
        />
      </div>
      <div className="w-80 border-l">
        <div className="border-b p-4">
          <h3 className="font-semibold">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-4 space-y-2">
            {selectedDateTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No tasks due on this date
              </div>
            ) : (
              selectedDateTasks.map((task) => (
                <Card
                  key={task.id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onEditTask(task.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                      {task.priority !== 'none' && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

