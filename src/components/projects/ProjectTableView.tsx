import React, { useCallback, useEffect, useMemo, useState } from "react";
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

// Convert tailwind bg class to a saturated hex color for checkbox styling
const tailwindColorToHex = (color: string | null): string | null => {
  if (!color) return null;
  // Extract the color name and shade from "bg-{color}-{shade}"
  const match = color.match(/^bg-(\w+)-(\d+)$/);
  if (!match) {
    if (color === 'bg-muted') return '#6b7280';
    return null;
  }
  const [, name, shade] = match;
  // Map to saturated versions for checkbox visibility (use 500-level for light shades)
  const baseColors: Record<string, Record<string, string>> = {
    yellow:  { '100': '#eab308', '200': '#eab308', '300': '#eab308', '400': '#facc15', '500': '#eab308', '600': '#ca8a04', '700': '#a16207' },
    orange:  { '100': '#f97316', '200': '#f97316', '300': '#f97316', '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c' },
    green:   { '100': '#22c55e', '200': '#22c55e', '300': '#22c55e', '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d' },
    blue:    { '100': '#3b82f6', '200': '#3b82f6', '300': '#3b82f6', '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8' },
    red:     { '100': '#ef4444', '200': '#ef4444', '300': '#ef4444', '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c' },
    purple:  { '100': '#a855f7', '200': '#a855f7', '300': '#a855f7', '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce' },
    pink:    { '100': '#ec4899', '200': '#ec4899', '300': '#ec4899', '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d' },
    indigo:  { '100': '#6366f1', '200': '#6366f1', '300': '#6366f1', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca' },
    teal:    { '100': '#14b8a6', '200': '#14b8a6', '300': '#14b8a6', '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e' },
    cyan:    { '100': '#06b6d4', '200': '#06b6d4', '300': '#06b6d4', '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490' },
    emerald: { '100': '#10b981', '200': '#10b981', '300': '#10b981', '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857' },
    lime:    { '100': '#84cc16', '200': '#84cc16', '300': '#84cc16', '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f' },
    amber:   { '100': '#f59e0b', '200': '#f59e0b', '300': '#f59e0b', '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309' },
    rose:    { '100': '#f43f5e', '200': '#f43f5e', '300': '#f43f5e', '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c' },
    slate:   { '100': '#64748b', '200': '#64748b', '300': '#64748b', '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155' },
    gray:    { '100': '#6b7280', '200': '#6b7280', '300': '#6b7280', '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151' },
  };
  return baseColors[name]?.[shade] || null;
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: '#eab308',
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

  // Local state for instant UI updates
  const [localProjectStatuses, setLocalProjectStatuses] = useState<Record<string, string>>({});
  const [localTaskStatuses, setLocalTaskStatuses] = useState<Record<string, string>>({});

  // Sync local state when props change
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

  const handleProjectStatusChange = useCallback(async (project: Project) => {
    if (project.is_request) return;
    const currentStatus = localProjectStatuses[project.id] || project.status;
    const next = getNextProjectStatus(currentStatus);
    setLocalProjectStatuses(prev => ({ ...prev, [project.id]: next }));
    await supabase.from('projects').update({ status: next }).eq('id', project.id);
  }, [localProjectStatuses]);

  const handleTaskStatusChange = useCallback(async (task: Task) => {
    if (task.is_pending_approval) return;
    const currentStatus = localTaskStatuses[task.id] || task.status;
    const next = getNextTaskStatus(currentStatus);
    setLocalTaskStatuses(prev => ({ ...prev, [task.id]: next }));
    await supabase.from('tasks').update({ status: next }).eq('id', task.id);
  }, [localTaskStatuses, sortedStages]);

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

  const getTaskStageColor = (status: string): string | null => {
    const stage = sortedStages.find(s => s.name === status || s.id === status);
    return stage ? tailwindColorToHex(stage.color) : null;
  };

  const getStatusLabel = (s: string) =>
    s === "active" ? "Ativo" : s === "paused" ? "Pausado" : s === "archived" ? "Arquivado" : s === "completed" ? "Concluído" : s;

  const getTaskStatusLabel = (status: string): string => {
    const stage = sortedStages.find(s => s.name === status || s.id === status);
    if (stage) return stage.name;
    if (status === 'pending') return 'Pendente';
    if (status === 'in_progress') return 'Em andamento';
    if (status === 'completed') return 'Concluída';
    return status;
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
                    );
                  })
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
              isAdminOrMaster={isAdminOrMaster}
              isClientMode={isClientMode}
              currentUserId={currentUserId}
              getProjectHours={getProjectHours}
              getTaskHours={getTaskHours}
              getCreatorName={getCreatorName}
              getClientColumns={getClientColumns}
              getTaskStatusLabel={getTaskStatusLabel}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              onArchiveProject={onArchiveProject}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onRequestTaskEdit={onRequestTaskEdit}
              onClose={() => setDetailDialog(null)}
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
  isAdminOrMaster: boolean;
  isClientMode: boolean;
  currentUserId?: string;
  getProjectHours: (projectId: string) => number;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getClientColumns: (clientId: string) => ProjectColumn[];
  getTaskStatusLabel: (status: string) => string;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onRequestTaskEdit?: (task: Task) => void;
  onClose: () => void;
}

const DetailContent: React.FC<DetailContentProps> = ({
  type,
  data,
  clients,
  tasks,
  timeEntries,
  projectColumns,
  kanbanStages,
  isAdminOrMaster,
  isClientMode,
  currentUserId,
  getProjectHours,
  getTaskHours,
  getCreatorName,
  getClientColumns,
  getTaskStatusLabel,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onEditTask,
  onDeleteTask,
  onRequestTaskEdit,
  onClose,
}) => {
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

  if (type === 'project') {
    const project = data as Project;
    const client = clients.find((c) => c.id === project.client_id);
    const hours = getProjectHours(project.id);
    const projectTasks = tasks.filter((t) => t.project_id === project.id);
    const columns = client ? getClientColumns(client.id) : [];

    return (
      <div className="space-y-4">
        {/* Action buttons */}
        {!project.is_request && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => { onClose(); onEditProject(project); }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {isClientMode ? 'Solicitar Edição' : 'Editar'}
            </Button>
            {isAdminOrMaster && (
              <>
                <Button size="sm" variant="outline" onClick={() => { onClose(); onArchiveProject(project); }}>
                  <Archive className="w-3.5 h-3.5 mr-1.5" />
                  Arquivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { onClose(); onDeleteProject(project); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        )}

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
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
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
                  <Badge variant="outline" className="text-[10px]">{getTaskStatusLabel(t.status)}</Badge>
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
  const isOwnTask = task.created_by === currentUserId;

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      {!task.is_pending_approval && (
        <div className="flex gap-2 flex-wrap">
          {isClientMode && !isOwnTask ? (
            <Button size="sm" variant="outline" onClick={() => { onClose(); onRequestTaskEdit?.(task); }}>
              <FilePenLine className="w-3.5 h-3.5 mr-1.5" />
              Solicitar Alteração
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => { onClose(); onEditTask(task); }}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Editar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { onClose(); onDeleteTask(task); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Excluir
              </Button>
            </>
          )}
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">Nome</p>
        <p className="font-medium">{task.name}</p>
      </div>
      <div className="flex gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant="outline" className="text-xs">{getTaskStatusLabel(task.status)}</Badge>
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
