import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Paperclip, X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoOras from "@/assets/logo-oras.svg";
import { ALLOWED_FILE_ACCEPT, ALLOWED_FILE_EXT_LABEL, AttachmentThumbnail, isAllowedAttachment } from "@/lib/fileThumbnail";

interface PublicAttachment {
  name: string;
  contentBase64: string;
  mime: string;
  previewUrl: string;
}

interface RequestedTask {
  title: string;
  description: string;
  dueDate: string;
}

export const PublicProjectRequest: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [checking, setChecking] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [step, setStep] = useState<"email" | "form" | "done">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [deadline, setDeadline] = useState("");
  const [publicAttachments, setPublicAttachments] = useState<PublicAttachment[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [requestedTasks, setRequestedTasks] = useState<RequestedTask[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [taskForm, setTaskForm] = useState<RequestedTask>({ title: "", description: "", dueDate: "" });

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 10;
  const minDate = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  const formatDueDate = (iso: string) => {
    if (!iso) return "Não informado";
    try {
      return format(new Date(iso + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const resetForm = () => {
    setTitle("");
    setBriefing("");
    setDeadline("");
    setRequestedTasks([]);
    setExpandedTasks([]);
    setPublicAttachments([]);
    setStep("form");
  };

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;
    setRequestedTasks((prev) => [...prev, { ...taskForm, title: taskForm.title.trim() }]);
    setExpandedTasks((prev) => [...prev, requestedTasks.length]);
    setTaskForm({ title: "", description: "", dueDate: "" });
    setTaskModalOpen(false);
  };

  const handleRemoveTask = (index: number) => {
    setRequestedTasks((prev) => prev.filter((_, i) => i !== index));
    setExpandedTasks((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
  };

  const toggleTaskExpansion = (index: number) => {
    setExpandedTasks((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (publicAttachments.length + files.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} imagens.`);
      return;
    }
    const next: PublicAttachment[] = [...publicAttachments];
    for (const file of files) {
      if (!isAllowedAttachment(file)) { toast.error(`"${file.name}" não é um tipo de arquivo suportado.`); continue; }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`"${file.name}" excede ${MAX_SIZE_MB}MB.`); continue; }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ name: file.name, contentBase64, mime: file.type || 'application/octet-stream', previewUrl: URL.createObjectURL(file) });
    }
    setPublicAttachments(next);
  };

  const removeAttachment = (idx: number) => {
    setPublicAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const check = async () => {
      if (!token) { setChecking(false); return; }
      const { data, error } = await supabase.rpc("get_public_request_link", { p_token: token });
      setLinkValid(!error && !!data && data.length > 0);
      setChecking(false);
    };
    check();
  }, [token]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setValidating(true);
    const { data, error } = await supabase.rpc("validate_request_email", { p_token: token, p_email: email });
    setValidating(false);
    if (error || !data || data.length === 0) {
      toast.error("E-mail não vinculado a nenhum cliente cadastrado.");
      return;
    }
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim() || !briefing.replace(/<[^>]*>/g, "").trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-public-project-request", {
      body: {
        token,
        email,
        name,
        title: title.trim(),
        briefing,
        desired_deadline: deadline || null,
        requested_tasks: requestedTasks.length > 0 ? requestedTasks : undefined,
        attachments: publicAttachments.map((a) => ({ name: a.name, contentBase64: a.contentBase64, mime: a.mime })),
      },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      toast.error("Erro ao enviar solicitação.");
      return;
    }
    setStep("done");
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!linkValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <img src={logoOras} alt="Oras" className="h-10 mb-6" />
        <Card className="w-full max-w-md">
          <CardContent className="p-4 sm:p-6 text-center space-y-2">
            <h1 className="text-lg font-semibold">Link indisponível</h1>
            <p className="text-sm text-muted-foreground">Este link de solicitação não está ativo no momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <img src={logoOras} alt="Oras" className="h-10 mb-6" />
      <Card className="w-full max-w-2xl">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Solicitar novo projeto</h1>
            <p className="text-sm text-muted-foreground">Preencha os campos abaixo para enviar sua solicitação.</p>
          </div>

          {step === "email" && (
            <form onSubmit={handleValidate} className="space-y-3">
              <p className="text-sm text-muted-foreground">Informe seu e-mail e nome para acessar o formulário. Apenas e-mails vinculados a clientes cadastrados são autorizados.</p>
              <div className="space-y-2"><Label>Nome *</Label><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>E-mail *</Label><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <Button type="submit" className="w-full sm:w-auto" disabled={validating || !email || !name}>{validating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Continuar</Button>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2"><Label>Título do projeto *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Briefing detalhado *</Label><WysiwygEditor value={briefing} onChange={setBriefing} minHeight="120px" /></div>
              <div className="space-y-2"><Label>Prazo desejado (opcional)</Label><Input type="date" min={minDate} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Tarefas do projeto (opcional)</p>
                    <p className="text-xs text-muted-foreground">Adicione uma ou mais tarefas vinculadas a esta solicitação.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setTaskModalOpen(true)} disabled={submitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova tarefa
                  </Button>
                </div>
                {requestedTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma tarefa adicionada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {requestedTasks.map((task, index) => {
                      const isExpanded = expandedTasks.includes(index);
                      return (
                        <div key={`${task.title}-${index}`} className="rounded-md border border-border bg-muted/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              className="flex flex-1 items-center justify-between text-left"
                              onClick={() => toggleTaskExpansion(index)}
                            >
                              <span className="text-sm font-medium">{task.title}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleRemoveTask(index)}
                              disabled={submitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                              <p><span className="font-medium text-foreground">Descrição:</span> {task.description || "Sem descrição"}</p>
                              <p><span className="font-medium text-foreground">Prazo:</span> {formatDueDate(task.dueDate)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Arquivos de apoio (opcional)</Label>
                <div className="flex flex-wrap items-start gap-2">
                  {publicAttachments.map((att, idx) => (
                    <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
                      <AttachmentThumbnail name={att.name} url={att.previewUrl} mime={att.mime} />
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                        aria-label={`Remover ${att.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={publicAttachments.length >= MAX_FILES}
                    className="h-20 w-20 flex-col gap-1 text-xs"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Anexar</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Até {MAX_FILES} arquivos ({ALLOWED_FILE_EXT_LABEL}), máx. {MAX_SIZE_MB}MB cada.</p>
                <input ref={fileInputRef} type="file" accept={ALLOWED_FILE_ACCEPT} multiple className="hidden" onChange={handleFilesPicked} />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Enviar solicitação</Button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-3 py-6">
              <h2 className="text-lg font-semibold">Solicitação enviada!</h2>
              <p className="text-sm text-muted-foreground">Recebemos seu pedido. A equipe entrará em contato em breve.</p>
              <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto mt-2">
                Enviar nova solicitação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova tarefa vinculada ao projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Título da tarefa *</Label>
              <Input
                id="taskTitle"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Criar layout da landing page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Descrição</Label>
              <Textarea
                id="taskDescription"
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes e contexto da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDueDate">Prazo</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                min={minDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleAddTask} disabled={!taskForm.title.trim()}>Adicionar tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};