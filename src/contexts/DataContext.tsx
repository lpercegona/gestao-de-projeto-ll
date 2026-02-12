import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token?: string;
  user_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  pipeline_status: string;
  company: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  converted_at: string | null;
  contract_type: 'one_time' | 'monthly';
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_months: number | null;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
  show_in_report: boolean;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  custom_fields: Record<string, string>;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  created_by: string | null;
  created_at: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  entry_type: 'task' | 'meeting';
  created_by: string | null;
  created_at: string;
}

interface TaskTimer {
  id: string;
  task_id: string | null;
  user_id: string;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
  created_at: string;
}

interface UserProjectAccess {
  id: string;
  user_id: string;
  project_id: string;
  granted_by: string;
  can_edit: boolean;
  created_at: string;
}

interface KanbanStage {
  id: string;
  name: string;
  order_position: number;
  color: string;
  is_default: boolean;
  owner_id: string | null;
}

interface AppData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
  projectAccess: UserProjectAccess[];
  taskTimers: TaskTimer[];
  kanbanStages: KanbanStage[];
}

const getEffectiveKanbanStages = (stages: KanbanStage[], userId: string): KanbanStage[] => {
  const customStages = stages
    .filter(stage => !stage.is_default && stage.owner_id === userId)
    .sort((a, b) => a.order_position - b.order_position);

  if (customStages.length > 0) {
    return customStages;
  }

  return stages
    .filter(stage => stage.is_default)
    .sort((a, b) => a.order_position - b.order_position);
};

