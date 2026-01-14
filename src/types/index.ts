export interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token: string;
  user_id: string | null;
  created_at: string;
}

export interface ProjectColumn {
  id: string;
  name: string;
  type: 'text' | 'select';
  options?: string[] | null;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  custom_fields: Record<string, string> | null;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface AppData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
}
