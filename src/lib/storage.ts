import { AppData, Client, Project, Task, TimeEntry, ProjectColumn } from '@/types';

const STORAGE_KEY = 'horaspro_data';

const generateId = () => crypto.randomUUID();
const generateToken = () => crypto.randomUUID().replace(/-/g, '');

const getDefaultData = (): AppData => ({
  clients: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  projectColumns: [
    { id: '1', name: 'Categoria', type: 'select', options: ['Web', 'Mobile', 'Design', 'Consultoria'] },
    { id: '2', name: 'Tipo', type: 'select', options: ['Desenvolvimento', 'Manutenção', 'Suporte'] },
  ],
});

export const getData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return getDefaultData();
  try {
    return JSON.parse(stored);
  } catch {
    return getDefaultData();
  }
};

export const saveData = (data: AppData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Client operations
export const createClient = (client: Omit<Client, 'id' | 'accessToken' | 'createdAt'>): Client => {
  const data = getData();
  const newClient: Client = {
    ...client,
    id: generateId(),
    accessToken: generateToken(),
    createdAt: new Date().toISOString(),
  };
  data.clients.push(newClient);
  saveData(data);
  return newClient;
};

export const updateClient = (id: string, updates: Partial<Client>): Client | null => {
  const data = getData();
  const index = data.clients.findIndex(c => c.id === id);
  if (index === -1) return null;
  data.clients[index] = { ...data.clients[index], ...updates };
  saveData(data);
  return data.clients[index];
};

export const deleteClient = (id: string): boolean => {
  const data = getData();
  const index = data.clients.findIndex(c => c.id === id);
  if (index === -1) return false;
  data.clients.splice(index, 1);
  // Delete related projects, tasks, and time entries
  const projectIds = data.projects.filter(p => p.clientId === id).map(p => p.id);
  data.projects = data.projects.filter(p => p.clientId !== id);
  const taskIds = data.tasks.filter(t => projectIds.includes(t.projectId)).map(t => t.id);
  data.tasks = data.tasks.filter(t => !projectIds.includes(t.projectId));
  data.timeEntries = data.timeEntries.filter(te => !taskIds.includes(te.taskId));
  saveData(data);
  return true;
};

export const getClientByToken = (token: string): Client | undefined => {
  const data = getData();
  return data.clients.find(c => c.accessToken === token);
};

// Project operations
export const createProject = (project: Omit<Project, 'id' | 'createdAt'>): Project => {
  const data = getData();
  const newProject: Project = {
    ...project,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.projects.push(newProject);
  saveData(data);
  return newProject;
};

export const updateProject = (id: string, updates: Partial<Project>): Project | null => {
  const data = getData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  data.projects[index] = { ...data.projects[index], ...updates };
  saveData(data);
  return data.projects[index];
};

export const deleteProject = (id: string): boolean => {
  const data = getData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return false;
  data.projects.splice(index, 1);
  const taskIds = data.tasks.filter(t => t.projectId === id).map(t => t.id);
  data.tasks = data.tasks.filter(t => t.projectId !== id);
  data.timeEntries = data.timeEntries.filter(te => !taskIds.includes(te.taskId));
  saveData(data);
  return true;
};

// Task operations
export const createTask = (task: Omit<Task, 'id' | 'createdAt'>): Task => {
  const data = getData();
  const newTask: Task = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  saveData(data);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | null => {
  const data = getData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  data.tasks[index] = { ...data.tasks[index], ...updates };
  saveData(data);
  return data.tasks[index];
};

export const deleteTask = (id: string): boolean => {
  const data = getData();
  const index = data.tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  data.tasks.splice(index, 1);
  data.timeEntries = data.timeEntries.filter(te => te.taskId !== id);
  saveData(data);
  return true;
};

// Time Entry operations
export const createTimeEntry = (entry: Omit<TimeEntry, 'id' | 'createdAt'>): TimeEntry => {
  const data = getData();
  const newEntry: TimeEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.timeEntries.push(newEntry);
  saveData(data);
  return newEntry;
};

export const updateTimeEntry = (id: string, updates: Partial<TimeEntry>): TimeEntry | null => {
  const data = getData();
  const index = data.timeEntries.findIndex(te => te.id === id);
  if (index === -1) return null;
  data.timeEntries[index] = { ...data.timeEntries[index], ...updates };
  saveData(data);
  return data.timeEntries[index];
};

export const deleteTimeEntry = (id: string): boolean => {
  const data = getData();
  const index = data.timeEntries.findIndex(te => te.id === id);
  if (index === -1) return false;
  data.timeEntries.splice(index, 1);
  saveData(data);
  return true;
};

// Column operations
export const createColumn = (column: Omit<ProjectColumn, 'id'>): ProjectColumn => {
  const data = getData();
  const newColumn: ProjectColumn = {
    ...column,
    id: generateId(),
  };
  data.projectColumns.push(newColumn);
  saveData(data);
  return newColumn;
};

export const updateColumn = (id: string, updates: Partial<ProjectColumn>): ProjectColumn | null => {
  const data = getData();
  const index = data.projectColumns.findIndex(c => c.id === id);
  if (index === -1) return null;
  data.projectColumns[index] = { ...data.projectColumns[index], ...updates };
  saveData(data);
  return data.projectColumns[index];
};

export const deleteColumn = (id: string): boolean => {
  const data = getData();
  const index = data.projectColumns.findIndex(c => c.id === id);
  if (index === -1) return false;
  data.projectColumns.splice(index, 1);
  saveData(data);
  return true;
};

// Utility functions
export const getProjectHours = (projectId: string): number => {
  const data = getData();
  const taskIds = data.tasks.filter(t => t.projectId === projectId).map(t => t.id);
  return data.timeEntries
    .filter(te => taskIds.includes(te.taskId))
    .reduce((sum, te) => sum + te.hours, 0);
};

export const getClientHours = (clientId: string): number => {
  const data = getData();
  const projectIds = data.projects.filter(p => p.clientId === clientId).map(p => p.id);
  return projectIds.reduce((sum, projectId) => sum + getProjectHours(projectId), 0);
};

export const getTaskHours = (taskId: string): number => {
  const data = getData();
  return data.timeEntries
    .filter(te => te.taskId === taskId)
    .reduce((sum, te) => sum + te.hours, 0);
};
