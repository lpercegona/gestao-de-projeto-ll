import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { ChevronDown, ChevronRight, Loader2, Share2, Copy, Check, Globe, Lock, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client_id: string;
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

interface ReportShare {
  id: string;
  share_token: string;
  is_public: boolean;
  share_password: string | null;
}

export const ClientReports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [reportShare, setReportShare] = useState<ReportShare | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch client associated with user
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientData) {
          setClient(clientData);

          // Fetch projects for this client
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', clientData.id);

          setProjects(projectsData || []);

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

  const handleCreateShare = async (password: string) => {
    if (!client || !user) return;
    
    if (!password || password.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_shares')
        .insert({
          client_id: client.id,
          created_by: user.id,
          is_public: false,
          share_password: password
        })
        .select()
        .single();

      if (error) throw error;
      setReportShare(data);
      setSharePassword('');
      toast.success('Link de compartilhamento criado!');
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Erro ao criar link de compartilhamento');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    if (!reportShare) return;
    
    if (!newPassword || newPassword.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_shares')
        .update({ share_password: newPassword })
        .eq('id', reportShare.id)
        .select()
        .single();

      if (error) throw error;
      setReportShare(data);
      setSharePassword('');
      toast.success('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setShareLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!reportShare) return;
    
    setShareLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_shares')
        .update({ is_public: !reportShare.is_public })
        .eq('id', reportShare.id)
        .select()
        .single();

      if (error) throw error;
      setReportShare(data);
      toast.success(data.is_public ? 'Relatório agora é público' : 'Relatório agora é privado');
    } catch (error) {
      console.error('Error updating share:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!reportShare) return;
    
    const shareUrl = `${window.location.origin}/report/${reportShare.share_token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compartilhar Relatório</DialogTitle>
                <DialogDescription>
                  Gere um link público para compartilhar este relatório com terceiros.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                {!reportShare ? (
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
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quem acessar o link precisará informar esta senha.
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleCreateShare(sharePassword)} 
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
                        {reportShare.is_public ? (
                          <Globe className="w-5 h-5 text-primary" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {reportShare.is_public ? 'Público' : 'Privado'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reportShare.is_public 
                              ? 'Qualquer pessoa com o link e senha pode ver' 
                              : 'Link desabilitado'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={reportShare.is_public}
                        onCheckedChange={handleTogglePublic}
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
                          className="flex-1 min-w-0"
                        />
                        <Button 
                          variant="outline"
                          className="shrink-0"
                          onClick={() => handleUpdatePassword(sharePassword)}
                          disabled={shareLoading || sharePassword.length < 4}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>

                    {reportShare.is_public && (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 p-3 bg-muted rounded-lg text-sm text-muted-foreground overflow-hidden">
                          <span className="block truncate">Link de compartilhamento</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="shrink-0"
                          onClick={handleCopyLink}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {!reportShare.is_public && (
                      <p className="text-sm text-muted-foreground text-center">
                        Ative o modo público para compartilhar o link do relatório.
                      </p>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
              <p className="text-2xl font-bold text-foreground">{client.contracted_hours}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Utilizadas</p>
              <p className="text-2xl font-bold text-foreground">{totalAllHours}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Restantes</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.max(0, client.contracted_hours - totalAllHours)}h
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
          })}
        </div>
      )}
    </div>
  );
};
