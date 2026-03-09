import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, ListTodo, CalendarClock, ChevronDown, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UpcomingDeadlines, DeadlineItem } from '@/components/dashboard/UpcomingDeadlines';
import { getDeadlineStatus } from '@/lib/deadlineUtils';
import { QuickTimeTracker } from '@/components/dashboard/QuickTimeTracker';

export const CollaboratorDashboard: React.FC = () => {
  const { data, loading } = useData();
  const [deadlinesOpen, setDeadlinesOpen] = useState(true);

  // Build upcoming deadlines from accessible projects and tasks
  const upcomingDeadlines = useMemo((): DeadlineItem[] => {
    const itemsWithDeadline: DeadlineItem[] = [];
    const itemsWithoutDeadline: DeadlineItem[] = [];
    
    // Add projects (only non-completed ones)
    data.projects
      .filter(p => p.status !== 'completed' && p.status !== 'archived')
      .forEach(p => {
        const client = data.clients.find(c => c.id === p.client_id);
        
        if (p.due_date) {
          const status = getDeadlineStatus(p.due_date);
          if (status) {
            itemsWithDeadline.push({
              id: p.id,
              type: 'project',
              name: p.name,
              due_date: p.due_date,
              clientName: client?.company || client?.name,
              status,
              created_at: p.created_at
            });
          }
        } else {
          itemsWithoutDeadline.push({
            id: p.id,
            type: 'project',
            name: p.name,
            due_date: '',
            clientName: client?.company || client?.name,
            status: 'normal',
            created_at: p.created_at
          });
        }
      });
    
    // Add tasks (only non-completed ones)
    data.tasks
      .filter(t => t.status !== 'completed' && t.status !== 'done')
      .forEach(t => {
        const project = data.projects.find(p => p.id === t.project_id);
        const client = project ? data.clients.find(c => c.id === project.client_id) : null;
        
        if (t.due_date) {
          const status = getDeadlineStatus(t.due_date);
          if (status) {
            itemsWithDeadline.push({
              id: t.id,
              type: 'task',
              name: t.name,
              due_date: t.due_date,
              projectId: t.project_id,
              projectName: project?.name,
              clientName: client?.company || client?.name,
              status,
              created_at: t.created_at
            });
          }
        } else {
          itemsWithoutDeadline.push({
            id: t.id,
            type: 'task',
            name: t.name,
            due_date: '',
            projectId: t.project_id,
            projectName: project?.name,
            clientName: client?.company || client?.name,
            status: 'normal',
            created_at: t.created_at
          });
        }
      });
    
    // Sort with deadline by proximity, without deadline by creation date (newest first)
    itemsWithDeadline.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    itemsWithoutDeadline.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    
    // Combine: items with deadline first, then items without
    return [...itemsWithDeadline, ...itemsWithoutDeadline].slice(0, 10);
  }, [data.projects, data.tasks, data.clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats for collaborator
  const activeProjects = data.projects.filter(p => p.status === 'active').length;
  const pendingTasks = data.tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length;
  const overdueCount = upcomingDeadlines.filter(d => d.status === 'overdue').length;

  const stats = [
    {
      title: 'Projetos Ativos',
      value: activeProjects,
      icon: FolderKanban,
      description: 'Projetos atribuídos a você',
    },
    {
      title: 'Tarefas Pendentes',
      value: pendingTasks,
      icon: ListTodo,
      description: 'Tarefas em andamento',
    },
    {
      title: 'Prazos Vencidos',
      value: overdueCount,
      icon: CalendarClock,
      description: overdueCount > 0 ? 'Requerem atenção!' : 'Tudo em dia',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                stat.title === 'Prazos Vencidos' && overdueCount > 0 && 'text-destructive'
              )}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Timer */}
      <QuickTimeTracker />

      {/* Upcoming Deadlines */}
      <Collapsible open={deadlinesOpen} onOpenChange={setDeadlinesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Próximas Entregas
                  {upcomingDeadlines.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {upcomingDeadlines.length}
                    </Badge>
                  )}
                </CardTitle>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  deadlinesOpen && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <UpcomingDeadlines items={upcomingDeadlines} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
