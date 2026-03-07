import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { supabase } from '@/integrations/supabase/client';
import { NoProjectsAssigned } from '@/components/collaborator/NoProjectsAssigned';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WysiwygEditor, WysiwygContent } from '@/components/ui/wysiwyg-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Pencil, Trash2, Loader2, Users, Settings, ChevronDown, X, ClipboardList, Plus } from 'lucide-react';
import { Users as UsersIcon } from 'lucide-react';
import { Project, Task } from '@/types';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

// New components
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { KanbanStagesDialog } from '@/components/projects/KanbanStagesDialog';

interface Collaborator {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
  show_in_report: boolean;
}



interface EditRequest {
  id: string;
  entity_type: 'project' | 'project_request' | 'task';
  entity_id: string;
  client_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  original_data: Record<string, unknown>;
  proposed_data: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
}

type PendingApprovalTask = Task & {
  is_pending_approval: true;
  approval_label: string;
  pending_request_id: string;
};

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  desired_deadline?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
  converted_project_id?: string | null;
  requested_tasks?: Array<{ title?: string; description?: string; dueDate?: string }> | null;
}

type UnifiedProject = Project & {
  is_request?: boolean;
  request_status?: string;
  request_id?: string;
  request_label?: string;
  request_kind?: 'new_project' | 'edit_request';
  edit_request_id?: string;
};

