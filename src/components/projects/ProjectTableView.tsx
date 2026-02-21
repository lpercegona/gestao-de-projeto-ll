import React, { useEffect, useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, MoreVertical, Pencil, Trash2, Archive, FilePenLine } from "lucide-react";
import { ExpandableDescription } from "./ExpandableDescription";
import { formatHours } from "@/lib/formatHours";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_by: string | null;
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
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getClientColumns: (clientId: string) => ProjectColumn[];
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRequestTaskEdit?: (task: Task) => void;
  onEditRequest?: (project: Project) => void;
  onDeleteRequest?: (project: Project) => void;
}

const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'];

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
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getClientColumns,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onEditTask,
  onDeleteTask,
  onRequestTaskEdit,
  onEditRequest,
  onDeleteRequest,
}) => {
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [detailDialog, setDetailDialog] = useState<{ type: 'project' | 'task'; data: Project | Task } | null>(null);

  const sortedStages = useMemo(() => {
    return [...kanbanStages].sort((a, b) => a.order_position - b.order_position);
  }, [kanbanStages]);

  const isClientMode = allowProjectEditOnly && !isAdminOrMaster;
  const isOwnTask = (task: Task) => task.created_by === currentUserId;

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
    const idx = sortedStages.findIndex((s) => s.name === current || s.id === current);
    if (idx === -1) return sortedStages[0]?.name || 'pending';
    const next = (idx + 1) % sortedStages.length;
    return sortedStages[next].name;
  };

  const handleProjectStatusChange = async (project: Project) => {
    if (project.is_request) return;
    const next = getNextProjectStatus(project.status);
    await supabase.from('projects').update({ status: next }).eq('id', project.id);
  };

  const handleTaskStatusChange = async (task: Task) => {
    if (task.is_pending_approval) return;
    const next = getNextTaskStatus(task.status);
    await supabase.from('tasks').update({ status: next }).eq('id', task.id);
  };

  const getProjectCheckState = (status: string): boolean | 'indeterminate' => {
    if (status === 'completed') return true;
    if (status === 'active' || status === 'paused') return 'indeterminate';
    return false;
  };

  const getTaskCheckState = (status: string): boolean | 'indeterminate' => {
    const lastStage = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1] : null;
    if (status === 'completed' || (lastStage && (status === lastStage.name || status === lastStage.id))) return true;
    if (status === 'pending' || (sortedStages.length > 0 && (status === sortedStages[0]?.name || status === sortedStages[0]?.id))) return false;
    return 'indeterminate';
  };

  const getStatusLabel = (s: string) =>
    s === "active" ? "Ativo" : s === "paused" ? "Pausado" : s === "archived" ? "Arquivado" : s === "completed" ? "Concluído" : s;

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

  return (
    <>
      <div className="rounded-lg border bg-card">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.project_id === project.id);
          const isOpen = openProjects[project.id] ?? false;

          return (
            <Collapsible
              key={project.id}
              open={isOpen}
              onOpenChange={() => setOpenProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
            >
              <div className="flex items-center gap-2 sm:gap-3 py-2 px-3 border-b hover:bg-muted/30 transition-colors">
                <Checkbox
                  checked={getProjectCheckState(project.status) === true}
                  data-state={getProjectCheckState(project.status) === 'indeterminate' ? 'indeterminate' : undefined}
                  className={getProjectCheckState(project.status) === 'indeterminate' ? 'data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:text-primary-foreground' : ''}
                  onCheckedChange={() => handleProjectStatusChange(project)}
                  disabled={project.is_request}
                />
                <span
                  onClick={() => setDetailDialog({ type: 'project', data: project })}
                  className="cursor-pointer flex-1 truncate font-medium text-sm sm:text-base"
                >
                  {project.name}
                </span>
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
                        <DropdownMenuItem onClick={() => isClientMode ? onEditRequest?.(project) : onEditProject(project)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          {isClientMode ? 'Solicitar Edição' : 'Editar'}
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
                  projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 sm:gap-3 py-1.5 px-3 pl-10 border-b bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={getTaskCheckState(task.status) === true}
                        data-state={getTaskCheckState(task.status) === 'indeterminate' ? 'indeterminate' : undefined}
                        className={getTaskCheckState(task.status) === 'indeterminate' ? 'data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:text-primary-foreground' : ''}
                        onCheckedChange={() => handleTaskStatusChange(task)}
                        disabled={task.is_pending_approval}
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
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailDialog?.type === 'project' ? 'Detalhes do Projeto' : 'Detalhes da Tarefa'}
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <DetailContent
              type={detailDialog.type}
              data={detailDialog.data}
              clients={clients}
              tasks={tasks}
              timeEntries={timeEntries}
              projectColumns={projectColumns}
              kanbanStages={kanbanStages}
              getProjectHours={getProjectHours}
              getTaskHours={getTaskHours}
              getCreatorName={getCreatorName}
              getClientColumns={getClientColumns}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface DetailContentProps {
  type: 'project' | 'task';
  data: Project | Task;
  clients: Client[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  projectColumns: ProjectColumn[];
  kanbanStages: KanbanStage[];
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getClientColumns: (clientId: string) => ProjectColumn[];
}

const DetailContent: React.FC<DetailContentProps> = ({
  type,
  data,
  clients,
  tasks,
  timeEntries,
  projectColumns,
  kanbanStages,
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getClientColumns,
}) => {
  if (type === 'project') {
    const project = data as Project;
    const client = clients.find((c) => c.id === project.client_id);
    const hours = getProjectHours(project.id);
    const projectTasks = tasks.filter((t) => t.project_id === project.id);
    const columns = client ? getClientColumns(client.id) : [];

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium">{project.name}</p>
        </div>
        {client && (
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="text-sm">{client.company || client.name}</p>
          </div>
        )}
        <div className="flex gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-sm">{project.status === 'active' ? 'Ativo' : project.status === 'paused' ? 'Pausado' : project.status === 'completed' ? 'Concluído' : project.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Horas</p>
            <p className="text-sm">{formatHours(hours)}</p>
          </div>
          {project.due_date && (
            <div>
              <p className="text-sm text-muted-foreground">Prazo</p>
              <p className="text-sm">{format(new Date(project.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
          )}
        </div>
        {project.description && (
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <ExpandableDescription content={project.description} className="text-sm" />
          </div>
        )}
        {columns.length > 0 && project.custom_fields && Object.keys(project.custom_fields).length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Campos personalizados</p>
            <div className="space-y-1">
              {columns.map((col) => {
                const value = project.custom_fields[col.id];
                if (!value) return null;
                return (
                  <div key={col.id} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">{col.name}:</span>
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {projectTasks.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Tarefas ({projectTasks.length})</p>
            <div className="space-y-1">
              {projectTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={t.status === 'completed' ? 'line-through text-muted-foreground' : ''}>{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Task detail
  const task = data as Task;
  const hours = getTaskHours(task.id);
  const taskEntries = timeEntries.filter((e) => e.task_id === task.id);
  const creatorName = getCreatorName(task.created_by);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Nome</p>
        <p className="font-medium">{task.name}</p>
      </div>
      <div className="flex gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-sm">{task.status}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Horas</p>
          <p className="text-sm">{formatHours(hours)}</p>
        </div>
        {task.due_date && (
          <div>
            <p className="text-sm text-muted-foreground">Prazo</p>
            <p className="text-sm">{format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Responsável</p>
        <p className="text-sm">{creatorName}</p>
      </div>
      {task.description && (
        <div>
          <p className="text-sm text-muted-foreground">Descrição</p>
          <ExpandableDescription content={task.description} className="text-sm" />
        </div>
      )}
      {taskEntries.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Registros de horas ({taskEntries.length})</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {taskEntries.map((entry) => (
              <div key={entry.id} className="flex gap-2 text-sm border-b pb-1">
                <span className="text-muted-foreground">{entry.date}</span>
                <span className="font-medium">{formatHours(entry.hours)}</span>
                {entry.description && <span className="truncate text-muted-foreground">- {entry.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
