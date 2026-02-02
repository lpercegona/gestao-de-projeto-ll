import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { ChevronDown, ChevronRight, FolderKanban, ListTodo, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client, Project, Task, TimeEntry } from '@/types';
import { formatHours } from '@/lib/formatHours';

export const ClientPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Validate token format
  const isValidToken = token && uuidRegex.test(token);

  useEffect(() => {
    const fetchClientData = async () => {
      // Validate token format before making any requests
      if (!token || !isValidToken) {
        setLoading(false);
        return;
      }

      // Use secure RPC function to get client data without exposing access_token
      const { data: clientData, error: clientError } = await supabase
        .rpc('get_client_portal_data', { p_token: token });

      if (clientError || !clientData || clientData.length === 0) {
        setLoading(false);
        return;
      }

      const clientRecord = clientData[0];
      // Create a minimal client object for display purposes
      const displayClient: Client = {
        id: clientRecord.client_id,
        name: clientRecord.client_name,
        email: clientRecord.client_email,
        contracted_hours: clientRecord.contracted_hours,
        access_token: '', // Not exposed for security
        user_id: null,
        created_at: '',
        contract_type: 'one_time',
        contract_start_date: null,
        contract_end_date: null,
        contract_months: null,
      };
      setClient(displayClient);

      // Use secure RPC function to get projects
      const { data: projectsData } = await supabase
        .rpc('get_client_portal_projects', { p_token: token });

      const mappedProjects: Project[] = (projectsData || []).map((p: any) => ({
        id: p.project_id,
        name: p.project_name,
        description: p.project_description,
        status: p.project_status,
        client_id: clientRecord.client_id,
        custom_fields: (p.custom_fields as Record<string, string>) || {},
        created_at: '',
        updated_at: '',
      }));
      setProjects(mappedProjects);

      if (projectsData && projectsData.length > 0) {
        // Use secure RPC function to get tasks
        const { data: tasksData } = await supabase
          .rpc('get_client_portal_tasks', { p_token: token });

        const mappedTasks: Task[] = (tasksData || []).map((t: any) => ({
          id: t.task_id,
          name: t.task_name,
          description: t.task_description,
          status: t.task_status,
          project_id: t.project_id,
          created_at: '',
          updated_at: '',
        }));
        setTasks(mappedTasks);

        if (tasksData && tasksData.length > 0) {
          // Use secure RPC function to get time entries
          const { data: entriesData } = await supabase
            .rpc('get_client_portal_time_entries', { p_token: token });

          const mappedEntries: TimeEntry[] = (entriesData || []).map((te: any) => ({
            id: te.entry_id,
            task_id: te.task_id,
            hours: te.hours,
            date: te.entry_date,
            description: te.description,
            created_at: '',
          }));
          setTimeEntries(mappedEntries);
        }
      }

      setLoading(false);
    };

    fetchClientData();
  }, [token, isValidToken]);

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

  const getTaskHours = (taskId: string): number => {
    return timeEntries
      .filter(te => te.task_id === taskId)
      .reduce((sum, te) => sum + te.hours, 0);
  };

  const getProjectHours = (projectId: string): number => {
    const projectTaskIds = tasks.filter(t => t.project_id === projectId).map(t => t.id);
    return timeEntries
      .filter(te => projectTaskIds.includes(te.task_id))
      .reduce((sum, te) => sum + te.hours, 0);
  };

  const reportData = useMemo(() => {
    if (!client) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const clientProjects = projects.filter(p => p.client_id === client.id);

    return clientProjects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      
      const tasksWithHours = projectTasks.map(task => {
        const taskEntries = timeEntries.filter(te => {
          if (te.task_id !== task.id) return false;
          const entryDate = parseISO(te.date);
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
        });
        
        const monthHours = taskEntries.reduce((sum, te) => sum + te.hours, 0);
        const totalHours = getTaskHours(task.id);
        
        return {
          ...task,
          monthHours,
          totalHours,
        };
      }).filter(t => t.monthHours > 0 || t.totalHours > 0);

      const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
      const totalHours = getProjectHours(project.id);

      return {
        ...project,
        tasks: tasksWithHours,
        monthHours,
        totalHours,
      };
    });
  }, [client, projects, tasks, timeEntries, selectedMonth]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">Link inválido</h1>
            <p className="text-muted-foreground">
              O link de acesso não é válido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsedHours = projects
    .filter(p => p.client_id === client.id)
    .reduce((sum, p) => sum + getProjectHours(p.id), 0);
  
  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const projectCount = projects.filter(p => p.client_id === client.id).length;
  const taskCount = tasks.filter(t => 
    projects.find(p => p.id === t.project_id && p.client_id === client.id)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Portal do Cliente</h1>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Contratadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatHours(client.contracted_hours)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Utilizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatHours(totalUsedHours)}</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${client.contracted_hours > 0 
                      ? Math.min((totalUsedHours / client.contracted_hours) * 100, 100) 
                      : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Projetos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{projectCount}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{taskCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="w-64">
              <Label className="mb-2 block">Período</Label>
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
            <CardTitle>
              Resumo - {monthOptions.find(m => m.value === selectedMonth)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{formatHours(totalMonthHours)}</p>
            <p className="text-sm text-muted-foreground">registradas no período</p>
          </CardContent>
        </Card>

        {/* Projects */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Projetos</h2>
        
        {reportData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum projeto encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reportData.map((project) => {
              const isExpanded = expandedProjects.has(project.id);
              
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
                            <div>
                              <CardTitle className="text-base">{project.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {project.tasks.length} tarefas
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{formatHours(project.monthHours)}</p>
                            <p className="text-xs text-muted-foreground">
                              Total: {formatHours(project.totalHours)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t border-border pt-4">
                          {project.tasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma tarefa com horas registradas neste período.
                            </p>
                          ) : (
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
                                    <p className="font-medium text-foreground">{formatHours(task.monthHours)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Total: {formatHours(task.totalHours)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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
    </div>
  );
};