import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, ListTodo, Clock, Loader2, ChevronDown, CalendarClock } from 'lucide-react';
import { QuickTimeTracker } from '@/components/dashboard/QuickTimeTracker';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/formatHours';
import { Badge } from '@/components/ui/badge';
import { UpcomingDeadlines, DeadlineItem } from '@/components/dashboard/UpcomingDeadlines';
import { getDeadlineStatus } from '@/lib/deadlineUtils';

export const Dashboard: React.FC = () => {
  const { data, loading, getClientHours } = useData();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [hoursClientOpen, setHoursClientOpen] = useState(false);
  const [recentEntriesOpen, setRecentEntriesOpen] = useState(false);
  const [deadlinesOpen, setDeadlinesOpen] = useState(true);

  // Build upcoming deadlines from projects and tasks - useMemo must be before early return
  const upcomingDeadlines = useMemo((): DeadlineItem[] => {
    if (loading) return [];
    
    const itemsWithDeadline: DeadlineItem[] = [];
    const itemsWithoutDeadline: DeadlineItem[] = [];
    
    // Add projects (only non-completed ones)
    data.projects
      .filter(p => p.status !== 'completed')
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
  }, [data.projects, data.tasks, data.clients, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalHours = data.clients.reduce((sum, client) => sum + getClientHours(client.id), 0);
  const totalContractedHours = data.clients.reduce((sum, client) => sum + client.contracted_hours, 0);

  const stats = [
    {
      title: 'Clientes',
      value: data.clients.length,
      icon: Users,
      description: 'Total de clientes',
    },
    {
      title: 'Projetos',
      value: data.projects.length,
      icon: FolderKanban,
      description: 'Projetos ativos e concluídos',
    },
    {
      title: 'Tarefas',
      value: data.tasks.length,
      icon: ListTodo,
      description: 'Total de tarefas',
    },
    {
      title: 'Horas Registradas',
      value: formatHours(totalHours),
      icon: Clock,
      description: `de ${formatHours(totalContractedHours)} contratadas`,
    },
  ];

  const recentProjects = data.projects.slice(0, 5);

  // Get recent time entries with task, project, and client info
  const recentTimeEntries = data.timeEntries.slice(0, 5).map(entry => {
    const task = data.tasks.find(t => t.id === entry.task_id);
    const project = task ? data.projects.find(p => p.id === task.project_id) : null;
    const client = project ? data.clients.find(c => c.id === project.client_id) : null;
    return {
      ...entry,
      taskName: task?.name || 'Tarefa não encontrada',
      projectName: project?.name || 'Projeto não encontrado',
      clientName: client?.company || client?.name || 'Cliente não encontrado',
    };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de gestão de projetos"
      />

      {/* Stats Grid - 2 columns on mobile, 4 on desktop - Always visible */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Timer - Always visible */}
      <div className="mb-6">
        <QuickTimeTracker />
      </div>

      {/* Upcoming Deadlines - Open by default */}
      <div className="mb-4">
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
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", deadlinesOpen && "rotate-180")} />
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

      {/* Collapsible Sections */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        {/* Recent Projects - Collapsible */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Projetos Recentes
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", projectsOpen && "rotate-180")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum projeto criado ainda.</p>
                ) : (
                  <ul className="space-y-3">
                    {recentProjects.map((project) => {
                      const client = data.clients.find(c => c.id === project.client_id);
                      return (
                        <li key={project.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{project.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{client?.company || client?.name || 'Cliente não encontrado'}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ml-2 shrink-0 ${
                            project.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                            project.status === 'paused' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {project.status === 'active' ? 'Ativo' : 
                             project.status === 'paused' ? 'Pausado' : 'Concluído'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Hours by Client - Collapsible */}
        <Collapsible open={hoursClientOpen} onOpenChange={setHoursClientOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Horas por Cliente
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", hoursClientOpen && "rotate-180")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {data.clients.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum cliente cadastrado ainda.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.clients.slice(0, 5).map((client) => {
                      const usedHours = getClientHours(client.id);
                      const percentage = client.contracted_hours > 0 
                        ? Math.min((usedHours / client.contracted_hours) * 100, 100)
                        : 0;
                      const isMonthly = (client as any).contract_type === 'monthly';
                      return (
                        <li key={client.id} className="py-2 border-b border-border last:border-0">
                          <div className="flex justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm truncate">{client.company || client.name}</span>
                              {isMonthly && (
                                <Badge variant="outline" className="text-xs">Mensal</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {formatHours(usedHours)} / {formatHours(client.contracted_hours)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Recent Time Entries - Collapsible */}
      <Collapsible open={recentEntriesOpen} onOpenChange={setRecentEntriesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Últimos Registros de Horas
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", recentEntriesOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {recentTimeEntries.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum registro de horas ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {recentTimeEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border last:border-0 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{entry.taskName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.projectName} • {entry.clientName}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{entry.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                          {formatHours(entry.hours)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};