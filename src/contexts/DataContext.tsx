import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, Client, Project, Task, TimeEntry, ProjectColumn } from '@/types';
import * as storage from '@/lib/storage';

interface DataContextType {
  data: AppData;
  refreshData: () => void;
  // Clients
  createClient: (client: Omit<Client, 'id' | 'accessToken' | 'createdAt'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => Client | null;
  deleteClient: (id: string) => boolean;
  // Projects
  createProject: (project: Omit<Project, 'id' | 'createdAt'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => Project | null;
  deleteProject: (id: string) => boolean;
  // Tasks
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => Task | null;
  deleteTask: (id: string) => boolean;
  // Time Entries
  createTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => TimeEntry;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => TimeEntry | null;
  deleteTimeEntry: (id: string) => boolean;
  // Columns
  createColumn: (column: Omit<ProjectColumn, 'id'>) => ProjectColumn;
  updateColumn: (id: string, updates: Partial<ProjectColumn>) => ProjectColumn | null;
  deleteColumn: (id: string) => boolean;
  // Utilities
  getProjectHours: (projectId: string) => number;
  getClientHours: (clientId: string) => number;
  getTaskHours: (taskId: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(storage.getData());

  const refreshData = useCallback(() => {
    setData(storage.getData());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const wrappedCreateClient = useCallback((client: Omit<Client, 'id' | 'accessToken' | 'createdAt'>) => {
    const result = storage.createClient(client);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedUpdateClient = useCallback((id: string, updates: Partial<Client>) => {
    const result = storage.updateClient(id, updates);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedDeleteClient = useCallback((id: string) => {
    const result = storage.deleteClient(id);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedCreateProject = useCallback((project: Omit<Project, 'id' | 'createdAt'>) => {
    const result = storage.createProject(project);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedUpdateProject = useCallback((id: string, updates: Partial<Project>) => {
    const result = storage.updateProject(id, updates);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedDeleteProject = useCallback((id: string) => {
    const result = storage.deleteProject(id);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedCreateTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    const result = storage.createTask(task);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    const result = storage.updateTask(id, updates);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedDeleteTask = useCallback((id: string) => {
    const result = storage.deleteTask(id);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedCreateTimeEntry = useCallback((entry: Omit<TimeEntry, 'id' | 'createdAt'>) => {
    const result = storage.createTimeEntry(entry);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedUpdateTimeEntry = useCallback((id: string, updates: Partial<TimeEntry>) => {
    const result = storage.updateTimeEntry(id, updates);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedDeleteTimeEntry = useCallback((id: string) => {
    const result = storage.deleteTimeEntry(id);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedCreateColumn = useCallback((column: Omit<ProjectColumn, 'id'>) => {
    const result = storage.createColumn(column);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedUpdateColumn = useCallback((id: string, updates: Partial<ProjectColumn>) => {
    const result = storage.updateColumn(id, updates);
    refreshData();
    return result;
  }, [refreshData]);

  const wrappedDeleteColumn = useCallback((id: string) => {
    const result = storage.deleteColumn(id);
    refreshData();
    return result;
  }, [refreshData]);

  return (
    <DataContext.Provider
      value={{
        data,
        refreshData,
        createClient: wrappedCreateClient,
        updateClient: wrappedUpdateClient,
        deleteClient: wrappedDeleteClient,
        createProject: wrappedCreateProject,
        updateProject: wrappedUpdateProject,
        deleteProject: wrappedDeleteProject,
        createTask: wrappedCreateTask,
        updateTask: wrappedUpdateTask,
        deleteTask: wrappedDeleteTask,
        createTimeEntry: wrappedCreateTimeEntry,
        updateTimeEntry: wrappedUpdateTimeEntry,
        deleteTimeEntry: wrappedDeleteTimeEntry,
        createColumn: wrappedCreateColumn,
        updateColumn: wrappedUpdateColumn,
        deleteColumn: wrappedDeleteColumn,
        getProjectHours: storage.getProjectHours,
        getClientHours: storage.getClientHours,
        getTaskHours: storage.getTaskHours,
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
