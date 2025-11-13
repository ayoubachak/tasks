import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Tag, Flag, Clock, RefreshCw, FileText, Code, BookOpen } from 'lucide-react';

interface CommandHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandHelpModal({ open, onOpenChange }: CommandHelpModalProps) {
  return (
    <>
      <style>{`
        [data-slot="tabs-content"][data-state="active"] {
          display: flex !important;
          flex-direction: column;
        }
        [data-slot="tabs-content"][data-state="active"] [data-slot="scroll-area"] {
          height: 100% !important;
          display: flex !important;
          flex-direction: column;
        }
        [data-slot="tabs-content"][data-state="active"] [data-slot="scroll-area-viewport"] {
          height: 100% !important;
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Command Palette Guide</DialogTitle>
              <DialogDescription className="mt-1">
                Learn how to create tasks and notes using simple commands
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basics" className="flex-1 flex flex-col min-h-0">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-1">
              <TabsTrigger value="basics" className="data-[state=active]:bg-muted">
                <Code className="h-4 w-4 mr-2" />
                Basics
              </TabsTrigger>
              <TabsTrigger value="options" className="data-[state=active]:bg-muted">
                <Flag className="h-4 w-4 mr-2" />
                Options
              </TabsTrigger>
              <TabsTrigger value="dates" className="data-[state=active]:bg-muted">
                <Calendar className="h-4 w-4 mr-2" />
                Dates
              </TabsTrigger>
              <TabsTrigger value="recurrence" className="data-[state=active]:bg-muted">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recurrence
              </TabsTrigger>
              <TabsTrigger value="examples" className="data-[state=active]:bg-muted">
                <FileText className="h-4 w-4 mr-2" />
                Examples
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <TabsContent value="basics" className="flex-1 min-h-0 mt-0 p-6 data-[state=active]:!flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6 pr-4 pb-4">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Basic Commands
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            task "Task Title"
                          </code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Creates a simple task with default settings
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            task "Title" status:in-progress priority:high
                          </code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Creates a task with custom options
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            note "Title" "Content here"
                          </code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Creates a standalone note
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Multi-line Execution
                    </h3>
                    <div className="bg-gradient-to-r from-muted/50 to-muted/30 border rounded-lg p-4">
                      <pre className="text-sm font-mono bg-background p-3 rounded border mb-3 overflow-x-auto">
{`task "Task 1" priority:high
task "Task 2" status:in-progress
note "Note 1" "Content here"`}
                      </pre>
                      <p className="text-sm text-muted-foreground">
                        Execute multiple commands at once with{' '}
                        <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl+Enter</kbd>
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Comments
                    </h3>
                    <div className="bg-gradient-to-r from-muted/50 to-muted/30 border rounded-lg p-4">
                      <pre className="text-sm font-mono bg-background p-3 rounded border mb-3 overflow-x-auto">
{`# This is a comment
task "Real task" priority:high
# Another comment`}
                      </pre>
                      <p className="text-sm text-muted-foreground">
                        Lines starting with <code className="text-xs bg-background px-1.5 py-0.5 rounded border">#</code> are ignored
                      </p>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="options" className="flex-1 min-h-0 mt-0 p-6 data-[state=active]:!flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      Status & Priority
                    </h3>
                    <div className="grid gap-3">
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">status</code>
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Task status
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {['todo', 'in-progress', 'blocked', 'done', 'archived'].map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs font-mono">
                              {s}
                            </Badge>
                          ))}
                        </div>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          status:in-progress
                        </code>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">priority</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Task priority level
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {['none', 'low', 'medium', 'high', 'urgent'].map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs font-mono">
                              {p}
                            </Badge>
                          ))}
                        </div>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          priority:high
                        </code>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      Tags & Labels
                    </h3>
                    <div className="grid gap-3">
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">tags</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Comma-separated list of tags
                        </p>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          tags:work,urgent,meeting
                        </code>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">labels</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Comma-separated list of labels
                        </p>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          labels:frontend,bug
                        </code>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Content
                    </h3>
                    <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-semibold font-mono">description</code>
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Task description (use quotes if contains spaces)
                      </p>
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        description:"This is a detailed description"
                      </code>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Time Tracking
                    </h3>
                    <div className="grid gap-3">
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">progress</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Progress percentage (0-100)
                        </p>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          progress:50
                        </code>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">estimated</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Estimated time in minutes
                        </p>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          estimated:120
                        </code>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">actual</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Actual time spent in minutes
                        </p>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          actual:90
                        </code>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="dates" className="flex-1 min-h-0 mt-0 p-6 data-[state=active]:!flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Date Options
                    </h3>
                    <div className="grid gap-3">
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">due</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Due date for the task
                        </p>
                        <div className="space-y-1.5">
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            due:2024-12-31
                          </code>
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            due:2024-12-31 14:30
                          </code>
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            due:2024-12-31T14:30
                          </code>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">start</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Start date for the task
                        </p>
                        <div className="space-y-1.5">
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            start:2024-12-01
                          </code>
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            start:2024-12-01 09:00
                          </code>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-semibold font-mono">reminder</code>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Reminder date and time
                        </p>
                        <div className="space-y-1.5">
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            reminder:2024-12-30
                          </code>
                          <code className="text-xs font-mono block text-muted-foreground bg-muted px-2 py-1 rounded">
                            reminder:2024-12-30 09:00
                          </code>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Date Formats
                    </h3>
                    <div className="border rounded-lg p-4 bg-card space-y-3">
                      <div className="border-l-2 border-primary pl-3">
                        <code className="text-sm font-mono font-semibold block mb-1">YYYY-MM-DD</code>
                        <p className="text-xs text-muted-foreground">
                          Date only (time defaults to 00:00)
                        </p>
                      </div>
                      <div className="border-l-2 border-primary pl-3">
                        <code className="text-sm font-mono font-semibold block mb-1">YYYY-MM-DD HH:mm</code>
                        <p className="text-xs text-muted-foreground">
                          Date and time (24-hour format)
                        </p>
                      </div>
                      <div className="border-l-2 border-primary pl-3">
                        <code className="text-sm font-mono font-semibold block mb-1">YYYY-MM-DDTHH:mm</code>
                        <p className="text-xs text-muted-foreground">
                          ISO format (same as above)
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recurrence" className="flex-1 min-h-0 mt-0 p-6 data-[state=active]:!flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      Recurrence Format
                    </h3>
                    <div className="border rounded-lg p-4 bg-card mb-4">
                      <code className="text-sm font-mono block mb-2">pattern:interval[:endDate]</code>
                      <p className="text-xs text-muted-foreground text-center mb-2">or</p>
                      <code className="text-sm font-mono block">pattern:interval:daysOfWeek</code>
                    </div>

                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center gap-2 mb-3">
                        <code className="text-sm font-semibold font-mono">Patterns</code>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs font-mono">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Examples
                    </h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <code className="text-sm font-mono block mb-2">recurrence:daily:1</code>
                        <p className="text-xs text-muted-foreground">Every day</p>
                      </div>
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <code className="text-sm font-mono block mb-2">recurrence:weekly:2</code>
                        <p className="text-xs text-muted-foreground">Every 2 weeks</p>
                      </div>
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <code className="text-sm font-mono block mb-2">recurrence:weekly:1:1,3,5</code>
                        <p className="text-xs text-muted-foreground">
                          Every week on Monday, Wednesday, Friday (0=Sunday, 1=Monday, etc.)
                        </p>
                      </div>
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <code className="text-sm font-mono block mb-2">recurrence:monthly:1:15</code>
                        <p className="text-xs text-muted-foreground">Every month on the 15th</p>
                      </div>
                      <div className="border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
                        <code className="text-sm font-mono block mb-2">recurrence:yearly:1:2025-12-31</code>
                        <p className="text-xs text-muted-foreground">Every year until 2025-12-31</p>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="examples" className="flex-1 min-h-0 mt-0 p-6 data-[state=active]:!flex data-[state=active]:flex-col overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Simple Tasks
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`task "Review pull request"
task "Buy groceries"
task "Call dentist"`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Tasks with Attributes
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`task "Fix bug in login" status:in-progress priority:high tags:bug,urgent
task "Plan team meeting" priority:medium tags:meeting due:2024-12-20
task "Write documentation" status:todo priority:low tags:docs estimated:180`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Tasks with Dates
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`task "Submit report" due:2024-12-31
task "Project kickoff" start:2024-12-01 due:2024-12-15
task "Follow up email" reminder:2024-12-10 09:00`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Recurring Tasks
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`task "Daily standup" recurrence:daily:1
task "Weekly review" recurrence:weekly:1:1 tags:meeting
task "Monthly report" recurrence:monthly:1:1 due:2024-12-31`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Notes
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`note "Meeting Notes" "Discussed project timeline and resource allocation"
note "Ideas" "Brainstorming session ideas for the next sprint"
note "Quick Reference" "API endpoint: /api/v1/tasks, Auth: Bearer token"`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Complex Example
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`task "Complex Task" status:in-progress priority:urgent tags:work,bug,frontend labels:critical due:2024-12-31 start:2024-12-01 description:"This is a complex task with many attributes" progress:25 estimated:480`}
                      </pre>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Bulk Import
                    </h3>
                    <div className="border rounded-lg p-4 bg-card">
                      <pre className="text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
{`# Project: Website Redesign
task "Design mockups" status:todo priority:high tags:design,project
task "Set up development environment" status:todo priority:medium tags:dev,setup
task "Create component library" status:todo priority:high tags:dev,components
task "Write API documentation" status:todo priority:low tags:docs
note "Project Brief" "Redesign the company website with modern UI/UX principles"`}
                      </pre>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
}
