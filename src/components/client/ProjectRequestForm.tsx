import React, { useEffect, useMemo, useState } from 'react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { FormSheet } from '@/components/ui/form-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RequestAttachmentsUploader, RequestAttachment } from '@/components/client/RequestAttachmentsUploader';

interface ProjectColumn {
  id: string;
  name: string;
  type: 'text' | 'select';
  options: string[] | null;
}

interface RequestedTask {
  title: string;
  description: string;
  dueDate: string;
}

interface ProjectRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    title: string,
    briefing: string,
    customFields: Record<string, string>,
    desiredDeadline?: string,
    requestedTasks?: RequestedTask[],
    attachments?: RequestAttachment[],
  ) => Promise<void>;
}

export const ProjectRequestForm: React.FC<ProjectRequestFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const { user } = useAuth();
  useEditingLock(open);

  const [title, setTitle] = useState('');
  const [briefing, setBriefing] = useState('');
  const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [desiredDeadline, setDesiredDeadline] = useState('');
  const [requestedTasks, setRequestedTasks] = useState<RequestedTask[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [taskForm, setTaskForm] = useState<RequestedTask>({ title: '', description: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);

  useEffect(() => {
    if (!open || !user) return;

    const fetchColumns = async () => {
      setLoadingFields(true);
      try {
        const [{ data: client }, { data: clientUser }] = await Promise.all([
          supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('client_users').select('client_id').eq('user_id', user.id).maybeSingle(),
        ]);

        const resolvedClientId = client?.id || clientUser?.client_id;
        setClientId(resolvedClientId || null);
        if (!resolvedClientId) {
          setProjectColumns([]);
          setCustomFields({});
          return;
        }

        const { data: columns, error } = await supabase
          .from('project_columns')
          .select('id, name, type, options')
          .eq('client_id', resolvedClientId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const typedColumns = (columns || []) as ProjectColumn[];
        setProjectColumns(typedColumns);
        setCustomFields((previous) => {
          const next: Record<string, string> = {};
          typedColumns.forEach((column) => {
            next[column.id] = previous[column.id] || column.options?.[0] || '';
          });
          return next;
        });
      } finally {
        setLoadingFields(false);
      }
    };

    fetchColumns();
  }, [open, user]);

  const selectedCustomFields = useMemo(
    () => Object.fromEntries(Object.entries(customFields).filter(([, value]) => value.trim())),
    [customFields],
  );

  const getContentText = (content: string) => content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;

    setRequestedTasks((prev) => [...prev, { ...taskForm, title: taskForm.title.trim() }]);
    setExpandedTasks((prev) => [...prev, requestedTasks.length]);
    setTaskForm({ title: '', description: '', dueDate: '' });
    setTaskModalOpen(false);
  };

  const handleRemoveTask = (index: number) => {
    setRequestedTasks((prev) => prev.filter((_, i) => i !== index));
    setExpandedTasks((prev) => prev.filter((taskIndex) => taskIndex !== index).map((taskIndex) => (taskIndex > index ? taskIndex - 1 : taskIndex)));
  };

  const toggleTaskExpansion = (index: number) => {
    setExpandedTasks((prev) =>
      prev.includes(index) ? prev.filter((taskIndex) => taskIndex !== index) : [...prev, index],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !getContentText(briefing)) return;

    setSubmitting(true);
    try {
      await onSubmit(
        title.trim(),
        briefing,
        selectedCustomFields,
        desiredDeadline || undefined,
        requestedTasks.length > 0 ? requestedTasks : undefined,
        attachments.length > 0 ? attachments : undefined,
      );
      setTitle('');
      setBriefing('');
      setCustomFields({});
      setDesiredDeadline('');
      setRequestedTasks([]);
      setExpandedTasks([]);
      setAttachments([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date is tomorrow
  const minDate = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Solicitar Novo Projeto"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const form = document.getElementById('project-request-form') as HTMLFormElement;
                form?.requestSubmit();
              }}
              disabled={submitting || !title.trim() || !getContentText(briefing)}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Solicitação
            </Button>
          </>
        }
      >
        <form id="project-request-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Projeto *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Redesign do site institucional"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="briefing">Briefing Detalhado *</Label>
              <WysiwygEditor
                value={briefing}
                onChange={setBriefing}
                disabled={submitting}
                minHeight="120px"
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes você fornecer, melhor conseguiremos entender suas necessidades.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo Desejado (opcional)</Label>
              <Input
                id="deadline"
                type="date"
                value={desiredDeadline}
                onChange={(e) => setDesiredDeadline(e.target.value)}
                min={minDate}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Se você tem uma data limite, informe aqui.
              </p>
            </div>

            {projectColumns.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Campos personalizados</p>
                {loadingFields ? (
                  <p className="text-xs text-muted-foreground">Carregando campos personalizados...</p>
                ) : (
                  projectColumns.map((column) => (
                    <div className="space-y-2" key={column.id}>
                      <Label htmlFor={column.id}>{column.name}</Label>
                      {column.type === 'select' && column.options?.length ? (
                        <select
                          id={column.id}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={customFields[column.id] || ''}
                          onChange={(event) => setCustomFields((prev) => ({ ...prev, [column.id]: event.target.value }))}
                          disabled={submitting}
                        >
                          {column.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={column.id}
                          value={customFields[column.id] || ''}
                          onChange={(event) => setCustomFields((prev) => ({ ...prev, [column.id]: event.target.value }))}
                          placeholder={`Digite ${column.name.toLowerCase()}`}
                          disabled={submitting}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

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
                            <p><span className="font-medium text-foreground">Descrição:</span> {task.description || 'Sem descrição'}</p>
                            <p><span className="font-medium text-foreground">Prazo:</span> {task.dueDate || 'Não informado'}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border p-3">
              <RequestAttachmentsUploader
                clientId={clientId}
                attachments={attachments}
                onChange={setAttachments}
                disabled={submitting}
              />
            </div>
          </div>
        </form>
      </FormSheet>

      <FormSheet
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        title="Nova tarefa vinculada ao projeto"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleAddTask} disabled={!taskForm.title.trim()}>Adicionar tarefa</Button>
          </>
        }
      >
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
      </FormSheet>
    </>
  );
};
