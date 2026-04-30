import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Archive, Users, Plus } from "lucide-react";
import { ExpandableDescription } from "./ExpandableDescription";
import { TaskCard } from "./TaskCard";
import { formatHours } from "@/lib/formatHours";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
  owner_id?: string | null;
  created_by?: string | null;
  is_request?: boolean;
  request_status?: string;
  request_label?: string;
  request_kind?: 'new_project' | 'edit_request';
  request_id?: string;
  edit_request_id?: string;
  request_attachments?: Array<{ name: string; url: string; uploaded_at: string; path?: string }>;
  attachments?: Array<{ name: string; url: string; uploaded_at: string; path?: string }> | null;
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
  is_pending_approval?: boolean;
  approval_label?: string;
  pending_request_id?: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_by: string | null;
  entry_type?: 'task' | 'meeting';
}

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
}

interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

interface TaskTimer {
  id: string;
  task_id: string | null;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
}

interface ProjectAccess {
  project_id: string;
  user_id: string;
}

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface ProjectDetailDialogContentProps {
  project: Project;
  clients: Client[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
  kanbanStages: KanbanStage[];
  taskTimers: TaskTimer[];
  projectAccess: ProjectAccess[];
  profilesByUserId: Record<string, ProfileSummary>;
  projectMembers: string[];
  isAdminOrMaster: boolean;
  isClientMode: boolean;
  hasPerTaskPermissions: boolean;
  currentUserId?: string;
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getClientColumns: (clientId: string) => ProjectColumn[];
  getActiveTimer?: (taskId: string) => TaskTimer | null;
  getStatusLabel: (s: string) => string;
  getStatusColor: (s: string) => string;
  onEditProject: (project: any) => void;
  onDeleteProject: (project: any) => void;
  onArchiveProject: (project: any) => void;
  onCreateTask?: (projectId: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (task: any) => void;
  onRegisterTime?: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer?: (taskId: string) => Promise<void>;
  onStopTimer?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onRequestTaskEdit?: (task: any) => void;
  onEditRequest?: (project: any) => void;
  onClose: () => void;
}

export const ProjectDetailDialogContent: React.FC<ProjectDetailDialogContentProps> = ({
  project,
  clients,
  tasks,
  timeEntries,
  projectColumns: _projectColumns,
  kanbanStages,
  isAdminOrMaster,
  isClientMode,
  hasPerTaskPermissions,
  currentUserId,
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getClientColumns,
  getActiveTimer,
  getStatusLabel,
  getStatusColor,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onRegisterTime,
  onStartTimer,
  onStopTimer,
  onCompleteTask,
  onRequestTaskEdit,
  onEditRequest,
  onClose,
  profilesByUserId,
  projectMembers,
}) => {
  const client = clients.find((c) => c.id === project.client_id);
  const hours = getProjectHours(project.id);
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const columns = client ? getClientColumns(client.id) : [];
  const isOwnTask = (task: any) => task.created_by === currentUserId;

  return (
    <div className="space-y-4">
      {/* Header: name + status + members + menu */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-base text-foreground">{project.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
            {getStatusLabel(project.status)}
          </span>
          {projectMembers.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {projectMembers.length}
            </span>
          )}
        </div>
        {!project.is_request && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { if (isClientMode) { onClose(); onEditRequest?.(project); } else { onEditProject(project); } }}>
                <Pencil className="w-4 h-4 mr-2" />
                {isClientMode ? 'Solicitar Edição' : 'Editar'}
              </DropdownMenuItem>
              {isAdminOrMaster && (
                <>
                  <DropdownMenuItem onClick={() => { onClose(); onArchiveProject(project); }}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { onClose(); onDeleteProject(project); }}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <ExpandableDescription content={project.description} className="text-sm text-muted-foreground" />
      )}

      {/* Imagens de apoio (anexos da solicitação ou do projeto) */}
      {(() => {
        const atts = project.is_request && Array.isArray(project.request_attachments)
          ? project.request_attachments
          : Array.isArray(project.attachments) ? project.attachments : [];
        if (!atts.length) return null;
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Imagens de apoio</h4>
            <div className="flex flex-wrap gap-2">
              {atts.map((att) => (
                <a
                  key={att.url}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={att.name}
                  className="block h-20 w-20 overflow-hidden rounded-md border border-border bg-muted"
                >
                  <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Info: Client, Tasks, Hours */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {!isClientMode && client && (
          <div>
            <span className="text-muted-foreground">Cliente: </span>
            <span className="font-medium text-foreground">{client.company || client.name}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Tarefas: </span>
          <span className="font-medium text-foreground">{projectTasks.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Horas: </span>
          <span className="font-medium text-foreground">{formatHours(hours)}</span>
        </div>
        {project.due_date && (
          <div>
            <span className="text-muted-foreground">Prazo: </span>
            <span className="font-medium text-foreground">{format(new Date(project.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
        )}
      </div>

      {/* Custom fields */}
      {columns.length > 0 && project.custom_fields && Object.keys(project.custom_fields).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {columns.map((col) => {
            const value = project.custom_fields[col.id];
            if (!value) return null;
            return (
              <div key={col.id}>
                <span className="text-muted-foreground">{col.name}: </span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Member avatars */}
      {projectMembers.length > 0 && (
        <div className="flex items-center -space-x-2">
          {projectMembers.map((userId) => {
            const profile = profilesByUserId[userId];
            const name = profile?.full_name?.trim() || profile?.email?.trim() || 'Usuário';
            const initial = name[0]?.toUpperCase() || '?';
            return (
              <Avatar key={userId} className="h-7 w-7 border-2 border-background" title={name}>
                <AvatarImage src={profile?.avatar_url || undefined} alt={name} />
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">{initial}</AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      )}

      {/* Tasks section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-foreground">Tarefas ({projectTasks.length})</h4>
          {onCreateTask && (
            <Button size="sm" variant="outline" onClick={() => { onClose(); onCreateTask(project.id); }} className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              Nova Tarefa
            </Button>
          )}
        </div>

        {projectTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa neste projeto.</p>
        ) : (
          <div className="space-y-3">
            {projectTasks.map((task) => {
              const taskTimeEntries = timeEntries.filter((te) => te.task_id === task.id);
              const activeTimer = getActiveTimer?.(task.id) || null;
              const isPendingApproval = Boolean(task.is_pending_approval);
              const ownTask = currentUserId ? task.created_by === currentUserId : true;

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  taskHours={getTaskHours(task.id)}
                  timeEntries={taskTimeEntries}
                  activeTimer={activeTimer}
                  kanbanStages={kanbanStages}
                  getCreatorName={getCreatorName}
                  onEditTask={() => !isPendingApproval && onEditTask(task)}
                  onDeleteTask={() => !isPendingApproval && onDeleteTask(task)}
                  onRequestEdit={
                    !isPendingApproval && !isOwnTask(task) && onRequestTaskEdit
                      ? () => onRequestTaskEdit(task)
                      : undefined
                  }
                  onRegisterTime={onRegisterTime || (() => {})}
                  onStartTimer={() => (isPendingApproval || !onStartTimer ? Promise.resolve() : onStartTimer(task.id))}
                  onStopTimer={() => (isPendingApproval || !onStopTimer ? Promise.resolve() : onStopTimer(task.id))}
                  onCompleteTask={() => (isPendingApproval || !onCompleteTask ? Promise.resolve() : onCompleteTask(task.id))}
                  showStatus
                  iconOnly
                  showTimeControls={hasPerTaskPermissions ? ownTask : !isClientMode}
                  allowTaskEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
                  allowTaskDelete={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
                  showRegisterTimeButton={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
                  allowTimeEntryEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
