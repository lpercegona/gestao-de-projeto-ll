import React, { useState, useMemo, useEffect, useCallback } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { ProjectDetailDialogContent } from "@/components/projects/ProjectDetailDialogContent";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalTimer } from "@/contexts/GlobalTimerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Settings, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProjectDetailSheetProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Collaborator {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const ProjectDetailSheet: React.FC<ProjectDetailSheetProps> = ({
  projectId,
  open,
  onOpenChange,
}) => {
  const {
    data,
    updateProject,
    deleteProject,
    getProjectHours,
    getTaskHours,
    getCreatorName,
    getClientColumns,
    getActiveTimer,
    createTask,
    updateTask,
    deleteTask,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    grantProjectAccess,
    revokeProjectAccess,
    refreshData,
    completeTask,
    stopTaskTimer,
    cancelTaskTimer,
    createColumn,
    updateColumn,
    deleteColumn,
  } = useData();
  const { user, isAdminOrMaster, isClient } = useAuth();
  const { resetTimer, startGlobalTimer, setTaskBinding } = useGlobalTimer();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_id: "",
    status: "active",
    due_date: "",
    custom_fields: {} as Record<string, string>,
  });

  // Task editing
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isTaskEditing, setIsTaskEditing] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: "", description: "", status: "pending", due_date: "" });

  // Time entry
  const [timeTaskId, setTimeTaskId] = useState("");
  const [isTimeEditing, setIsTimeEditing] = useState(false);
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [timeForm, setTimeForm] = useState({ time: "00:15", description: "", date: new Date().toISOString().slice(0, 10), entry_type: "task" as "task" | "meeting" });

  // Delete confirmations
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteTimeConfirm, setDeleteTimeConfirm] = useState(false);

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

  // Timer pause
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [pauseDescription, setPauseDescription] = useState("");

  const project = data.projects.find((p) => p.id === projectId);

  const clientColumns = useMemo(() => {
    if (!formData.client_id) return [];
    return getClientColumns(formData.client_id);
  }, [formData.client_id, getClientColumns, data.projectColumns]);

  // Reset mode when project changes
  useEffect(() => {
    if (open && project) {
      setMode("view");
    }
  }, [open, projectId]);

  // Fetch collaborators
  useEffect(() => {
    if (!isAdminOrMaster || mode !== "edit") return;
    const fetch = async () => {
      setLoadingCollaborators(true);
      try {
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "collaborator");
        if (roles && roles.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", roles.map((r) => r.user_id));
          setCollaborators(profiles || []);
        }
      } catch {}
      setLoadingCollaborators(false);
    };
    fetch();
  }, [isAdminOrMaster, mode]);

  const getCurrentUserActiveTimer = useCallback(
    (taskId: string) => {
      const timer = getActiveTimer(taskId);
      if (!timer || !user) return null;
      return timer.user_id === user.id ? timer : null;
    },
    [getActiveTimer, user]
  );

  const getStatusLabel = (s: string) =>
    s === "active" ? "Ativo" : s === "paused" ? "Pausado" : s === "archived" ? "Arquivado" : s === "completed" ? "Concluído" : s;

  const getStatusColor = (s: string) =>
    s === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : s === "paused"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      : "bg-muted text-muted-foreground";

  const handleStartEdit = () => {
    if (!project) return;
    setFormData({
      name: project.name,
      description: project.description || "",
      client_id: project.client_id,
      status: project.status,
      due_date: project.due_date || "",
      custom_fields: { ...((project.custom_fields || {}) as Record<string, string>) },
    });
    const access = data.projectAccess.filter((a) => a.project_id === project.id);
    setSelectedCollaborators(access.map((a) => a.user_id));
    setCustomFieldsOpen(false);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!project) return;
    setSubmitting(true);
    try {
      await updateProject(project.id, {
        ...formData,
        due_date: formData.due_date || null,
      });

      if (isAdminOrMaster) {
        const currentAccess = data.projectAccess.filter((a) => a.project_id === project.id);
        const currentUserIds = currentAccess.map((a) => a.user_id);
        for (const userId of selectedCollaborators) {
          if (!currentUserIds.includes(userId)) await grantProjectAccess(userId, project.id, true);
        }
        for (const userId of currentUserIds) {
          if (!selectedCollaborators.includes(userId)) await revokeProjectAccess(userId, project.id);
        }
        await refreshData();
      }

      toast.success("Projeto atualizado!");
      setMode("view");
    } catch {
      toast.error("Erro ao salvar projeto");
    }
    setSubmitting(false);
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    await deleteProject(project.id);
    toast.success("Projeto excluído!");
    setDeleteProjectConfirm(false);
    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (!project) return;
    await updateProject(project.id, { status: "archived" });
    toast.success("Projeto arquivado!");
    onOpenChange(false);
  };

  // Task handlers
  const handleOpenTaskEdit = (task: any) => {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      description: task.description || "",
      status: task.status,
      due_date: task.due_date || "",
    });
    setIsTaskEditing(true);
  };

  const handleCreateTask = () => {
    if (!project) return;
    setEditingTask(null);
    setTaskForm({ name: "", description: "", status: "pending", due_date: "" });
    setIsTaskEditing(true);
  };

  const handleSaveTask = async () => {
    if (!project) return;
    setSubmitting(true);
    const taskData = { ...taskForm, due_date: taskForm.due_date || null };
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
      toast.success("Tarefa atualizada!");
    } else {
      await createTask({ ...taskData, project_id: project.id });
      toast.success("Tarefa criada!");
    }
    setSubmitting(false);
    setIsTaskEditing(false);
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    await deleteTask(deletingTaskId);
    toast.success("Tarefa excluída!");
    setDeletingTaskId(null);
  };

  // Time handlers
  const parseTimeToHours = (t: string) => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
  const formatHoursToTime = (d: number) => { const m = Math.round(d * 60); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

  const handleOpenTimeEntry = (taskId: string, entry?: any) => {
    setTimeTaskId(taskId);
    if (entry) {
      setEditingTimeEntryId(entry.id);
      setTimeForm({ time: formatHoursToTime(entry.hours), description: entry.description || "", date: entry.date, entry_type: entry.entry_type || "task" });
    } else {
      setEditingTimeEntryId(null);
      setTimeForm({ time: "00:15", description: "", date: new Date().toISOString().slice(0, 10), entry_type: "task" });
    }
    setIsTimeEditing(true);
  };

  const handleSaveTime = async () => {
    const hours = parseTimeToHours(timeForm.time);
    if (hours <= 0) { toast.error("Insira um tempo válido."); return; }
    setSubmitting(true);
    if (editingTimeEntryId) {
      await updateTimeEntry(editingTimeEntryId, { hours, description: timeForm.description, date: timeForm.date, entry_type: timeForm.entry_type });
      toast.success("Registro atualizado!");
    } else {
      await createTimeEntry({ task_id: timeTaskId, hours, description: timeForm.description, date: timeForm.date, entry_type: timeForm.entry_type });
      toast.success("Horas registradas!");
    }
    setSubmitting(false);
    setIsTimeEditing(false);
    setEditingTimeEntryId(null);
  };

  const handleDeleteTimeEntry = async () => {
    if (!editingTimeEntryId) return;
    await deleteTimeEntry(editingTimeEntryId);
    toast.success("Registro excluído!");
    setDeleteTimeConfirm(false);
    setIsTimeEditing(false);
    setEditingTimeEntryId(null);
  };

  // Timer handlers
  const handleStartTimer = async (taskId: string) => {
    const task = data.tasks.find((t) => t.id === taskId);
    const proj = task ? data.projects.find((p) => p.id === task.project_id) : null;
    const client = proj ? data.clients.find((c) => c.id === proj.client_id) : null;
    if (task && proj) {
      setTaskBinding({
        taskId: task.id,
        snapshot: { taskTitle: task.name, taskDescription: task.description, projectName: proj.name, clientName: client?.company || client?.name || "Cliente" },
      });
    }
    await startGlobalTimer();
    toast.success("Timer iniciado!");
  };

  const handleStopTimer = async (taskId: string) => {
    await stopTaskTimer(taskId);
    resetTimer();
    toast.success("Timer parado e horas registradas!");
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
    toast.success("Tarefa concluída!");
  };

  const handleClientChange = (newClientId: string) => {
    const cols = getClientColumns(newClientId);
    const cf: Record<string, string> = {};
    cols.forEach((c) => { cf[c.id] = formData.custom_fields[c.id] || c.options?.[0] || ""; });
    setFormData({ ...formData, client_id: newClientId, custom_fields: cf });
  };

  if (!project) return null;

  const projectData = { ...project, custom_fields: (project.custom_fields || {}) as Record<string, string> };

  // Determine which FormSheet to show
  if (isTaskEditing) {
    return (
      <FormSheet
        open={open}
        onOpenChange={(o) => { if (!o) { setIsTaskEditing(false); } }}
        title={editingTask ? "Editar Tarefa" : "Nova Tarefa"}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsTaskEditing(false)} disabled={submitting}>Voltar</Button>
            <Button onClick={handleSaveTask} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingTask ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nome da Tarefa</Label><Input value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={taskForm.description} onChange={(v) => setTaskForm({ ...taskForm, description: v })} minHeight="80px" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Status</Label><Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="in_progress">Em Andamento</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
          </div>
        </div>
      </FormSheet>
    );
  }

  if (isTimeEditing) {
    return (
      <FormSheet
        open={open}
        onOpenChange={(o) => { if (!o) { setIsTimeEditing(false); setEditingTimeEntryId(null); } }}
        title={editingTimeEntryId ? "Editar Registro" : "Registrar Horas"}
        footer={
          <>
            {editingTimeEntryId && <Button variant="destructive" onClick={() => setDeleteTimeConfirm(true)}>Excluir</Button>}
            <Button variant="outline" onClick={() => { setIsTimeEditing(false); setEditingTimeEntryId(null); }}>Voltar</Button>
            <Button onClick={handleSaveTime} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingTimeEntryId ? "Salvar" : "Registrar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2"><Label>Tempo (HH:mm)</Label><Input type="time" value={timeForm.time} onChange={(e) => setTimeForm({ ...timeForm, time: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Descrição (opcional)</Label><Input value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} /></div>
        </div>
        <AlertDialog open={deleteTimeConfirm} onOpenChange={setDeleteTimeConfirm}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTimeEntry}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </FormSheet>
    );
  }

  if (mode === "edit") {
    return (
      <>
        <FormSheet
          open={open}
          onOpenChange={(o) => { if (!o) setMode("view"); }}
          title="Editar Projeto"
          footer={
            <>
              <Button variant="outline" onClick={() => setMode("view")} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome do Projeto</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><WysiwygEditor value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} minHeight="80px" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{data.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="archived">Arquivo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Prazo (opcional)</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>

            {isAdminOrMaster && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Users className="w-4 h-4" />Colaboradores</Label>
                {loadingCollaborators ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>
                ) : collaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
                ) : (
                  <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                    {collaborators.map((c) => (
                      <div key={c.user_id} className="flex items-center space-x-2">
                        <Checkbox id={`collab-${c.user_id}`} checked={selectedCollaborators.includes(c.user_id)} onCheckedChange={() => setSelectedCollaborators((prev) => prev.includes(c.user_id) ? prev.filter((id) => id !== c.user_id) : [...prev, c.user_id])} />
                        <label htmlFor={`collab-${c.user_id}`} className="text-sm font-medium leading-none cursor-pointer">{c.full_name || c.email || "Sem nome"}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom fields for collaborators (read-only view) and admins (editable) */}
            {clientColumns.length > 0 && (
              <div className="space-y-4">
                {clientColumns.map((column) => (
                  <div key={column.id} className="space-y-2">
                    <Label>{column.name}</Label>
                    {column.type === "select" && column.options ? (
                      <Select value={formData.custom_fields[column.id] || ""} onValueChange={(v) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: v } })}>
                        <SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger>
                        <SelectContent>{column.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={formData.custom_fields[column.id] || ""} onChange={(e) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: e.target.value } })} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormSheet>
      </>
    );
  }

  // View mode
  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Detalhes do Projeto"
      >
        <ProjectDetailDialogContent
          project={projectData}
          clients={data.clients as any[]}
          tasks={data.tasks as any[]}
          timeEntries={data.timeEntries as any[]}
          projectColumns={data.projectColumns as any[]}
          kanbanStages={data.kanbanStages as any[]}
          taskTimers={data.taskTimers as any[]}
          projectAccess={data.projectAccess as any[]}
          profilesByUserId={{}}
          projectMembers={data.projectAccess.filter((a) => a.project_id === project.id).map((a) => a.user_id)}
          isAdminOrMaster={isAdminOrMaster}
          isClientMode={!!isClient}
          hasPerTaskPermissions={false}
          currentUserId={user?.id}
          getProjectHours={getProjectHours}
          getTaskHours={getTaskHours}
          getCreatorName={getCreatorName}
          getClientColumns={getClientColumns}
          getActiveTimer={getCurrentUserActiveTimer}
          getStatusLabel={getStatusLabel}
          getStatusColor={getStatusColor}
          onEditProject={handleStartEdit}
          onDeleteProject={() => setDeleteProjectConfirm(true)}
          onArchiveProject={handleArchive}
          onCreateTask={handleCreateTask}
          onEditTask={handleOpenTaskEdit}
          onDeleteTask={(task) => setDeletingTaskId(task.id)}
          onRegisterTime={handleOpenTimeEntry}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onCompleteTask={handleCompleteTask}
          onClose={() => onOpenChange(false)}
        />
      </FormSheet>

      <AlertDialog open={deleteProjectConfirm} onOpenChange={setDeleteProjectConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir projeto?</AlertDialogTitle><AlertDialogDescription>Todas as tarefas e registros de horas serão removidos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProject}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingTaskId} onOpenChange={(o) => !o && setDeletingTaskId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTask}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
};
