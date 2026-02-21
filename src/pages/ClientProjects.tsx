import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { ClientEditRequestForm } from '@/components/client/ClientEditRequestForm';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { toast } from 'sonner';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { getWysiwygPlainText } from '@/lib/wysiwyg';

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
  const { data, refreshData, createProject, getProjectHours, getTaskHours, getCreatorName, getActiveTimer, getClientColumns } = useData();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [pendingTaskRequests, setPendingTaskRequests] = useState<PendingTaskRequest[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddProjectOptionDialogOpen, setIsAddProjectOptionDialogOpen] = useState(false);
  const [isDirectProjectDialogOpen, setIsDirectProjectDialogOpen] = useState(false);
  const [projectCreateSubmitting, setProjectCreateSubmitting] = useState(false);
  const [projectCreateForm, setProjectCreateForm] = useState({
    name: '',
    description: '',
    due_date: '',
  });
  const [projectTasks, setProjectTasks] = useState<Array<{ name: string; description: string; due_date: string }>>([]);
  const [projectTaskDialogOpen, setProjectTaskDialogOpen] = useState(false);
  const [projectTaskForm, setProjectTaskForm] = useState({ name: '', description: '', due_date: '' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'table'>('list');
  const [filterStageId, setFilterStageId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editEntity, setEditEntity] = useState<{
    type: 'project' | 'project_request';
    id: string;
    data: Record<string, unknown>;
  } | null>(null);

  // Direct task creation dialog (client autonomy)
  const [taskCreateDialogOpen, setTaskCreateDialogOpen] = useState(false);
  const [taskCreateProjectId, setTaskCreateProjectId] = useState('');
  const [taskCreateStatus, setTaskCreateStatus] = useState('pending');
  const [taskCreateSubmitting, setTaskCreateSubmitting] = useState(false);
  const [taskCreateForm, setTaskCreateForm] = useState({ name: '', description: '', due_date: '' });

  // Task edit dialog (for own tasks)
  const [taskEditDialogOpen, setTaskEditDialogOpen] = useState(false);
  const [taskEditSubmitting, setTaskEditSubmitting] = useState(false);
  const [taskEditForm, setTaskEditForm] = useState({
    taskId: '',
    projectId: '',
    name: '',
    description: '',
    due_date: '',
  });

  // Task edit request dialog (for admin tasks)
  const [taskEditRequestDialogOpen, setTaskEditRequestDialogOpen] = useState(false);
  const [taskEditRequestSubmitting, setTaskEditRequestSubmitting] = useState(false);
  const [taskEditRequestForm, setTaskEditRequestForm] = useState({
    taskId: '',
    projectId: '',
    name: '',
    description: '',
    due_date: '',
  });

  // Delete task dialog
  const [taskDeleteDialogOpen, setTaskDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ClientTask | null>(null);

  const [deletingRequest, setDeletingRequest] = useState<UnifiedProject | null>(null);
  const [isDeleteRequestDialogOpen, setIsDeleteRequestDialogOpen] = useState(false);

  const getCurrentUserActiveTimer = useCallback((taskId: string) => {
    const timer = getActiveTimer(taskId);
    if (!timer || !user) return null;
    return timer.user_id === user.id ? timer : null;
  }, [getActiveTimer, user]);

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
        const [{ data: clientData }, { data: clientUserData }] = await Promise.all([
          supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('client_users').select('client_id').eq('user_id', user.id).maybeSingle(),
        ]);
        const resolvedClientId = clientData?.id || clientUserData?.client_id;
        if (!resolvedClientId) {
          setLoading(false);
          return;
        }
        setClientId(resolvedClientId);
        const [{ data: requestsData, error: requestError }, { data: pendingTaskData, error: pendingTaskError }] = await Promise.all([
          supabase
            .from('project_requests')
            .select('id, client_id, title, briefing, status, desired_deadline, converted_project_id, created_at, updated_at')
            .eq('client_id', resolvedClientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('edit_requests')
            .select('id, entity_id, status, proposed_data, created_at')
            .eq('client_id', resolvedClientId)
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

  const handleSubmitRequest = async (title: string, briefing: string, customFields: Record<string, string>, desiredDeadline?: string) => {
    if (!user) return;
    const [{ data: clientData }, { data: clientUserData }] = await Promise.all([
      supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('client_users').select('client_id').eq('user_id', user.id).maybeSingle(),
    ]);
    const resolvedClientId = clientData?.id || clientUserData?.client_id;
    if (!resolvedClientId) {
      toast.error('Erro: Cliente não encontrado');
      return;
    }
    if (!clientId) setClientId(resolvedClientId);
    const { data: newRequest, error } = await supabase
      .from('project_requests')
      .insert({
        client_id: resolvedClientId,
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

  const handleOpenAddProjectOptions = () => {
    setIsAddProjectOptionDialogOpen(true);
  };

  const handleOpenProjectRequestDialog = () => {
    setIsAddProjectOptionDialogOpen(false);
    setIsFormOpen(true);
  };

  const handleOpenDirectProjectDialog = () => {
    setProjectCreateForm({ name: '', description: '', due_date: '' });
    setProjectTasks([]);
    setProjectTaskForm({ name: '', description: '', due_date: '' });
    setIsAddProjectOptionDialogOpen(false);
    setIsDirectProjectDialogOpen(true);
  };

  const handleAddProjectTask = () => {
    if (!projectTaskForm.name.trim()) return;
    setProjectTasks((prev) => [...prev, { ...projectTaskForm, name: projectTaskForm.name.trim() }]);
    setProjectTaskForm({ name: '', description: '', due_date: '' });
    setProjectTaskDialogOpen(false);
  };

  const handleRemoveProjectTask = (index: number) => {
    setProjectTasks((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmitDirectProject = async () => {
    if (!clientId) {
      toast.error('Cliente não encontrado para criar o projeto.');
      return;
    }

    if (!projectCreateForm.name.trim()) {
      toast.error('Preencha o nome do projeto.');
      return;
    }

    setProjectCreateSubmitting(true);
    try {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: projectCreateForm.name.trim(),
          description: getWysiwygPlainText(projectCreateForm.description) ? projectCreateForm.description : null,
          due_date: projectCreateForm.due_date || null,
          custom_fields: {},
          created_by: user?.id || null,
        })
        .select('id')
        .single();

      if (projectError || !newProject) {
        console.error('Error creating direct project:', projectError);
        toast.error('Erro ao criar projeto.');
        return;
      }

      if (projectTasks.length > 0) {
        const tasksToInsert = projectTasks.map((task) => ({
          project_id: newProject.id,
          name: task.name,
          description: getWysiwygPlainText(task.description) ? task.description : null,
          due_date: task.due_date || null,
          status: 'pending',
          created_by: user?.id || null,
        }));
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) {
          console.error('Error creating tasks:', tasksError);
          toast.error('Projeto criado, mas houve erro ao criar tarefas.');
        }
      }

      toast.success('Projeto criado com sucesso!');
      setIsDirectProjectDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error('Error creating direct project:', error);
      toast.error('Erro ao criar projeto.');
    } finally {
      setProjectCreateSubmitting(false);
    }
  };

  const openEditRequest = (project: UnifiedProject) => {
    if (!clientId) return;
    if (project.is_request && project.request_id) {
      setEditEntity({
        type: 'project_request',
        id: project.request_id,
        data: { title: project.name, briefing: project.description || '', desired_deadline: project.desired_deadline || null },
      });
    } else {
      setEditEntity({
        type: 'project',
        id: project.id,
        data: { name: project.name, description: project.description || '', due_date: project.due_date || null },
      });
    }
    setEditFormOpen(true);
  };

  const handleDeleteRequest = async () => {
    const project = deletingRequest;
    if (!project || !project.is_request || !project.request_id) return;
    try {
      const { error } = await supabase.from('project_requests').delete().eq('id', project.request_id);
      if (error) throw error;
      setRequests((prev) => prev.filter((item) => item.id !== project.request_id));
      toast.success('Solicitação excluída com sucesso!');
      setIsDeleteRequestDialogOpen(false);
      setDeletingRequest(null);
    } catch (error) {
      console.error('Error deleting project request:', error);
      toast.error('Erro ao excluir solicitação');
    }
  };

  // ---- Direct task creation (client autonomy) ----
  const handleOpenTaskCreate = (projectId: string, status?: string) => {
    setTaskCreateProjectId(projectId);
    setTaskCreateStatus(status || 'pending');
    setTaskCreateForm({ name: '', description: '', due_date: '' });
    setTaskCreateDialogOpen(true);
  };

  const handleSubmitTaskCreate = async () => {
    if (!user || !taskCreateProjectId || !taskCreateForm.name.trim()) {
      toast.error('Preencha o nome da tarefa.');
      return;
    }
    setTaskCreateSubmitting(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: taskCreateProjectId,
        name: taskCreateForm.name.trim(),
        description: getWysiwygPlainText(taskCreateForm.description) ? taskCreateForm.description : null,
        due_date: taskCreateForm.due_date || null,
        status: taskCreateStatus,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Tarefa criada com sucesso!');
      setTaskCreateDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa.');
    } finally {
      setTaskCreateSubmitting(false);
    }
  };

  // ---- Edit own task ----
  const handleOpenTaskEdit = (task: ClientTask) => {
    setTaskEditForm({
      taskId: task.id,
      projectId: task.project_id,
      name: task.name,
      description: task.description || '',
      due_date: task.due_date || '',
    });
    setTaskEditDialogOpen(true);
  };

  const handleSubmitTaskEdit = async () => {
    if (!user || !taskEditForm.taskId || !taskEditForm.name.trim()) {
      toast.error('Preencha o nome da tarefa.');
      return;
    }
    setTaskEditSubmitting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          name: taskEditForm.name.trim(),
          description: getWysiwygPlainText(taskEditForm.description) ? taskEditForm.description : null,
          due_date: taskEditForm.due_date || null,
        })
        .eq('id', taskEditForm.taskId);
      if (error) throw error;
      toast.success('Tarefa atualizada com sucesso!');
      setTaskEditDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa.');
    } finally {
      setTaskEditSubmitting(false);
    }
  };

  // ---- Request edit for admin tasks ----
  const handleOpenTaskEditRequest = (task: ClientTask) => {
    setTaskEditRequestForm({
      taskId: task.id,
      projectId: task.project_id,
      name: task.name,
      description: task.description || '',
      due_date: task.due_date || '',
    });
    setTaskEditRequestDialogOpen(true);
  };

  const handleSubmitTaskEditRequest = async () => {
    if (!clientId || !user || !taskEditRequestForm.taskId || !taskEditRequestForm.name.trim()) {
      toast.error('Preencha o nome da tarefa para solicitar a edição.');
      return;
    }
    setTaskEditRequestSubmitting(true);
    try {
      const { error } = await supabase.from('edit_requests').insert([{
        entity_type: 'project',
        entity_id: taskEditRequestForm.projectId,
        client_id: clientId,
        requested_by: user.id,
        original_data: {
          task_id: taskEditRequestForm.taskId,
          task_name: taskEditRequestForm.name,
          task_description: taskEditRequestForm.description || null,
          task_due_date: taskEditRequestForm.due_date || null,
        },
        proposed_data: {
          request_type: 'edit_task',
          task_id: taskEditRequestForm.taskId,
          task_name: taskEditRequestForm.name.trim(),
          task_description: getWysiwygPlainText(taskEditRequestForm.description) ? taskEditRequestForm.description : null,
          task_due_date: taskEditRequestForm.due_date || null,
        },
      }]);
      if (error) throw error;
      toast.success('Solicitação de edição da tarefa enviada para aprovação!');
      setTaskEditRequestDialogOpen(false);
    } catch (error) {
      console.error('Error creating task edit request:', error);
      toast.error('Erro ao solicitar edição da tarefa');
    } finally {
      setTaskEditRequestSubmitting(false);
    }
  };

  // ---- Delete own task ----
  const handleOpenTaskDelete = (task: ClientTask) => {
    setTaskToDelete(task);
    setTaskDeleteDialogOpen(true);
  };

  const handleConfirmTaskDelete = async () => {
    if (!taskToDelete) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw error;
      toast.success('Tarefa excluída com sucesso!');
      setTaskDeleteDialogOpen(false);
      setTaskToDelete(null);
      refreshData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa.');
    }
  };

  // ---- Timer handlers for own tasks ----
  const handleStartTimer = async (taskId: string) => {
    if (!user) return;
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const project = data.projects.find((p) => p.id === task.project_id);
    const client = project ? data.clients.find((c) => c.id === project.client_id) : null;

    const { error } = await supabase.from('task_timers').insert({
      task_id: taskId,
      user_id: user.id,
      task_title_snapshot: task.name,
      task_description_snapshot: task.description,
      project_name_snapshot: project?.name || null,
      client_name_snapshot: client?.name || null,
    });
    if (error) {
      console.error('Error starting timer:', error);
      toast.error('Erro ao iniciar timer.');
      return;
    }
    refreshData();
  };

  const handleStopTimer = async (taskId: string) => {
    if (!user) return;
    const timer = getCurrentUserActiveTimer(taskId);
    if (!timer) return;
    const startedAt = new Date(timer.started_at);
    const now = new Date();
    const elapsedMs = now.getTime() - startedAt.getTime() - (timer.paused_elapsed_seconds * 1000);
    const hours = Math.max(0.01, parseFloat((elapsedMs / 3600000).toFixed(2)));

    const { error: entryError } = await supabase.from('time_entries').insert({
      task_id: taskId,
      hours,
      description: 'Registro automático via timer',
      date: new Date().toISOString().split('T')[0],
      created_by: user.id,
      entry_type: 'timer',
    });
    if (entryError) {
      console.error('Error creating time entry:', entryError);
      toast.error('Erro ao registrar horas.');
      return;
    }

    const { error: deleteError } = await supabase.from('task_timers').delete().eq('id', timer.id);
    if (deleteError) console.error('Error deleting timer:', deleteError);

    toast.success(`Timer parado. ${hours}h registradas.`);
    refreshData();
  };

  const handleCompleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
    if (error) {
      console.error('Error completing task:', error);
      toast.error('Erro ao concluir tarefa.');
      return;
    }
    toast.success('Tarefa concluída!');
    refreshData();
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status da tarefa.');
      return;
    }
    refreshData();
  };

  const handleRegisterTime = (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string }) => {
    // For now clients can use the same register time flow
    // This could open a dialog for manual time entry
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Per-task permission helper
  const isOwnTask = (task: ClientTask) => task.created_by === user?.id;

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
        onAddProject={handleOpenAddProjectOptions}
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
            <Button onClick={handleOpenAddProjectOptions} size="icon" className="h-8 w-8 shrink-0 rounded-lg">
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
          getActiveTimer={getCurrentUserActiveTimer}
          getClientColumns={getClientColumns}
          onEditProject={(project) => openEditRequest(project as UnifiedProject)}
          onDeleteProject={() => {}}
          onArchiveProject={() => {}}
          onCreateTask={handleOpenTaskCreate}
          onEditTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskEdit(task as ClientTask);
            }
          }}
          onDeleteTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskDelete(task as ClientTask);
            }
          }}
          onRegisterTime={handleRegisterTime}
          onStartTimer={(taskId) => handleStartTimer(taskId)}
          onStopTimer={(taskId) => handleStopTimer(taskId)}
          onCompleteTask={(taskId) => handleCompleteTask(taskId)}
          onRequestTaskEdit={(task) => {
            const t = task as ClientTask;
            if (!isOwnTask(t)) {
              handleOpenTaskEditRequest(t);
            }
          }}
          onEditRequest={(project) => openEditRequest(project as UnifiedProject)}
          onDeleteRequest={(project) => {
            setDeletingRequest(project as UnifiedProject);
            setIsDeleteRequestDialogOpen(true);
          }}
          currentUserId={user?.id}
        />
      ) : viewMode === 'table' ? (
        <ProjectTableView
          projects={filteredProjects}
          clients={data.clients}
          tasks={tasksWithPendingRequests}
          timeEntries={data.timeEntries}
          projectColumns={data.projectColumns}
          kanbanStages={data.kanbanStages}
          isAdminOrMaster={false}
          allowProjectEditOnly
          currentUserId={user?.id}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getClientColumns={getClientColumns}
          onEditProject={(project) => openEditRequest(project as UnifiedProject)}
          onDeleteProject={() => {}}
          onArchiveProject={() => {}}
          onEditTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskEdit(task as ClientTask);
            }
          }}
          onDeleteTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskDelete(task as ClientTask);
            }
          }}
          onRequestTaskEdit={(task) => {
            const t = task as ClientTask;
            if (!isOwnTask(t)) {
              handleOpenTaskEditRequest(t);
            }
          }}
          onEditRequest={(project) => openEditRequest(project as UnifiedProject)}
          onDeleteRequest={(project) => {
            setDeletingRequest(project as UnifiedProject);
            setIsDeleteRequestDialogOpen(true);
          }}
        />
      ) : (
        <ProjectKanbanView
          projects={visibleProjects}
          clients={data.clients}
          tasks={tasksWithPendingRequests}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          kanbanStages={data.kanbanStages}
          projectAccess={data.projectAccess}
          isAdminOrMaster={false}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getCurrentUserActiveTimer}
          onEditTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskEdit(task as ClientTask);
            }
          }}
          onDeleteTask={(task) => {
            if (isOwnTask(task as ClientTask)) {
              handleOpenTaskDelete(task as ClientTask);
            }
          }}
          onRegisterTime={handleRegisterTime}
          onStartTimer={(taskId) => handleStartTimer(taskId)}
          onStopTimer={(taskId) => handleStopTimer(taskId)}
          onCompleteTask={(taskId) => handleCompleteTask(taskId)}
          onUpdateTaskStatus={(taskId, newStatus) => handleUpdateTaskStatus(taskId, newStatus)}
          onCreateTask={handleOpenTaskCreate}
          onManageStages={() => {}}
          currentUserId={user?.id}
          onRequestTaskEdit={(task) => {
            const t = task as ClientTask;
            if (!isOwnTask(t)) {
              handleOpenTaskEditRequest(t);
            }
          }}
        />
      )}

      <Dialog open={isAddProjectOptionDialogOpen} onOpenChange={setIsAddProjectOptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Como você deseja criar o projeto?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleOpenProjectRequestDialog}>
              Solicitar novo projeto
            </Button>
            <Button className="w-full justify-start" onClick={handleOpenDirectProjectDialog}>
              Adicionar novo projeto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDirectProjectDialogOpen} onOpenChange={setIsDirectProjectDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="project-create-name">Nome do projeto</Label>
              <Input
                id="project-create-name"
                value={projectCreateForm.name}
                onChange={(e) => setProjectCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Campanha de lançamento"
                disabled={projectCreateSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-create-description">Descrição</Label>
              <WysiwygEditor
                value={projectCreateForm.description}
                onChange={(value) => setProjectCreateForm((prev) => ({ ...prev, description: value }))}
                placeholder="Descreva os objetivos do projeto"
                disabled={projectCreateSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-create-due-date">Prazo (opcional)</Label>
              <Input
                id="project-create-due-date"
                type="date"
                value={projectCreateForm.due_date}
                onChange={(e) => setProjectCreateForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={projectCreateSubmitting}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tarefas do projeto (opcional)</p>
                  <p className="text-xs text-muted-foreground">Adicione tarefas iniciais para este projeto proprietário.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setProjectTaskDialogOpen(true)} disabled={projectCreateSubmitting}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova tarefa
                </Button>
              </div>

              {projectTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa adicionada.</p>
              ) : (
                <div className="space-y-2">
                  {projectTasks.map((task, index) => (
                    <div key={`${task.name}-${index}`} className="rounded-md border border-border p-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.name}</p>
                          <p className="text-xs text-muted-foreground">Prazo: {task.due_date || 'Não informado'}</p>
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveProjectTask(index)} disabled={projectCreateSubmitting}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDirectProjectDialogOpen(false)} disabled={projectCreateSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitDirectProject} disabled={projectCreateSubmitting || !projectCreateForm.name.trim()}>
              {projectCreateSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectTaskDialogOpen} onOpenChange={setProjectTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova tarefa do projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-task-name">Nome da tarefa</Label>
              <Input
                id="project-task-name"
                value={projectTaskForm.name}
                onChange={(e) => setProjectTaskForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Definir cronograma"
                disabled={projectCreateSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-task-description">Descrição</Label>
              <WysiwygEditor
                value={projectTaskForm.description}
                onChange={(value) => setProjectTaskForm((prev) => ({ ...prev, description: value }))}
                disabled={projectCreateSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-task-due-date">Prazo (opcional)</Label>
              <Input
                id="project-task-due-date"
                type="date"
                value={projectTaskForm.due_date}
                onChange={(e) => setProjectTaskForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={projectCreateSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectTaskDialogOpen(false)} disabled={projectCreateSubmitting}>Cancelar</Button>
            <Button onClick={handleAddProjectTask} disabled={projectCreateSubmitting || !projectTaskForm.name.trim()}>Adicionar tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct task creation dialog */}
      <Dialog open={taskCreateDialogOpen} onOpenChange={setTaskCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="task-create-name">Nome da tarefa</Label>
              <Input
                id="task-create-name"
                value={taskCreateForm.name}
                onChange={(e) => setTaskCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Criar arte para campanha"
                disabled={taskCreateSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-create-description">Descrição</Label>
              <WysiwygEditor
                value={taskCreateForm.description}
                onChange={(value) => setTaskCreateForm((prev) => ({ ...prev, description: value }))}
                placeholder="Descreva o que precisa ser feito"
                disabled={taskCreateSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-create-due-date">Prazo (opcional)</Label>
              <Input
                id="task-create-due-date"
                type="date"
                value={taskCreateForm.due_date}
                onChange={(e) => setTaskCreateForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={taskCreateSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskCreateDialogOpen(false)} disabled={taskCreateSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitTaskCreate} disabled={taskCreateSubmitting || !taskCreateForm.name.trim()}>
              {taskCreateSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit own task dialog */}
      <Dialog open={taskEditDialogOpen} onOpenChange={setTaskEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da tarefa</Label>
              <Input
                value={taskEditForm.name}
                onChange={(e) => setTaskEditForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={taskEditSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <WysiwygEditor
                value={taskEditForm.description}
                onChange={(value) => setTaskEditForm((prev) => ({ ...prev, description: value }))}
                disabled={taskEditSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={taskEditForm.due_date}
                onChange={(e) => setTaskEditForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={taskEditSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskEditDialogOpen(false)} disabled={taskEditSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitTaskEdit} disabled={taskEditSubmitting}>
              {taskEditSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request edit for admin tasks dialog */}
      <Dialog open={taskEditRequestDialogOpen} onOpenChange={setTaskEditRequestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Edição da Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da tarefa</Label>
              <Input
                value={taskEditRequestForm.name}
                onChange={(e) => setTaskEditRequestForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={taskEditRequestSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <WysiwygEditor
                value={taskEditRequestForm.description}
                onChange={(value) => setTaskEditRequestForm((prev) => ({ ...prev, description: value }))}
                disabled={taskEditRequestSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={taskEditRequestForm.due_date}
                onChange={(e) => setTaskEditRequestForm((prev) => ({ ...prev, due_date: e.target.value }))}
                disabled={taskEditRequestSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskEditRequestDialogOpen(false)} disabled={taskEditRequestSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmitTaskEditRequest} disabled={taskEditRequestSubmitting}>
              {taskEditRequestSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete own task confirmation */}
      <AlertDialog open={taskDeleteDialogOpen} onOpenChange={(open) => { setTaskDeleteDialogOpen(open); if (!open) setTaskToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove definitivamente a tarefa "{taskToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTaskDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          onSuccess={() => {}}
        />
      )}

      <AlertDialog
        open={isDeleteRequestDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteRequestDialogOpen(open);
          if (!open) setDeletingRequest(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove definitivamente a solicitação "{deletingRequest?.name}" do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest}>Excluir solicitação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
