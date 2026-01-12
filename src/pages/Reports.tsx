import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Reports: React.FC = () => {
  const { data, getProjectHours, getTaskHours } = useData();
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

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

  // Filter and calculate report data
  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const filteredProjects = data.projects.filter(p => 
      selectedClientId === 'all' || p.clientId === selectedClientId
    );

    return filteredProjects.map(project => {
      const client = data.clients.find(c => c.id === project.clientId);
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
          entries: taskEntries,
        };
      }).filter(t => t.monthHours > 0 || t.totalHours > 0);

      const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
      const totalHours = getProjectHours(project.id);

      return {
        ...project,
        client,
        tasks: tasksWithHours,
        monthHours,
        totalHours,
      };
    }).filter(p => p.monthHours > 0 || p.tasks.length > 0);
  }, [data, selectedMonth, selectedClientId, getProjectHours, getTaskHours]);

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

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Visualize as horas registradas por projeto e período"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
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
            
            <div className="w-64">
              <Label className="mb-2 block">Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {data.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Projetos com atividade</p>
              <p className="text-2xl font-bold text-foreground">{reportData.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas no período</p>
              <p className="text-2xl font-bold text-foreground">{totalMonthHours}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média por projeto</p>
              <p className="text-2xl font-bold text-foreground">
                {reportData.length > 0 ? (totalMonthHours / reportData.length).toFixed(1) : 0}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      {reportData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum registro de horas encontrado para o período selecionado.
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
                            <p className="text-sm text-muted-foreground">{project.client?.name}</p>
                          </div>
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
  );
};
