import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Loader2, Share2, Copy, Check, Globe, Lock, Users, User, KeyRound } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface ReportShare {
  id: string;
  client_id: string;
  share_token: string;
  is_public: boolean;
  share_password: string | null;
}

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, getProjectHours, getTaskHours, getClientHours } = useData();
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'by-client'>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // Sharing state
  const [reportShares, setReportShares] = useState<ReportShare[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [shareDialogClientId, setShareDialogClientId] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState('');

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
    return reportShares.find(s => s.client_id === clientId);
  };

  const handleCreateShare = async (clientId: string, password: string) => {
    if (!user) return;
    
    if (!password || password.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      const { data: shareData, error } = await supabase
        .from('report_shares')
        .insert({
          client_id: clientId,
          created_by: user.id,
          is_public: false,
          share_password: password
        })
        .select()
        .single();

      if (error) throw error;
      setReportShares(prev => [...prev, shareData]);
      setSharePassword('');
      toast.success('Link de compartilhamento criado!');
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Erro ao criar link de compartilhamento');
    } finally {
      setShareLoading(false);
    }
  };
  
  const handleUpdatePassword = async (share: ReportShare, newPassword: string) => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      const { data: updatedShare, error } = await supabase
        .from('report_shares')
        .update({ share_password: newPassword })
        .eq('id', share.id)
        .select()
        .single();

      if (error) throw error;
      setReportShares(prev => prev.map(s => s.id === share.id ? updatedShare : s));
      setSharePassword('');
      toast.success('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setShareLoading(false);
    }
  };

  const handleTogglePublic = async (share: ReportShare) => {
    setShareLoading(true);
    try {
      const { data: updatedShare, error } = await supabase
        .from('report_shares')
        .update({ is_public: !share.is_public })
        .eq('id', share.id)
        .select()
        .single();

      if (error) throw error;
      setReportShares(prev => prev.map(s => s.id === share.id ? updatedShare : s));
      toast.success(updatedShare.is_public ? 'Relatório agora é público' : 'Relatório agora é privado');
    } catch (error) {
      console.error('Error updating share:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/report/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(shareToken);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
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
    
    return (
      <Dialog open={shareDialogClientId === clientId} onOpenChange={(open) => {
        setShareDialogClientId(open ? clientId : null);
        if (!open) setSharePassword('');
      }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 sm:px-3">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Relatório</DialogTitle>
            <DialogDescription>
              Gere um link protegido por senha para compartilhar o relatório de {clientName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {!share ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="share-password" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Senha de acesso (obrigatória)
                  </Label>
                  <Input
                    id="share-password"
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quem acessar o link precisará informar esta senha.
                  </p>
                </div>
                <Button 
                  onClick={() => handleCreateShare(clientId, sharePassword)} 
                  disabled={shareLoading || sharePassword.length < 4}
                  className="w-full"
                >
                  {shareLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Link de Compartilhamento'
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {share.is_public ? (
                      <Globe className="w-5 h-5 text-primary" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {share.is_public ? 'Público' : 'Privado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {share.is_public 
                          ? 'Qualquer pessoa com o link e senha pode ver' 
                          : 'Link desabilitado'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={share.is_public}
                    onCheckedChange={() => handleTogglePublic(share)}
                    disabled={shareLoading}
                  />
                </div>
                
                {/* Password indicator */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Protegido por senha</span>
                </div>
                
                {/* Update password */}
                <div className="space-y-2">
                  <Label htmlFor="update-password">Alterar senha</Label>
                  <div className="flex gap-2">
                    <Input
                      id="update-password"
                      type="password"
                      placeholder="Nova senha"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => handleUpdatePassword(share, sharePassword)}
                      disabled={shareLoading || sharePassword.length < 4}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>

                {share.is_public && (
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 p-3 bg-muted rounded-lg text-sm text-muted-foreground overflow-hidden">
                      <span className="block truncate">Link de compartilhamento</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleCopyLink(share.share_token)}
                    >
                      {copiedToken === share.share_token ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}

                {!share.is_public && (
                  <p className="text-sm text-muted-foreground text-center">
                    Ative o modo público para compartilhar o link do relatório.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderProjectCard = (project: typeof allProjectsData[0], showClientName: boolean = true) => {
    const isExpanded = expandedProjects.has(project.id);
    
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
                      <p className="text-sm text-muted-foreground">{project.client?.name}</p>
                    )}
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
                        <p className="font-medium text-foreground">{task.monthHours.toFixed(2)}h</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {task.monthTaskHours > 0 && <span className="text-primary">{task.monthTaskHours.toFixed(2)}h tarefas</span>}
                          {task.monthMeetingHours > 0 && <span className="text-accent-foreground">{task.monthMeetingHours.toFixed(2)}h reuniões</span>}
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
              <p className="text-2xl font-bold text-foreground">{totalMonthHours.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em tarefas</p>
              <p className="text-2xl font-bold text-primary">{totalMonthTaskHours.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas em reuniões</p>
              <p className="text-2xl font-bold text-accent-foreground">{totalMonthMeetingHours.toFixed(2)}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média por cliente</p>
              <p className="text-2xl font-bold text-foreground">
                {totalClients > 0 ? (totalMonthHours / totalClients).toFixed(1) : 0}h
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
                                <CardTitle className="text-lg">{clientData.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {clientData.projects.length} projeto{clientData.projects.length !== 1 ? 's' : ''} • 
                                  Contratado: {clientData.contracted_hours}h
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xl font-bold text-foreground">{clientData.monthHours}h</p>
                                <p className="text-xs text-muted-foreground">no período</p>
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
                              <p className="text-sm text-muted-foreground">Horas Contratadas</p>
                              <p className="text-lg font-bold text-foreground">{clientData.contracted_hours}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Utilizado</p>
                              <p className="text-lg font-bold text-foreground">{clientData.totalHours}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Horas em Tarefas</p>
                              <p className="text-lg font-bold text-primary">{clientData.monthTaskHours.toFixed(2)}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Horas em Reuniões</p>
                              <p className="text-lg font-bold text-accent-foreground">{clientData.monthMeetingHours.toFixed(2)}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Restante</p>
                              <p className="text-lg font-bold text-foreground">
                                {Math.max(0, clientData.contracted_hours - clientData.totalHours)}h
                              </p>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ 
                                width: `${clientData.contracted_hours > 0 
                                  ? Math.min((clientData.totalHours / clientData.contracted_hours) * 100, 100) 
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
