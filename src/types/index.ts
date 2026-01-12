export interface Client {
  id: string;
  name: string;
  email: string;
  contractedHours: number;
  accessToken: string;
  createdAt: string;
}

export interface ProjectColumn {
  id: string;
  name: string;
  type: 'text' | 'select';
  options?: string[];
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  customFields: Record<string, string>;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  hours: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface AppData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
}
