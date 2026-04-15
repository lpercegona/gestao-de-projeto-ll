import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectDetailSheet } from "./ProjectDetailSheet";
import { TaskDetailDialogContent } from "./TaskDetailDialogContent";
import { useEditingLock } from "@/hooks/useEditingLock";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSheet } from "@/components/ui/form-sheet";
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
import {
  getStageKeyFromStatus,
  stageToDbStatus,
  LEGACY_STATUS_TO_NAME,
} from "@/lib/kanbanStageMapping";

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

const mapStatusToStageName = (status: string, stages: { id: string; name: string; color: string | null; order_position: number }[]): string => {
  return getStageKeyFromStatus(status, stages);
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
    if (sortedStages.length === 0) {
      if (current === 'pending') return 'in_progress';
      if (current === 'in_progress') return 'completed';
      return 'pending';
    }
    const mappedName = mapStatusToStageName(current, sortedStages);
    const idx = sortedStages.findIndex((s) => s.name === mappedName || s.id === current);
    if (idx === -1) return stageToDbStatus(sortedStages[0]);
    const next = (idx + 1) % sortedStages.length;
    return stageToDbStatus(sortedStages[next]);
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
    const mappedName = mapStatusToStageName(status, sortedStages);
    const lastStage = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1] : null;
    const firstStage = sortedStages.length > 0 ? sortedStages[0] : null;
    if (status === 'completed' || (lastStage && mappedName === lastStage.name)) return true;
    if (status === 'pending' || (firstStage && mappedName === firstStage.name)) return false;
    return 'indeterminate';
  };

  const getTaskStageColor = (status: string): string | null => {
    const mappedName = mapStatusToStageName(status, sortedStages);
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
    const mappedName = mapStatusToStageName(status, sortedStages);
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

      {/* Detail Sheet */}
      {detailDialog?.type === 'project' && (
        <ProjectDetailSheet
          projectId={detailDialog.data.id}
          open={!!detailDialog}
          onOpenChange={(open) => !open && setDetailDialog(null)}
        />
      )}
      {detailDialog?.type === 'task' && (
        <ProjectDetailSheet
          projectId={(detailDialog.data as Task).project_id}
          open={!!detailDialog}
          onOpenChange={(open) => !open && setDetailDialog(null)}
        />
      )}
    </>
  );
};

// Re-export from extracted files for backward compatibility
export { ProjectDetailDialogContent } from "./ProjectDetailDialogContent";
export { TaskDetailDialogContent } from "./TaskDetailDialogContent";
