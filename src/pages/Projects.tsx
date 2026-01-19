import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { NoProjectsAssigned } from '@/components/collaborator/NoProjectsAssigned';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Pencil, Trash2, Loader2, Users, Settings, ChevronDown, X, ClipboardList } from 'lucide-react';
import { Users as UsersIcon } from 'lucide-react';
import { Project, Task } from '@/types';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// New components
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView';
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
}

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
    startTaskTimer,
    stopTaskTimer,
    getActiveTimer,
    completeTask,
    saveKanbanStages,
  } = useData();
  const { user, isAdminOrMaster, isCollaborator } = useAuth();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  
  // Project dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', client_id: '', status: 'active', custom_fields: {} as Record<string, string>,
  });
  
  // Task dialog state
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [taskProjectId, setTaskProjectId] = useState<string>('');
  const [taskFormData, setTaskFormData] = useState({ name: '', description: '', status: 'pending' });

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
    
    return projects;
  }, [data.projects, data.projectAccess, user?.id, isAdminOrMaster, filterClientId]);

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
      setFormData({ name: project.name, description: project.description || '', client_id: project.client_id, status: project.status, custom_fields: { ...project.custom_fields } });
      const projectAccess = data.projectAccess.filter(a => a.project_id === project.id);
      setSelectedCollaborators(projectAccess.map(a => a.user_id));
    } else {
      setEditingProject(null);
      const defaultClientId = data.clients[0]?.id || '';
      const clientCols = defaultClientId ? getClientColumns(defaultClientId) : [];
      const defaultCustomFields: Record<string, string> = {};
      clientCols.forEach(col => { defaultCustomFields[col.id] = col.options?.[0] || ''; });
      setFormData({ name: '', description: '', client_id: defaultClientId, status: 'active', custom_fields: defaultCustomFields });
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
      let projectId: string | undefined;
      if (editingProject) {
        await updateProject(editingProject.id, formData);
        projectId = editingProject.id;
        toast.success('Projeto atualizado!');
      } else {
        const newProject = await createProject(formData);
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

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // Task handlers
  const handleOpenTaskDialog = (projectId: string, task?: Task, initialStatus?: string) => {
    setTaskProjectId(projectId);
    if (task) {
      setEditingTask(task);
      setTaskFormData({ name: task.name, description: task.description || '', status: task.status });
    } else {
      setEditingTask(null);
      setTaskFormData({ name: '', description: '', status: initialStatus || 'pending' });
    }
    setIsTaskDialogOpen(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (editingTask) {
      await updateTask(editingTask.id, taskFormData);
      toast.success('Tarefa atualizada!');
    } else {
      await createTask({ ...taskFormData, project_id: taskProjectId });
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
    await startTaskTimer(taskId);
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
      toast.success('Timer parado e horas registradas!');
      setIsPauseDialogOpen(false);
      setPausingTaskId(null);
    }
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
    const columnData = { name: columnFormData.name, type: columnFormData.type, options: columnFormData.type === 'select' ? columnFormData.options : null, client_id: formData.client_id };
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

  if (isCollaborator && !isAdminOrMaster && visibleProjects.length === 0 && filterClientId === 'all') {
    return <NoProjectsAssigned />;
  }

  if (isAdminOrMaster && data.clients.length === 0) return (
    <div><PageHeader title="Projetos" description="Gerencie seus projetos e tarefas" />
      <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground mb-4">Você precisa cadastrar um cliente antes de criar projetos.</p><Button asChild><Link to="/clients">Ir para Clientes</Link></Button></CardContent></Card></div>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isCollaborator && !isAdminOrMaster ? "Meus Projetos" : "Projetos"} 
        description={isCollaborator && !isAdminOrMaster ? "Projetos atribuídos a você" : "Gerencie seus projetos e tarefas"} 
      />
      
      {/* Filters and view toggle */}
      <ProjectFilters
        clients={data.clients}
        selectedClientId={filterClientId}
        onClientChange={setFilterClientId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Header with count and new button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {visibleProjects.length} {visibleProjects.length === 1 ? 'projeto' : 'projetos'}
        </h2>
        {isAdminOrMaster && (
          <Button onClick={() => handleOpenDialog()} size="sm" className="px-3">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Novo Projeto</span>
          </Button>
        )}
      </div>

      {/* View content */}
      {viewMode === 'list' ? (
        <ProjectListView
          projects={visibleProjects}
          clients={data.clients}
          tasks={data.tasks}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          projectColumns={data.projectColumns}
          projectAccess={data.projectAccess}
          kanbanStages={data.kanbanStages}
          isAdminOrMaster={isAdminOrMaster}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getActiveTimer}
          getClientColumns={getClientColumns}
          onEditProject={handleOpenDialog}
          onDeleteProject={(project) => { setDeletingProject(project); setIsDeleteDialogOpen(true); }}
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
          projects={visibleProjects}
          clients={data.clients}
          tasks={data.tasks}
          timeEntries={data.timeEntries}
          taskTimers={data.taskTimers}
          kanbanStages={data.kanbanStages}
          isAdminOrMaster={isAdminOrMaster}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getActiveTimer={getActiveTimer}
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
      
      {/* Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2"><Label htmlFor="name">Nome do Projeto</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} disabled={submitting} /></div>
              <div className="space-y-2"><Label>Cliente</Label><Select value={formData.client_id} onValueChange={handleClientChange} disabled={submitting}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem></SelectContent></Select></div>
              
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTask}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nome da Tarefa</Label><Input value={taskFormData.name} onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={taskFormData.description} onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })} rows={3} disabled={submitting} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={taskFormData.status} onValueChange={(v) => setTaskFormData({ ...taskFormData, status: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em Andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTask ? 'Salvar' : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
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

      {/* Pause Timer Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pausar Timer</DialogTitle></DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmPause}>Pausar e Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent>
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
