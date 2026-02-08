import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { ClientEditRequestForm } from '@/components/client/ClientEditRequestForm';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
import { Plus, FolderKanban, Clock, Loader2, FileText, CheckCircle, XCircle, Search, ArrowRight, MoreVertical, Pencil, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  created_at: string;
}

export const ClientProjects: React.FC = () => {
  const { user } = useAuth();
  const { data, getProjectHours, getTaskHours, getCreatorName, getActiveTimer } = useData();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStageId, setFilterStageId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editEntity, setEditEntity] = useState<{
    type: 'project' | 'project_request';
    id: string;
    data: Record<string, unknown>;
  } | null>(null);

  const projectStatusOptions = useMemo(() => ([
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'archived', label: 'Arquivado' },
  ]), []);

  const filteredProjects = useMemo(() => {
    let projects = data.projects;

    if (filterStageId !== 'all') {
      projects = projects.filter((project) => project.status === filterStageId);
    }

    if (filterDateRange?.from) {
      projects = projects.filter((project) => {
        if (!project.due_date) return false;
        const dueDate = new Date(project.due_date);
        const from = startOfDay(filterDateRange.from!);
        const to = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from!);
        return isWithinInterval(dueDate, { start: from, end: to });
      });
    }

    if (filterStageId === 'all') {
      projects = projects.filter((project) => project.status !== 'archived');
    }

    return projects;
  }, [data.projects, filterDateRange, filterStageId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!clientData) {
          setLoading(false);
          return;
        }

        setClientId(clientData.id);

        const { data: requestsData, error } = await supabase
          .from('project_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(requestsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmitRequest = async (title: string, briefing: string, desiredDeadline?: string) => {
    if (!user) return;

    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!clientData) {
      toast.error('Erro: Cliente não encontrado');
      return;
    }

    const { data: newRequest, error } = await supabase
      .from('project_requests')
      .insert({
        client_id: clientData.id,
        title,
        briefing,
        desired_deadline: desiredDeadline || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação');
      return;
    }

    setRequests((prev) => [newRequest, ...prev]);
    toast.success('Solicitação enviada com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando análise</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Em análise</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Não aprovado</Badge>;
      case 'converted':
        return <Badge variant="default">Projeto criado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'in_review':
        return <Search className="w-5 h-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'converted':
        return <ArrowRight className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Meus Projetos"
        description="Visualize seus projetos e solicite novos"
        actions={
          <Button onClick={() => setIsFormOpen(true)} className="px-3 sm:px-4">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Solicitar Novo Projeto</span>
          </Button>
        }
      />

      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Solicitações</h2>
          <div className="space-y-4">
            {requests.map((request) => {
              const canEdit = request.status === 'pending' || request.status === 'in_review';

              return (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="pt-1">{getStatusIcon(request.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">{request.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{request.briefing}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              Enviado em {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {request.admin_notes && (
                              <div className="mt-2 p-2 bg-muted rounded-md">
                                <p className="text-xs font-medium text-muted-foreground">Observação:</p>
                                <p className="text-sm text-foreground">{request.admin_notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:block">
                              {getStatusBadge(request.status)}
                            </div>
                            {canEdit && clientId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditEntity({
                                      type: 'project_request',
                                      id: request.id,
                                      data: {
                                        title: request.title,
                                        briefing: request.briefing,
                                        desired_deadline: (request as unknown as { desired_deadline?: string }).desired_deadline || null,
                                      },
                                    });
                                    setEditFormOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Solicitar Edição
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Projetos em Andamento</h2>

        <ProjectFilters
          projectCount={filteredProjects.length}
          clients={[]}
          projectStatusOptions={projectStatusOptions}
          selectedClientId="all"
          selectedStageId={filterStageId}
          dateRange={filterDateRange}
          onClientChange={() => {}}
          onStageChange={setFilterStageId}
          onDateRangeChange={setFilterDateRange}
          pendingRequestsCount={0}
          showOnlyRequests={false}
          onShowOnlyRequestsChange={() => {}}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddProject={() => setIsFormOpen(true)}
          isAdminOrMaster={false}
          showClientFilter={false}
          showRequestsFilter={false}
          showViewToggle
        />

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Nenhum projeto encontrado para os filtros selecionados.</p>
              <Button onClick={() => setIsFormOpen(true)} className="px-3 sm:px-4">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Solicitar Novo Projeto</span>
                <span className="sm:hidden ml-2">Solicitar</span>
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <ProjectListView
            projects={filteredProjects}
            clients={data.clients}
            tasks={data.tasks}
            timeEntries={data.timeEntries}
            taskTimers={data.taskTimers}
            projectColumns={data.projectColumns}
            projectAccess={data.projectAccess}
            kanbanStages={data.kanbanStages}
            isAdminOrMaster={false}
            getProjectHours={getProjectHours}
            getTaskHours={getTaskHours}
            getCreatorName={getCreatorName}
            getActiveTimer={getActiveTimer}
            getClientColumns={() => []}
            onEditProject={(project) => {
              if (!clientId) return;
              setEditEntity({
                type: 'project',
                id: project.id,
                data: {
                  name: project.name,
                  description: project.description || '',
                  due_date: project.due_date || null,
                },
              });
              setEditFormOpen(true);
            }}
            onDeleteProject={() => {}}
            onArchiveProject={() => {}}
            onCreateTask={() => {}}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            onRegisterTime={() => {}}
            onStartTimer={async () => {}}
            onStopTimer={async () => {}}
            onCompleteTask={async () => {}}
          />
        ) : (
          <ProjectKanbanView
            projects={filteredProjects}
            clients={data.clients}
            tasks={data.tasks}
            timeEntries={data.timeEntries}
            taskTimers={data.taskTimers}
            kanbanStages={data.kanbanStages}
            isAdminOrMaster={false}
            getProjectHours={getProjectHours}
            getTaskHours={getTaskHours}
            getCreatorName={getCreatorName}
            getActiveTimer={getActiveTimer}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            onRegisterTime={() => {}}
            onStartTimer={async () => {}}
            onStopTimer={async () => {}}
            onCompleteTask={async () => {}}
            onUpdateTaskStatus={async () => {}}
            onCreateTask={() => {}}
            onManageStages={() => {}}
          />
        )}
      </div>

      <ProjectRequestForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmitRequest}
      />

      {editEntity && clientId && (
        <ClientEditRequestForm
          entityType={editEntity.type}
          entityId={editEntity.id}
          clientId={clientId}
          currentData={editEntity.data}
          open={editFormOpen}
          onOpenChange={(open) => {
            setEditFormOpen(open);
            if (!open) setEditEntity(null);
          }}
          onSuccess={() => {
            // Optionally refresh data
          }}
        />
      )}
    </div>
  );
};
