import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/ui/form-sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { ClientEditRequestForm } from '@/components/client/ClientEditRequestForm';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { Plus, FolderKanban, Loader2, Trash2, ClipboardList, Users as UsersIcon, FileText, ListTodo } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  created_by?: string | null;
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
  const { data, refreshData, createProject, updateProject, deleteProject, createTask, updateTask, deleteTask, createTimeEntry, updateTimeEntry, deleteTimeEntry, startTaskTimer, stopTaskTimer, cancelTaskTimer, completeTask, getProjectHours, getTaskHours, getCreatorName, getActiveTimer, getClientColumns } = useData();
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

  // Direct project edit/delete (for own projects)
  const [projectEditDialogOpen, setProjectEditDialogOpen] = useState(false);
  const [projectEditSubmitting, setProjectEditSubmitting] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({ id: '', name: '', description: '', due_date: '' });
  const [projectDeleteDialogOpen, setProjectDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<UnifiedProject | null>(null);

  // Task request dialog (for admin-owned projects)
  const [taskRequestDialogOpen, setTaskRequestDialogOpen] = useState(false);
  const [taskRequestSubmitting, setTaskRequestSubmitting] = useState(false);
  const [taskRequestProjectId, setTaskRequestProjectId] = useState('');
  const [taskRequestForm, setTaskRequestForm] = useState({ name: '', description: '', due_date: '' });

  // Time entry dialog state
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isDeleteTimeEntryDialogOpen, setIsDeleteTimeEntryDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [timeForm, setTimeForm] = useState({ time: '00:15', description: '', date: format(new Date(), 'yyyy-MM-dd'), entry_type: 'task' as 'task' | 'meeting' });
  const [submitting, setSubmitting] = useState(false);

  // Pause dialog state (timer completion)
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [pauseDescription, setPauseDescription] = useState('');
  const [pauseEntryType, setPauseEntryType] = useState<'task' | 'meeting'>('task');

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

  const handleSubmitRequest = async (title: string, briefing: string, customFields: Record<string, string>, desiredDeadline?: string, requestedTasks?: Array<{ title: string; description: string; dueDate: string }>) => {
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
        requested_tasks: (requestedTasks || []) as unknown as import('@/integrations/supabase/types').Json,
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
      const newProject = await createProject({
        client_id: clientId,
        name: projectCreateForm.name.trim(),
        description: getWysiwygPlainText(projectCreateForm.description) ? projectCreateForm.description : null,
        due_date: projectCreateForm.due_date || null,
        custom_fields: {},
        status: 'active',
      });

      if (!newProject) {
        toast.error('Erro ao criar projeto.');
        return;
      }

      if (projectTasks.length > 0) {
        for (const task of projectTasks) {
          await createTask({
            project_id: newProject.id,
            name: task.name,
            description: getWysiwygPlainText(task.description) ? task.description : null,
            due_date: task.due_date || null,
            status: 'pending',
          });
        }
      }

      toast.success('Projeto criado com sucesso!');
      setIsDirectProjectDialogOpen(false);
    } catch (error) {
      console.error('Error creating direct project:', error);
      toast.error('Erro ao criar projeto.');
    } finally {
      setProjectCreateSubmitting(false);
    }
  };

  const isOwnProject = (project: UnifiedProject) => project.created_by === user?.id;

  // ---- Direct project edit (own projects) ----
  const handleDirectEditProject = (project: UnifiedProject) => {
    setProjectEditForm({
      id: project.id,
      name: project.name,
      description: project.description || '',
      due_date: project.due_date || '',
    });
    setProjectEditDialogOpen(true);
  };

  const handleSubmitDirectEditProject = async () => {
    if (!projectEditForm.id || !projectEditForm.name.trim()) {
      toast.error('Preencha o nome do projeto.');
      return;
    }
    setProjectEditSubmitting(true);
    try {
      await updateProject(projectEditForm.id, {
        name: projectEditForm.name.trim(),
        description: getWysiwygPlainText(projectEditForm.description) ? projectEditForm.description : null,
        due_date: projectEditForm.due_date || null,
      });
      toast.success('Projeto atualizado com sucesso!');
      setProjectEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Erro ao atualizar projeto.');
    } finally {
      setProjectEditSubmitting(false);
    }
  };

  // ---- Delete own project ----
  const handleDeleteProject = (project: UnifiedProject) => {
    setProjectToDelete(project);
    setProjectDeleteDialogOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      toast.success('Projeto excluído com sucesso!');
      setProjectDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto.');
    }
  };

  // ---- Task request for admin-owned projects ----
  const handleOpenTaskRequest = (projectId: string) => {
    setTaskRequestProjectId(projectId);
    setTaskRequestForm({ name: '', description: '', due_date: '' });
    setTaskRequestDialogOpen(true);
  };

  const handleSubmitTaskRequest = async () => {
    if (!clientId || !user || !taskRequestProjectId || !taskRequestForm.name.trim()) {
      toast.error('Preencha o nome da tarefa.');
      return;
    }
    setTaskRequestSubmitting(true);
    try {
      const { error } = await supabase.from('edit_requests').insert([{
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
        },
      }]);
      if (error) throw error;
      toast.success('Solicitação de nova tarefa enviada para aprovação!');
      setTaskRequestDialogOpen(false);
      // Refresh pending task requests
      const { data: pendingTaskData } = await supabase
        .from('edit_requests')
        .select('id, entity_id, status, proposed_data, created_at')
        .eq('client_id', clientId)
        .eq('entity_type', 'project')
        .in('status', ['pending', 'analyzing', 'in_review'])
        .contains('proposed_data', { request_type: 'new_task' })
        .order('created_at', { ascending: false });
      setPendingTaskRequests((pendingTaskData || []) as PendingTaskRequest[]);
    } catch (error) {
      console.error('Error creating task request:', error);
      toast.error('Erro ao solicitar nova tarefa.');
    } finally {
      setTaskRequestSubmitting(false);
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
      await createTask({
        project_id: taskCreateProjectId,
        name: taskCreateForm.name.trim(),
        description: getWysiwygPlainText(taskCreateForm.description) ? taskCreateForm.description : null,
        due_date: taskCreateForm.due_date || null,
        status: taskCreateStatus,
      });
      toast.success('Tarefa criada com sucesso!');
      setTaskCreateDialogOpen(false);
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
      await updateTask(taskEditForm.taskId, {
        name: taskEditForm.name.trim(),
        description: getWysiwygPlainText(taskEditForm.description) ? taskEditForm.description : null,
        due_date: taskEditForm.due_date || null,
      });
      toast.success('Tarefa atualizada com sucesso!');
      setTaskEditDialogOpen(false);
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
      await deleteTask(taskToDelete.id);
      toast.success('Tarefa excluída com sucesso!');
      setTaskDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa.');
    }
  };

  // ---- Timer handlers for own tasks ----
  const handleStartTimer = async (taskId: string) => {
    if (!user) return;
    await startTaskTimer(taskId);
  };

  const handleStopTimer = async (taskId: string) => {
    setPausingTaskId(taskId);
    setPauseDescription('');
    setPauseEntryType('task');
    setIsPauseDialogOpen(true);
  };

  const handleConfirmPause = async () => {
    if (!user || !pausingTaskId) return;
    const result = await stopTaskTimer(pausingTaskId, pauseDescription || 'Registro via timer', pauseEntryType);
    if (result) {
      toast.success(`Timer parado. ${result.hours}h registradas.`);
    } else {
      toast.error('Erro ao registrar horas.');
    }
    setIsPauseDialogOpen(false);
    setPausingTaskId(null);
  };

  const handleDiscardTimer = async () => {
    if (!pausingTaskId) return;
    await cancelTaskTimer(pausingTaskId);
    setIsPauseDialogOpen(false);
    setPausingTaskId(null);
    setPauseDescription('');
    toast.info('Timer descartado');
  };

  const handleCompleteTask = async (taskId: string) => {
    const success = await completeTask(taskId);
    if (success) {
      toast.success('Tarefa concluída!');
    } else {
      toast.error('Erro ao concluir tarefa.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus });
  };

  // Helper functions for time conversion
  const parseTimeToHours = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const formatHoursToTime = (decimalHours: number): string => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleRegisterTime = (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => {
    setSelectedTaskId(taskId);
    if (entry) {
      setEditingTimeEntryId(entry.id);
      setTimeForm({ time: formatHoursToTime(entry.hours), description: entry.description || '', date: entry.date, entry_type: entry.entry_type || 'task' });
    } else {
      setEditingTimeEntryId(null);
      setTimeForm({ time: '00:15', description: '', date: format(new Date(), 'yyyy-MM-dd'), entry_type: 'task' });
    }
    setIsTimeDialogOpen(true);
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = parseTimeToHours(timeForm.time);
    if (totalHours <= 0) { toast.error('Insira um tempo válido maior que zero.'); return; }
    setSubmitting(true);
    if (editingTimeEntryId) {
      const result = await updateTimeEntry(editingTimeEntryId, {
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
        entry_type: timeForm.entry_type,
      });
      if (!result) toast.error('Erro ao atualizar registro.');
      else toast.success('Registro atualizado!');
    } else {
      const result = await createTimeEntry({
        task_id: selectedTaskId,
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
        entry_type: timeForm.entry_type,
      });
      if (!result) toast.error('Erro ao registrar horas.');
      else toast.success('Horas registradas!');
    }
    setSubmitting(false);
    setIsTimeDialogOpen(false);
    setEditingTimeEntryId(null);
  };

  const handleDeleteTimeEntry = async () => {
    if (editingTimeEntryId) {
      const success = await deleteTimeEntry(editingTimeEntryId);
      if (!success) toast.error('Erro ao excluir registro.');
      else toast.success('Registro excluído!');
      setIsDeleteTimeEntryDialogOpen(false);
      setIsTimeDialogOpen(false);
      setEditingTimeEntryId(null);
    }
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
          onEditProject={(project) => {
            const p = project as UnifiedProject;
            if (isOwnProject(p)) {
              handleDirectEditProject(p);
            } else {
              openEditRequest(p);
            }
          }}
          onDeleteProject={(project) => {
            const p = project as UnifiedProject;
            if (isOwnProject(p)) {
              handleDeleteProject(p);
            }
          }}
          onArchiveProject={() => {}}
          onCreateTask={(projectId) => {
            const project = filteredProjects.find(p => p.id === projectId);
            if (project && isOwnProject(project)) {
              handleOpenTaskCreate(projectId);
            } else {
              handleOpenTaskRequest(projectId);
            }
          }}
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
          taskTimers={data.taskTimers}
          projectAccess={data.projectAccess}
          isAdminOrMaster={false}
          allowProjectEditOnly
          currentUserId={user?.id}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getClientColumns={getClientColumns}
          getActiveTimer={getCurrentUserActiveTimer}
          onEditProject={(project) => {
            const p = project as UnifiedProject;
            if (isOwnProject(p)) {
              handleDirectEditProject(p);
            } else {
              openEditRequest(p);
            }
          }}
          onDeleteProject={(project) => {
            const p = project as UnifiedProject;
            if (isOwnProject(p)) {
              handleDeleteProject(p);
            }
          }}
          onArchiveProject={() => {}}
          onCreateTask={(projectId) => {
            const project = filteredProjects.find(p => p.id === projectId);
            if (project && isOwnProject(project)) {
              handleOpenTaskCreate(projectId);
            } else {
              handleOpenTaskRequest(projectId);
            }
          }}
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
          onUpdateProjectStatus={async (id, status) => { await updateProject(id, { status }); }}
          onUpdateTaskStatus={async (id, status) => { await updateTask(id, { status }); }}
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
          onCreateTask={(projectId) => {
            const project = visibleProjects.find(p => p.id === projectId);
            if (project && isOwnProject(project as UnifiedProject)) {
              handleOpenTaskCreate(projectId);
            } else {
              handleOpenTaskRequest(projectId);
            }
          }}
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

      <FormSheet open={isAddProjectOptionDialogOpen} onOpenChange={setIsAddProjectOptionDialogOpen} title="Como você deseja criar o projeto?">
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleOpenProjectRequestDialog}>
              Solicitar novo projeto
            </Button>
            <Button className="w-full justify-start" onClick={handleOpenDirectProjectDialog}>
              Adicionar novo projeto
            </Button>
          </div>
      </FormSheet>

      <FormSheet open={isDirectProjectDialogOpen} onOpenChange={setIsDirectProjectDialogOpen} title="Adicionar Novo Projeto" footer={<><Button variant="outline" onClick={() => setIsDirectProjectDialogOpen(false)} disabled={projectCreateSubmitting}>Cancelar</Button><Button onClick={handleSubmitDirectProject} disabled={projectCreateSubmitting || !projectCreateForm.name.trim()}>{projectCreateSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Projeto</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-create-name">Nome do projeto</Label>
              <Input id="project-create-name" value={projectCreateForm.name} onChange={(e) => setProjectCreateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Campanha de lançamento" disabled={projectCreateSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-create-description">Descrição</Label>
              <WysiwygEditor value={projectCreateForm.description} onChange={(value) => setProjectCreateForm((prev) => ({ ...prev, description: value }))} placeholder="Descreva os objetivos do projeto" disabled={projectCreateSubmitting} minHeight="120px" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-create-due-date">Prazo (opcional)</Label>
              <Input id="project-create-due-date" type="date" value={projectCreateForm.due_date} onChange={(e) => setProjectCreateForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={projectCreateSubmitting} />
            </div>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tarefas do projeto (opcional)</p>
                  <p className="text-xs text-muted-foreground">Adicione tarefas iniciais para este projeto proprietário.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setProjectTaskDialogOpen(true)} disabled={projectCreateSubmitting}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
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
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveProjectTask(index)} disabled={projectCreateSubmitting}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </FormSheet>

      <FormSheet open={projectTaskDialogOpen} onOpenChange={setProjectTaskDialogOpen} title="Nova tarefa do projeto" footer={<><Button variant="outline" onClick={() => setProjectTaskDialogOpen(false)} disabled={projectCreateSubmitting}>Cancelar</Button><Button onClick={handleAddProjectTask} disabled={projectCreateSubmitting || !projectTaskForm.name.trim()}>Adicionar tarefa</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-task-name">Nome da tarefa</Label>
              <Input id="project-task-name" value={projectTaskForm.name} onChange={(e) => setProjectTaskForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Definir cronograma" disabled={projectCreateSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-task-description">Descrição</Label>
              <WysiwygEditor value={projectTaskForm.description} onChange={(value) => setProjectTaskForm((prev) => ({ ...prev, description: value }))} disabled={projectCreateSubmitting} minHeight="120px" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-task-due-date">Prazo (opcional)</Label>
              <Input id="project-task-due-date" type="date" value={projectTaskForm.due_date} onChange={(e) => setProjectTaskForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={projectCreateSubmitting} />
            </div>
          </div>
      </FormSheet>

      <FormSheet open={projectEditDialogOpen} onOpenChange={setProjectEditDialogOpen} title="Editar Projeto" footer={<><Button variant="outline" onClick={() => setProjectEditDialogOpen(false)} disabled={projectEditSubmitting}>Cancelar</Button><Button onClick={handleSubmitDirectEditProject} disabled={projectEditSubmitting || !projectEditForm.name.trim()}>{projectEditSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome do projeto</Label><Input value={projectEditForm.name} onChange={(e) => setProjectEditForm((prev) => ({ ...prev, name: e.target.value }))} disabled={projectEditSubmitting} /></div>
            <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={projectEditForm.description} onChange={(value) => setProjectEditForm((prev) => ({ ...prev, description: value }))} disabled={projectEditSubmitting} minHeight="120px" /></div>
            <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={projectEditForm.due_date} onChange={(e) => setProjectEditForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={projectEditSubmitting} /></div>
          </div>
      </FormSheet>

      {/* Delete own project confirmation */}
      <AlertDialog open={projectDeleteDialogOpen} onOpenChange={(open) => { setProjectDeleteDialogOpen(open); if (!open) setProjectToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove definitivamente o projeto "{projectToDelete?.name}" e todas as suas tarefas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteProject}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task request dialog (for admin-owned projects) */}
      <FormSheet open={taskRequestDialogOpen} onOpenChange={setTaskRequestDialogOpen} title="Solicitar Nova Tarefa" footer={<><Button variant="outline" onClick={() => setTaskRequestDialogOpen(false)} disabled={taskRequestSubmitting}>Cancelar</Button><Button onClick={handleSubmitTaskRequest} disabled={taskRequestSubmitting || !taskRequestForm.name.trim()}>{taskRequestSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar Solicitação</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da tarefa</Label><Input value={taskRequestForm.name} onChange={(e) => setTaskRequestForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Criar arte para campanha" disabled={taskRequestSubmitting} /></div>
            <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={taskRequestForm.description} onChange={(value) => setTaskRequestForm((prev) => ({ ...prev, description: value }))} placeholder="Descreva o que precisa ser feito" disabled={taskRequestSubmitting} minHeight="120px" /></div>
            <div className="space-y-2"><Label>Prazo (opcional)</Label><Input type="date" value={taskRequestForm.due_date} onChange={(e) => setTaskRequestForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={taskRequestSubmitting} /></div>
          </div>
      </FormSheet>

      <FormSheet open={taskCreateDialogOpen} onOpenChange={setTaskCreateDialogOpen} title="Nova Tarefa" footer={<><Button variant="outline" onClick={() => setTaskCreateDialogOpen(false)} disabled={taskCreateSubmitting}>Cancelar</Button><Button onClick={handleSubmitTaskCreate} disabled={taskCreateSubmitting || !taskCreateForm.name.trim()}>{taskCreateSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Tarefa</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="task-create-name">Nome da tarefa</Label><Input id="task-create-name" value={taskCreateForm.name} onChange={(e) => setTaskCreateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Criar arte para campanha" disabled={taskCreateSubmitting} /></div>
            <div className="space-y-2"><Label htmlFor="task-create-description">Descrição</Label><WysiwygEditor value={taskCreateForm.description} onChange={(value) => setTaskCreateForm((prev) => ({ ...prev, description: value }))} placeholder="Descreva o que precisa ser feito" disabled={taskCreateSubmitting} minHeight="120px" /></div>
            <div className="space-y-2"><Label htmlFor="task-create-due-date">Prazo (opcional)</Label><Input id="task-create-due-date" type="date" value={taskCreateForm.due_date} onChange={(e) => setTaskCreateForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={taskCreateSubmitting} /></div>
          </div>
      </FormSheet>

      <FormSheet open={taskEditDialogOpen} onOpenChange={setTaskEditDialogOpen} title="Editar Tarefa" footer={<><Button variant="outline" onClick={() => setTaskEditDialogOpen(false)} disabled={taskEditSubmitting}>Cancelar</Button><Button onClick={handleSubmitTaskEdit} disabled={taskEditSubmitting}>{taskEditSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da tarefa</Label><Input value={taskEditForm.name} onChange={(e) => setTaskEditForm((prev) => ({ ...prev, name: e.target.value }))} disabled={taskEditSubmitting} /></div>
            <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={taskEditForm.description} onChange={(value) => setTaskEditForm((prev) => ({ ...prev, description: value }))} disabled={taskEditSubmitting} minHeight="120px" /></div>
            <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={taskEditForm.due_date} onChange={(e) => setTaskEditForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={taskEditSubmitting} /></div>
          </div>
      </FormSheet>

      <FormSheet open={taskEditRequestDialogOpen} onOpenChange={setTaskEditRequestDialogOpen} title="Solicitar Edição da Tarefa" footer={<><Button variant="outline" onClick={() => setTaskEditRequestDialogOpen(false)} disabled={taskEditRequestSubmitting}>Cancelar</Button><Button onClick={handleSubmitTaskEditRequest} disabled={taskEditRequestSubmitting}>{taskEditRequestSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar Solicitação</Button></>}>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da tarefa</Label><Input value={taskEditRequestForm.name} onChange={(e) => setTaskEditRequestForm((prev) => ({ ...prev, name: e.target.value }))} disabled={taskEditRequestSubmitting} /></div>
            <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={taskEditRequestForm.description} onChange={(value) => setTaskEditRequestForm((prev) => ({ ...prev, description: value }))} disabled={taskEditRequestSubmitting} minHeight="120px" /></div>
            <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={taskEditRequestForm.due_date} onChange={(e) => setTaskEditRequestForm((prev) => ({ ...prev, due_date: e.target.value }))} disabled={taskEditRequestSubmitting} /></div>
          </div>
      </FormSheet>

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

      <FormSheet open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen} title={editingTimeEntryId ? 'Editar Registro' : 'Registrar Horas'} footer={<div className="flex flex-col sm:flex-row gap-2 w-full">{editingTimeEntryId && (<Button type="button" variant="destructive" onClick={() => setIsDeleteTimeEntryDialogOpen(true)} disabled={submitting} className="w-full sm:w-auto"><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>)}<div className="flex gap-2 w-full sm:w-auto sm:ml-auto"><Button type="button" variant="outline" onClick={() => setIsTimeDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="button" onClick={(e) => { e.preventDefault(); const form = document.getElementById('time-entry-form') as HTMLFormElement; form?.requestSubmit(); }} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTimeEntryId ? 'Salvar' : 'Registrar'}</Button></div></div>}>
          <form id="time-entry-form" onSubmit={handleSubmitTime}>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Tempo (HH:mm)</Label><Input type="time" value={timeForm.time} onChange={(e) => setTimeForm({ ...timeForm, time: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <ToggleGroup type="single" value={timeForm.entry_type} onValueChange={(v) => v && setTimeForm({ ...timeForm, entry_type: v as 'task' | 'meeting' })} className="justify-start">
                  <ToggleGroupItem value="task" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Tarefa</ToggleGroupItem>
                  <ToggleGroupItem value="meeting" className="gap-1.5"><UsersIcon className="h-3.5 w-3.5" />Reunião</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2"><Label>Descrição (opcional)</Label><Textarea value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} rows={2} disabled={submitting} /></div>
            </div>
          </form>
      </FormSheet>

      <FormSheet open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen} title="Concluir Registro" footer={<div className="flex flex-col sm:flex-row gap-2 w-full"><Button variant="ghost" onClick={handleDiscardTimer} className="text-destructive hover:text-destructive sm:mr-auto">Descartar</Button><div className="flex gap-2 w-full sm:w-auto"><Button variant="outline" onClick={() => setIsPauseDialogOpen(false)} className="flex-1 sm:flex-initial">Cancelar</Button><Button onClick={handleConfirmPause} className="flex-1 sm:flex-initial">Registrar</Button></div></div>}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <ToggleGroup type="single" value={pauseEntryType} onValueChange={(v) => v && setPauseEntryType(v as 'task' | 'meeting')} className="justify-start">
                <ToggleGroupItem value="task" aria-label="Tarefa" className="gap-2"><ClipboardList className="w-4 h-4" />Tarefa</ToggleGroupItem>
                <ToggleGroupItem value="meeting" aria-label="Reunião" className="gap-2"><UsersIcon className="w-4 h-4" />Reunião</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-2"><Label>Descrição do trabalho (opcional)</Label><Textarea value={pauseDescription} onChange={(e) => setPauseDescription(e.target.value)} placeholder="O que você fez durante este período?" rows={3} /></div>
          </div>
      </FormSheet>

      {/* Delete Time Entry Confirmation */}
      <AlertDialog open={isDeleteTimeEntryDialogOpen} onOpenChange={setIsDeleteTimeEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de horas?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTimeEntry}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
