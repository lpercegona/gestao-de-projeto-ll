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
import { ChevronDown, ChevronRight, Clock, Loader2, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  status: string;
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
}

interface ClientInfo {
  client_id: string;
  client_name: string;
  contracted_hours: number;
  is_public: boolean;
}

export const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch client info
        const { data: reportData, error: reportError } = await supabase.rpc('get_shared_report', {
          p_token: token
        });
        
        if (reportError || !reportData || reportData.length === 0) {
          setLoading(false);
          return;
        }
        
        setClientInfo(reportData[0]);
        
        // Fetch projects
        const { data: projectsData } = await supabase.rpc('get_shared_report_projects', {
          p_token: token
        });
        
        const mappedProjects: Project[] = (projectsData || []).map((p: any) => ({
          id: p.project_id,
          name: p.project_name,
          status: p.project_status
        }));
        setProjects(mappedProjects);
        
        // Fetch tasks
        const { data: tasksData } = await supabase.rpc('get_shared_report_tasks', {
          p_token: token
        });
        
        const mappedTasks: Task[] = (tasksData || []).map((t: any) => ({
          id: t.task_id,
          name: t.task_name,
          description: t.task_description,
          project_id: t.project_id
        }));
        setTasks(mappedTasks);
        
        // Fetch time entries
        const { data: entriesData } = await supabase.rpc('get_shared_report_time_entries', {
          p_token: token
        });
        
        const mappedEntries: TimeEntry[] = (entriesData || []).map((e: any) => ({
          id: e.entry_id,
          task_id: e.task_id,
          hours: Number(e.hours),
          date: e.entry_date
        }));
        setTimeEntries(mappedEntries);
        
      } catch (error) {
        console.error('Error fetching shared report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

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
        
        const monthHours = taskEntries.reduce((sum, te) => sum + te.hours, 0);
        const totalHours = timeEntries
          .filter(te => te.task_id === task.id)
          .reduce((sum, te) => sum + te.hours, 0);
        
        return {
          ...task,
          monthHours,
          totalHours,
        };
      }).filter(t => t.monthHours > 0); // Only tasks with hours in period

      const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
      const totalHours = tasksWithHours.reduce((sum, t) => sum + t.totalHours, 0);

      return {
        ...project,
        tasks: tasksWithHours,
        monthHours,
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
  const totalAllHours = timeEntries.reduce((sum, te) => sum + te.hours, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Relatório não disponível</h1>
            <p className="text-muted-foreground">
              Este relatório não existe ou não está disponível publicamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Relatório de Horas</h1>
              <p className="text-sm text-muted-foreground">{clientInfo.client_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Client Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumo do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Horas Contratadas</p>
                <p className="text-2xl font-bold text-foreground">{clientInfo.contracted_hours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Utilizadas</p>
                <p className="text-2xl font-bold text-foreground">{totalAllHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Restantes</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.max(0, clientInfo.contracted_hours - totalAllHours)}h
                </p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 mt-4">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ 
                  width: `${clientInfo.contracted_hours > 0 
                    ? Math.min((totalAllHours / clientInfo.contracted_hours) * 100, 100) 
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Projetos com atividade</p>
                <p className="text-2xl font-bold text-foreground">{reportData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas no período</p>
                <p className="text-2xl font-bold text-foreground">{totalMonthHours}h</p>
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
                            <p className="text-lg font-bold text-foreground">{project.monthHours}h</p>
                            <p className="text-xs text-muted-foreground">no período</p>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t border-border pt-4">
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
                                  <p className="font-medium text-foreground">{task.monthHours}h</p>
                                  <p className="text-xs text-muted-foreground">
                                    Total: {task.totalHours}h
                                  </p>
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
    </div>
  );
};