interface DataContextType {
  data: AppData;
  loading: boolean;
  refreshData: () => Promise<void>;
  // Clients
  createClient: (client: Pick<Client, 'name' | 'email' | 'contracted_hours'> & Partial<Pick<Client, 'pipeline_status' | 'company' | 'phone' | 'source' | 'notes'>>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  // Projects
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'owner_id' | 'created_by'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  // Tasks
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  // Time Entries
  createTimeEntry: (entry: Omit<TimeEntry, 'id' | 'created_at' | 'created_by'>) => Promise<TimeEntry | null>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<TimeEntry | null>;
  deleteTimeEntry: (id: string) => Promise<boolean>;
  // Columns
  createColumn: (column: Omit<ProjectColumn, 'id'>) => Promise<ProjectColumn | null>;
  updateColumn: (id: string, updates: Partial<ProjectColumn>) => Promise<ProjectColumn | null>;
  getClientColumns: (clientId: string) => ProjectColumn[];
  deleteColumn: (id: string) => Promise<boolean>;
  // Project Access
  grantProjectAccess: (userId: string, projectId: string, canEdit: boolean) => Promise<UserProjectAccess | null>;
  revokeProjectAccess: (userId: string, projectId: string) => Promise<boolean>;
  // Task Timer
  startTaskTimer: (taskId: string) => Promise<TaskTimer | null>;
  pauseTaskTimer: (taskId: string) => Promise<TaskTimer | null>;
  resumeTaskTimer: (taskId: string) => Promise<TaskTimer | null>;
  stopTaskTimer: (taskId: string, description?: string, entryType?: 'task' | 'meeting') => Promise<{ hours: number } | null>;
  cancelTaskTimer: (taskId: string) => Promise<boolean>;
  getActiveTimer: (taskId: string) => TaskTimer | null;
  completeTask: (taskId: string) => Promise<boolean>;
  // Kanban stages
  saveKanbanStages: (stages: Omit<KanbanStage, 'id' | 'is_default' | 'owner_id'>[]) => Promise<void>;
  // Utilities
  getProjectHours: (projectId: string) => number;
  getClientHours: (clientId: string) => number;
  getClientMonthlyHours: (clientId: string, year?: number, month?: number) => number;
  getClientPreviousMonthOverflow: (clientId: string, year?: number, month?: number) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const emptyData: AppData = {
  clients: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  projectColumns: [],
  projectAccess: [],
  taskTimers: [],
  kanbanStages: [],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMasterAdmin, isAdmin, isCollaborator, isAdminOrMaster } = useAuth();
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const refreshData = useCallback(async (showLoading = true) => {
    if (!user) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      // Fetch all data in parallel
      // Use clients_limited view for collaborators (excludes sensitive fields like access_token, email, phone)
      // Admins and master_admins get full client data from the clients table
      const clientsQuery = isCollaborator && !isAdminOrMaster
        ? supabase.from('clients_limited' as any).select('*').order('created_at', { ascending: false })
        : supabase.from('clients').select('id, name, email, contracted_hours, user_id, owner_id, created_by, created_at, pipeline_status, company, phone, source, notes, converted_at, contract_type, contract_start_date, contract_end_date, contract_months, updated_at, password_set, logo_url').order('created_at', { ascending: false });
      const [clientsRes, projectsRes, tasksRes, entriesRes, columnsRes, accessRes, profilesRes, timersRes, stagesRes] = await Promise.all([
        clientsQuery,
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').order('created_at', { ascending: false }),
        supabase.from('project_columns').select('*').order('created_at', { ascending: true }),
        supabase.from('user_project_access').select('*'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('task_timers').select('*'),
        supabase.from('kanban_stages').select('*').order('order_position', { ascending: true }),
      ]);

      // Build profiles map for creator names
      const profiles: Record<string, string> = {};
      (profilesRes.data || []).forEach(p => {
        if (p.user_id && p.full_name) {
          profiles[p.user_id] = p.full_name;
        }
      });
      setProfilesMap(profiles);

      const allStages = (stagesRes.data || []) as KanbanStage[];

      setData({
        clients: (clientsRes.data || []).map(c => ({
          ...c,
          contract_type: (c as any).contract_type || 'one_time',
          contract_start_date: (c as any).contract_start_date || null,
          contract_end_date: (c as any).contract_end_date || null,
          contract_months: (c as any).contract_months || 1,
        })) as Client[],
        projects: (projectsRes.data || []).map(p => ({
          ...p,
          custom_fields: (p.custom_fields as Record<string, string>) || {},
        })) as Project[],
        tasks: (tasksRes.data || []) as Task[],
        timeEntries: (entriesRes.data || []).map(e => ({
          ...e,
          hours: Number(e.hours),
        })) as TimeEntry[],
        projectColumns: (columnsRes.data || []) as ProjectColumn[],
        projectAccess: (accessRes.data || []) as UserProjectAccess[],
        taskTimers: (timersRes.data || []) as TaskTimer[],
        kanbanStages: getEffectiveKanbanStages(allStages, user.id),
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`task-timers-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_timers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setData(prev => {
            if (payload.eventType === 'DELETE') {
              const deletedTimer = payload.old as Partial<TaskTimer>;
              if (deletedTimer.user_id && deletedTimer.user_id !== user.id) {
                return prev;
              }

              const deletedId = payload.old.id as string;
              return {
                ...prev,
                taskTimers: prev.taskTimers.filter(timer => timer.id !== deletedId),
              };
            }

            const nextTimer = payload.new as TaskTimer;
            if (nextTimer.user_id !== user.id) {
              return prev;
            }

            const withoutCurrent = prev.taskTimers.filter(timer => timer.id !== nextTimer.id);

            return {
              ...prev,
              taskTimers: [...withoutCurrent, nextTimer],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get creator name from user ID
  const getCreatorName = (userId: string | null): string => {
    if (!userId) return 'Sistema';
    return profilesMap[userId] || 'Desconhecido';
  };

  // Client operations
  const createClient = async (client: Omit<Client, 'id' | 'access_token' | 'created_at' | 'user_id' | 'owner_id' | 'created_by'>) => {
    if (!user) return null;

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([{
        ...client,
        owner_id: user.id,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return null;
    }

    const clientWithDefaults = {
      ...newClient,
      contract_type: (newClient as any).contract_type || 'one_time',
      contract_start_date: (newClient as any).contract_start_date || null,
      contract_end_date: (newClient as any).contract_end_date || null,
      contract_months: (newClient as any).contract_months || 1,
    } as Client;

    // Update local state immediately
    setData(prev => ({
      ...prev,
      clients: [clientWithDefaults, ...prev.clients],
    }));
    return clientWithDefaults;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data: updated, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return null;
    }

    const clientWithDefaults = {
      ...updated,
      contract_type: (updated as any).contract_type || 'one_time',
      contract_start_date: (updated as any).contract_start_date || null,
      contract_end_date: (updated as any).contract_end_date || null,
      contract_months: (updated as any).contract_months || 1,
    } as Client;

    // Update local state immediately
    setData(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? clientWithDefaults : c),
    }));
    return clientWithDefaults;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }
    // Update local state immediately
    setData(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
    }));
    return true;
  };

  // Project operations
  const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'owner_id' | 'created_by'>) => {
    if (!user) return null;

    // Get owner_id - for collaborators, use the project's client's owner
    let ownerId = user.id;
    if (isCollaborator && !isAdminOrMaster) {
      const client = data.clients.find(c => c.id === project.client_id);
      if (client?.owner_id) {
        ownerId = client.owner_id;
      }
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert([{
        ...project,
        owner_id: ownerId,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    const projectWithFields = {
      ...newProject,
      custom_fields: (newProject.custom_fields as Record<string, string>) || {},
    } as Project;
    
    // Update local state immediately
    setData(prev => ({
      ...prev,
      projects: [projectWithFields, ...prev.projects],
    }));
    return projectWithFields;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data: updated, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return null;
    }

    const projectWithFields = {
      ...updated,
      custom_fields: (updated.custom_fields as Record<string, string>) || {},
    } as Project;
    
    // Update local state immediately
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? projectWithFields : p),
    }));
    return projectWithFields;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }
    // Update local state immediately
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
    return true;
  };

  // Task operations
  const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    if (!user) return null;

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([{
        ...task,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      tasks: [newTask as Task, ...prev.tasks],
    }));
    return newTask as Task;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data: updated, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? updated as Task : t),
    }));
    return updated as Task;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    // Update local state immediately
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
    }));
    return true;
  };

  // Time entry operations
  const createTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'created_at' | 'created_by'>) => {
    if (!user) return null;

    const { data: newEntry, error } = await supabase
      .from('time_entries')
      .insert([{
        ...entry,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return null;
    }

    const entryWithNumber = { ...newEntry, hours: Number(newEntry.hours) } as TimeEntry;
    // Update local state immediately
    setData(prev => ({
      ...prev,
      timeEntries: [entryWithNumber, ...prev.timeEntries],
    }));
    return entryWithNumber;
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    const { data: updated, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating time entry:', error);
      return null;
    }

    const entryWithNumber = { ...updated, hours: Number(updated.hours) } as TimeEntry;
    // Update local state immediately
    setData(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.map(e => e.id === id ? entryWithNumber : e),
    }));
    return entryWithNumber;
  };

  const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting time entry:', error);
      return false;
    }
    // Update local state immediately
    setData(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.filter(e => e.id !== id),
    }));
    return true;
  };

  // Column operations
  const createColumn = async (column: Omit<ProjectColumn, 'id'>) => {
    const { data: newColumn, error } = await supabase
      .from('project_columns')
      .insert([column])
      .select()
      .single();

    if (error) {
      console.error('Error creating column:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      projectColumns: [...prev.projectColumns, newColumn as ProjectColumn],
    }));
    return newColumn as ProjectColumn;
  };

  const updateColumn = async (id: string, updates: Partial<ProjectColumn>) => {
    const { data: updated, error } = await supabase
      .from('project_columns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating column:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      projectColumns: prev.projectColumns.map(c => c.id === id ? updated as ProjectColumn : c),
    }));
    return updated as ProjectColumn;
  };

  const deleteColumn = async (id: string) => {
    const { error } = await supabase.from('project_columns').delete().eq('id', id);
    if (error) {
      console.error('Error deleting column:', error);
      return false;
    }
    // Update local state immediately
    setData(prev => ({
      ...prev,
      projectColumns: prev.projectColumns.filter(c => c.id !== id),
    }));
    return true;
  };

  // Project access operations
  const grantProjectAccess = async (userId: string, projectId: string, canEdit: boolean) => {
    if (!user) return null;

    const { data: access, error } = await supabase
      .from('user_project_access')
      .upsert({
        user_id: userId,
        project_id: projectId,
        granted_by: user.id,
        can_edit: canEdit,
      }, {
        onConflict: 'user_id,project_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error granting project access:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      projectAccess: [...prev.projectAccess.filter(a => !(a.user_id === userId && a.project_id === projectId)), access as UserProjectAccess],
    }));
    return access as UserProjectAccess;
  };

  const revokeProjectAccess = async (userId: string, projectId: string) => {
    const { error } = await supabase
      .from('user_project_access')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error revoking project access:', error);
      return false;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      projectAccess: prev.projectAccess.filter(a => !(a.user_id === userId && a.project_id === projectId)),
    }));
    return true;
  };

  // Task Timer operations
  const startTaskTimer = async (taskId: string): Promise<TaskTimer | null> => {
    if (!user) return null;

    const hasAnotherActiveTimer = data.taskTimers.some((timer) => timer.user_id === user.id && timer.task_id !== taskId);
    if (hasAnotherActiveTimer) {
      console.warn('Timer start blocked: user already has an active timer running.');
      return null;
    }

    const existingTaskTimer = data.taskTimers.find((timer) => timer.task_id === taskId && timer.user_id === user.id);
    if (existingTaskTimer) {
      return existingTaskTimer;
    }

    // First update task status to in_progress if it's pending
    const task = data.tasks.find(t => t.id === taskId);
    if (task?.status === 'pending') {
      await updateTask(taskId, { status: 'in_progress' });
    }

    const { data: timer, error } = await supabase
      .from('task_timers')
      .insert({
        task_id: taskId,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      return null;
    }

    // Update local state immediately
    setData(prev => ({
      ...prev,
      taskTimers: [...prev.taskTimers, timer as TaskTimer],
    }));
    return timer as TaskTimer;
  };

  const pauseTaskTimer = async (taskId: string): Promise<TaskTimer | null> => {
    if (!user) return null;

    const timer = data.taskTimers.find(t => t.task_id === taskId && t.user_id === user.id);
    if (!timer || timer.paused_at) return timer || null;

    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(timer.started_at).getTime()) / 1000
    ) + (timer.paused_elapsed_seconds || 0);

    const { data: updatedTimer, error } = await supabase
      .from('task_timers')
      .update({
        paused_at: new Date().toISOString(),
        paused_elapsed_seconds: elapsedSeconds,
      } as any)
      .eq('id', timer.id)
      .select()
      .single();

    if (error) {
      console.error('Error pausing timer:', error);
      return null;
    }

    setData(prev => ({
      ...prev,
      taskTimers: prev.taskTimers.map(t => t.id === timer.id ? updatedTimer as TaskTimer : t),
    }));

    return updatedTimer as TaskTimer;
  };

  const resumeTaskTimer = async (taskId: string): Promise<TaskTimer | null> => {
    if (!user) return null;

    const timer = data.taskTimers.find(t => t.task_id === taskId && t.user_id === user.id);
    if (!timer || !timer.paused_at) return timer || null;

    const { data: updatedTimer, error } = await supabase
      .from('task_timers')
      .update({
        started_at: new Date().toISOString(),
        paused_at: null,
      } as any)
      .eq('id', timer.id)
      .select()
      .single();

    if (error) {
      console.error('Error resuming timer:', error);
      return null;
    }

    setData(prev => ({
      ...prev,
      taskTimers: prev.taskTimers.map(t => t.id === timer.id ? updatedTimer as TaskTimer : t),
    }));

    return updatedTimer as TaskTimer;
  };

  const stopTaskTimer = async (taskId: string, description?: string, entryType: 'task' | 'meeting' = 'task'): Promise<{ hours: number } | null> => {
    if (!user) return null;

    const timer = data.taskTimers.find(t => t.task_id === taskId && t.user_id === user.id);
    if (!timer) return null;

    // Calculate elapsed time
    const pausedElapsedMs = (timer.paused_elapsed_seconds || 0) * 1000;
    const elapsedMs = timer.paused_at
      ? pausedElapsedMs
      : pausedElapsedMs + (Date.now() - new Date(timer.started_at).getTime());
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    
    // Round to nearest 0.25 hours (15 minutes)
    const roundedHours = Math.round(elapsedHours * 4) / 4;
    const finalHours = Math.max(0.25, roundedHours); // Minimum 15 minutes

    // Create time entry with user-provided description or default
    // Use format() instead of toISOString() to avoid timezone issues
    await createTimeEntry({
      task_id: taskId,
      hours: finalHours,
      description: description || 'Timer automático',
      date: format(new Date(), 'yyyy-MM-dd'),
      entry_type: entryType,
    });

    // Delete the timer
    const { error } = await supabase
      .from('task_timers')
      .delete()
      .eq('id', timer.id);

    if (error) {
      console.error('Error stopping timer:', error);
      return null;
    }

    // Update local state immediately (remove timer)
    setData(prev => ({
      ...prev,
      taskTimers: prev.taskTimers.filter(t => t.id !== timer.id),
    }));
    return { hours: finalHours };
  };

  const cancelTaskTimer = async (taskId: string): Promise<boolean> => {
    if (!user) return false;

    const timer = data.taskTimers.find(t => t.task_id === taskId && t.user_id === user.id);
    if (!timer) return false;

    // Delete the timer without creating a time entry
    const { error } = await supabase
      .from('task_timers')
      .delete()
      .eq('id', timer.id);

    if (error) {
      console.error('Error canceling timer:', error);
      return false;
    }

    // Update local state immediately (remove timer)
    setData(prev => ({
      ...prev,
      taskTimers: prev.taskTimers.filter(t => t.id !== timer.id),
    }));
    return true;
  };

  const getActiveTimer = (taskId: string): TaskTimer | null => {
    if (!user) return null;

    return data.taskTimers.find(t => t.task_id === taskId && t.user_id === user.id) || null;
  };

  const completeTask = async (taskId: string): Promise<boolean> => {
    // If there's an active timer, stop it first
    const timer = data.taskTimers.find(t => t.task_id === taskId && t.user_id === user?.id);
    if (timer) {
      await stopTaskTimer(taskId);
    }

    // Update task status to completed
    const updated = await updateTask(taskId, { status: 'completed' });
    return !!updated;
  };

  // Utility functions
  const getTaskHours = (taskId: string): number => {
    return data.timeEntries
      .filter(e => e.task_id === taskId)
      .reduce((sum, e) => sum + Number(e.hours), 0);
  };

  const getProjectHours = (projectId: string): number => {
    const projectTasks = data.tasks.filter(t => t.project_id === projectId);
    return projectTasks.reduce((sum, task) => sum + getTaskHours(task.id), 0);
  };

  const getClientHours = (clientId: string): number => {
    const clientProjects = data.projects.filter(p => p.client_id === clientId);
    return clientProjects.reduce((sum, project) => sum + getProjectHours(project.id), 0);
  };

  const getClientMonthlyHours = (clientId: string, year?: number, month?: number): number => {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;
    
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    
    const clientProjects = data.projects.filter(p => p.client_id === clientId);
    const projectIds = new Set(clientProjects.map(p => p.id));
    const clientTaskIds = new Set(data.tasks.filter(t => projectIds.has(t.project_id)).map(t => t.id));
    
    return data.timeEntries
      .filter(e => {
        if (!clientTaskIds.has(e.task_id)) return false;
        const entryDate = new Date(e.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.hours), 0);
  };

  const getClientColumns = (clientId: string): ProjectColumn[] => {
    return data.projectColumns.filter(col => col.client_id === clientId);
  };

  // Calculate overflow hours from previous months for monthly contracts
  const getClientPreviousMonthOverflow = (clientId: string, year?: number, month?: number): number => {
    const client = data.clients.find(c => c.id === clientId);
    if (!client || client.contract_type !== 'monthly') return 0;

    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const targetMonthIndex = targetYear * 12 + (targetMonth - 1);

    // Prefer explicit contract start. For legacy clients without contract_start_date,
    // use the earliest reliable month available from client creation/time entries.
    const fallbackStartDate = client.contract_start_date || client.created_at || null;
    const startDate = fallbackStartDate ? new Date(fallbackStartDate) : null;

    if (startDate) {
      const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
      if (targetMonthIndex <= startMonthIndex) return 0;
    }

    // Walk month by month (iterative) to avoid unbounded recursion on legacy data.
    const MAX_LOOKBACK_MONTHS = 120;
    const firstMonthToEvaluate = Math.max(0, targetMonthIndex - MAX_LOOKBACK_MONTHS);

    let overflow = 0;
    for (let monthIndex = firstMonthToEvaluate; monthIndex < targetMonthIndex; monthIndex += 1) {
      if (startDate) {
        const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
        if (monthIndex <= startMonthIndex) continue;
      }

      const monthYear = Math.floor(monthIndex / 12);
      const monthNumber = (monthIndex % 12) + 1;
      const usedHours = getClientMonthlyHours(clientId, monthYear, monthNumber);
      const availableHours = Math.max(0, client.contracted_hours - overflow);
      overflow = Math.max(0, usedHours - availableHours);
    }

    return overflow;
  };

  // Kanban stages operations
  const saveKanbanStages = async (stages: Omit<KanbanStage, 'id' | 'is_default' | 'owner_id'>[]): Promise<void> => {
    if (!user) return;

    // Delete existing custom stages (keep defaults)
    await supabase
      .from('kanban_stages')
      .delete()
      .eq('is_default', false)
      .eq('owner_id', user.id);

    // Insert new custom stages
    if (stages.length > 0) {
      const stagesToInsert = stages.map((stage, index) => ({
        name: stage.name,
        order_position: index,
        color: stage.color,
        is_default: false,
        owner_id: user.id,
      }));

      const { data: insertedStages } = await supabase.from('kanban_stages').insert(stagesToInsert).select();
      
      // Update local state immediately using only user custom stages
      if (insertedStages) {
        setData(prev => ({
          ...prev,
          kanbanStages: (insertedStages as KanbanStage[]).sort((a, b) => a.order_position - b.order_position),
        }));
      }
    } else {
      // Just remove custom stages from local state
      setData(prev => ({
        ...prev,
        kanbanStages: prev.kanbanStages.filter(s => s.is_default || s.owner_id !== user.id),
      }));
    }
  };

  return (
    <DataContext.Provider
      value={{
        data,
        loading,
        refreshData,
        createClient,
        updateClient,
        deleteClient,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        deleteTask,
        createTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        createColumn,
        updateColumn,
        deleteColumn,
        getClientColumns,
        grantProjectAccess,
        revokeProjectAccess,
        startTaskTimer,
        pauseTaskTimer,
        resumeTaskTimer,
        stopTaskTimer,
        cancelTaskTimer,
        getActiveTimer,
        completeTask,
        saveKanbanStages,
        getProjectHours,
        getClientHours,
        getClientMonthlyHours,
        getClientPreviousMonthOverflow,
        getTaskHours,
        getCreatorName,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
