import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuickRequestCard } from '@/components/dashboard/QuickRequestCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatHours } from '@/lib/formatHours';
import { 
  FolderKanban, 
  CheckSquare, 
  Clock, 
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, getClientHours, getClientPreviousMonthOverflow } = useData();
  const [projectRequests, setProjectRequests] = useState<ProjectRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [clientInfo, setClientInfo] = useState<{ id: string; contracted_hours: number; contract_type: 'one_time' | 'monthly'; contract_end_date: string | null; contract_start_date: string | null } | null>(null);
  const [recentRequestsOpen, setRecentRequestsOpen] = useState(true);
  const [activeProjectsOpen, setActiveProjectsOpen] = useState(true);

  // Fetch client info and requests
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Get client_id from client_users
        const { data: clientUserData } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientUserData?.client_id) {
          // Get client info
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, contracted_hours, contract_type, contract_end_date, contract_start_date')
            .eq('id', clientUserData.client_id)
            .single();

          if (clientData) {
            setClientInfo({
              id: (clientData as any).id,
              contracted_hours: (clientData as any).contracted_hours,
              contract_type: ((clientData as any).contract_type as 'one_time' | 'monthly') || 'one_time',
              contract_end_date: (clientData as any).contract_end_date || null,
              contract_start_date: (clientData as any).contract_start_date || null,
            });
          }

          // Get project requests
          const { data: requestsData } = await supabase
            .from('project_requests')
            .select('*')
            .eq('client_id', clientUserData.client_id)
            .order('created_at', { ascending: false });

          if (requestsData) {
            setProjectRequests(requestsData);
          }
        }
      } catch (err) {
        console.error('Error fetching client data:', err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate statistics (moved before early return to avoid hook order issues)
  const activeProjects = data.projects.filter(p => p.status === 'active');
  const pendingTasks = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const contractedHours = clientInfo?.contracted_hours || 0;
  const usedHours = clientInfo?.id ? getClientHours(clientInfo.id) : 0;
  const isMonthly = clientInfo?.contract_type === 'monthly';
  
  // Calculate monthly hours and overflow for monthly clients
  const previousMonthOverflow = React.useMemo(() => {
    if (!clientInfo?.id || !isMonthly) return 0;
    return getClientPreviousMonthOverflow(clientInfo.id);
  }, [clientInfo?.id, isMonthly, getClientPreviousMonthOverflow]);
  
  // Calculate monthly hours for monthly clients
  const monthlyUsedHours = React.useMemo(() => {
    if (!clientInfo?.id || !isMonthly) return usedHours;
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const clientProjectsFiltered = data.projects.filter(p => p.client_id === clientInfo.id);
    const projectIds = new Set(clientProjectsFiltered.map(p => p.id));
    const clientTaskIds = new Set(data.tasks.filter(t => projectIds.has(t.project_id)).map(t => t.id));
    
    return data.timeEntries
      .filter(e => {
        if (!clientTaskIds.has(e.task_id)) return false;
        const entryDate = new Date(e.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.hours), 0);
  }, [clientInfo?.id, isMonthly, data.projects, data.tasks, data.timeEntries, usedHours]);
  
  // Calculate available hours (contracted - saldo anterior)
  const availableHours = isMonthly ? Math.max(0, contractedHours - previousMonthOverflow) : contractedHours;
  const displayedHours = isMonthly ? monthlyUsedHours : usedHours;
  const remainingHours = Math.max(0, availableHours - displayedHours);
  const hoursPercentage = availableHours > 0 ? Math.min((displayedHours / availableHours) * 100, 100) : 0;

  // Request statistics
  const pendingRequests = projectRequests.filter(r => r.status === 'pending');
  const analyzingRequests = projectRequests.filter(r => r.status === 'analyzing');
  const convertedRequests = projectRequests.filter(r => r.status === 'converted');

  const stats = [
    { label: 'Projetos Ativos', value: activeProjects.length, icon: FolderKanban },
    { label: 'Tarefas Pendentes', value: pendingTasks.length, icon: CheckSquare },
    { label: 'Solicitações Pendentes', value: pendingRequests.length + analyzingRequests.length, icon: FileText },
    { label: isMonthly ? 'Disponível este Mês' : 'Horas Utilizadas', value: isMonthly ? formatHours(availableHours) : formatHours(displayedHours), icon: Clock, extra: isMonthly && previousMonthOverflow > 0 ? `${formatHours(contractedHours)} - ${formatHours(previousMonthOverflow)} saldo ant.` : (contractedHours > 0 ? `de ${formatHours(contractedHours)}` : undefined) },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'analyzing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Em Análise</Badge>;
      case 'converted':
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Convertido</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const recentRequests = projectRequests.slice(0, 5);

  if (loading || loadingRequests) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Painel"
        description="Acompanhe seus projetos, tarefas e solicitações"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {stat.extra && (
                    <p className="text-xs text-muted-foreground">{stat.extra}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hours Progress */}
      {contractedHours > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {isMonthly ? `Horas do Mês - ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}` : 'Horas Contratadas'}
                </span>
                {isMonthly && (
                  <Badge variant="outline" className="text-xs">Plano Mensal</Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {formatHours(displayedHours)} / {formatHours(availableHours)}
              </span>
            </div>
            
            {/* Previous month overflow indicator */}
            {isMonthly && previousMonthOverflow > 0 && (
              <div className="mb-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Saldo Anterior: {formatHours(previousMonthOverflow)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Horas excedentes do mês anterior descontadas do limite deste mês
                </p>
              </div>
            )}
            
            <Progress value={hoursPercentage} className="h-2" />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {formatHours(remainingHours)} restantes{isMonthly ? ' este mês' : ''}
              </p>
              {isMonthly && displayedHours > availableHours && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {formatHours(displayedHours - availableHours)} serão descontadas do próximo mês
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Request Card */}
      <QuickRequestCard 
        pendingCount={pendingRequests.length + analyzingRequests.length}
      />

      {/* Recent Requests */}
      <Collapsible open={recentRequestsOpen} onOpenChange={setRecentRequestsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Solicitações Recentes
                </CardTitle>
                <ChevronDown className={`w-5 h-5 transition-transform ${recentRequestsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {recentRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhuma solicitação realizada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Active Projects */}
      <Collapsible open={activeProjectsOpen} onOpenChange={setActiveProjectsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderKanban className="w-5 h-5" />
                  Projetos Ativos
                </CardTitle>
                <ChevronDown className={`w-5 h-5 transition-transform ${activeProjectsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {activeProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum projeto ativo no momento
                </p>
              ) : (
                <div className="space-y-3">
                  {activeProjects.slice(0, 5).map((project) => {
                    const projectTasks = data.tasks.filter(t => t.project_id === project.id);
                    const completedTasks = projectTasks.filter(t => t.status === 'completed');
                    const progress = projectTasks.length > 0 
                      ? (completedTasks.length / projectTasks.length) * 100 
                      : 0;

                    return (
                      <div 
                        key={project.id} 
                        className="p-3 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{project.name}</p>
                          <Badge variant="outline">
                            {completedTasks.length}/{projectTasks.length} tarefas
                          </Badge>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
