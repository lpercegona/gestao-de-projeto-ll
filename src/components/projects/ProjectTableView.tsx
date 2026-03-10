import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useEditingLock } from "@/hooks/useEditingLock";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, MoreVertical, Pencil, Trash2, Archive, FilePenLine, Users, Plus } from "lucide-react";
import { ExpandableDescription } from "./ExpandableDescription";
import { TaskCard } from "./TaskCard";
import { formatHours } from "@/lib/formatHours";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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

interface ProjectTableViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
  kanbanStages: KanbanStage[];
  isAdminOrMaster: boolean;
  allowProjectEditOnly?: boolean;
  currentUserId?: string;
  taskTimers?: TaskTimer[];
  projectAccess?: ProjectAccess[];
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getClientColumns: (clientId: string) => ProjectColumn[];
  getActiveTimer?: (taskId: string) => TaskTimer | null;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTask?: (projectId: string) => void;
  onRegisterTime?: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer?: (taskId: string) => Promise<void>;
  onStopTimer?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onUpdateProjectStatus?: (projectId: string, newStatus: string) => Promise<void>;
  onUpdateTaskStatus?: (taskId: string, newStatus: string) => Promise<void>;
  onRequestTaskEdit?: (task: Task) => void;
  onEditRequest?: (project: Project) => void;
  onDeleteRequest?: (project: Project) => void;
}

const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'];

// Map legacy status values to kanban stage names
const STATUS_TO_STAGE_NAME: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

const mapStatusToStageName = (status: string): string => {
  return STATUS_TO_STAGE_NAME[status] || status;
};

// Convert tailwind bg class to a saturated hex color for checkbox styling
const tailwindColorToHex = (color: string | null): string | null => {
  if (!color) return null;
  const match = color.match(/^bg-(\w+)-(\d+)$/);
  if (!match) {
    if (color === 'bg-muted') return '#6b7280';
    return null;
  }
  const [, name] = match;
  const baseColors: Record<string, string> = {
    yellow: '#eab308', orange: '#f97316', green: '#22c55e', blue: '#3b82f6',
    red: '#ef4444', purple: '#a855f7', pink: '#ec4899', indigo: '#6366f1',
    teal: '#14b8a6', cyan: '#06b6d4', emerald: '#10b981', lime: '#84cc16',
    amber: '#f59e0b', rose: '#f43f5e', slate: '#64748b', gray: '#6b7280',
  };
  return baseColors[name] || null;
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  paused: '#f97316',
  completed: '#22c55e',
  archived: '#94a3b8',
};