export const Projects: React.FC = () => {
  const { 
    data, 
    loading, 
    createProject, 
    updateProject, 
    deleteProject, 
    getProjectHours, 
    grantProjectAccess, 
    revokeProjectAccess, 
    refreshData, 
    createColumn, 
    updateColumn, 
    deleteColumn, 
    getClientColumns,
    createTask,
    updateTask,
    deleteTask,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTaskHours,
    getCreatorName,
    stopTaskTimer,
    cancelTaskTimer,
    getActiveTimer,
    completeTask,
    saveKanbanStages,
  } = useData();
  const { user, isAdminOrMaster, isCollaborator } = useAuth();
  const { resetTimer, startGlobalTimer, setTaskBinding } = useGlobalTimer();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'table'>('list');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterStageId, setFilterStageId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [showOnlyRequests, setShowOnlyRequests] = useState(false);

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
  
  // Project dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<UnifiedProject | null>(null);
  const [isDeleteRequestDialogOpen, setIsDeleteRequestDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', client_id: '', status: 'active', due_date: '', custom_fields: {} as Record<string, string>,
  });
  
  // Task dialog state
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [taskProjectId, setTaskProjectId] = useState<string>('');
  const [taskFormData, setTaskFormData] = useState({ name: '', description: '', status: 'pending', due_date: '' });

  // Time entry dialog state
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isDeleteTimeEntryDialogOpen, setIsDeleteTimeEntryDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [timeForm, setTimeForm] = useState({ time: '00:15', description: '', date: format(new Date(), 'yyyy-MM-dd'), entry_type: 'task' as 'task' | 'meeting' });

  // Pause dialog state
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [pauseDescription, setPauseDescription] = useState('');
  const [pauseEntryType, setPauseEntryType] = useState<'task' | 'meeting'>('task');
  
  // Collaborator management
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Custom fields management
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ProjectColumn | null>(null);
  const [isDeleteColumnDialogOpen, setIsDeleteColumnDialogOpen] = useState(false);
  const [columnFormData, setColumnFormData] = useState({ name: '', type: 'text' as 'text' | 'select', options: [] as string[] });
  const [newOption, setNewOption] = useState('');
  const [submittingColumn, setSubmittingColumn] = useState(false);

  // Kanban stages dialog
  const [isKanbanStagesDialogOpen, setIsKanbanStagesDialogOpen] = useState(false);
  const [requestProjects, setRequestProjects] = useState<ProjectRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestAdminNotes, setRequestAdminNotes] = useState('');
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [selectedEditRequest, setSelectedEditRequest] = useState<EditRequest | null>(null);
  const [isEditRequestDialogOpen, setIsEditRequestDialogOpen] = useState(false);
  const [editRequestAdminNotes, setEditRequestAdminNotes] = useState('');
  const [processingEditRequest, setProcessingEditRequest] = useState(false);

  // Get columns for selected client
  const clientColumns = useMemo(() => {
    if (!formData.client_id) return [];
    return getClientColumns(formData.client_id);
  }, [formData.client_id, getClientColumns, data.projectColumns]);

  // Fetch collaborators for admin
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!isAdminOrMaster) return;
      setLoadingCollaborators(true);
      try {
        const { data: roles, error: rolesError } = await supabase.from('user_roles').select('user_id').eq('role', 'collaborator');
        if (rolesError) throw rolesError;
        if (roles && roles.length > 0) {
          const userIds = roles.map(r => r.user_id);
          const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
          if (profilesError) throw profilesError;
          setCollaborators(profiles || []);
        }
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      } finally {
        setLoadingCollaborators(false);
      }
    };
    fetchCollaborators();
  }, [isAdminOrMaster]);


  useEffect(() => {
    const fetchProjectRequests = async () => {
      if (!isAdminOrMaster) {
        setRequestProjects([]);
        return;
      }

      const { data: requestsData, error } = await supabase
        .from('project_requests')
        .select('id, client_id, title, briefing, status, desired_deadline, admin_notes, created_at, updated_at, converted_project_id, requested_tasks')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project requests:', error);
        return;
      }

      setRequestProjects((requestsData || []) as ProjectRequest[]);
    };

    fetchProjectRequests();
  }, [isAdminOrMaster]);


  useEffect(() => {
    const fetchEditRequests = async () => {
      if (!isAdminOrMaster) {
        setEditRequests([]);
        return;
      }

      const { data: editRequestsData, error } = await supabase
        .from('edit_requests')
        .select('id, entity_type, entity_id, client_id, requested_by, status, original_data, proposed_data, admin_notes, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching edit requests:', error);
        return;
      }

      setEditRequests((editRequestsData || []) as EditRequest[]);
    };

    fetchEditRequests();
  }, [isAdminOrMaster]);

  useEffect(() => {
    const filter = searchParams.get('filter');

    if (filter === 'requests' && isAdminOrMaster) {
      setShowOnlyRequests(true);
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);
        nextParams.delete('filter');
        return nextParams;
      }, { replace: true });
    }
  }, [isAdminOrMaster, searchParams, setSearchParams]);

  // Filter projects
  const visibleProjects = useMemo(() => {
    let projects = data.projects;
    
    // Filter by role
    if (!isAdminOrMaster) {
      const accessibleProjectIds = data.projectAccess.filter(access => access.user_id === user?.id).map(access => access.project_id);
      projects = projects.filter(project => accessibleProjectIds.includes(project.id));
    }
    
    // Filter by client
    if (filterClientId !== 'all') {
      projects = projects.filter(project => project.client_id === filterClientId);
    }
    
    // Filter by status
    if (filterStageId !== 'all') {
      projects = projects.filter((project) => project.status === filterStageId);
    }
    
    // Filter by date range (due_date)
    if (filterDateRange?.from) {
      projects = projects.filter(project => {
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
  }, [data.projects, data.projectAccess, data.kanbanStages, user?.id, isAdminOrMaster, filterClientId, filterStageId, filterDateRange]);

  const visibleRequestProjects = useMemo<UnifiedProject[]>(() => {
    if (!isAdminOrMaster) return [];

    let filteredRequests = requestProjects.filter((request) =>
      !request.converted_project_id && (request.status === 'pending' || request.status === 'analyzing' || request.status === 'in_review'),
    );

    if (filterClientId !== 'all') {
      filteredRequests = filteredRequests.filter((request) => request.client_id === filterClientId);
    }

    return filteredRequests.map((request) => ({
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
        request_label: 'Solicitação de novo projeto',
        request_kind: 'new_project',
      } as UnifiedProject));
  }, [isAdminOrMaster, requestProjects, filterClientId]);



  const visibleEditRequests = useMemo<UnifiedProject[]>(() => {
    if (!isAdminOrMaster) return [];

    let filteredEditRequests = editRequests.filter((request) => {
      if (request.status !== 'pending') return false;

      if (request.entity_type !== 'project_request') {
        const requestType = typeof request.proposed_data?.['request_type'] === 'string' ? request.proposed_data['request_type'] : null;
        if (requestType === 'new_task') return false;
      }

      return true;
    });

    if (filterClientId !== 'all') {
      filteredEditRequests = filteredEditRequests.filter((request) => request.client_id === filterClientId);
    }

    return filteredEditRequests.map((request) => {
      const requestType = typeof request.proposed_data?.['request_type'] === 'string' ? request.proposed_data['request_type'] : null;

      return ({
      id: `edit-request-${request.id}`,
      client_id: request.client_id,
      name: request.entity_type === 'project_request'
        ? 'Solicitação de edição de solicitação de projeto'
        : (requestType === 'edit_task' ? 'Solicitação de edição de tarefa' : 'Solicitação de edição de projeto'),
      description: null,
      status: 'active',
      due_date: null,
      custom_fields: {},
      created_at: request.created_at,
      updated_at: request.created_at,
      is_request: true,
      request_status: request.status,
      request_label: 'Solicitação de edição',
      request_kind: 'edit_request',
      edit_request_id: request.id,
    } as UnifiedProject);
    });
  }, [isAdminOrMaster, editRequests, filterClientId]);

  const tasksWithPendingApprovals = useMemo<(Task | PendingApprovalTask)[]>(() => {
    if (!isAdminOrMaster) return data.tasks;

    const pendingTaskRequests = editRequests
      .filter((request) => {
        if (request.status !== 'pending' || request.entity_type !== 'project') return false;
        return request.proposed_data?.['request_type'] === 'new_task';
      })
      .map((request) => {
        const taskName = typeof request.proposed_data?.['task_name'] === 'string' ? request.proposed_data['task_name'] : 'Nova tarefa solicitada';
        const taskDescription = typeof request.proposed_data?.['task_description'] === 'string' ? request.proposed_data['task_description'] : null;
        const taskDueDate = typeof request.proposed_data?.['task_due_date'] === 'string' ? request.proposed_data['task_due_date'] : null;

        return {
          id: `pending-request-${request.id}`,
          project_id: request.entity_id,
          name: taskName,
          description: taskDescription,
          status: 'pending',
          due_date: taskDueDate,
          created_by: request.requested_by,
          created_at: request.created_at,
          is_pending_approval: true,
          approval_label: 'Solicitação pendente',
          pending_request_id: request.id,
        } as PendingApprovalTask;
      })
      .filter((task) => data.projects.some((project) => project.id === task.project_id));

    return [...data.tasks, ...pendingTaskRequests];
  }, [data.tasks, data.projects, editRequests, isAdminOrMaster]);
  const filteredProjects: UnifiedProject[] = useMemo(() => {
    const unifiedList = [...(visibleProjects as UnifiedProject[]), ...visibleRequestProjects, ...visibleEditRequests];

    const requestFilteredList = showOnlyRequests
      ? unifiedList.filter((project) => project.is_request)
      : unifiedList;

    return requestFilteredList.sort((a, b) => {
      const firstDate = new Date(a.updated_at || a.created_at).getTime();
      const secondDate = new Date(b.updated_at || b.created_at).getTime();
      return secondDate - firstDate;
    });
  }, [visibleProjects, visibleRequestProjects, visibleEditRequests, showOnlyRequests]);

  const pendingRequestsCount = useMemo(() => {
    return requestProjects.filter((request) => !request.converted_project_id && (request.status === 'pending' || request.status === 'analyzing' || request.status === 'in_review')).length + editRequests.filter((request) => request.status === 'pending').length;
  }, [requestProjects, editRequests]);


  const handleOpenRequestDialog = (project: UnifiedProject) => {
    if (!project.is_request || project.request_kind !== 'new_project' || !project.request_id) return;

    const request = requestProjects.find((item) => item.id === project.request_id);
    if (!request) return;

    setSelectedRequest(request);
    setRequestAdminNotes(request.admin_notes || '');
    setIsRequestDialogOpen(true);
  };


  const handleOpenEditRequestFromCard = (project: UnifiedProject) => {
    if (!project.is_request || project.request_kind !== 'edit_request' || !project.edit_request_id) return;

    const request = editRequests.find((item) => item.id === project.edit_request_id);
    if (!request) return;

    setSelectedEditRequest(request);
    setEditRequestAdminNotes(request.admin_notes || '');
    setIsEditRequestDialogOpen(true);
  };

  const handleQuickApproveRequest = async (project: UnifiedProject) => {
    if (!project.is_request) return;

    try {
      if (project.request_kind === 'edit_request') {
        const request = editRequests.find((item) => item.id === project.edit_request_id);
        if (!request || request.status !== 'pending') return;

        const proposedData = request.proposed_data || {};
        if (request.entity_type === 'project' && proposedData.request_type === 'new_task') {
          const taskName = typeof proposedData.task_name === 'string' ? proposedData.task_name : 'Nova tarefa solicitada';
          const taskDescription = typeof proposedData.task_description === 'string' ? proposedData.task_description : '';
          const taskDueDate = typeof proposedData.task_due_date === 'string' ? proposedData.task_due_date : null;

          const newTask = await createTask({
            project_id: request.entity_id,
            name: taskName,
            description: taskDescription,
            status: 'pending',
            due_date: taskDueDate,
          });
          if (!newTask) throw new Error('Falha ao criar tarefa');
        } else if (request.entity_type === 'project' && proposedData.request_type === 'edit_task') {
          const taskId = typeof proposedData.task_id === 'string' ? proposedData.task_id : '';
          if (!taskId) throw new Error('Solicitação de edição de tarefa inválida');

          const taskPatch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_name')) taskPatch.name = proposedData.task_name as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_description')) taskPatch.description = proposedData.task_description as string | null;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_due_date')) taskPatch.due_date = proposedData.task_due_date as string | null;

          await updateTask(taskId, taskPatch);
        } else if (request.entity_type === 'project') {
          const patch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'description')) patch.description = proposedData.description as string | null;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'due_date')) patch.due_date = proposedData.due_date as string | null;
          await updateProject(request.entity_id, patch);
        } else if (request.entity_type === 'project_request') {
          const requestPatch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'title')) requestPatch.title = proposedData.title as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'briefing')) requestPatch.briefing = proposedData.briefing as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'desired_deadline')) requestPatch.desired_deadline = proposedData.desired_deadline as string | null;

          const { error: requestError } = await supabase
            .from('project_requests')
            .update(requestPatch)
            .eq('id', request.entity_id);

          if (requestError) throw requestError;
        }

        const { error } = await supabase
          .from('edit_requests')
          .update({
            status: 'approved',
            admin_notes: request.admin_notes || null,
            processed_by: user?.id || null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        if (error) throw error;

        setEditRequests((prev) => prev.map((item) => (
          item.id === request.id
            ? {
                ...item,
                status: 'approved',
                admin_notes: request.admin_notes || null,
              }
            : item
        )));

        toast.success('Solicitação de edição aprovada!');
        await refreshData();
        return;
      }

      if (!project.request_id) return;
      const request = requestProjects.find((item) => item.id === project.request_id);
      if (!request || request.status !== 'pending') return;

      const createdProject = await createProject({
        name: request.title,
        description: request.briefing || '',
        client_id: request.client_id,
        status: 'active',
        due_date: request.desired_deadline || null,
        custom_fields: {},
      });

      if (!createdProject?.id) throw new Error('Falha ao criar projeto a partir da solicitação');

      // Fetch requested_tasks and create them
      const { data: fullRequest } = await supabase
        .from('project_requests')
        .select('requested_tasks')
        .eq('id', request.id)
        .single();

      const reqTasks = Array.isArray(fullRequest?.requested_tasks) ? fullRequest.requested_tasks : [];
      for (const rt of reqTasks) {
        const t = rt as Record<string, unknown>;
        if (typeof t?.title === 'string' && t.title.trim()) {
          await createTask({
            project_id: createdProject.id,
            name: t.title as string,
            description: (typeof t.description === 'string' ? t.description : '') || '',
            status: 'pending',
            due_date: typeof t.dueDate === 'string' && t.dueDate ? t.dueDate : null,
          });
        }
      }

      const { error } = await supabase
        .from('project_requests')
        .update({
          status: 'converted',
          converted_project_id: createdProject.id,
        })
        .eq('id', request.id);

      if (error) throw error;

      setRequestProjects((prev) => prev.map((item) => (
        item.id === request.id
          ? {
              ...item,
              status: 'converted',
              converted_project_id: createdProject.id,
            }
          : item
      )));

      toast.success('Solicitação aprovada e convertida em projeto!');
      await refreshData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erro ao aprovar solicitação');
    }
  };

  const handleQuickRejectRequest = async (project: UnifiedProject) => {
    if (!project.is_request) return;

    try {
      if (project.request_kind === 'edit_request') {
        const request = editRequests.find((item) => item.id === project.edit_request_id);
        if (!request || request.status !== 'pending') return;

        const { error } = await supabase
          .from('edit_requests')
          .update({
            status: 'rejected',
            admin_notes: request.admin_notes || null,
            processed_by: user?.id || null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        if (error) throw error;

        setEditRequests((prev) => prev.map((item) => (
          item.id === request.id
            ? {
                ...item,
                status: 'rejected',
                admin_notes: request.admin_notes || null,
              }
            : item
        )));

        toast.success('Solicitação de edição rejeitada!');
        await refreshData();
        return;
      }

      if (!project.request_id) return;
      const request = requestProjects.find((item) => item.id === project.request_id);
      if (!request || request.status !== 'pending') return;

      const { error } = await supabase
        .from('project_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      setRequestProjects((prev) => prev.map((item) => (
        item.id === request.id
          ? {
              ...item,
              status: 'rejected',
            }
          : item
      )));

      toast.success('Solicitação rejeitada!');
      await refreshData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao rejeitar solicitação');
    }
  };

  const handleDeleteRequest = async () => {
    const project = deletingRequest;
    if (!project || !project.is_request) return;

    try {
      if (project.request_kind === 'edit_request' && project.edit_request_id) {
        const { error } = await supabase.from('edit_requests').delete().eq('id', project.edit_request_id);
        if (error) throw error;
        setEditRequests((prev) => prev.filter((item) => item.id !== project.edit_request_id));
        toast.success('Solicitação de edição excluída!');
        await refreshData();
        setIsDeleteRequestDialogOpen(false);
        setDeletingRequest(null);
        return;
      }

      if (project.request_id) {
        const { error } = await supabase.from('project_requests').delete().eq('id', project.request_id);
        if (error) throw error;
        setRequestProjects((prev) => prev.filter((item) => item.id !== project.request_id));
        toast.success('Solicitação excluída!');
        await refreshData();
        setIsDeleteRequestDialogOpen(false);
        setDeletingRequest(null);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Erro ao excluir solicitação');
    }
  };

  const handleOpenPendingTaskRequest = (task: Task | PendingApprovalTask) => {
    const requestId = 'pending_request_id' in task ? task.pending_request_id : undefined;
    if (!requestId) return;

    const request = editRequests.find((item) => item.id === requestId);
    if (!request) return;

    setSelectedEditRequest(request);
    setEditRequestAdminNotes(request.admin_notes || '');
    setIsEditRequestDialogOpen(true);
  };

  const handleUpdateRequest = async (status: 'in_review' | 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    setUpdatingRequest(true);
    try {
      let nextStatus: 'in_review' | 'approved' | 'rejected' | 'converted' = status;
      let convertedProjectId: string | null = null;

      if (status === 'approved') {
        const createdProject = await createProject({
          name: selectedRequest.title,
          description: selectedRequest.briefing || '',
          client_id: selectedRequest.client_id,
          status: 'active',
          due_date: selectedRequest.desired_deadline || null,
          custom_fields: {},
        });

        if (!createdProject?.id) {
          throw new Error('Falha ao criar projeto a partir da solicitação');
        }

        // Fetch requested_tasks and create them
        const { data: fullReq } = await supabase
          .from('project_requests')
          .select('requested_tasks')
          .eq('id', selectedRequest.id)
          .single();

        const reqTasks = Array.isArray(fullReq?.requested_tasks) ? fullReq.requested_tasks : [];
        for (const rt of reqTasks) {
          const t = rt as Record<string, unknown>;
          if (typeof t?.title === 'string' && t.title.trim()) {
            await createTask({
              project_id: createdProject.id,
              name: t.title as string,
              description: (typeof t.description === 'string' ? t.description : '') || '',
              status: 'pending',
              due_date: typeof t.dueDate === 'string' && t.dueDate ? t.dueDate : null,
            });
          }
        }

        convertedProjectId = createdProject.id;
        nextStatus = 'converted';
      }

      const { data: updatedRequest, error } = await supabase
        .from('project_requests')
        .update({
          status: nextStatus,
          admin_notes: requestAdminNotes || null,
          converted_project_id: convertedProjectId,
        })
        .eq('id', selectedRequest.id)
        .select('id, client_id, title, briefing, status, desired_deadline, admin_notes, created_at, updated_at, converted_project_id')
        .single();

      if (error) throw error;

      setRequestProjects((previous) =>
        previous.map((request) => (request.id === selectedRequest.id ? (updatedRequest as ProjectRequest) : request)),
      );
      setIsRequestDialogOpen(false);
      setSelectedRequest(null);
      await refreshData();
      toast.success(nextStatus === 'converted' ? 'Solicitação aprovada e convertida em projeto!' : 'Solicitação atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating project request:', error);
      toast.error('Erro ao atualizar solicitação');
    } finally {
      setUpdatingRequest(false);
    }
  };

  const hasPendingEditRequest = (project: UnifiedProject) => {
    if (project.is_request && project.request_id) {
      return editRequests.some((request) => request.status === 'pending' && request.entity_type === 'project_request' && request.entity_id === project.request_id);
    }

    return editRequests.some((request) => request.status === 'pending' && request.entity_type === 'project' && request.entity_id === project.id);
  };

  const handleOpenEditRequestDialog = (project: UnifiedProject) => {
    const request = editRequests.find((item) => {
      if (item.status !== 'pending') return false;
      if (project.is_request && project.request_id) {
        return item.entity_type === 'project_request' && item.entity_id === project.request_id;
      }
      return item.entity_type === 'project' && item.entity_id === project.id;
    });

    if (!request) return;

    setSelectedEditRequest(request);
    setEditRequestAdminNotes(request.admin_notes || '');
    setIsEditRequestDialogOpen(true);
  };

  const handleProcessEditRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedEditRequest) return;

    setProcessingEditRequest(true);

    try {
      const proposedData = selectedEditRequest.proposed_data || {};

      if (status === 'approved') {
        if (selectedEditRequest.entity_type === 'project' && proposedData.request_type === 'new_task') {
          const taskName = typeof proposedData.task_name === 'string' ? proposedData.task_name : 'Nova tarefa solicitada';
          const taskDescription = typeof proposedData.task_description === 'string' ? proposedData.task_description : '';
          const taskDueDate = typeof proposedData.task_due_date === 'string' ? proposedData.task_due_date : null;

          const newTask = await createTask({
            project_id: selectedEditRequest.entity_id,
            name: taskName,
            description: taskDescription,
            status: 'pending',
            due_date: taskDueDate,
          });
          if (!newTask) throw new Error('Falha ao criar tarefa');
        } else if (selectedEditRequest.entity_type === 'project' && proposedData.request_type === 'edit_task') {
          const taskId = typeof proposedData.task_id === 'string' ? proposedData.task_id : '';
          if (!taskId) {
            throw new Error('Solicitação de edição de tarefa inválida');
          }

          const taskPatch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_name')) taskPatch.name = proposedData.task_name as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_description')) taskPatch.description = proposedData.task_description as string | null;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'task_due_date')) taskPatch.due_date = proposedData.task_due_date as string | null;

          await updateTask(taskId, taskPatch);
        } else if (selectedEditRequest.entity_type === 'project') {
          const patch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'description')) patch.description = proposedData.description as string | null;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'due_date')) patch.due_date = proposedData.due_date as string | null;
          await updateProject(selectedEditRequest.entity_id, patch);
        } else if (selectedEditRequest.entity_type === 'project_request') {
          const requestPatch: Record<string, unknown> = {};
          if (Object.prototype.hasOwnProperty.call(proposedData, 'title')) requestPatch.title = proposedData.title as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'briefing')) requestPatch.briefing = proposedData.briefing as string;
          if (Object.prototype.hasOwnProperty.call(proposedData, 'desired_deadline')) requestPatch.desired_deadline = proposedData.desired_deadline as string | null;

          const { error: requestError } = await supabase
            .from('project_requests')
            .update(requestPatch)
            .eq('id', selectedEditRequest.entity_id);

          if (requestError) throw requestError;
        }
      }

      const { data: updatedEditRequest, error } = await supabase
        .from('edit_requests')
        .update({
          status,
          admin_notes: editRequestAdminNotes || null,
          processed_by: user?.id || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedEditRequest.id)
        .select('id, entity_type, entity_id, client_id, requested_by, status, original_data, proposed_data, admin_notes, created_at')
        .single();

      if (error) throw error;

      setEditRequests((previous) => previous.map((request) => request.id === selectedEditRequest.id ? (updatedEditRequest as EditRequest) : request));
      setIsEditRequestDialogOpen(false);
      setSelectedEditRequest(null);
      toast.success(status === 'approved' ? 'Solicitação de edição aprovada!' : 'Solicitação de edição rejeitada!');
    } catch (error) {
      console.error('Error processing edit request:', error);
      toast.error('Erro ao processar solicitação de edição');
    } finally {
      setProcessingEditRequest(false);
    }
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
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Project handlers
  const handleOpenDialog = async (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({ 
        name: project.name, 
        description: project.description || '', 
        client_id: project.client_id, 
        status: project.status, 
        due_date: project.due_date || '',
        custom_fields: { ...project.custom_fields } 
      });
      const projectAccess = data.projectAccess.filter(a => a.project_id === project.id);
      setSelectedCollaborators(projectAccess.map(a => a.user_id));
    } else {
      setEditingProject(null);
      const defaultClientId = data.clients[0]?.id || '';
      const clientCols = defaultClientId ? getClientColumns(defaultClientId) : [];
      const defaultCustomFields: Record<string, string> = {};
      clientCols.forEach(col => { defaultCustomFields[col.id] = col.options?.[0] || ''; });
      setFormData({ name: '', description: '', client_id: defaultClientId, status: 'active', due_date: '', custom_fields: defaultCustomFields });
      setSelectedCollaborators([]);
    }
    setCustomFieldsOpen(false);
    setIsDialogOpen(true);
  };

  const handleClientChange = (newClientId: string) => {
    const clientCols = getClientColumns(newClientId);
    const newCustomFields: Record<string, string> = {};
    clientCols.forEach(col => { newCustomFields[col.id] = formData.custom_fields[col.id] || col.options?.[0] || ''; });
    setFormData({ ...formData, client_id: newClientId, custom_fields: newCustomFields });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const projectData = {
        ...formData,
        due_date: formData.due_date || null,
      };
      let projectId: string | undefined;
      if (editingProject) {
        await updateProject(editingProject.id, projectData);
        projectId = editingProject.id;
        toast.success('Projeto atualizado!');
      } else {
        const newProject = await createProject(projectData);
        projectId = newProject?.id;
        toast.success('Projeto criado!');
      }
      if (isAdminOrMaster && projectId) {
        const currentAccess = data.projectAccess.filter(a => a.project_id === projectId);
        const currentUserIds = currentAccess.map(a => a.user_id);
        for (const userId of selectedCollaborators) {
          if (!currentUserIds.includes(userId)) { await grantProjectAccess(userId, projectId, true); }
        }
        for (const userId of currentUserIds) {
          if (!selectedCollaborators.includes(userId)) { await revokeProjectAccess(userId, projectId); }
        }
        await refreshData();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
    }
    setSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingProject) { 
      await deleteProject(deletingProject.id); 
      toast.success('Projeto excluído!'); 
      setIsDeleteDialogOpen(false); 
      setDeletingProject(null); 
    }
  };

  const handleArchiveProject = async (project: Project) => {
    await updateProject(project.id, { status: 'archived' });
    toast.success('Projeto arquivado!');
  };

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // Task handlers
  const handleOpenTaskDialog = (projectId: string, task?: Task, initialStatus?: string) => {
    setTaskProjectId(projectId);
    if (task) {
      setEditingTask(task);
      setTaskFormData({ name: task.name, description: task.description || '', status: task.status, due_date: task.due_date || '' });
    } else {
      setEditingTask(null);
      setTaskFormData({ name: '', description: '', status: initialStatus || 'pending', due_date: '' });
    }
    setIsTaskDialogOpen(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const taskData = {
      ...taskFormData,
      due_date: taskFormData.due_date || null,
    };
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
      toast.success('Tarefa atualizada!');
    } else {
      await createTask({ ...taskData, project_id: taskProjectId });
      toast.success('Tarefa criada!');
    }
    setSubmitting(false);
    setIsTaskDialogOpen(false);
  };

  const handleDeleteTask = async () => {
    if (deletingTask) {
      await deleteTask(deletingTask.id);
      toast.success('Tarefa excluída!');
      setIsDeleteTaskDialogOpen(false);
      setDeletingTask(null);
    }
  };

  // Time entry handlers
  const handleOpenTimeDialog = (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => {
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
      await updateTimeEntry(editingTimeEntryId, { hours: totalHours, description: timeForm.description, date: timeForm.date, entry_type: timeForm.entry_type });
      toast.success('Registro atualizado!');
    } else {
      await createTimeEntry({ task_id: selectedTaskId, hours: totalHours, description: timeForm.description, date: timeForm.date, entry_type: timeForm.entry_type });
      toast.success('Horas registradas!');
    }
    setSubmitting(false);
    setIsTimeDialogOpen(false);
    setEditingTimeEntryId(null);
  };

  const handleDeleteTimeEntry = async () => {
    if (editingTimeEntryId) {
      await deleteTimeEntry(editingTimeEntryId);
      toast.success('Registro excluído!');
      setIsDeleteTimeEntryDialogOpen(false);
      setIsTimeDialogOpen(false);
      setEditingTimeEntryId(null);
    }
  };

  // Timer handlers
  const handleStartTimer = async (taskId: string) => {
    const task = data.tasks.find((item) => item.id === taskId);
    const project = task ? data.projects.find((item) => item.id === task.project_id) : null;
    const client = project ? data.clients.find((item) => item.id === project.client_id) : null;

    if (task && project) {
      setTaskBinding({
        taskId: task.id,
        snapshot: {
          taskTitle: task.name,
          taskDescription: task.description,
          projectName: project.name,
          clientName: client?.company || client?.name || 'Cliente',
        },
      });
    }

    await startGlobalTimer();
    toast.success('Timer iniciado!');
  };

  const handleStopTimer = async (taskId: string) => {
    setPausingTaskId(taskId);
    setPauseDescription('');
    setPauseEntryType('task');
    setIsPauseDialogOpen(true);
  };

  const handleConfirmPause = async () => {
    if (pausingTaskId) {
      await stopTaskTimer(pausingTaskId, pauseDescription || undefined, pauseEntryType);
      resetTimer(); // Reset global timer after registration
      toast.success('Timer parado e horas registradas!');
      setIsPauseDialogOpen(false);
      setPausingTaskId(null);
    }
  };

  const handleDiscardTimer = async () => {
    if (pausingTaskId) {
      await cancelTaskTimer(pausingTaskId);
    }
    resetTimer();
    setIsPauseDialogOpen(false);
    setPausingTaskId(null);
    setPauseDescription('');
    toast.info('Timer descartado');
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
    toast.success('Tarefa concluída!');
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus });
  };

  // Custom field column management
  const handleOpenColumnDialog = (column?: ProjectColumn) => {
    if (column) {
      setEditingColumn(column);
      setColumnFormData({ name: column.name, type: column.type as 'text' | 'select', options: column.options || [] });
    } else {
      setEditingColumn(null);
      setColumnFormData({ name: '', type: 'text', options: [] });
    }
    setNewOption('');
    setIsColumnDialogOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !columnFormData.options.includes(newOption.trim())) {
      setColumnFormData({ ...columnFormData, options: [...columnFormData.options, newOption.trim()] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setColumnFormData({ ...columnFormData, options: columnFormData.options.filter(o => o !== option) });
  };

  const handleSubmitColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (columnFormData.type === 'select' && columnFormData.options.length === 0) { toast.error('Adicione pelo menos uma opção.'); return; }
    if (!formData.client_id) { toast.error('Selecione um cliente primeiro.'); return; }
    setSubmittingColumn(true);
    const columnData = { name: columnFormData.name, type: columnFormData.type, options: columnFormData.type === 'select' ? columnFormData.options : null, client_id: formData.client_id, show_in_report: false };
    if (editingColumn) { 
      await updateColumn(editingColumn.id, columnData); 
      toast.success('Campo atualizado!'); 
    } else { 
      const newCol = await createColumn(columnData); 
      if (newCol) { setFormData(prev => ({ ...prev, custom_fields: { ...prev.custom_fields, [newCol.id]: newCol.options?.[0] || '' } })); }
      toast.success('Campo criado!'); 
    }
    setSubmittingColumn(false);
    setIsColumnDialogOpen(false);
  };

  const handleDeleteColumn = async () => {
    if (deletingColumn) { 
      await deleteColumn(deletingColumn.id); 
      const newCustomFields = { ...formData.custom_fields };
      delete newCustomFields[deletingColumn.id];
      setFormData(prev => ({ ...prev, custom_fields: newCustomFields }));
      toast.success('Campo excluído!'); 
      setIsDeleteColumnDialogOpen(false); 
      setDeletingColumn(null); 
    }
  };

  // Kanban stages handler
  const handleSaveKanbanStages = async (stages: { name: string; order_position: number; color: string }[]) => {
    await saveKanbanStages(stages);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  if (isCollaborator && !isAdminOrMaster && filteredProjects.length === 0 && filterClientId === 'all') {
    return <NoProjectsAssigned />;
  }

  if (isAdminOrMaster && data.clients.length === 0) return (
    <div className="space-y-6">
      <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground mb-4">Você precisa cadastrar um cliente antes de criar projetos.</p><Button asChild><Link to="/clients">Ir para Clientes</Link></Button></CardContent></Card></div>
  );

  return (
    <div className="space-y-6">
      {/* Unified header with filters */}
      <ProjectFilters
        projectCount={filteredProjects.length}
        clients={data.clients}
        projectStatusOptions={projectStatusOptions}
        selectedClientId={filterClientId}
        selectedStageId={filterStageId}
        dateRange={filterDateRange}
        onClientChange={setFilterClientId}
        onStageChange={setFilterStageId}
        onDateRangeChange={setFilterDateRange}
        pendingRequestsCount={pendingRequestsCount}
        showOnlyRequests={showOnlyRequests}
        onShowOnlyRequestsChange={setShowOnlyRequests}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddProject={() => handleOpenDialog()}
        isAdminOrMaster={isAdminOrMaster}
      />

      {/* View content */}
      {viewMode === 'list' ? (
        <ProjectListView
          projects={filteredProjects}
          clients={data.clients}
          tasks={tasksWithPendingApprovals as any}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          projectColumns={data.projectColumns}
          projectAccess={data.projectAccess}
          kanbanStages={data.kanbanStages}
          isAdminOrMaster={isAdminOrMaster}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getCurrentUserActiveTimer}
          getClientColumns={getClientColumns}
          onEditProject={handleOpenDialog}
          onDeleteProject={(project) => { setDeletingProject(project); setIsDeleteDialogOpen(true); }}
          onArchiveProject={handleArchiveProject}
          onCreateTask={(projectId) => handleOpenTaskDialog(projectId)}
          onEditTask={(task) => handleOpenTaskDialog(task.project_id, task)}
          onDeleteTask={(task) => { setDeletingTask(task); setIsDeleteTaskDialogOpen(true); }}
          onRegisterTime={handleOpenTimeDialog}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onCompleteTask={handleCompleteTask}
          onRequestCardClick={handleOpenRequestDialog}
          hasPendingEditRequest={(project) => hasPendingEditRequest(project as UnifiedProject)}
          onOpenEditRequestReview={(project) => handleOpenEditRequestDialog(project as UnifiedProject)}
          onEditRequestCardClick={(project) => handleOpenEditRequestFromCard(project as UnifiedProject)}
          onPendingTaskClick={(task) => handleOpenPendingTaskRequest(task as Task | PendingApprovalTask)}
          onEditRequest={(project) => {
            const unified = project as UnifiedProject;
            if (unified.request_kind === 'edit_request') {
              handleOpenEditRequestFromCard(unified);
              return;
            }
            handleOpenRequestDialog(unified);
          }}
          onDeleteRequest={(project) => {
            setDeletingRequest(project as UnifiedProject);
            setIsDeleteRequestDialogOpen(true);
          }}
          onApproveRequest={(project) => handleQuickApproveRequest(project as UnifiedProject)}
          onRejectRequest={(project) => handleQuickRejectRequest(project as UnifiedProject)}
        />
      ) : viewMode === 'table' ? (
        <ProjectTableView
          projects={filteredProjects}
          clients={data.clients}
          tasks={tasksWithPendingApprovals as any}
          timeEntries={data.timeEntries}
          projectColumns={data.projectColumns}
          kanbanStages={data.kanbanStages}
          taskTimers={data.taskTimers}
          projectAccess={data.projectAccess}
          isAdminOrMaster={isAdminOrMaster}
          currentUserId={user?.id}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getClientColumns={getClientColumns}
          getActiveTimer={getCurrentUserActiveTimer}
          onEditProject={handleOpenDialog}
          onDeleteProject={(project) => { setDeletingProject(project); setIsDeleteDialogOpen(true); }}
          onArchiveProject={handleArchiveProject}
          onCreateTask={(projectId) => handleOpenTaskDialog(projectId)}
          onEditTask={(task) => handleOpenTaskDialog(task.project_id, task)}
          onDeleteTask={(task) => { setDeletingTask(task); setIsDeleteTaskDialogOpen(true); }}
          onRegisterTime={handleOpenTimeDialog}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onCompleteTask={handleCompleteTask}
        />
      ) : (
        <ProjectKanbanView
          projects={filteredProjects}
          clients={data.clients}
          tasks={data.tasks}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          kanbanStages={data.kanbanStages}
          projectAccess={data.projectAccess}
          isAdminOrMaster={isAdminOrMaster}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getCurrentUserActiveTimer}
          onEditTask={(task) => handleOpenTaskDialog(task.project_id, task)}
          onDeleteTask={(task) => { setDeletingTask(task); setIsDeleteTaskDialogOpen(true); }}
          onRegisterTime={handleOpenTimeDialog}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onCompleteTask={handleCompleteTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onCreateTask={(projectId, status) => handleOpenTaskDialog(projectId, undefined, status)}
          onManageStages={() => setIsKanbanStagesDialogOpen(true)}
        />
      )}
      
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Solicitação de Projeto</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Briefing</p>
                <WysiwygContent content={selectedRequest.briefing} className="text-sm" />
              </div>
              {(() => {
                const tasks = Array.isArray(selectedRequest.requested_tasks) ? selectedRequest.requested_tasks : [];
                if (tasks.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tarefas solicitadas</p>
                    <div className="space-y-2">
                      {tasks.map((task, index) => {
                        const t = task as Record<string, unknown>;
                        const title = typeof t?.title === 'string' ? t.title : `Tarefa ${index + 1}`;
                        const description = typeof t?.description === 'string' ? t.description : '';
                        const dueDate = typeof t?.dueDate === 'string' ? t.dueDate : '';
                        return (
                          <div key={index} className="rounded-lg border border-border p-3 space-y-1">
                            <p className="text-sm font-medium">{title}</p>
                            {description && (
                              <WysiwygContent content={description} className="text-xs text-muted-foreground" />
                            )}
                            {dueDate && (
                              <p className="text-xs text-muted-foreground">
                                Prazo: {format(parseISO(dueDate), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div>
                <p className="text-sm text-muted-foreground">Prazo desejado</p>
                <p className="text-sm font-medium">
                  {selectedRequest.desired_deadline
                    ? format(parseISO(selectedRequest.desired_deadline), "dd/MM/yyyy")
                    : 'Não informado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status atual</p>
                <p className="text-sm font-medium">{selectedRequest.status}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-admin-notes">Observações do admin</Label>
                <Textarea
                  id="request-admin-notes"
                  value={requestAdminNotes}
                  onChange={(event) => setRequestAdminNotes(event.target.value)}
                  placeholder="Adicione um retorno para o cliente"
                  rows={4}
                  disabled={updatingRequest}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleUpdateRequest('in_review')} disabled={!selectedRequest || updatingRequest}>
              Em análise
            </Button>
            <Button variant="destructive" onClick={() => handleUpdateRequest('rejected')} disabled={!selectedRequest || updatingRequest}>
              Rejeitar
            </Button>
            <Button onClick={() => handleUpdateRequest('approved')} disabled={!selectedRequest || updatingRequest}>
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditRequestDialogOpen} onOpenChange={setIsEditRequestDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Revisar solicitação de edição</DialogTitle>
          </DialogHeader>

          {selectedEditRequest && (() => {
            const proposed = selectedEditRequest.proposed_data || {};
            const original = selectedEditRequest.original_data || {};
            const isProject = selectedEditRequest.entity_type === 'project';
            const requestType = typeof proposed.request_type === 'string' ? proposed.request_type : null;
            const isNewTask = requestType === 'new_task';
            const isEditTask = requestType === 'edit_task';

            const fieldLabels: Record<string, string> = {
              title: 'Título',
              name: 'Nome',
              task_name: 'Nome da tarefa',
              description: 'Descrição',
              task_description: 'Descrição da tarefa',
              briefing: 'Briefing',
              due_date: 'Prazo',
              task_due_date: 'Prazo da tarefa',
              desired_deadline: 'Prazo desejado',
              status: 'Status',
              request_type: '',
            };

            const formatValue = (value: unknown): string => {
              if (value === null || value === undefined || value === '') return 'Não informado';
              return String(value);
            };

            const typeLabel = isNewTask ? 'Nova tarefa' : isEditTask ? 'Edição de tarefa' : isProject ? 'Edição de projeto' : 'Edição de solicitação';

            const fieldsToShow = Object.keys(proposed).filter(k => k !== 'request_type');

            return (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedEditRequest.entity_type === 'project' ? 'Projeto' : 'Solicitação de projeto'}
                </span>
              </div>

              <div className="space-y-3">
                {fieldsToShow.map((key) => {
                  const proposedVal = formatValue(proposed[key]);
                  const originalVal = formatValue(original[key]);
                  const hasChanged = proposedVal !== originalVal;
                  const label = fieldLabels[key] || key;

                  return (
                    <div key={key} className="rounded-lg border border-border p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      {hasChanged ? (
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 text-xs font-medium text-red-500 dark:text-red-400">Atual</span>
                            <p className="text-sm text-muted-foreground line-through whitespace-pre-wrap break-words">{originalVal}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">Novo</span>
                            <p className="text-sm font-medium whitespace-pre-wrap break-words">{proposedVal}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{proposedVal}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-request-admin-notes">Observações do admin</Label>
                <Textarea
                  id="edit-request-admin-notes"
                  value={editRequestAdminNotes}
                  onChange={(event) => setEditRequestAdminNotes(event.target.value)}
                  placeholder="Adicione um retorno para o cliente"
                  rows={4}
                  disabled={processingEditRequest}
                />
              </div>
            </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleProcessEditRequest('rejected')} disabled={!selectedEditRequest || processingEditRequest}>
              Rejeitar
            </Button>
            <Button onClick={() => handleProcessEditRequest('approved')} disabled={!selectedEditRequest || processingEditRequest}>
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader><DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2"><Label htmlFor="name">Nome do Projeto</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label htmlFor="description">Descrição</Label><WysiwygEditor value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} disabled={submitting} minHeight="80px" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cliente</Label><Select value={formData.client_id} onValueChange={handleClientChange} disabled={submitting}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="archived">Arquivo</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label htmlFor="due_date">Prazo (opcional)</Label><Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} disabled={submitting} /></div>
              
              {isAdminOrMaster && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Users className="w-4 h-4" />Colaboradores</Label>
                  {loadingCollaborators ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>
                  ) : collaborators.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
                  ) : (
                    <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                      {collaborators.map((collab) => (
                        <div key={collab.user_id} className="flex items-center space-x-2">
                          <Checkbox id={`collab-${collab.user_id}`} checked={selectedCollaborators.includes(collab.user_id)} onCheckedChange={() => toggleCollaborator(collab.user_id)} disabled={submitting} />
                          <label htmlFor={`collab-${collab.user_id}`} className="text-sm font-medium leading-none cursor-pointer">{collab.full_name || collab.email || 'Sem nome'}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdminOrMaster && formData.client_id && (
                <Collapsible open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between">
                      <span className="flex items-center gap-2"><Settings className="w-4 h-4" />Campos Personalizados ({clientColumns.length})</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${customFieldsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {clientColumns.length > 0 && (
                      <div className="space-y-3">
                        {clientColumns.map((column) => (
                          <div key={column.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2">{column.name}<Badge variant="secondary" className="text-xs">{column.type === 'text' ? 'Texto' : 'Seleção'}</Badge></Label>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" type="button" className="h-6 w-6" onClick={() => handleOpenColumnDialog(column)}><Pencil className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => { setDeletingColumn(column); setIsDeleteColumnDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </div>
                            {column.type === 'select' && column.options ? (
                              <Select value={formData.custom_fields[column.id] || ''} onValueChange={(v) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: v } })} disabled={submitting}><SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger><SelectContent>{column.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                            ) : (
                              <Input value={formData.custom_fields[column.id] || ''} onChange={(e) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: e.target.value } })} disabled={submitting} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => handleOpenColumnDialog()} className="w-full"><Plus className="w-4 h-4 mr-2" />Novo Campo para este Cliente</Button>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {(!isAdminOrMaster || !customFieldsOpen) && clientColumns.length > 0 && (
                <div className="space-y-4">
                  {clientColumns.map((column) => (
                    <div key={column.id} className="space-y-2">
                      <Label>{column.name}</Label>
                      {column.type === 'select' && column.options ? (
                        <Select value={formData.custom_fields[column.id] || ''} onValueChange={(v) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: v } })} disabled={submitting}><SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger><SelectContent>{column.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                      ) : (
                        <Input value={formData.custom_fields[column.id] || ''} onChange={(e) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: e.target.value } })} disabled={submitting} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingProject ? 'Salvar' : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader><DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTask}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2"><Label>Nome da Tarefa</Label><Input value={taskFormData.name} onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={taskFormData.description} onChange={(value) => setTaskFormData({ ...taskFormData, description: value })} disabled={submitting} minHeight="80px" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Status</Label><Select value={taskFormData.status} onValueChange={(v) => setTaskFormData({ ...taskFormData, status: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em Andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem><SelectItem value="archived">Arquivo</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={taskFormData.due_date} onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })} disabled={submitting} /></div>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTask ? 'Salvar' : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader><DialogTitle>{editingTimeEntryId ? 'Editar Registro' : 'Registrar Horas'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTime}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Tempo (HH:mm)</Label><Input type="time" value={timeForm.time} onChange={(e) => setTimeForm({ ...timeForm, time: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <ToggleGroup type="single" value={timeForm.entry_type} onValueChange={(v) => v && setTimeForm({ ...timeForm, entry_type: v as 'task' | 'meeting' })} className="justify-start">
                  <ToggleGroupItem value="task" className="gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Tarefa
                  </ToggleGroupItem>
                  <ToggleGroupItem value="meeting" className="gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5" />
                    Reunião
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2"><Label>Descrição (opcional)</Label><Textarea value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} rows={2} disabled={submitting} /></div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingTimeEntryId && (
                <Button type="button" variant="destructive" onClick={() => setIsDeleteTimeEntryDialogOpen(true)} disabled={submitting} className="w-full sm:w-auto"><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => setIsTimeDialogOpen(false)} disabled={submitting}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTimeEntryId ? 'Salvar' : 'Registrar'}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Timer Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader><DialogTitle>Concluir Registro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <ToggleGroup type="single" value={pauseEntryType} onValueChange={(v) => v && setPauseEntryType(v as 'task' | 'meeting')} className="justify-start">
                <ToggleGroupItem value="task" aria-label="Tarefa" className="gap-2"><ClipboardList className="w-4 h-4" />Tarefa</ToggleGroupItem>
                <ToggleGroupItem value="meeting" aria-label="Reunião" className="gap-2"><UsersIcon className="w-4 h-4" />Reunião</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-2"><Label>Descrição do trabalho (opcional)</Label><Textarea value={pauseDescription} onChange={(e) => setPauseDescription(e.target.value)} placeholder="O que você fez durante este período?" rows={3} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={handleDiscardTimer} 
              className="text-destructive hover:text-destructive sm:mr-auto"
            >
              Descartar
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)} className="flex-1 sm:flex-initial">Cancelar</Button>
              <Button onClick={handleConfirmPause} className="flex-1 sm:flex-initial">Registrar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogHeader><DialogTitle>{editingColumn ? 'Editar Campo' : 'Novo Campo Personalizado'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitColumn}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nome do Campo</Label><Input value={columnFormData.name} onChange={(e) => setColumnFormData({ ...columnFormData, name: e.target.value })} placeholder="Ex: Categoria" required disabled={submittingColumn} /></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={columnFormData.type} onValueChange={(v: 'text' | 'select') => setColumnFormData({ ...columnFormData, type: v })} disabled={submittingColumn}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Texto livre</SelectItem><SelectItem value="select">Lista de opções</SelectItem></SelectContent></Select></div>
              {columnFormData.type === 'select' && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="flex gap-2"><Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Nova opção" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }} disabled={submittingColumn} /><Button type="button" onClick={handleAddOption} disabled={submittingColumn}>Adicionar</Button></div>
                  {columnFormData.options.length > 0 && (<div className="flex flex-wrap gap-2 mt-2">{columnFormData.options.map((o) => (<Badge key={o} variant="secondary" className="gap-1">{o}<button type="button" onClick={() => handleRemoveOption(o)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>))}</div>)}
                </div>
              )}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsColumnDialogOpen(false)} disabled={submittingColumn}>Cancelar</Button><Button type="submit" disabled={submittingColumn}>{submittingColumn && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingColumn ? 'Salvar' : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Column Dialog */}
      <AlertDialog open={isDeleteColumnDialogOpen} onOpenChange={setIsDeleteColumnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir campo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O campo "{deletingColumn?.name}" será removido de todos os projetos deste cliente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteColumn}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir projeto?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto "{deletingProject?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              Esta ação remove definitivamente a solicitação "{deletingRequest?.name}" do banco de dados e ela deixará de aparecer para cliente e admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest}>Excluir solicitação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Dialog */}
      <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa "{deletingTask?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTask}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Time Entry Dialog */}
      <AlertDialog open={isDeleteTimeEntryDialogOpen} onOpenChange={setIsDeleteTimeEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTimeEntry}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kanban Stages Dialog */}
      <KanbanStagesDialog
        open={isKanbanStagesDialogOpen}
        onOpenChange={setIsKanbanStagesDialogOpen}
        stages={data.kanbanStages}
        onSave={handleSaveKanbanStages}
      />
    </div>
  );
};
