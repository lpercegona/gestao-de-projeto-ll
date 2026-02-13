import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectRequestForm } from "@/components/client/ProjectRequestForm";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { toast } from "sonner";
import { FileText, ListTodo, Loader2 } from "lucide-react";

interface CreatedProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface QuickRequestCardProps {
  pendingCount?: number;
  onRequestCreated?: (request: CreatedProjectRequest) => void;
}

export const QuickRequestCard: React.FC<QuickRequestCardProps> = ({ pendingCount = 0, onRequestCreated }) => {
  const { user } = useAuth();
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [taskForm, setTaskForm] = useState({ name: "", description: "", due_date: "" });

  const getWysiwygPlainText = (content: string) =>
    content
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const loadClientProjects = async () => {
    if (!user) return null;

    const [{ data: clientData }, { data: clientUserData, error: clientUserError }] = await Promise.all([
      supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const resolvedClientId = clientData?.id || clientUserData?.client_id;

    if (clientUserError || !resolvedClientId) {
      throw new Error("Cliente não encontrado");
    }

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("client_id", resolvedClientId)
      .order("name", { ascending: true });

    if (projectsError) throw projectsError;

    const parsedProjects = (projectsData || []).map((project) => ({
      id: project.id,
      name: project.name,
    }));

    setProjectOptions(parsedProjects);
    setSelectedProjectId((prev) => prev || parsedProjects[0]?.id || "");

    return resolvedClientId;
  };

  const handleSubmitRequest = async (title: string, briefing: string, customFields: Record<string, string>, desiredDeadline?: string) => {
    if (!user) return;

    try {
      const [{ data: clientData }, { data: clientUserData, error: clientUserError }] = await Promise.all([
        supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("client_users")
          .select("client_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const resolvedClientId = clientData?.id || clientUserData?.client_id;

      if (clientUserError || !resolvedClientId) {
        throw new Error("Cliente não encontrado");
      }

      const { data: createdRequest, error } = await supabase
        .from("project_requests")
        .insert({
          client_id: resolvedClientId,
          title,
          briefing,
          desired_deadline: desiredDeadline || null,
          created_by: user.id,
          status: "pending",
        })
        .select("id, client_id, title, briefing, status, admin_notes, created_at")
        .single();

      if (error) throw error;

      toast.success("Solicitação enviada com sucesso!");
      onRequestCreated?.(createdRequest);
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Erro ao enviar solicitação");
    }
  };

  const handleOpenTaskDialog = async () => {
    try {
      await loadClientProjects();
      setTaskDialogOpen(true);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Erro ao carregar projetos");
    }
  };

  const handleSubmitTaskRequest = async () => {
    if (!user || !selectedProjectId || !taskForm.name.trim()) {
      toast.error("Selecione um projeto e preencha o nome da tarefa.");
      return;
    }

    setTaskSubmitting(true);

    try {
      const clientId = await loadClientProjects();
      if (!clientId) throw new Error("Cliente não encontrado");

      const { error } = await supabase.from("edit_requests").insert([
        {
          entity_type: "project",
          entity_id: selectedProjectId,
          client_id: clientId,
          requested_by: user.id,
          original_data: {},
          proposed_data: {
            request_type: "new_task",
            task_name: taskForm.name.trim(),
            task_description: getWysiwygPlainText(taskForm.description) ? taskForm.description : null,
            task_due_date: taskForm.due_date || null,
          },
        },
      ]);

      if (error) throw error;

      toast.success("Solicitação de nova tarefa enviada para aprovação!");
      setTaskDialogOpen(false);
      setTaskForm({ name: "", description: "", due_date: "" });
      setSelectedProjectId("");
    } catch (error) {
      console.error("Error creating task request:", error);
      toast.error("Erro ao solicitar nova tarefa");
    } finally {
      setTaskSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-lg">Solicitação Rápida</h3>
                <p className="text-sm text-muted-foreground">Solicite um novo projeto ou serviço</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-2">
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="grid gap-2 mt-3 sm:grid-cols-2">
            <Button onClick={() => setIsFormOpen(true)} className="gap-2 w-full">
              <FileText className="w-4 h-4" />
              Novo Projeto
            </Button>
            <Button onClick={handleOpenTaskDialog} className="gap-2 w-full" variant="outline">
              <ListTodo className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Solicitar Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="task-request-project">Projeto</Label>
              <select
                id="task-request-project"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={taskSubmitting || projectOptions.length === 0}
              >
                {projectOptions.length === 0 ? (
                  <option value="">Nenhum projeto disponível</option>
                ) : (
                  projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-request-name">Nome da tarefa</Label>
              <Input
                id="task-request-name"
                value={taskForm.name}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ex: Criar arte para campanha"
                disabled={taskSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-request-description">Descrição</Label>
              <WysiwygEditor
                value={taskForm.description}
                onChange={(value) => setTaskForm((prev) => ({ ...prev, description: value }))}
                placeholder="Descreva o que precisa ser feito"
                disabled={taskSubmitting}
                minHeight="120px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-request-due-date">Prazo (opcional)</Label>
              <Input
                id="task-request-due-date"
                type="date"
                value={taskForm.due_date}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={taskSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} disabled={taskSubmitting}>Cancelar</Button>
            <Button
              onClick={handleSubmitTaskRequest}
              disabled={taskSubmitting || projectOptions.length === 0 || !selectedProjectId || !taskForm.name.trim()}
            >
              {taskSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectRequestForm open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleSubmitRequest} />
    </>
  );
};
