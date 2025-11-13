import { useState, useEffect, useRef } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useViewStore } from '@/stores/viewStore';
import { useTaskStore, useWorkspaceStore } from '@/stores';
import { useShortcutStore } from '@/stores/shortcutStore';
import { getShortcutDisplay } from '@/constants/shortcuts';
import { List, LayoutGrid, Calendar, Plus, FileText, Terminal, CheckCircle2, XCircle, Loader2, Play, HelpCircle } from 'lucide-react';
import type { ViewType } from '@/types/filter';
import { parseCommands } from '@/lib/commands/commandParser';
import { executeCommands, getExecutionSummary, type CommandResult } from '@/lib/commands/commandExecutor';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { CommandHelpModal } from './CommandHelpModal';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

type Mode = 'search' | 'command';

export function CommandPalette({
  open,
  onOpenChange,
  onNewTask,
  onNavigateToTask,
}: CommandPaletteProps) {
  const { setView, currentView } = useViewStore();
  const { getTasksByWorkspace } = useTaskStore();
  const { getActiveWorkspace } = useWorkspaceStore();
  const { shortcuts } = useShortcutStore();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<Mode>('search');
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<CommandResult[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeWorkspace = getActiveWorkspace();
  const tasks = activeWorkspace ? getTasksByWorkspace(activeWorkspace.id) : [];

  // Filter tasks based on search
  const filteredTasks = tasks.filter((task) => {
    if (!search) return false;
    const query = search.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setCommandInput('');
      setMode('search');
      setExecutionResults([]);
      setIsExecuting(false);
    }
  }, [open]);

  // Focus textarea when switching to command mode
  useEffect(() => {
    if (mode === 'command' && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleSelect = (value: string) => {
    if (value === 'command-mode') {
      setMode('command');
      return;
    }
    if (value.startsWith('task:')) {
      const taskId = value.replace('task:', '');
      onNavigateToTask?.(taskId);
      onOpenChange(false);
    } else if (value === 'new-task') {
      onNewTask?.();
      onOpenChange(false);
    } else if (value.startsWith('view:')) {
      const view = value.replace('view:', '') as ViewType;
      setView(view);
      onOpenChange(false);
    }
  };

  const handleExecuteCommands = async () => {
    if (!activeWorkspace || !commandInput.trim()) {
      toast.error('No workspace', 'Please select a workspace first');
      return;
    }

    setIsExecuting(true);
    setExecutionResults([]);

    try {
      const commands = parseCommands(commandInput);
      if (commands.length === 0) {
        toast.error('No commands', 'Please enter at least one valid command');
        setIsExecuting(false);
        return;
      }

      const results = executeCommands(commands, activeWorkspace.id);
      setExecutionResults(results);

      const summary = getExecutionSummary(results);
      
      if (summary.failed === 0) {
        toast.success(
          `Created ${summary.successful} item${summary.successful > 1 ? 's' : ''}`,
          `${summary.tasks} task${summary.tasks !== 1 ? 's' : ''}, ${summary.notes} note${summary.notes !== 1 ? 's' : ''}`
        );
        // Clear input on success
        setCommandInput('');
      } else {
        toast.error(
          `${summary.failed} error${summary.failed > 1 ? 's' : ''}`,
          `${summary.successful} succeeded, ${summary.failed} failed`
        );
      }
    } catch (error) {
      toast.error('Execution error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteCommands();
    }
    // Escape to go back to search mode
    if (e.key === 'Escape' && mode === 'command') {
      e.preventDefault();
      setMode('search');
      setCommandInput('');
      setExecutionResults([]);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {mode === 'search' ? (
        <>
          <CommandInput
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Workspace Context */}
            {activeWorkspace && (
              <CommandGroup heading="Workspace">
                <CommandItem value="workspace-info" disabled>
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeWorkspace.color }}
                    />
                    <span className="text-sm font-medium">{activeWorkspace.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Active
                    </Badge>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Command Mode Toggle */}
            <CommandGroup heading="Commands">
              <CommandItem value="command-mode" onSelect={handleSelect}>
                <Terminal className="mr-2 h-4 w-4" />
                <span>Command Mode</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Bulk create tasks/notes
                </span>
              </CommandItem>
            </CommandGroup>

            {/* Quick Actions */}
            <CommandGroup heading="Actions">
              <CommandItem value="new-task" onSelect={handleSelect}>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Task</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {getShortcutDisplay(shortcuts.find((s) => s.id === 'new-task')!)}
                </span>
              </CommandItem>
            </CommandGroup>

            {/* Views */}
            <CommandGroup heading="Views">
              <CommandItem
                value="view:list"
                onSelect={handleSelect}
                className={currentView === 'list' ? 'bg-accent' : ''}
              >
                <List className="mr-2 h-4 w-4" />
                <span>List View</span>
                {currentView === 'list' && (
                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                )}
              </CommandItem>
              <CommandItem
                value="view:board"
                onSelect={handleSelect}
                className={currentView === 'board' ? 'bg-accent' : ''}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Board View</span>
                {currentView === 'board' && (
                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                )}
              </CommandItem>
              <CommandItem
                value="view:calendar"
                onSelect={handleSelect}
                className={currentView === 'calendar' ? 'bg-accent' : ''}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>Calendar View</span>
                {currentView === 'calendar' && (
                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                )}
              </CommandItem>
            </CommandGroup>

            {/* Tasks */}
            {filteredTasks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tasks">
                  {filteredTasks.slice(0, 10).map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`task:${task.id}`}
                      onSelect={handleSelect}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span className="truncate">{task.title}</span>
                      {task.priority !== 'none' && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {task.priority}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </>
      ) : (
        <div className="flex flex-col h-[600px] max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <span className="font-semibold">Command Mode</span>
              {activeWorkspace && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeWorkspace.color }}
                    />
                    <span className="text-sm text-muted-foreground">{activeWorkspace.name}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHelpOpen(true)}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMode('search');
                  setCommandInput('');
                  setExecutionResults([]);
                }}
              >
                Back
              </Button>
            </div>
          </div>

          {/* Command Input */}
          <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Commands</label>
                <span className="text-xs text-muted-foreground">
                  Ctrl+Enter to execute • Esc to cancel
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`task "My Task" status:in-progress priority:high tags:work,urgent due:2024-12-31
note "My Note" "Note content here"
task "Another Task" priority:medium`}
                className="flex-1 font-mono text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExecuteCommands}
                  disabled={isExecuting || !commandInput.trim() || !activeWorkspace}
                  className="flex items-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommandInput('')}
                  disabled={isExecuting}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Execution Results */}
            {executionResults.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Results</label>
                  <Badge variant="outline">
                    {executionResults.filter((r) => r.success).length} / {executionResults.length} succeeded
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {executionResults.map((result, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded text-sm',
                        result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.title || 'Untitled'}</span>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          {result.lineNumber && (
                            <span className="text-xs text-muted-foreground">
                              Line {result.lineNumber}
                            </span>
                          )}
                        </div>
                        {result.error && (
                          <div className="text-xs text-red-500 mt-1">{result.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <details className="text-xs text-muted-foreground flex-1">
                  <summary className="cursor-pointer font-medium mb-2">Quick Reference</summary>
                  <div className="space-y-2 pl-4">
                    <div>
                      <code className="text-xs">task "Title" [options]</code>
                      <p className="text-xs mt-1">Options: status, priority, tags, labels, due, start, description, progress, etc.</p>
                    </div>
                    <div>
                      <code className="text-xs">note "Title" "Content"</code>
                      <p className="text-xs mt-1">Create a standalone note</p>
                    </div>
                    <div className="text-xs mt-2">
                      <strong>Examples:</strong>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
{`task "Review PR" status:in-progress priority:high tags:work,code
task "Buy groceries" due:2024-12-25 priority:medium
note "Meeting Notes" "Discussed project timeline..."`}
                      </pre>
                    </div>
                  </div>
                </details>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHelpOpen(true)}
                  className="ml-4 flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Full Guide</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CommandHelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </CommandDialog>
  );
}

