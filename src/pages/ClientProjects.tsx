import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { ClientEditRequestForm } from '@/components/client/ClientEditRequestForm';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { toast } from 'sonner';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  desired_deadline?: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at?: string;
}

interface PendingTaskRequest {
  id: string;
  entity_id: string;
  status: string;
  proposed_data: Record<string, unknown>;
  created_at: string;
}

type UnifiedProject = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
  updated_at?: string;
  is_request?: boolean;
  request_status?: string;
  request_id?: string;
  desired_deadline?: string | null;
};



const getWysiwygPlainText = (content: string) => content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

type ClientTask = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  created_by: string | null;
  created_at: string;
  is_pending_approval?: boolean;
  approval_label?: string;
};

export const ClientProjects: React.FC = () => {
  const { user } = useAuth();
  const { data, getProjectHours, getTaskHours, getCreatorName, getActiveTimer, getClientColumns } = useData();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [pendingTaskRequests, setPendingTaskRequests] = useState<PendingTaskRequest[]>([]);
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
  const [taskRequestDialogOpen, setTaskRequestDialogOpen] = useState(false);
  const [taskRequestProjectId, setTaskRequestProjectId] = useState('');
  const [taskRequestSubmitting, setTaskRequestSubmitting] = useState(false);
  const [taskRequestForm, setTaskRequestForm] = useState({ name: '', description: '', due_date: '' });
  const [taskRequestCustomFields, setTaskRequestCustomFields] = useState<Record<string, string>>({});

  const [taskEditDialogOpen, setTaskEditDialogOpen] = useState(false);
  const [taskEditSubmitting, setTaskEditSubmitting] = useState(false);
  const [taskEditForm, setTaskEditForm] = useState({
    taskId: '',
    projectId: '',
    name: '',
    description: '',
    due_date: '',
  });

  const selectedTaskRequestProject = useMemo(() => {
    if (!taskRequestProjectId) return null;
    return data.projects.find((project) => project.id === taskRequestProjectId) || null;
  }, [data.projects, taskRequestProjectId]);

  const taskRequestProjectColumns = useMemo(() => {
    if (!selectedTaskRequestProject) return [];

    return data.projectColumns.filter(
      (column) => column.client_id === selectedTaskRequestProject.client_id,
    );
  }, [data.projectColumns, selectedTaskRequestProject]);

  const projectStatusOptions = useMemo(() => ([
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'archived', label: 'Arquivado' },
  ]), []);

  const visibleProjects = useMemo(() => {
    let projects = data.projects;

    if (filterStageId !== 'all') {
      projects = projects.filter((project) => project.status === filterStageId);
    }

    if (filterDateRange?.from) {
      projects = projects.filter((project) => {
        if (!project.due_date) return false;
        const dueDate = new Date(project.due_date);
        const from = startOfDay(filterDateRange.from);
        const to = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
        return isWithinInterval(dueDate, { start: from, end: to });
      });
    }

    if (filterStageId === 'all') {
      projects = projects.filter((project) => project.status !== 'archived');
    }

    return projects;
  }, [data.projects, filterDateRange, filterStageId]);

  const visibleRequestProjects = useMemo<UnifiedProject[]>(() => {
    if (viewMode === 'kanban') return [];

    return requests
      .filter(
        (request) =>
          !request.converted_project_id &&
          (request.status === 'pending' || request.status === 'analyzing' || request.status === 'in_review')
      )
      .map((request) => ({
        id: `request-${request.id}`,
        client_id: request.client_id,
        name: request.title,
        description: request.briefing || null,
        status: 'active',
        due_date: null,
        custom_fields: {},
        created_at: request.created_at,
        updated_at: request.updated_at || request.created_at,
        is_request: true,
        request_status: request.status,
        request_id: request.id,
        desired_deadline: request.desired_deadline || null,
      }));
  }, [requests, viewMode]);

  const filteredProjects: UnifiedProject[] = useMemo(() => {
    return [...(visibleProjects as UnifiedProject[]), ...visibleRequestProjects].sort((a, b) => {
      const firstDate = new Date(a.updated_at || a.created_at).getTime();
      const secondDate = new Date(b.updated_at || b.created_at).getTime();
      return secondDate - firstDate;
    });
  }, [visibleProjects, visibleRequestProjects]);

  const tasksWithPendingRequests = useMemo<ClientTask[]>(() => {
    const pendingTasks = pendingTaskRequests
      .map((request) => {
        const taskName = request.proposed_data?.task_name;
        if (typeof taskName !== 'string' || !taskName.trim()) return null;

        const taskDescription = request.proposed_data?.task_description;
        const taskDueDate = request.proposed_data?.task_due_date;

        return {
          id: `pending-task-request-${request.id}`,
          project_id: request.entity_id,
          name: taskName,
          description: typeof taskDescription === 'string' ? taskDescription : null,
          status: 'pending',
          due_date: typeof taskDueDate === 'string' ? taskDueDate : null,
          created_by: user?.id || null,
          created_at: request.created_at,
          is_pending_approval: true,
          approval_label: 'Aguardando aprovação',
        } as ClientTask;
      })
      .filter((task): task is ClientTask => task !== null);

    return [...data.tasks, ...pendingTasks];
  }, [data.tasks, pendingTaskRequests, user?.id]);

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

        const [{ data: requestsData, error: requestError }, { data: pendingTaskData, error: pendingTaskError }] = await Promise.all([
          supabase
            .from('project_requests')
            .select('id, client_id, title, briefing, status, desired_deadline, converted_project_id, created_at, updated_at')
            .eq('client_id', clientData.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('edit_requests')
            .select('id, entity_id, status, proposed_data, created_at')
            .eq('client_id', clientData.id)
            .eq('entity_type', 'project')
            .in('status', ['pending', 'analyzing', 'in_review'])
            .contains('proposed_data', { request_type: 'new_task' })
            .order('created_at', { ascending: false }),
        ]);

        if (requestError) throw requestError;
        if (pendingTaskError) throw pendingTaskError;

        setRequests((requestsData || []) as ProjectRequest[]);
        setPendingTaskRequests((pendingTaskData || []) as PendingTaskRequest[]);
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
      .select('id, client_id, title, briefing, status, desired_deadline, converted_project_id, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação');
      return;
    }

    setRequests((prev) => [newRequest as ProjectRequest, ...prev]);
    toast.success('Solicitação enviada com sucesso!');
  };

  const openEditRequest = (project: UnifiedProject) => {
    if (!clientId) return;

    if (project.is_request && project.request_id) {
      setEditEntity({
        type: 'project_request',
        id: project.request_id,
        data: {
          title: project.name,
          briefing: project.description || '',
          desired_deadline: project.desired_deadline || null,
        },
      });
    } else {
      setEditEntity({
        type: 'project',
        id: project.id,
        data: {
          name: project.name,
          description: project.description || '',
          due_date: project.due_date || null,
        },
      });
    }

    setEditFormOpen(true);
  };

  const handleOpenTaskRequestDialog = (projectId: string) => {
    const project = data.projects.find((item) => item.id === projectId);
    const clientColumns = project
      ? data.projectColumns.filter((column) => column.client_id === project.client_id)
      : [];

    const defaultCustomFields = clientColumns.reduce<Record<string, string>>((acc, column) => {
      const currentValue = project?.custom_fields?.[column.id];
      const defaultOption = column.type === 'select' ? (column.options?.[0] || '') : '';
      acc[column.id] = currentValue || defaultOption;
      return acc;
    }, {});

    setTaskRequestProjectId(projectId);
    setTaskRequestForm({ name: '', description: '', due_date: '' });
    setTaskRequestCustomFields(defaultCustomFields);
    setTaskRequestDialogOpen(true);
  };

  const handleSubmitTaskRequest = async () => {
    if (!clientId || !user || !taskRequestProjectId || !taskRequestForm.name.trim()) {
      toast.error('Preencha o nome da tarefa para solicitar.');
      return;
    }

    setTaskRequestSubmitting(true);

    try {
      const { data: createdRequest, error } = await supabase.from('edit_requests').insert([
        {
          entity_type: 'project',
          entity_id: taskRequestProjectId,
          client_id: clientId,
          requested_by: user.id,
          original_data: {},
          proposed_data: {
            request_type: 'new_task',
            task_name: taskRequestForm.name.trim(),
            task_description: getWysiwygPlainText(taskRequestForm.description) ? taskRequestForm.description : null,
            task_due_date: taskRequestForm.due_date || null,
            task_custom_fields: taskRequestCustomFields,
          },
        },
      ]).select('id, entity_id, status, proposed_data, created_at').single();

      if (error) throw error;

      if (createdRequest) {
        setPendingTaskRequests((prev) => [createdRequest as PendingTaskRequest, ...prev]);
      }

      toast.success('Solicitação de nova tarefa enviada para aprovação!');
      setTaskRequestDialogOpen(false);
      setTaskRequestProjectId('');
      setTaskRequestCustomFields({});
    } catch (error) {
      console.error('Error creating task request:', error);
      toast.error('Erro ao solicitar nova tarefa');
    } finally {
      setTaskRequestSubmitting(false);
    }
  };

  const handleOpenTaskEditDialog = (task: ClientTask) => {
    setTaskEditForm({
      taskId: task.id,
      projectId: task.project_id,
      name: task.name,
      description: task.description || '',
      due_date: task.due_date || '',
    });
    setTaskEditDialogOpen(true);
  };

  const handleSubmitTaskEditRequest = async () => {
    if (!clientId || !user || !taskEditForm.taskId || !taskEditForm.projectId || !taskEditForm.name.trim()) {
      toast.error('Preencha o nome da tarefa para solicitar a edição.');
      return;
    }

    setTaskEditSubmitting(true);

    try {
      const { error } = await supabase.from('edit_requests').insert([
        {
          entity_type: 'project',
          entity_id: taskEditForm.projectId,
          client_id: clientId,
          requested_by: user.id,
          original_data: {
            task_id: taskEditForm.taskId,
            task_name: taskEditForm.name,
            task_description: taskEditForm.description || null,
            task_due_date: taskEditForm.due_date || null,
          },
          proposed_data: {
            request_type: 'edit_task',
            task_id: taskEditForm.taskId,
            task_name: taskEditForm.name.trim(),
            task_description: getWysiwygPlainText(taskEditForm.description) ? taskEditForm.description : null,
            task_due_date: taskEditForm.due_date || null,
          },
        },
      ]);

      if (error) throw error;

      toast.success('Solicitação de edição da tarefa enviada para aprovação!');
      setTaskEditDialogOpen(false);
      setTaskEditForm({ taskId: '', projectId: '', name: '', description: '', due_date: '' });
    } catch (error) {
      console.error('Error creating task edit request:', error);
      toast.error('Erro ao solicitar edição da tarefa');
    } finally {
      setTaskEditSubmitting(false);
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
    <div className="space-y-4">
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
        showAddButton
      />

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhum projeto encontrado para os filtros selecionados.</p>
            <Button onClick={() => setIsFormOpen(true)} size="icon" className="h-8 w-8 shrink-0 rounded-lg">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <ProjectListView
          projects={filteredProjects}
          clients={data.clients}
          tasks={tasksWithPendingRequests}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          projectColumns={data.projectColumns}
          projectAccess={data.projectAccess}
          kanbanStages={data.kanbanStages}
          isAdminOrMaster={false}
          allowProjectEditOnly
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getActiveTimer}
          getClientColumns={getClientColumns}
          onEditProject={(project) => openEditRequest(project as UnifiedProject)}
          onDeleteProject={() => {}}
          onArchiveProject={() => {}}
          onCreateTask={handleOpenTaskRequestDialog}
          onEditTask={() => {}}
          onDeleteTask={() => {}}
          onRegisterTime={() => {}}
          onStartTimer={async () => {}}
          onStopTimer={async () => {}}
          onCompleteTask={async () => {}}
          onRequestTaskEdit={handleOpenTaskEditDialog}
        />
      ) : (
        <ProjectKanbanView
          projects={visibleProjects}
          clients={data.clients}
          tasks={tasksWithPendingRequests}
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
          onCreateTask={handleOpenTaskRequestDialog}
          onManageStages={() => {}}
          clientRestrictedMode
          onRequestTaskEdit={handleOpenTaskEditDialog}
        />
      )}


      <Dialog open={taskEditDialogOpen} onOpenChange={setTaskEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Edição da Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-edit-name">Nome da tarefa</Label>
              <Input
                id="task-edit-name"
                value={taskEditForm.name}
                onChange={(event) => setTaskEditForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={taskEditSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-edit-description">Descrição</Label>
              <WysiwygEditor
                value={taskEditForm.description}
                onChange={(value) => setTaskEditForm((prev) => ({ ...prev, description: value }))}
                disabled={taskEditSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-edit-due-date">Prazo</Label>
              <Input
                id="task-edit-due-date"
                type="date"
                value={taskEditForm.due_date}
                onChange={(event) => setTaskEditForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={taskEditSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskEditDialogOpen(false)} disabled={taskEditSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitTaskEditRequest} disabled={taskEditSubmitting}>
              {taskEditSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={taskRequestDialogOpen} onOpenChange={setTaskRequestDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Solicitar Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="task-request-name">Nome da tarefa</Label>
              <Input
                id="task-request-name"
                value={taskRequestForm.name}
                onChange={(event) => setTaskRequestForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ex: Criar arte para campanha"
                disabled={taskRequestSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-request-description">Descrição</Label>
              <WysiwygEditor
                value={taskRequestForm.description}
                onChange={(value) => setTaskRequestForm((prev) => ({ ...prev, description: value }))}
                placeholder="Descreva o que precisa ser feito"
                disabled={taskRequestSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-request-due-date">Prazo (opcional)</Label>
              <Input
                id="task-request-due-date"
                type="date"
                value={taskRequestForm.due_date}
                onChange={(event) => setTaskRequestForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={taskRequestSubmitting}
              />
            </div>

            {taskRequestProjectColumns.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Campos personalizados do cliente</p>
                {taskRequestProjectColumns.map((column) => (
                  <div key={column.id} className="space-y-2">
                    <Label>{column.name}</Label>
                    {column.type === 'select' ? (
                      <Select value={taskRequestCustomFields[column.id] || ''} disabled>
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${column.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(column.options || []).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={taskRequestCustomFields[column.id] || ''}
                        onChange={(event) => setTaskRequestCustomFields((prev) => ({
                          ...prev,
                          [column.id]: event.target.value,
                        }))}
                        disabled={taskRequestSubmitting}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskRequestDialogOpen(false)} disabled={taskRequestSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitTaskRequest} disabled={taskRequestSubmitting || !taskRequestForm.name.trim()}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
