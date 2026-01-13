import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token: string;
  user_id: string | null;
  created_at: string;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  custom_fields: Record<string, string>;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
}

interface AppData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
}

interface DataContextType {
  data: AppData;
  loading: boolean;
  refreshData: () => Promise<void>;
  // Clients
  createClient: (client: Omit<Client, 'id' | 'access_token' | 'created_at' | 'user_id'>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  // Projects
  createProject: (project: Omit<Project, 'id' | 'created_at'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  // Tasks
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  // Time Entries
  createTimeEntry: (entry: Omit<TimeEntry, 'id' | 'created_at'>) => Promise<TimeEntry | null>;
  deleteTimeEntry: (id: string) => Promise<boolean>;
  // Columns
  createColumn: (column: Omit<ProjectColumn, 'id'>) => Promise<ProjectColumn | null>;
  updateColumn: (id: string, updates: Partial<ProjectColumn>) => Promise<ProjectColumn | null>;
  deleteColumn: (id: string) => Promise<boolean>;
  // Utilities
  getProjectHours: (projectId: string) => number;
  getClientHours: (clientId: string) => number;
  getTaskHours: (taskId: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const emptyData: AppData = {
  clients: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  projectColumns: [],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all data in parallel
      const [clientsRes, projectsRes, tasksRes, entriesRes, columnsRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').order('created_at', { ascending: false }),
        supabase.from('project_columns').select('*').order('created_at', { ascending: true }),
      ]);

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

  // Client operations
  const createClient = async (client: Omit<Client, 'id' | 'access_token' | 'created_at' | 'user_id'>) => {
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([client])
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
  const createProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert([project])
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
  const createTask = async (task: Omit<Task, 'id' | 'created_at'>) => {
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([task])
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
  const createTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'created_at'>) => {
    const { data: newEntry, error } = await supabase
      .from('time_entries')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return null;
    }

    await refreshData();
    return { ...newEntry, hours: Number(newEntry.hours) } as TimeEntry;
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
        deleteTimeEntry,
        createColumn,
        updateColumn,
        deleteColumn,
        getProjectHours,
        getClientHours,
        getTaskHours,
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
