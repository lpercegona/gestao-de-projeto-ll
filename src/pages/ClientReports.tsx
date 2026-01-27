import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Loader2, Share2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHours } from '@/lib/formatHours';
import { ReportShareDialog, ReportShare } from '@/components/reports/ReportShareDialog';

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
  custom_fields?: Record<string, string> | null;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  date: string;
  entry_type?: string;
}

interface Client {
  id: string;
  name: string;
  company?: string | null;
  contracted_hours: number;
}


export const ClientReports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);
  const [reportShare, setReportShare] = useState<ReportShare | null>(null);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch client associated with user through client_users table
        const { data: clientUserData } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .maybeSingle();

        let clientData = null;

        if (clientUserData?.client_id) {
          // User is in client_users table, fetch the client
          const { data: fetchedClient } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientUserData.client_id)
            .maybeSingle();
          clientData = fetchedClient;
        } else {
          // Fallback: check legacy user_id field on clients table
          const { data: legacyClient } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          clientData = legacyClient;
        }

        if (clientData) {
          setClient(clientData);

          // Fetch projects for this client
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', clientData.id);

          setProjects((projectsData || []).map(p => ({
            ...p,
            custom_fields: (p.custom_fields as Record<string, string> | null) || {}
          })));

          if (projectsData && projectsData.length > 0) {
            const projectIds = projectsData.map(p => p.id);

            // Fetch tasks
            const { data: tasksData } = await supabase
              .from('tasks')
              .select('*')
              .in('project_id', projectIds);

            setTasks(tasksData || []);

            if (tasksData && tasksData.length > 0) {
              const taskIds = tasksData.map(t => t.id);

              // Fetch time entries
              const { data: entriesData } = await supabase
                .from('time_entries')
                .select('*')
                .in('task_id', taskIds);

              setTimeEntries(entriesData || []);
            }
          }

          // Fetch project columns for this client
          const { data: columnsData } = await supabase
            .from('project_columns')
            .select('*')
            .eq('client_id', clientData.id);

          setProjectColumns(columnsData || []);

          // Fetch existing share settings
          const { data: shareData } = await supabase
            .from('report_shares')
            .select('*')
            .eq('client_id', clientData.id)
            .maybeSingle();

          setReportShare(shareData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Filter and calculate report data - only show projects with hours > 0 in period
  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      
      const tasksWithHours = projectTasks.map(task => {
        const taskEntries = timeEntries.filter(te => {
          if (te.task_id !== task.id) return false;
          const entryDate = parseISO(te.date);
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
        });
        
        const monthHours = taskEntries.reduce((sum, te) => sum + Number(te.hours), 0);
        const monthTaskHours = taskEntries
          .filter(te => te.entry_type === 'task')
          .reduce((sum, te) => sum + Number(te.hours), 0);
        const monthMeetingHours = taskEntries
          .filter(te => te.entry_type === 'meeting')
          .reduce((sum, te) => sum + Number(te.hours), 0);
        const totalHours = timeEntries
          .filter(te => te.task_id === task.id)
          .reduce((sum, te) => sum + Number(te.hours), 0);
        
        return {
          ...task,
          monthHours,
          monthTaskHours,
          monthMeetingHours,
          totalHours,
        };
      }).filter(t => t.monthHours > 0); // Only tasks with hours in period

      const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
      const monthTaskHours = tasksWithHours.reduce((sum, t) => sum + t.monthTaskHours, 0);
      const monthMeetingHours = tasksWithHours.reduce((sum, t) => sum + t.monthMeetingHours, 0);
      const totalHours = tasksWithHours.reduce((sum, t) => sum + t.totalHours, 0);

      return {
        ...project,
        tasks: tasksWithHours,
        monthHours,
        monthTaskHours,
        monthMeetingHours,
        totalHours,
      };
    }).filter(p => p.monthHours > 0); // Only projects with hours in period
  }, [projects, tasks, timeEntries, selectedMonth]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };


  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const totalMonthTaskHours = reportData.reduce((sum, p) => sum + p.monthTaskHours, 0);
  const totalMonthMeetingHours = reportData.reduce((sum, p) => sum + p.monthMeetingHours, 0);
  const totalAllHours = timeEntries.reduce((sum, te) => sum + Number(te.hours), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <PageHeader
          title="Meus Relatórios"
          description="Visualize as horas dos seus projetos"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Sua conta não está vinculada a um cliente. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Meus Relatórios"
        description={`Relatórios de horas - ${client.company || client.name}`}
        actions={
          user && client && (
            <ReportShareDialog
              clientId={client.id}
              clientName={client.company || client.name}
              userId={user.id}
              share={reportShare}
              onShareChange={setReportShare}
              triggerButton={
                <Button variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </Button>
              }
            />
          )
        }
      />

      {/* Client Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumo do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Horas Contratadas</p>
              <p className="text-2xl font-bold text-foreground">{formatHours(client.contracted_hours)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Utilizadas</p>
              <p className="text-2xl font-bold text-foreground">{formatHours(totalAllHours)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Restantes</p>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(Math.max(0, client.contracted_hours - totalAllHours))}
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3 mt-4">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ 
                width: `${client.contracted_hours > 0 
                  ? Math.min((totalAllHours / client.contracted_hours) * 100, 100) 
                  : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="w-64">
            <Label className="mb-2 block">Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Projetos com atividade</p>
              <p className="text-2xl font-bold text-foreground">{reportData.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de horas</p>
              <p className="text-2xl font-bold text-foreground">{formatHours(totalMonthHours)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em tarefas</p>
              <p className="text-2xl font-bold text-primary">{formatHours(totalMonthTaskHours)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em reuniões</p>
              <p className="text-2xl font-bold text-accent-foreground">{formatHours(totalMonthMeetingHours)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      {reportData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum projeto com horas registradas no período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportData.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const originalProject = projects.find(p => p.id === project.id);
            const customFields = originalProject?.custom_fields || {};
            
            return (
              <Card key={project.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base">{project.name}</CardTitle>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 text-sm font-medium">
                            {project.monthTaskHours > 0 && <span className="text-primary">{formatHours(project.monthTaskHours)} tarefas</span>}
                            {project.monthMeetingHours > 0 && <span className="text-accent-foreground">{formatHours(project.monthMeetingHours)} reuniões</span>}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Custom Fields */}
                      {projectColumns.length > 0 && Object.keys(customFields).length > 0 && (
                        <div className="border-t border-border pt-4 mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-3">
                            Campos do Projeto
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {projectColumns.map(col => {
                              const value = customFields[col.id];
                              if (!value) return null;
                              return (
                                <div key={col.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm">
                                  <span className="text-muted-foreground">{col.name}:</span>
                                  <span className="font-medium text-foreground">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className={projectColumns.length > 0 && Object.keys(customFields).length > 0 ? '' : 'border-t border-border pt-4'}>
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Tarefas ({project.tasks.length})
                        </p>
                        <div className="space-y-3">
                          {project.tasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                            >
                              <div>
                                <p className="font-medium text-foreground">{task.name}</p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">{task.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="flex gap-2 text-xs">
                                  {task.monthTaskHours > 0 && <span className="text-primary font-medium">{formatHours(task.monthTaskHours)} tarefas</span>}
                                  {task.monthMeetingHours > 0 && <span className="text-accent-foreground font-medium">{formatHours(task.monthMeetingHours)} reuniões</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
