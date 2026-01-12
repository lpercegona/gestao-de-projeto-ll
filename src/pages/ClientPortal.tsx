import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getClientByToken, getData, getProjectHours, getTaskHours } from '@/lib/storage';
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
import { ChevronDown, ChevronRight, Clock, FolderKanban, ListTodo } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ClientPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const client = token ? getClientByToken(token) : undefined;
  const data = getData();
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

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

  const reportData = useMemo(() => {
    if (!client) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const clientProjects = data.projects.filter(p => p.clientId === client.id);

    return clientProjects.map(project => {
      const projectTasks = data.tasks.filter(t => t.projectId === project.id);
      
      const tasksWithHours = projectTasks.map(task => {
        const taskEntries = data.timeEntries.filter(te => {
          if (te.taskId !== task.id) return false;
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
  }, [client, data, selectedMonth]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

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

  const totalUsedHours = data.projects
    .filter(p => p.clientId === client.id)
    .reduce((sum, p) => sum + getProjectHours(p.id), 0);
  
  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const projectCount = data.projects.filter(p => p.clientId === client.id).length;
  const taskCount = data.tasks.filter(t => 
    data.projects.find(p => p.id === t.projectId && p.clientId === client.id)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horas Contratadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{client.contractedHours}h</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horas Utilizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalUsedHours}h</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${client.contractedHours > 0 
                      ? Math.min((totalUsedHours / client.contractedHours) * 100, 100) 
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
            <p className="text-3xl font-bold text-foreground">{totalMonthHours}h</p>
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
                            <p className="text-lg font-bold text-foreground">{project.monthHours}h</p>
                            <p className="text-xs text-muted-foreground">
                              Total: {project.totalHours}h
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
                                    <p className="font-medium text-foreground">{task.monthHours}h</p>
                                    <p className="text-xs text-muted-foreground">
                                      Total: {task.totalHours}h
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
