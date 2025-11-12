import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  TrendingUp,
  Target,
  Flame,
  Tag as TagIcon
} from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { calculateTaskStats } from '@/lib/analytics/calculateStats';
import { format } from 'date-fns';

export function StatsDashboard() {
  const { getActiveWorkspace } = useWorkspaceStore();
  const { getTasksByWorkspace } = useTaskStore();
  const activeWorkspace = getActiveWorkspace();

  const stats = useMemo(() => {
    if (!activeWorkspace) {
      return null;
    }
    const tasks = getTasksByWorkspace(activeWorkspace.id);
    return calculateTaskStats(tasks);
  }, [activeWorkspace, getTasksByWorkspace]);

  if (!activeWorkspace || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select a workspace to view statistics</p>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'default' 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>; 
    color?: 'default' | 'success' | 'warning' | 'danger';
  }) => {
    const colorClasses = {
      default: 'text-primary',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      danger: 'text-red-600 dark:text-red-400',
    };

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${colorClasses[color]} opacity-50`} />
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Statistics for {activeWorkspace.name}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={Target}
          color="default"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          subtitle={`${stats.completionRate.toFixed(1)}% completion rate`}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressTasks}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Overdue"
          value={stats.overdueTasks}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      {/* Progress & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Completion Rate
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className="text-lg font-bold">{stats.completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Done: </span>
                <span className="font-medium">{stats.completedTasks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining: </span>
                <span className="font-medium">{stats.totalTasks - stats.completedTasks}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Streak
          </h3>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats.streakDays}
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.streakDays === 1 
                ? 'day in a row' 
                : 'days in a row'} of completing tasks
            </p>
            {stats.averageCompletionTime > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Avg. completion time</p>
                <p className="text-lg font-semibold">
                  {stats.averageCompletionTime.toFixed(1)} days
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tasks by Status */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Tasks by Status</h3>
        <div className="space-y-3">
          {Object.entries(stats.tasksByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {status.replace('-', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-medium w-12 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tasks by Priority */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Tasks by Priority</h3>
        <div className="space-y-3">
          {Object.entries(stats.tasksByPriority)
            .filter(([_, count]) => count > 0)
            .map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {priority}
                </Badge>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="font-medium w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Created This Week"
          value={stats.tasksCreatedThisWeek}
          icon={Calendar}
        />
        <StatCard
          title="Completed This Week"
          value={stats.tasksCompletedThisWeek}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Due This Week"
          value={stats.tasksDueThisWeek}
          icon={Clock}
          color="warning"
        />
      </div>

      {/* Top Tags */}
      {Object.keys(stats.tasksByTag).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Top Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.tasksByTag)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="text-sm">
                  {tag} ({count})
                </Badge>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

