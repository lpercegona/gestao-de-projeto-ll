import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectShareDialog } from "./ProjectShareDialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Users,
  MoreVertical,
  Archive,
  FilePenLine,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/formatHours";
import { ExpandableDescription } from "./ExpandableDescription";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

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
  request_kind?: "new_project" | "edit_request";
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
}

interface TaskTimer {
  id: string;
  task_id: string | null;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
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

interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

interface ProjectListViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  taskTimers: TaskTimer[];
  projectColumns: ProjectColumn[];
  projectAccess: ProjectAccess[];
  kanbanStages: KanbanStage[];
  isAdminOrMaster: boolean;
  allowProjectEditOnly?: boolean;
  currentUserId?: string;
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getActiveTimer: (taskId: string) => TaskTimer | null;
  getClientColumns: (clientId: string) => ProjectColumn[];
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onCreateTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRegisterTime: (
    taskId: string,
    entry?: {
      id: string;
      hours: number;
      description: string | null;
      date: string;
    },
  ) => void;
  onStartTimer: (taskId: string) => Promise<void>;
  onStopTimer: (taskId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onRequestCardClick?: (project: Project) => void;
  hasPendingEditRequest?: (project: Project) => boolean;
  onOpenEditRequestReview?: (project: Project) => void;
  onRequestTaskEdit?: (task: Task) => void;
  onEditRequestCardClick?: (project: Project) => void;
  onPendingTaskClick?: (task: Task) => void;
  onEditRequest?: (project: Project) => void;
  onDeleteRequest?: (project: Project) => void;
  onApproveRequest?: (project: Project) => void;
  onRejectRequest?: (project: Project) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  clients,
  tasks,
  timeEntries,
  taskTimers,
  projectAccess,
  kanbanStages,
  isAdminOrMaster,
  allowProjectEditOnly = false,
  currentUserId,
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getActiveTimer,
  getClientColumns,
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
  onRequestCardClick,
  hasPendingEditRequest,
  onOpenEditRequestReview,
  onRequestTaskEdit,
  onEditRequestCardClick,
  onPendingTaskClick,
  onEditRequest,
  onDeleteRequest,
  onApproveRequest,
  onRejectRequest,
}) => {
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, ProfileSummary>
  >({});
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);

  const isClientRestrictedMode = allowProjectEditOnly && !isAdminOrMaster;
  const hasPerTaskPermissions = !!currentUserId && !isAdminOrMaster;

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
      if (userIdsWithProjectAccess.length === 0) {
        setProfilesByUserId({});
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIdsWithProjectAccess);

      if (profilesError) {
        console.error(
          "Erro ao buscar perfis de usuários para projetos:",
          profilesError,
        );
        return;
      }

      const nextMap: Record<string, ProfileSummary> = {};
      (profiles || []).forEach((profile) => {
        nextMap[profile.user_id] = profile;
      });

      setProfilesByUserId(nextMap);
    };

    fetchProfiles();
  }, [userIdsWithProjectAccess]);

  const getMemberName = (userId: string, profile?: ProfileSummary) => {
    const fullName = profile?.full_name?.trim();
    if (fullName) return fullName;

    const email = profile?.email?.trim();
    if (email) return "Usuário sem perfil";

    return "Usuário";
  };

  const getMemberEmail = (profile?: ProfileSummary) => {
    const email = profile?.email?.trim();
    return email || "Email indisponível";
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

  const projectMembersByProjectId = useMemo(() => {
    const membersMap: Record<string, string[]> = {};

    projects.forEach((project) => {
      const userIds = new Set(
        projectAccess
          .filter((access) => access.project_id === project.id)
          .map((access) => access.user_id),
      );
      if (project.owner_id) userIds.add(project.owner_id);
      if (project.created_by) userIds.add(project.created_by);
      membersMap[project.id] = Array.from(userIds);
    });

    return membersMap;
  }, [projectAccess, projects]);

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const getStatusLabel = (s: string) =>
    s === "active"
      ? "Ativo"
      : s === "paused"
        ? "Pausado"
        : s === "archived"
          ? "Arquivo"
          : "Concluído";
  const getStatusColor = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : s === "paused"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : s === "archived"
          ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          : "bg-muted text-muted-foreground";

  const getRequestStatusLabel = (status?: string) => {
    if (status === "pending") return "Pendente";
    if (status === "analyzing" || status === "in_review") return "Em análise";
    if (status === "approved") return "Aprovada";
    if (status === "converted") return "Convertida";
    if (status === "rejected") return "Rejeitada";
    return status || "Solicitação";
  };

  const getRequestCardClass = (project: Project) => {
    if (!project.is_request) return "";

    if (project.request_status === "pending") {
      return "border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20";
    }

    if (
      project.request_status === "analyzing" ||
      project.request_status === "in_review"
    ) {
      return "border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20";
    }

    return "";
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

  return (
    <div className="columns-1 gap-4 lg:columns-3">
      {projects.map((project) => {
        const client = clients.find((c) => c.id === project.client_id);
        const projectTasks = tasks.filter((t) => t.project_id === project.id);
        const hours = getProjectHours(project.id);
        const projectCollaborators =
          projectMembersByProjectId[project.id] || [];
        const canManageShare =
          isAdminOrMaster ||
          (!!currentUserId && currentUserId === project.owner_id);
        const projectColumns = client ? getClientColumns(client.id) : [];
        const isOpen = openProjects[project.id] ?? false;

        return (
          <Card
            key={project.id}
            className={`relative mb-4 break-inside-avoid overflow-hidden ${getRequestCardClass(project)}`}
          >
            {/* Project Header */}
            <Collapsible
              open={isOpen}
              onOpenChange={() => toggleProject(project.id)}
            >
              <div className="relative">
                {hasPendingEditRequest?.(project) && (
                  <div className="absolute top-3 right-11 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenEditRequestReview?.(project);
                      }}
                    >
                      <FilePenLine className="w-3 h-3 text-amber-500" />
                    </Button>
                  </div>
                )}

                {(allowProjectEditOnly || isAdminOrMaster) && (
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {project.is_request ? (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditRequest?.(project);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar solicitação
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRequest?.(project);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir solicitação
                            </DropdownMenuItem>
                            {isAdminOrMaster && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onApproveRequest?.(project);
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-2 text-green-600" />
                                  Aceitar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRejectRequest?.(project);
                                  }}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProject(project);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              {isClientRestrictedMode
                                ? (project.created_by === currentUserId ? "Editar" : "Solicitar Edição")
                                : "Editar"}
                            </DropdownMenuItem>

                            {isAdminOrMaster && !allowProjectEditOnly && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onArchiveProject(project);
                                  }}
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteProject(project);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}

                            {isClientRestrictedMode && project.created_by === currentUserId && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProject(project);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <CollapsibleTrigger
                  className="w-full text-left"
                  onClick={(event) => {
                    if (!project.is_request || !isAdminOrMaster) return;

                    if (project.request_kind === "edit_request") {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditRequestCardClick?.(project);
                      return;
                    }

                    if (onRequestCardClick) {
                      event.preventDefault();
                      event.stopPropagation();
                      onRequestCardClick(project);
                    }
                  }}
                >
                  <CardContent className="p-4 sm:p-6 pr-16 sm:pr-20 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="w-full space-y-2">
                      <div className="flex items-start gap-2">
                        <ChevronDown
                          className={`w-4 h-4 mt-1 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                        />
                        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="font-semibold text-base sm:text-[1.05rem] text-foreground">
                            {project.name}
                          </h3>
                          {project.is_request && (
                            <Badge variant="secondary">
                              {project.request_label || "Solicitação"}
                            </Badge>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}
                          >
                            {project.is_request
                              ? getRequestStatusLabel(project.request_status)
                              : getStatusLabel(project.status)}
                          </span>
                          {isAdminOrMaster &&
                            projectCollaborators.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {projectCollaborators.length}
                              </span>
                            )}
                        </div>
                      </div>
                      {project.description && (
                        <ExpandableDescription
                          content={project.description}
                          className="w-full max-w-none text-sm text-muted-foreground"
                          stopPropagationOnToggle
                        />
                      )}
                      <div className="w-full flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {!isClientRestrictedMode && (
                          <div>
                            <span className="text-muted-foreground">
                              Cliente:{" "}
                            </span>
                            <span className="font-medium text-foreground">
                              {client?.company || client?.name}
                            </span>
                          </div>
                        )}
                        {!project.is_request && (
                          <>
                            <div>
                              <span className="text-muted-foreground">
                                Tarefas:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {projectTasks.length}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Horas:{" "}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatHours(hours)}
                              </span>
                            </div>
                          </>
                        )}
                        {projectColumns.map(
                          (col) =>
                            project.custom_fields[col.id] && (
                              <div key={col.id}>
                                <span className="text-muted-foreground">
                                  {col.name}:{" "}
                                </span>
                                <span className="font-medium text-foreground">
                                  {project.custom_fields[col.id]}
                                </span>
                              </div>
                            ),
                        )}
                      </div>
                      {projectCollaborators.length > 0 && (
                        <div
                          className={`inline-flex items-center -space-x-2 pt-1 ${canManageShare ? "cursor-pointer hover:opacity-80" : ""}`}
                          onClick={(e) => {
                            if (!canManageShare) return;
                            e.stopPropagation();
                            setShareProjectId(project.id);
                          }}
                        >
                          {projectCollaborators.map((userId) => {
                            const profile = profilesByUserId[userId];
                            return (
                              <Avatar
                                key={userId}
                                className="h-7 w-7 border-1 border-background"
                                title={`${getMemberName(userId, profile)} • ${getMemberEmail(profile)}`}
                              >
                                <AvatarImage
                                  src={getAvatarSrc(profile)}
                                  alt={`${getMemberName(userId, profile)} - Avatar`}
                                />
                                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                                  {getAvatarInitial(userId, profile)}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {canManageShare && (
                            <div
                              className="h-6 w-6 rounded-full border-1 border-background bg-secondary text-muted-foreground flex items-center justify-center z-10"
                              title="Gerenciar compartilhamento"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t px-4 sm:px-6 py-4 bg-muted/20">
                  {project.is_request ? (
                    <p className="text-sm text-muted-foreground">
                      Esta solicitação ainda não foi convertida em projeto.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-foreground">
                          Tarefas ({projectTasks.length})
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCreateTask(project.id)}
                          className="h-8"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Nova Tarefa
                        </Button>
                      </div>

                      {projectTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma tarefa neste projeto.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {projectTasks.map((task) => {
                            const taskTimeEntries = timeEntries.filter(
                              (te) => te.task_id === task.id,
                            );
                            const activeTimer = getActiveTimer(task.id);
                            const isPendingApprovalTask = Boolean(
                              task.is_pending_approval,
                            );
                            const isOwnTask = currentUserId
                              ? task.created_by === currentUserId
                              : true;

                            return (
                              <TaskCard
                                key={task.id}
                                task={task}
                                taskHours={getTaskHours(task.id)}
                                timeEntries={taskTimeEntries}
                                activeTimer={activeTimer}
                                kanbanStages={kanbanStages}
                                getCreatorName={getCreatorName}
                                onEditTask={() =>
                                  !isPendingApprovalTask && onEditTask(task)
                                }
                                onDeleteTask={() =>
                                  !isPendingApprovalTask && onDeleteTask(task)
                                }
                                onRequestEdit={
                                  !isPendingApprovalTask &&
                                  !isOwnTask &&
                                  onRequestTaskEdit
                                    ? () => onRequestTaskEdit(task)
                                    : undefined
                                }
                                onRegisterTime={onRegisterTime}
                                onStartTimer={() =>
                                  isPendingApprovalTask
                                    ? Promise.resolve()
                                    : onStartTimer(task.id)
                                }
                                onStopTimer={() =>
                                  isPendingApprovalTask
                                    ? Promise.resolve()
                                    : onStopTimer(task.id)
                                }
                                onCompleteTask={() =>
                                  isPendingApprovalTask
                                    ? Promise.resolve()
                                    : onCompleteTask(task.id)
                                }
                                showStatus={true}
                                showTimeControls={
                                  hasPerTaskPermissions
                                    ? isOwnTask
                                    : !isClientRestrictedMode
                                }
                                allowTaskEdit={
                                  !isPendingApprovalTask &&
                                  (hasPerTaskPermissions
                                    ? isOwnTask
                                    : !isClientRestrictedMode)
                                }
                                allowTaskDelete={
                                  !isPendingApprovalTask &&
                                  (hasPerTaskPermissions
                                    ? isOwnTask
                                    : !isClientRestrictedMode)
                                }
                                showRegisterTimeButton={
                                  !isPendingApprovalTask &&
                                  (hasPerTaskPermissions
                                    ? isOwnTask
                                    : !isClientRestrictedMode)
                                }
                                allowTimeEntryEdit={
                                  !isPendingApprovalTask &&
                                  (hasPerTaskPermissions
                                    ? isOwnTask
                                    : !isClientRestrictedMode)
                                }
                                onPendingApprovalClick={
                                  isPendingApprovalTask
                                    ? () => onPendingTaskClick?.(task)
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {shareProjectId && (
        <ProjectShareDialog
          projectId={shareProjectId}
          projectOwnerId={
            projects.find((p) => p.id === shareProjectId)?.owner_id
          }
          isOpen={!!shareProjectId}
          onClose={() => setShareProjectId(null)}
          canManageShare={
            isAdminOrMaster ||
            (!!currentUserId &&
              currentUserId ===
                projects.find((p) => p.id === shareProjectId)?.owner_id)
          }
        />
      )}
    </div>
  );
};
