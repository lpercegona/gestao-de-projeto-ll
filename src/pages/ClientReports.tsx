import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ChevronDown, ChevronRight, Loader2, Share2, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHours } from '@/lib/formatHours';
import { ReportShareDialog, ReportShare } from '@/components/reports/ReportShareDialog';
import { supabase } from '@/integrations/supabase/client';

export const ClientReports: React.FC = () => {
  const { user } = useAuth();
  const { 
    data, 
    loading, 
    getClientColumns, 
    getClientMonthlyHours, 
    getClientPreviousMonthOverflow 
  } = useData();
  
  const [reportShare, setReportShare] = useState<ReportShare | null>(null);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Get client for current user (RLS ensures only their data is returned)
  const client = useMemo(() => {
    if (!data.clients.length) return null;
    return data.clients[0] || null;
  }, [data.clients]);

  // Get data from context
  const projects = data.projects;
  const tasks = data.tasks;
  const timeEntries = data.timeEntries;
  const projectColumns = client ? getClientColumns(client.id) : [];

  // Fetch report share settings
  useEffect(() => {
    const fetchShareSettings = async () => {
      if (!client) return;
      const { data: shareData } = await supabase
        .from('report_shares')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();
      setReportShare(shareData);
    };
    fetchShareSettings();
  }, [client]);

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

  // Parse selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const isMonthly = client?.contract_type === 'monthly';

  // Calculate overflow for monthly contracts
  const previousOverflow = useMemo(() => {
    if (!client || !isMonthly) return 0;
    return getClientPreviousMonthOverflow(client.id, year, month);
  }, [client, isMonthly, year, month, getClientPreviousMonthOverflow]);

  const availableHours = useMemo(() => {
    if (!client) return 0;
    if (isMonthly) {
      return Math.max(0, client.contracted_hours - previousOverflow);
    }
    return client.contracted_hours;
  }, [client, isMonthly, previousOverflow]);

  // Filter and calculate report data
  const reportData = useMemo(() => {
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
      }).filter(t => t.monthHours > 0);

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
    }).filter(p => p.monthHours > 0);
  }, [projects, tasks, timeEntries, year, month]);

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

  // Calculate displayed used hours based on contract type
  const displayedUsedHours = isMonthly ? totalMonthHours : totalAllHours;
  const remainingHours = Math.max(0, availableHours - displayedUsedHours);

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

      {/* Contract Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Resumo do Contrato</CardTitle>
            <Badge variant={isMonthly ? "default" : "secondary"}>
              {isMonthly ? (
                <><RefreshCw className="w-3 h-3 mr-1" />Mensal</>
              ) : (
                <><Clock className="w-3 h-3 mr-1" />Único</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <p className="text-sm text-muted-foreground">
                {isMonthly ? 'Disponível' : 'Horas Contratadas'}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(availableHours)}
              </p>
              {isMonthly && previousOverflow > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatHours(client.contracted_hours)} - {formatHours(previousOverflow)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isMonthly ? 'Usado no Mês' : 'Total Utilizado'}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(displayedUsedHours)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em Tarefas</p>
              <p className="text-2xl font-bold text-primary">
                {formatHours(totalMonthTaskHours)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em Reuniões</p>
              <p className="text-2xl font-bold text-accent-foreground">
                {formatHours(totalMonthMeetingHours)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isMonthly ? 'Restante do Mês' : 'Restante'}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(remainingHours)}
              </p>
            </div>
          </div>
          
          {/* Overflow Alert for Monthly Contracts */}
          {isMonthly && previousOverflow > 0 && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 mt-4">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  Saldo Anterior: {formatHours(previousOverflow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Horas excedentes do mês anterior descontadas do limite deste mês
                </p>
              </div>
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 mt-4">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ 
                width: `${availableHours > 0 
                  ? Math.min((displayedUsedHours / availableHours) * 100, 100) 
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
            const visibleColumns = projectColumns.filter(col => col.show_in_report);
            
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
                      {visibleColumns.length > 0 && Object.keys(customFields).length > 0 && (
                        <div className="border-t border-border pt-4 mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-3">
                            Campos do Projeto
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {visibleColumns.map(col => {
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
                      
                      <div className={visibleColumns.length > 0 && Object.keys(customFields).length > 0 ? '' : 'border-t border-border pt-4'}>
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