import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Settings, GripVertical } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { ProjectShareDialog } from "./ProjectShareDialog";

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
  order_position: number;
  color: string;
  is_default: boolean;
}

interface ProjectKanbanViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  taskTimers: TaskTimer[];
  kanbanStages: KanbanStage[];
  projectAccess: ProjectAccess[];
  isAdminOrMaster: boolean;
  currentUserId?: string;
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getActiveTimer: (taskId: string) => TaskTimer | null;
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
  onUpdateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
  onCreateTask: (projectId: string, status?: string) => void;
  onManageStages: () => void;
  clientRestrictedMode?: boolean;
  onRequestTaskEdit?: (task: Task) => void;
}

// Map task status to kanban stage
const getStageKeyFromStatus = (status: string): string => {
  switch (status) {
    case "pending":
      return "Pendente";
    case "in_progress":
      return "Em Andamento";
    case "completed":
      return "Concluída";
    default:
      return "Pendente";
  }
};

const getStatusFromStageKey = (stageName: string): string => {
  switch (stageName) {
    case "Pendente":
      return "pending";
    case "Em Andamento":
      return "in_progress";
    case "Concluída":
      return "completed";
    default:
      return "pending";
  }
};

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  projects,
  clients,
  tasks,
  timeEntries,
  kanbanStages,
  projectAccess,
  isAdminOrMaster,
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
  onUpdateTaskStatus,
  onCreateTask,
  onManageStages,
  clientRestrictedMode = false,
  onRequestTaskEdit,
}) => {
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, ProfileSummary>
  >({});
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);

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

  const isClientRestrictedMode = clientRestrictedMode && !isAdminOrMaster;
  const hasPerTaskPermissions = !!currentUserId && !isAdminOrMaster;

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

  // Default stages if none from DB
  const stages: KanbanStage[] = useMemo(() => {
    if (kanbanStages.length > 0) {
      return kanbanStages.sort((a, b) => a.order_position - b.order_position);
    }
    return [
      {
        id: "pending",
        name: "Pendente",
        order_position: 0,
        color: "bg-yellow-100",
        is_default: true,
      },
      {
        id: "in_progress",
        name: "Em Andamento",
        order_position: 1,
        color: "bg-blue-100",
        is_default: true,
      },
      {
        id: "completed",
        name: "Concluída",
        order_position: 2,
        color: "bg-green-100",
        is_default: true,
      },
    ];
  }, [kanbanStages]);

  // Get all tasks for visible projects, grouped by stage
  const tasksByStage = useMemo(() => {
    const projectIds = new Set(projects.map((p) => p.id));
    const relevantTasks = tasks.filter((t) => projectIds.has(t.project_id));

    const grouped: Record<string, Task[]> = {};
    stages.forEach((stage) => {
      grouped[stage.name] = [];
    });

    relevantTasks.forEach((task) => {
      const stageName = getStageKeyFromStatus(task.status);
      if (grouped[stageName]) {
        grouped[stageName].push(task);
      } else {
        // Put in first stage if status doesn't match
        const firstStage = stages[0]?.name || "Pendente";
        if (grouped[firstStage]) {
          grouped[firstStage].push(task);
        }
      }
    });

    return grouped;
  }, [tasks, projects, stages]);

  const getProject = (projectId: string) =>
    projects.find((p) => p.id === projectId);
  const getClient = (clientId: string) =>
    clients.find((c) => c.id === clientId);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      const newStatus = getStatusFromStageKey(stageName);
      await onUpdateTaskStatus(taskId, newStatus);
    }
  };

  const getStageColor = (color: string) => {
    const colorMap: Record<string, string> = {
      "bg-yellow-100": "bg-yellow-100 dark:bg-yellow-900/30",
      "bg-blue-100": "bg-blue-100 dark:bg-blue-900/30",
      "bg-green-100": "bg-green-100 dark:bg-green-900/30",
      "bg-muted": "bg-muted",
    };
    return colorMap[color] || "bg-muted";
  };

  return (
    <div className="space-y-4">
      {/* Kanban board */}
      <ScrollArea className="w-full h-full">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const stageTasks = tasksByStage[stage.name] || [];

            return (
              <div
                key={stage.id}
                className="w-80 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.name)}
              >
                <Card
                  className={`flex flex-col h-full ${getStageColor(stage.color)}`}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between column-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Badge
                          
                          className="text-[10px] border-transparent font-bold text-background px-1.5 bg-[#00000040]"
                        >
                          {stageTasks.length}
                        </Badge>
                        {stage.name}
                  
                      </CardTitle>
                      {/* Stage management button */}
                      {isAdminOrMaster && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onManageStages}
                            className="inline-flex justify-center items-center gap-2"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span className="hidden">Gerenciar Etapas</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1p-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                    {stageTasks.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Adicione novas tarefas
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {stageTasks.map((task) => {
                          const project = getProject(task.project_id);
                          const client = project
                            ? getClient(project.client_id)
                            : null;
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
                          const canManageShare =
                            isAdminOrMaster ||
                            (!!currentUserId &&
                              currentUserId === project?.owner_id);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <div className="mb-1.5">
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground px-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <GripVertical className="w-3 h-3 shrink-0" />
                                    <span className="truncate">
                                      {project?.name}
                                    </span>
                                    {!isClientRestrictedMode && (
                                      <>
                                        <span className="text-muted-foreground/50">
                                          •
                                        </span>
                                        <span className="truncate">
                                          {client?.company || client?.name}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div
                                    className={`flex items-center -space-x-2 shrink-0 ${canManageShare ? "cursor-pointer hover:opacity-80" : ""}`}
                                    onClick={(e) => {
                                      if (!canManageShare) return;
                                      e.stopPropagation();
                                      setShareProjectId(task.project_id);
                                    }}
                                  >
                                    {(
                                      projectMembersByProjectId[
                                        task.project_id
                                      ] || []
                                    ).map((userId) => {
                                      const profile = profilesByUserId[userId];
                                      return (
                                        <Avatar
                                          key={userId}
                                          className={`h-6 w-6 border-2 ${stage.color.replace("bg-", "border-")}`}
                                          title={`${getMemberName(userId, profile)} • ${getMemberEmail(profile)}`}
                                        >
                                          <AvatarImage
                                            src={getAvatarSrc(profile)}
                                            alt={`${getMemberName(userId, profile)} - Avatar`}
                                          />
                                          <AvatarFallback className="text-[10px] bg-background text-muted-foreground">
                                            {getAvatarInitial(userId, profile)}
                                          </AvatarFallback>
                                        </Avatar>
                                      );
                                    })}
                                    {canManageShare && (
                                      <div
                                        className={`h-6 w-6 rounded-full border-2 ${stage.color.replace("bg-", "border-")} bg-background text-muted-foreground flex items-center justify-center z-10`}
                                        title="Gerenciar compartilhamento"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <TaskCard
                                task={task}
                                taskHours={getTaskHours(task.id)}
                                timeEntries={taskTimeEntries}
                                activeTimer={activeTimer}
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
                                compact
                                showStatus={false}
                                iconOnly
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
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add task button at bottom of each column */}
                    {projects.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 p-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const firstProject = projects[0];
                          if (firstProject) {
                            onCreateTask(
                              firstProject.id,
                              getStatusFromStageKey(stage.name),
                            );
                          }
                        }}
                      >
                        <Plus className="w-3 h-3 " />
                        Adicionar tarefa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
