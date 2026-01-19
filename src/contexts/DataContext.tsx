import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token: string;
  user_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
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
  task_id: string;
  user_id: string;
  started_at: string;
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

interface DataContextType {
  data: AppData;
  loading: boolean;
  refreshData: () => Promise<void>;
  // Clients
  createClient: (client: Omit<Client, 'id' | 'access_token' | 'created_at' | 'user_id' | 'owner_id' | 'created_by'>) => Promise<Client | null>;
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
  stopTaskTimer: (taskId: string, description?: string, entryType?: 'task' | 'meeting') => Promise<{ hours: number } | null>;
  getActiveTimer: (taskId: string) => TaskTimer | null;
  completeTask: (taskId: string) => Promise<boolean>;
  // Kanban stages
  saveKanbanStages: (stages: Omit<KanbanStage, 'id' | 'is_default'>[]) => Promise<void>;
  // Utilities
  getProjectHours: (projectId: string) => number;
  getClientHours: (clientId: string) => number;
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

  const refreshData = useCallback(async () => {
    if (!user) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all data in parallel
      const [clientsRes, projectsRes, tasksRes, entriesRes, columnsRes, accessRes, profilesRes, timersRes, stagesRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
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

      setData({
        clients: (clientsRes.data || []) as Client[],
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
        kanbanStages: (stagesRes.data || []) as KanbanStage[],
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

    await refreshData();
    return newClient as Client;
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

    await refreshData();
    return updated as Client;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }
    await refreshData();
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

    await refreshData();
    return {
      ...newProject,
      custom_fields: (newProject.custom_fields as Record<string, string>) || {},
    } as Project;
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

    await refreshData();
    return {
      ...updated,
      custom_fields: (updated.custom_fields as Record<string, string>) || {},
    } as Project;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }
    await refreshData();
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

    await refreshData();
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

    await refreshData();
    return updated as Task;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    await refreshData();
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

    await refreshData();
    return { ...newEntry, hours: Number(newEntry.hours) } as TimeEntry;
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

    await refreshData();
    return { ...updated, hours: Number(updated.hours) } as TimeEntry;
  };

  const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting time entry:', error);
      return false;
    }
    await refreshData();
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

    await refreshData();
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

    await refreshData();
    return updated as ProjectColumn;
  };

  const deleteColumn = async (id: string) => {
    const { error } = await supabase.from('project_columns').delete().eq('id', id);
    if (error) {
      console.error('Error deleting column:', error);
      return false;
    }
    await refreshData();
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

    await refreshData();
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

    await refreshData();
    return true;
  };

  // Task Timer operations
  const startTaskTimer = async (taskId: string): Promise<TaskTimer | null> => {
    if (!user) return null;

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
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      return null;
    }

    await refreshData();
    return timer as TaskTimer;
  };

  const stopTaskTimer = async (taskId: string, description?: string, entryType: 'task' | 'meeting' = 'task'): Promise<{ hours: number } | null> => {
    if (!user) return null;

    const timer = data.taskTimers.find(t => t.task_id === taskId);
    if (!timer) return null;

    // Calculate elapsed time
    const startTime = new Date(timer.started_at).getTime();
    const now = Date.now();
    const elapsedMs = now - startTime;
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

    await refreshData();
    return { hours: finalHours };
  };

  const getActiveTimer = (taskId: string): TaskTimer | null => {
    return data.taskTimers.find(t => t.task_id === taskId) || null;
  };

  const completeTask = async (taskId: string): Promise<boolean> => {
    // If there's an active timer, stop it first
    const timer = data.taskTimers.find(t => t.task_id === taskId);
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

  const getClientColumns = (clientId: string): ProjectColumn[] => {
    return data.projectColumns.filter(col => col.client_id === clientId);
  };

  // Kanban stages operations
  const saveKanbanStages = async (stages: Omit<KanbanStage, 'id' | 'is_default'>[]): Promise<void> => {
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

      await supabase.from('kanban_stages').insert(stagesToInsert);
    }

    await refreshData();
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
        stopTaskTimer,
        getActiveTimer,
        completeTask,
        saveKanbanStages,
        getProjectHours,
        getClientHours,
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
