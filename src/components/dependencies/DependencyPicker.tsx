import { useState } from 'react';
import { useTaskStore } from '@/stores';
import { getAvailableDependencies, getDependencyTasks, getDependentTasks } from '@/lib/dependencies/dependencyUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { X, Link2, Lock } from 'lucide-react';
import type { Task } from '@/types';

interface DependencyPickerProps {
  task: Task;
  workspaceId: string;
}

export function DependencyPicker({ task, workspaceId }: DependencyPickerProps) {
  const { tasks, addDependency, removeDependency, addBlockedBy, removeBlockedBy } = useTaskStore();
  const [openDeps, setOpenDeps] = useState(false);
  const [openBlockers, setOpenBlockers] = useState(false);

  const availableDeps = getAvailableDependencies(tasks, task.id, workspaceId);
  const dependencyTasks = getDependencyTasks(tasks, task);
  const dependentTasks = getDependentTasks(tasks, task.id);

  const handleAddDependency = (dependencyId: string) => {
    addDependency(task.id, dependencyId);
    setOpenDeps(false);
  };

  const handleAddBlocker = (blockerId: string) => {
    addBlockedBy(task.id, blockerId);
    setOpenBlockers(false);
  };

  return (
    <div className="space-y-4">
      {/* Dependencies (tasks this task depends on) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Dependencies
          </Label>
          <Popover open={openDeps} onOpenChange={setOpenDeps}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Add Dependency
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search tasks..." />
                <CommandList>
                  <CommandEmpty>No tasks found.</CommandEmpty>
                  <CommandGroup>
                    {availableDeps.map((depTask) => (
                      <CommandItem
                        key={depTask.id}
                        onSelect={() => handleAddDependency(depTask.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm">{depTask.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {depTask.status}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {task.dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dependencies</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dependencyTasks
              .filter((t) => task.dependencies.includes(t.id))
              .map((depTask) => (
                <Badge
                  key={depTask.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Link2 className="h-3 w-3" />
                  {depTask.title}
                  <button
                    onClick={() => removeDependency(task.id, depTask.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Blocked By (tasks blocking this task) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Blocked By
          </Label>
          <Popover open={openBlockers} onOpenChange={setOpenBlockers}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Add Blocker
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search tasks..." />
                <CommandList>
                  <CommandEmpty>No tasks found.</CommandEmpty>
                  <CommandGroup>
                    {availableDeps.map((blockerTask) => (
                      <CommandItem
                        key={blockerTask.id}
                        onSelect={() => handleAddBlocker(blockerTask.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm">{blockerTask.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {blockerTask.status}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {task.blockedBy.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not blocked</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dependencyTasks
              .filter((t) => task.blockedBy.includes(t.id))
              .map((blockerTask) => (
                <Badge
                  key={blockerTask.id}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  {blockerTask.title}
                  <button
                    onClick={() => removeBlockedBy(task.id, blockerTask.id)}
                    className="ml-1 hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Dependent Tasks (tasks that depend on this) */}
      {dependentTasks.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Dependent Tasks</Label>
          <div className="flex flex-wrap gap-2">
            {dependentTasks.map((depTask) => (
              <Badge key={depTask.id} variant="outline" className="text-xs">
                {depTask.title}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

