import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ChevronDown, ChevronRight, Loader2, Users, User, RefreshCw, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHours } from '@/lib/formatHours';
import { Badge } from '@/components/ui/badge';
import { ReportShareDialog, ReportShare } from '@/components/reports/ReportShareDialog';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, getProjectHours, getTaskHours, getClientHours, getClientColumns } = useData();
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'by-client'>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // Sharing state
  const [reportShares, setReportShares] = useState<ReportShare[]>([]);

  // Fetch existing report shares
  useEffect(() => {
    const fetchShares = async () => {
      const { data: shares } = await supabase
        .from('report_shares')
        .select('*');
      setReportShares(shares || []);
    };
    fetchShares();
  }, []);

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

  // Calculate hours for a specific month with optional type filter
  const getMonthHours = (taskId: string, monthStart: Date, monthEnd: Date, entryType?: 'task' | 'meeting') => {
    return data.timeEntries
      .filter(te => {
        if (te.task_id !== taskId) return false;
        if (entryType && te.entry_type !== entryType) return false;
        const entryDate = parseISO(te.date);
        return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, te) => sum + Number(te.hours), 0);
  };

  // Calculate meeting hours for a specific month
  const getMonthMeetingHours = (taskId: string, monthStart: Date, monthEnd: Date) => {
    return getMonthHours(taskId, monthStart, monthEnd, 'meeting');
  };

  // Calculate task hours for a specific month
  const getMonthTaskHours = (taskId: string, monthStart: Date, monthEnd: Date) => {
    return getMonthHours(taskId, monthStart, monthEnd, 'task');
  };

  // Filter and calculate report data by client
  const reportDataByClient = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const clientsToProcess = selectedClientId === 'all' 
      ? data.clients 
      : data.clients.filter(c => c.id === selectedClientId);

    return clientsToProcess.map(client => {
      const clientProjects = data.projects.filter(p => p.client_id === client.id);
      
      const projectsWithData = clientProjects.map(project => {
        const projectTasks = data.tasks.filter(t => t.project_id === project.id);
        
        const tasksWithHours = projectTasks.map(task => {
          const monthHours = getMonthHours(task.id, monthStart, monthEnd);
          const monthTaskHours = getMonthTaskHours(task.id, monthStart, monthEnd);
          const monthMeetingHours = getMonthMeetingHours(task.id, monthStart, monthEnd);
          const totalHours = getTaskHours(task.id);
          
          return {
            ...task,
            monthHours,
            monthTaskHours,
            monthMeetingHours,
            totalHours,
          };
        }).filter(t => t.monthHours > 0 || t.totalHours > 0);

        const projectMonthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
        const projectMonthTaskHours = tasksWithHours.reduce((sum, t) => sum + t.monthTaskHours, 0);
        const projectMonthMeetingHours = tasksWithHours.reduce((sum, t) => sum + t.monthMeetingHours, 0);
        const projectTotalHours = getProjectHours(project.id);

        return {
          ...project,
          tasks: tasksWithHours,
          monthHours: projectMonthHours,
          monthTaskHours: projectMonthTaskHours,
          monthMeetingHours: projectMonthMeetingHours,
          totalHours: projectTotalHours,
        };
      }).filter(p => p.monthHours > 0 || p.tasks.length > 0);

      const clientMonthHours = projectsWithData.reduce((sum, p) => sum + p.monthHours, 0);
      const clientMonthTaskHours = projectsWithData.reduce((sum, p) => sum + p.monthTaskHours, 0);
      const clientMonthMeetingHours = projectsWithData.reduce((sum, p) => sum + p.monthMeetingHours, 0);
      const clientTotalHours = getClientHours(client.id);

      return {
        ...client,
        projects: projectsWithData,
        monthHours: clientMonthHours,
        monthTaskHours: clientMonthTaskHours,
        monthMeetingHours: clientMonthMeetingHours,
        totalHours: clientTotalHours,
      };
    }).filter(c => c.monthHours > 0 || c.projects.length > 0);
  }, [data, selectedMonth, selectedClientId, getProjectHours, getTaskHours, getClientHours]);

  // Flatten for "all projects" view
  const allProjectsData = useMemo(() => {
    return reportDataByClient.flatMap(client => 
      client.projects.map(project => ({
        ...project,
        client,
      }))
    );
  }, [reportDataByClient]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  // Sharing functions
  const getShareForClient = (clientId: string) => {
    return reportShares.find(s => s.client_id === clientId) || null;
  };

  const handleShareChange = (clientId: string, share: ReportShare | null) => {
    if (share) {
      setReportShares(prev => {
        const others = prev.filter(s => s.client_id !== clientId);
        return [...others, share];
      });
    } else {
      setReportShares(prev => prev.filter(s => s.client_id !== clientId));
    }
  };

  const totalMonthHours = reportDataByClient.reduce((sum, c) => sum + c.monthHours, 0);
  const totalMonthTaskHours = reportDataByClient.reduce((sum, c) => sum + c.monthTaskHours, 0);
  const totalMonthMeetingHours = reportDataByClient.reduce((sum, c) => sum + c.monthMeetingHours, 0);
  const totalClients = reportDataByClient.length;
  const totalProjects = allProjectsData.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderShareDialog = (clientId: string, clientName: string) => {
    const share = getShareForClient(clientId);
    
    return user ? (
      <ReportShareDialog
        clientId={clientId}
        clientName={clientName}
        userId={user.id}
        share={share}
        onShareChange={(newShare) => handleShareChange(clientId, newShare)}
      />
    ) : null;
  };

  const renderProjectCard = (project: typeof allProjectsData[0], showClientName: boolean = true) => {
    const isExpanded = expandedProjects.has(project.id);
    const clientId = 'client' in project && project.client ? project.client.id : (project as any).client_id;
    const clientColumns = clientId ? getClientColumns(clientId) : [];
    const customFields = (project as any).custom_fields || {};
    
    return (
      <Card key={project.id}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {showClientName && 'client' in project && (
                      <p className="text-sm text-muted-foreground">{project.client?.company || project.client?.name}</p>
                    )}
                  </div>
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
              {clientColumns.length > 0 && Object.keys(customFields).length > 0 && (
                <div className="border-t border-border pt-4 mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Campos do Projeto
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {clientColumns.map(col => {
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
              
              <div className={clientColumns.length > 0 && Object.keys(customFields).length > 0 ? '' : 'border-t border-border pt-4'}>
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
  };

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Visualize as horas registradas por projeto e período"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="w-full sm:w-64">
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
            
            <div className="w-full sm:w-64">
              <Label className="mb-2 block">Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {data.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company || client.name}
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
          <CardTitle>Resumo Geral do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-sm text-muted-foreground">Clientes ativos</p>
              <p className="text-2xl font-bold text-foreground">{totalClients}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projetos ativos</p>
              <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
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
            <div>
              <p className="text-sm text-muted-foreground">Média por cliente</p>
              <p className="text-2xl font-bold text-foreground">
                {totalClients > 0 ? formatHours(totalMonthHours / totalClients) : '0h'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'all' | 'by-client')} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="w-4 h-4" />
            Todos os Projetos
          </TabsTrigger>
          <TabsTrigger value="by-client" className="gap-2">
            <User className="w-4 h-4" />
            Por Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {allProjectsData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum registro de horas encontrado para o período selecionado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allProjectsData.map((project) => renderProjectCard(project, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-client" className="mt-4">
          {reportDataByClient.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum registro de horas encontrado para o período selecionado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {reportDataByClient.map((clientData) => {
                const isExpanded = expandedClients.has(clientData.id);
                const isMonthly = (clientData as any).contract_type === 'monthly';
                const displayedUsedHours = isMonthly ? clientData.monthHours : clientData.totalHours;
                const remainingHours = Math.max(0, clientData.contracted_hours - displayedUsedHours);
                
                return (
                  <Card key={clientData.id} className="overflow-hidden">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleClient(clientData.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{clientData.company || clientData.name}</CardTitle>
                                  <Badge variant={isMonthly ? "default" : "secondary"} className="text-xs">
                                    {isMonthly ? (
                                      <><RefreshCw className="w-3 h-3 mr-1" />Mensal</>
                                    ) : (
                                      <><Clock className="w-3 h-3 mr-1" />Único</>
                                    )}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {clientData.projects.length} projeto{clientData.projects.length !== 1 ? 's' : ''} • 
                                  Contratado: {formatHours(clientData.contracted_hours)}{isMonthly ? '/mês' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex gap-2 text-sm font-medium">
                                  {clientData.monthTaskHours > 0 && <span className="text-primary">{formatHours(clientData.monthTaskHours)} tarefas</span>}
                                  {clientData.monthMeetingHours > 0 && <span className="text-accent-foreground">{formatHours(clientData.monthMeetingHours)} reuniões</span>}
                                </div>
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                {renderShareDialog(clientData.id, clientData.name)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-4 space-y-4">
                          {/* Client summary */}
                          <div className="grid gap-4 grid-cols-2 md:grid-cols-5 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">{isMonthly ? 'Horas/Mês' : 'Horas Contratadas'}</p>
                              <p className="text-lg font-bold text-foreground">{formatHours(clientData.contracted_hours)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{isMonthly ? 'Usado no Mês' : 'Total Utilizado'}</p>
                              <p className="text-lg font-bold text-foreground">{formatHours(displayedUsedHours)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Horas em Tarefas</p>
                              <p className="text-lg font-bold text-primary">{formatHours(clientData.monthTaskHours)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Horas em Reuniões</p>
                              <p className="text-lg font-bold text-accent-foreground">{formatHours(clientData.monthMeetingHours)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{isMonthly ? 'Restante do Mês' : 'Restante'}</p>
                              <p className="text-lg font-bold text-foreground">{formatHours(remainingHours)}</p>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ 
                                width: `${clientData.contracted_hours > 0 
                                  ? Math.min((displayedUsedHours / clientData.contracted_hours) * 100, 100) 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          
                          {/* Projects */}
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">
                              Projetos ({clientData.projects.length})
                            </p>
                            {clientData.projects.map((project) => renderProjectCard({...project, client: clientData}, false))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