export const ProjectTableView: React.FC<ProjectTableViewProps> = ({
  projects,
  clients,
  tasks,
  timeEntries,
  projectColumns,
  kanbanStages,
  isAdminOrMaster,
  allowProjectEditOnly = false,
  currentUserId,
  taskTimers = [],
  projectAccess = [],
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getClientColumns,
  getActiveTimer,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onEditTask,
  onDeleteTask,
  onCreateTask,
  onRegisterTime,
  onStartTimer,
  onStopTimer,
  onCompleteTask,
  onUpdateProjectStatus,
  onUpdateTaskStatus,
  onRequestTaskEdit,
  onEditRequest,
  onDeleteRequest,
}) => {
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [detailDialog, setDetailDialog] = useState<{ type: 'project' | 'task'; data: Project | Task } | null>(null);
  useEditingLock(detailDialog !== null);

  // Local state for instant UI updates
  const [localProjectStatuses, setLocalProjectStatuses] = useState<Record<string, string>>({});
  const [localTaskStatuses, setLocalTaskStatuses] = useState<Record<string, string>>({});

  // Profiles for member avatars
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, ProfileSummary>>({});

  useEffect(() => {
    const ps: Record<string, string> = {};
    projects.forEach(p => { ps[p.id] = p.status; });
    setLocalProjectStatuses(ps);
  }, [projects]);

  useEffect(() => {
    const ts: Record<string, string> = {};
    tasks.forEach(t => { ts[t.id] = t.status; });
    setLocalTaskStatuses(ts);
  }, [tasks]);

  const sortedStages = useMemo(() => {
    return [...kanbanStages].sort((a, b) => a.order_position - b.order_position);
  }, [kanbanStages]);

  const isClientMode = allowProjectEditOnly && !isAdminOrMaster;
  const hasPerTaskPermissions = !!currentUserId && !isAdminOrMaster;
  const isOwnTask = (task: Task) => task.created_by === currentUserId;
  const isOwnProject = (project: Project) => project.created_by === currentUserId;

  // Fetch profiles for member avatars in dialog
  const userIdsWithProjectAccess = useMemo(() => {
    const ids = new Set(projectAccess.map((a) => a.user_id));
    projects.forEach((p) => {
      if (p.owner_id) ids.add(p.owner_id);
      if (p.created_by) ids.add(p.created_by);
    });
    return Array.from(ids);
  }, [projectAccess, projects]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (userIdsWithProjectAccess.length === 0) return;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIdsWithProjectAccess);
      const nextMap: Record<string, ProfileSummary> = {};
      (profiles || []).forEach((p) => { nextMap[p.user_id] = p; });
      setProfilesByUserId(nextMap);
    };
    fetchProfiles();
  }, [userIdsWithProjectAccess]);

  const projectMembersByProjectId = useMemo(() => {
    const membersMap: Record<string, string[]> = {};
    projects.forEach((project) => {
      const userIds = new Set(
        projectAccess.filter((a) => a.project_id === project.id).map((a) => a.user_id),
      );
      if (project.owner_id) userIds.add(project.owner_id);
      if (project.created_by) userIds.add(project.created_by);
      membersMap[project.id] = Array.from(userIds);
    });
    return membersMap;
  }, [projectAccess, projects]);

  const getMemberName = (userId: string, profile?: ProfileSummary) => {
    const fullName = profile?.full_name?.trim();
    if (fullName) return fullName;

    const email = profile?.email?.trim();
    if (email) return email;

    const memberId = userId.trim();
    if (memberId) return "Usuário";

    return "Usuário";
  };

  const getAvatarInitial = (userId: string, profile?: ProfileSummary) => {
    const fullName = profile?.full_name?.trim();
    if (fullName) return fullName[0].toUpperCase();

    const email = profile?.email?.trim();
    if (email) return email[0].toUpperCase();

    const memberId = userId.trim();
    if (memberId) return memberId[0].toUpperCase();

    return "?";
  };

  const getAvatarSrc = (profile?: ProfileSummary) => {
    const src = profile?.avatar_url?.trim();
    return src ? src : undefined;
  };

  const getNextProjectStatus = (current: string): string => {
    const idx = PROJECT_STATUSES.indexOf(current);
    if (idx === -1 || idx >= PROJECT_STATUSES.length - 1) return PROJECT_STATUSES[0];
    return PROJECT_STATUSES[idx + 1];
  };

  const getNextTaskStatus = (current: string): string => {
    const mappedName = mapStatusToStageName(current);
    if (sortedStages.length === 0) {
      if (current === 'pending') return 'in_progress';
      if (current === 'in_progress') return 'completed';
      return 'pending';
    }
    const idx = sortedStages.findIndex((s) => s.name === mappedName || s.id === current);
    if (idx === -1) return sortedStages[0]?.name || 'pending';
    const next = (idx + 1) % sortedStages.length;
    return sortedStages[next].name;
  };

  const handleProjectStatusChange = useCallback(async (project: Project) => {
    if (project.is_request) return;
    const currentStatus = localProjectStatuses[project.id] || project.status;
    const next = getNextProjectStatus(currentStatus);
    setLocalProjectStatuses(prev => ({ ...prev, [project.id]: next }));
    if (onUpdateProjectStatus) {
      await onUpdateProjectStatus(project.id, next);
    }
  }, [localProjectStatuses, onUpdateProjectStatus]);

  const handleTaskStatusChange = useCallback(async (task: Task) => {
    if (task.is_pending_approval) return;
    const currentStatus = localTaskStatuses[task.id] || task.status;
    const next = getNextTaskStatus(currentStatus);
    setLocalTaskStatuses(prev => ({ ...prev, [task.id]: next }));
    if (onUpdateTaskStatus) {
      await onUpdateTaskStatus(task.id, next);
    }
  }, [localTaskStatuses, sortedStages, onUpdateTaskStatus]);

  const getProjectCheckState = (status: string): boolean | 'indeterminate' => {
    if (status === 'completed') return true;
    if (status === 'active' || status === 'paused') return 'indeterminate';
    return false;
  };

  const getTaskCheckState = (status: string): boolean | 'indeterminate' => {
    const mappedName = mapStatusToStageName(status);
    const lastStage = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1] : null;
    const firstStage = sortedStages.length > 0 ? sortedStages[0] : null;
    if (status === 'completed' || (lastStage && mappedName === lastStage.name)) return true;
    if (status === 'pending' || (firstStage && mappedName === firstStage.name)) return false;
    return 'indeterminate';
  };

  const getTaskStageColor = (status: string): string | null => {
    const mappedName = mapStatusToStageName(status);
    const stage = sortedStages.find(s => s.name === mappedName || s.id === status);
    return stage ? tailwindColorToHex(stage.color) : null;
  };

  const getStatusLabel = (s: string) =>
    s === "active" ? "Ativo" : s === "paused" ? "Pausado" : s === "archived" ? "Arquivado" : s === "completed" ? "Concluído" : s;

  const getStatusColor = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : s === "paused"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : s === "archived"
          ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          : "bg-muted text-muted-foreground";

  const getTaskStatusLabel = (status: string): string => {
    const mappedName = mapStatusToStageName(status);
    const stage = sortedStages.find(s => s.name === mappedName || s.id === status);
    if (stage) return stage.name;
    return mappedName;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'dd/MM/yy', { locale: ptBR });
    } catch {
      return '';
    }
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  const getCheckboxStyle = (color: string | null, isChecked: boolean | 'indeterminate'): React.CSSProperties => {
    if (!color || isChecked === false) return {};
    return {
      backgroundColor: color,
      borderColor: color,
    };
  };

  // Permission helpers
  const isProjectCheckboxDisabled = (project: Project) => {
    if (project.is_request) return true;
    if (isAdminOrMaster) return false;
    if (isClientMode && !isOwnProject(project)) return true;
    return false;
  };

  const isTaskCheckboxDisabled = (task: Task) => {
    if (task.is_pending_approval) return true;
    if (isAdminOrMaster) return false;
    if (isClientMode && !isOwnTask(task)) return true;
    return false;
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.project_id === project.id);
          const isOpen = openProjects[project.id] ?? false;
          const projectStatus = localProjectStatuses[project.id] || project.status;
          const projectCheckState = getProjectCheckState(projectStatus);
          const projectColor = PROJECT_STATUS_COLORS[projectStatus] || null;

          return (
            <Collapsible
              key={project.id}
              open={isOpen}
              onOpenChange={() => setOpenProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
            >
              <div className="flex items-center gap-2 sm:gap-3 py-2 px-3 border-b hover:bg-muted/30 transition-colors">
                <Checkbox
                  checked={projectCheckState === true}
                  data-state={projectCheckState === 'indeterminate' ? 'indeterminate' : undefined}
                  className={projectCheckState === 'indeterminate' ? 'data-[state=indeterminate]:text-primary-foreground' : projectCheckState === true ? 'data-[state=checked]:text-primary-foreground' : ''}
                  style={getCheckboxStyle(projectColor, projectCheckState)}
                  onCheckedChange={() => handleProjectStatusChange(project)}
                  disabled={isProjectCheckboxDisabled(project)}
                />
                <span
                  onClick={() => setDetailDialog({ type: 'project', data: project })}
                  className="cursor-pointer flex-1 truncate font-medium text-sm sm:text-base"
                >
                  {project.name}
                </span>
                {(projectMembersByProjectId[project.id] || []).length > 0 && (
                  <div className="flex items-center -space-x-2 shrink-0">
                    {(projectMembersByProjectId[project.id] || []).map((userId) => {
                      const profile = profilesByUserId[userId];
                      const memberName = getMemberName(userId, profile);
                      return (
                        <Avatar
                          key={userId}
                          className="h-6 w-6 border-2 border-background"
                          title={memberName}
                        >
                          <AvatarImage
                            src={getAvatarSrc(profile)}
                            alt={`${memberName} - Avatar`}
                          />
                          <AvatarFallback className="text-[10px] bg-secondary text-muted-foreground">
                            {getAvatarInitial(userId, profile)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                )}
                {project.is_request && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {project.request_label || 'Solicitação'}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {formatDate(project.due_date)}
                </span>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {project.is_request ? (
                      <>
                        <DropdownMenuItem onClick={() => onEditRequest?.(project)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar solicitação
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRequest?.(project)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => onEditProject(project)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          {isClientMode
                            ? (isOwnProject(project) ? 'Editar' : 'Solicitar Edição')
                            : 'Editar'}
                        </DropdownMenuItem>
                        {isAdminOrMaster && (
                          <>
                            <DropdownMenuItem onClick={() => onArchiveProject(project)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(project)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                        {isClientMode && isOwnProject(project) && (
                          <DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(project)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CollapsibleContent>
                {projectTasks.length === 0 ? (
                  <div className="py-3 px-3 pl-10 border-b text-xs text-muted-foreground">
                    Nenhuma tarefa neste projeto.
                  </div>
                ) : (
                  projectTasks.map((task) => {
                    const taskStatus = localTaskStatuses[task.id] || task.status;
                    const taskCheckState = getTaskCheckState(taskStatus);
                    const taskColor = getTaskStageColor(taskStatus);

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 sm:gap-3 py-1.5 px-3 pl-10 border-b bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={taskCheckState === true}
                          data-state={taskCheckState === 'indeterminate' ? 'indeterminate' : undefined}
                          className={taskCheckState === 'indeterminate' ? 'data-[state=indeterminate]:text-primary-foreground' : taskCheckState === true ? 'data-[state=checked]:text-primary-foreground' : ''}
                          style={getCheckboxStyle(taskColor, taskCheckState)}
                          onCheckedChange={() => handleTaskStatusChange(task)}
                          disabled={isTaskCheckboxDisabled(task)}
                        />
                        <span
                          onClick={() => setDetailDialog({ type: 'task', data: task })}
                          className="cursor-pointer flex-1 truncate text-sm"
                        >
                          {task.name}
                        </span>
                        {task.is_pending_approval && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {task.approval_label || 'Pendente'}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                          {formatDate(task.due_date)}
                        </span>
                        {!task.is_pending_approval && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isClientMode && !isOwnTask(task) ? (
                                <DropdownMenuItem onClick={() => onRequestTaskEdit?.(task)}>
                                  <FilePenLine className="w-4 h-4 mr-2" />
                                  Solicitar Alteração
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => onEditTask(task)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => onDeleteTask(task)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Detail Dialog - replicates ProjectListView card layout */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailDialog?.type === 'project' && (
            <ProjectDetailDialogContent
              project={detailDialog.data as Project}
              clients={clients}
              tasks={tasks}
              timeEntries={timeEntries}
              projectColumns={projectColumns}
              kanbanStages={kanbanStages}
              taskTimers={taskTimers}
              projectAccess={projectAccess}
              profilesByUserId={profilesByUserId}
              projectMembers={projectMembersByProjectId[detailDialog.data.id] || []}
              isAdminOrMaster={isAdminOrMaster}
              isClientMode={isClientMode}
              hasPerTaskPermissions={hasPerTaskPermissions}
              currentUserId={currentUserId}
              getProjectHours={getProjectHours}
              getTaskHours={getTaskHours}
              getCreatorName={getCreatorName}
              getClientColumns={getClientColumns}
              getActiveTimer={getActiveTimer}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              onArchiveProject={onArchiveProject}
              onCreateTask={onCreateTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onRegisterTime={onRegisterTime}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              onCompleteTask={onCompleteTask}
              onRequestTaskEdit={onRequestTaskEdit}
              onEditRequest={onEditRequest}
              onClose={() => setDetailDialog(null)}
            />
          )}
          {detailDialog?.type === 'task' && (
            <TaskDetailDialogContent
              task={detailDialog.data as Task}
              timeEntries={timeEntries}
              kanbanStages={kanbanStages}
              isAdminOrMaster={isAdminOrMaster}
              isClientMode={isClientMode}
              currentUserId={currentUserId}
              getTaskHours={getTaskHours}
              getCreatorName={getCreatorName}
              getActiveTimer={getActiveTimer}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onRegisterTime={onRegisterTime}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              onCompleteTask={onCompleteTask}
              onRequestTaskEdit={onRequestTaskEdit}
              onClose={() => setDetailDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// ---- Project Detail Dialog (replicates ProjectListView expanded card) ----

interface ProjectDetailDialogContentProps {
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
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onCreateTask?: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRegisterTime?: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer?: (taskId: string) => Promise<void>;
  onStopTimer?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onRequestTaskEdit?: (task: Task) => void;
  onEditRequest?: (project: Project) => void;
  onClose: () => void;
}

const ProjectDetailDialogContent: React.FC<ProjectDetailDialogContentProps> = ({
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
  const isOwnTask = (task: Task) => task.created_by === currentUserId;

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
              <DropdownMenuItem onClick={() => { onClose(); if (isClientMode) { onEditRequest?.(project); } else { onEditProject(project); } }}>
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
                    !isPendingApproval && !ownTask && onRequestTaskEdit
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

// ---- Task Detail Dialog (renders TaskCard directly) ----

interface TaskDetailDialogContentProps {
  task: Task;
  timeEntries: TimeEntry[];
  kanbanStages: KanbanStage[];
  isAdminOrMaster: boolean;
  isClientMode: boolean;
  currentUserId?: string;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getActiveTimer?: (taskId: string) => TaskTimer | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRegisterTime?: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer?: (taskId: string) => Promise<void>;
  onStopTimer?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onRequestTaskEdit?: (task: Task) => void;
  onClose: () => void;
}

const TaskDetailDialogContent: React.FC<TaskDetailDialogContentProps> = ({
  task,
  timeEntries,
  kanbanStages,
  isAdminOrMaster,
  isClientMode,
  currentUserId,
  getTaskHours,
  getCreatorName,
  getActiveTimer,
  onEditTask,
  onDeleteTask,
  onRegisterTime,
  onStartTimer,
  onStopTimer,
  onCompleteTask,
  onRequestTaskEdit,
  onClose,
}) => {
  const taskTimeEntries = timeEntries.filter((e) => e.task_id === task.id);
  const activeTimer = getActiveTimer?.(task.id) || null;
  const isPendingApproval = Boolean(task.is_pending_approval);
  const ownTask = currentUserId ? task.created_by === currentUserId : true;
  const hasPerTaskPermissions = !!currentUserId && !isAdminOrMaster;

  return (
    <div className="pt-2">
      <TaskCard
        task={task}
        taskHours={getTaskHours(task.id)}
        timeEntries={taskTimeEntries}
        activeTimer={activeTimer}
        kanbanStages={kanbanStages}
        getCreatorName={getCreatorName}
        onEditTask={() => { onClose(); onEditTask(task); }}
        onDeleteTask={() => { onClose(); onDeleteTask(task); }}
        onRequestEdit={
          !isPendingApproval && !ownTask && onRequestTaskEdit
            ? () => { onClose(); onRequestTaskEdit(task); }
            : undefined
        }
        onRegisterTime={onRegisterTime || (() => {})}
        onStartTimer={() => (isPendingApproval || !onStartTimer ? Promise.resolve() : onStartTimer(task.id))}
        onStopTimer={() => (isPendingApproval || !onStopTimer ? Promise.resolve() : onStopTimer(task.id))}
        onCompleteTask={() => (isPendingApproval || !onCompleteTask ? Promise.resolve() : onCompleteTask(task.id))}
        showStatus
        showTimeControls={hasPerTaskPermissions ? ownTask : !isClientMode}
        allowTaskEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        allowTaskDelete={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        showRegisterTimeButton={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        allowTimeEntryEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
      />
    </div>
  );
};
