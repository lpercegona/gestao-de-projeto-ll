import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Settings, GripVertical } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
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
  isAdminOrMaster: boolean;
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getActiveTimer: (taskId: string) => TaskTimer | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRegisterTime: (
    taskId: string,
    entry?: { id: string; hours: number; description: string | null; date: string },
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
  isAdminOrMaster,
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
  // Default stages if none from DB
  const stages: KanbanStage[] = useMemo(() => {
    if (kanbanStages.length > 0) {
      return kanbanStages.sort((a, b) => a.order_position - b.order_position);
    }
    return [
      { id: "pending", name: "Pendente", order_position: 0, color: "bg-yellow-100", is_default: true },
      { id: "in_progress", name: "Em Andamento", order_position: 1, color: "bg-blue-100", is_default: true },
      { id: "completed", name: "Concluída", order_position: 2, color: "bg-green-100", is_default: true },
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

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId);
  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);

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
      <ScrollArea className="w-full">
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
                <Card className={`h-full ${getStageColor(stage.color)}`}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between column-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {stage.name}
                        <Badge variant="outline" className="text-xs border-foreground px-1.5">
                          {stageTasks.length}
                        </Badge>
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
                  <CardContent className="p-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                    {stageTasks.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">Adicione novas tarefas</div>
                    ) : (
                      <div className="space-y-2">
                        {stageTasks.map((task) => {
                          const project = getProject(task.project_id);
                          const client = project ? getClient(project.client_id) : null;
                          const taskTimeEntries = timeEntries.filter((te) => te.task_id === task.id);
                          const activeTimer = getActiveTimer(task.id);
                          const isPendingApprovalTask = Boolean(task.is_pending_approval);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <div className="mb-1.5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
                                  <GripVertical className="w-3 h-3" />
                                  <span className="truncate">{project?.name}</span>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="truncate">{client?.company || client?.name}</span>
                                </div>
                              </div>
                              <TaskCard
                                task={task}
                                taskHours={getTaskHours(task.id)}
                                timeEntries={taskTimeEntries}
                                activeTimer={activeTimer}
                                getCreatorName={getCreatorName}
                                onEditTask={() => !isPendingApprovalTask && onEditTask(task)}
                                onDeleteTask={() => !isPendingApprovalTask && onDeleteTask(task)}
                                onRequestEdit={!isPendingApprovalTask && clientRestrictedMode && onRequestTaskEdit ? () => onRequestTaskEdit(task) : undefined}
                                onRegisterTime={onRegisterTime}
                                onStartTimer={() => (isPendingApprovalTask ? Promise.resolve() : onStartTimer(task.id))}
                                onStopTimer={() => (isPendingApprovalTask ? Promise.resolve() : onStopTimer(task.id))}
                                onCompleteTask={() => (isPendingApprovalTask ? Promise.resolve() : onCompleteTask(task.id))}
                                compact
                                showStatus={false}
                                iconOnly
                                showTimeControls={!clientRestrictedMode}
                                allowTaskEdit={!isPendingApprovalTask && !clientRestrictedMode}
                                allowTaskDelete={!isPendingApprovalTask && !clientRestrictedMode}
                                showRegisterTimeButton={!isPendingApprovalTask && !clientRestrictedMode}
                                allowTimeEntryEdit={!isPendingApprovalTask && !clientRestrictedMode}
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
                        className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const firstProject = projects[0];
                          if (firstProject) {
                            onCreateTask(firstProject.id, getStatusFromStageKey(stage.name));
                          }
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
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
    </div>
  );
};
