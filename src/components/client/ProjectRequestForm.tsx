import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, briefing: string, desiredDeadline?: string) => Promise<void>;
}

export const ProjectRequestForm: React.FC<ProjectRequestFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  interface RequestedTask {
    title: string;
    description: string;
    dueDate: string;
  }

  const [title, setTitle] = useState('');
  const [briefing, setBriefing] = useState('');
  const [customField, setCustomField] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('');
  const [requestedTasks, setRequestedTasks] = useState<RequestedTask[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [taskForm, setTaskForm] = useState<RequestedTask>({ title: '', description: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const getContentText = (content: string) => content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  const buildBriefingPayload = () => {
    let enrichedBriefing = briefing;

    if (customField.trim()) {
      enrichedBriefing += `<hr /><p><strong>Campo personalizado:</strong> ${customField.trim()}</p>`;
    }

    if (requestedTasks.length > 0) {
      const tasksSection = requestedTasks
        .map((task, index) => {
          const description = task.description.trim() || 'Sem descrição';
          const dueDate = task.dueDate || 'Não informado';
          return `<li><p><strong>Tarefa ${index + 1}:</strong> ${task.title}</p><p><strong>Descrição:</strong> ${description}</p><p><strong>Prazo:</strong> ${dueDate}</p></li>`;
        })
        .join('');

      enrichedBriefing += `<hr /><p><strong>Tarefas solicitadas para o projeto:</strong></p><ul>${tasksSection}</ul>`;
    }

    return enrichedBriefing;
  };

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
      await onSubmit(title.trim(), buildBriefingPayload(), desiredDeadline || undefined);
      setTitle('');
      setBriefing('');
      setCustomField('');
      setDesiredDeadline('');
      setRequestedTasks([]);
      setExpandedTasks([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date is tomorrow
  const minDate = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Solicitar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="customField">Campo personalizado (opcional)</Label>
              <Input
                id="customField"
                value={customField}
                onChange={(e) => setCustomField(e.target.value)}
                placeholder="Ex: Unidade, campanha, referência interna"
                disabled={submitting}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tarefas do projeto (opcional)</p>
                  <p className="text-xs text-muted-foreground">Adicione uma ou mais tarefas vinculadas a esta solicitação.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setTaskModalOpen(true)} disabled={submitting}>
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !getContentText(briefing)}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>

        <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova tarefa vinculada ao projeto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
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
      </DialogContent>
    </Dialog>
  );
};
