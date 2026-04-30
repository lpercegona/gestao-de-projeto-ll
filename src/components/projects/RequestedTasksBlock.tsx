import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormSheet } from '@/components/ui/form-sheet';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export type DraftTask = {
  title: string;
  description: string;
  dueDate: string;
};

interface RequestedTasksBlockProps {
  tasks: DraftTask[];
  onChange: (tasks: DraftTask[]) => void;
  disabled?: boolean;
  title?: string;
  helperText?: string;
}

export const RequestedTasksBlock: React.FC<RequestedTasksBlockProps> = ({
  tasks,
  onChange,
  disabled,
  title = 'Tarefas do projeto (opcional)',
  helperText = 'Adicione uma ou mais tarefas vinculadas a este projeto.',
}) => {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [taskForm, setTaskForm] = useState<DraftTask>({ title: '', description: '', dueDate: '' });

  const minDate = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;
    const next = [...tasks, { ...taskForm, title: taskForm.title.trim() }];
    onChange(next);
    setExpandedTasks((prev) => [...prev, tasks.length]);
    setTaskForm({ title: '', description: '', dueDate: '' });
    setTaskModalOpen(false);
  };

  const handleRemoveTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
    setExpandedTasks((prev) =>
      prev.filter((taskIndex) => taskIndex !== index).map((taskIndex) => (taskIndex > index ? taskIndex - 1 : taskIndex)),
    );
  };

  const toggleTaskExpansion = (index: number) => {
    setExpandedTasks((prev) =>
      prev.includes(index) ? prev.filter((taskIndex) => taskIndex !== index) : [...prev, index],
    );
  };

  return (
    <>
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setTaskModalOpen(true)}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova tarefa
          </Button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma tarefa adicionada ainda.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, index) => {
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
                      disabled={disabled}
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
            <Label htmlFor="draftTaskTitle">Título da tarefa *</Label>
            <Input
              id="draftTaskTitle"
              value={taskForm.title}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Criar layout da landing page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="draftTaskDescription">Descrição</Label>
            <Textarea
              id="draftTaskDescription"
              value={taskForm.description}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes e contexto da tarefa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="draftTaskDueDate">Prazo</Label>
            <Input
              id="draftTaskDueDate"
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