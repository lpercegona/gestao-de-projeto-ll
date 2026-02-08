import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Pencil, Trash2, Plus, Users, MoreVertical, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/formatHours";
import { WysiwygContent } from "@/components/ui/wysiwyg-editor";

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
  is_request?: boolean;
  request_status?: string;
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
  task_id: string;
  started_at: string;
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
    entry?: { id: string; hours: number; description: string | null; date: string },
  ) => void;
  onStartTimer: (taskId: string) => Promise<void>;
  onStopTimer: (taskId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
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
}) => {
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const getStatusLabel = (s: string) => (s === "active" ? "Ativo" : s === "paused" ? "Pausado" : s === "archived" ? "Arquivo" : "Concluído");
  const getStatusColor = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : s === "paused"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : s === "archived"
          ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          : "bg-muted text-muted-foreground";

  const getRequestStatusLabel = (status?: string) => {
    if (status === 'pending') return 'Pendente';
    if (status === 'analyzing' || status === 'in_review') return 'Em análise';
    if (status === 'approved') return 'Aprovada';
    if (status === 'converted') return 'Convertida';
    if (status === 'rejected') return 'Rejeitada';
    return status || 'Solicitação';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((project) => {
        const client = clients.find((c) => c.id === project.client_id);
        const projectTasks = tasks.filter((t) => t.project_id === project.id);
        const hours = getProjectHours(project.id);
        const projectCollaborators = projectAccess.filter((a) => a.project_id === project.id);
        const projectColumns = client ? getClientColumns(client.id) : [];
        const isOpen = openProjects[project.id] ?? false;

        return (
          <Card key={project.id} className="relative overflow-hidden">
            {/* Project Header */}
            <Collapsible open={isOpen} onOpenChange={() => toggleProject(project.id)}>
              <div className="relative">
                {(allowProjectEditOnly || (isAdminOrMaster && !project.is_request)) && (
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(project);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          {allowProjectEditOnly ? 'Solicitar Edição' : 'Editar'}
                        </DropdownMenuItem>
                        {isAdminOrMaster && !allowProjectEditOnly && !project.is_request && (
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <CollapsibleTrigger className="w-full text-left">
                  <CardContent className="p-4 sm:p-6 pr-24 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <ChevronDown
                        className={`w-5 h-5 mt-0.5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-foreground">{project.name}</h3>
                          {project.is_request && <Badge variant="secondary">Solicitação</Badge>}
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                            {project.is_request ? getRequestStatusLabel(project.request_status) : getStatusLabel(project.status)}
                          </span>
                          {isAdminOrMaster && projectCollaborators.length > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {projectCollaborators.length}
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <WysiwygContent
                            content={project.description}
                            className="text-sm text-muted-foreground mb-2 line-clamp-1"
                          />
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Cliente: </span>
                            <span className="font-medium text-foreground">{client?.company || client?.name}</span>
                          </div>
                          {!project.is_request && (<>
                            <div>
                              <span className="text-muted-foreground">Tarefas: </span>
                              <span className="font-medium text-foreground">{projectTasks.length}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Horas: </span>
                              <span className="font-medium text-foreground">{formatHours(hours)}</span>
                            </div>
                          </>)}
                          {projectColumns.map(
                            (col) =>
                              project.custom_fields[col.id] && (
                                <div key={col.id}>
                                  <span className="text-muted-foreground">{col.name}: </span>
                                  <span className="font-medium text-foreground">{project.custom_fields[col.id]}</span>
                                </div>
                              ),
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t px-4 sm:px-6 py-4 bg-muted/20">
                  {project.is_request ? (
                    <p className="text-sm text-muted-foreground">Esta solicitação ainda não foi convertida em projeto.</p>
                  ) : (<>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-foreground">Tarefas ({projectTasks.length})</h4>
                    <Button size="sm" variant="outline" onClick={() => onCreateTask(project.id)} className="h-8">
                      <Plus className="w-4 h-4 mr-1" />
                      Nova Tarefa
                    </Button>
                  </div>

                  {projectTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa neste projeto.</p>
                  ) : (
                    <div className="space-y-3">
                      {projectTasks.map((task) => {
                        const taskTimeEntries = timeEntries.filter((te) => te.task_id === task.id);
                        const activeTimer = getActiveTimer(task.id);

                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            taskHours={getTaskHours(task.id)}
                            timeEntries={taskTimeEntries}
                            activeTimer={activeTimer}
                            kanbanStages={kanbanStages}
                            getCreatorName={getCreatorName}
                            onEditTask={() => onEditTask(task)}
                            onDeleteTask={() => onDeleteTask(task)}
                            onRegisterTime={onRegisterTime}
                            onStartTimer={() => onStartTimer(task.id)}
                            onStopTimer={() => onStopTimer(task.id)}
                            onCompleteTask={() => onCompleteTask(task.id)}
                            showStatus={true}
                          />
                        );
                      })}
                    </div>
                  )}
                  </>)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};
