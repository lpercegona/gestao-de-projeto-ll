import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { useEditingLock } from '@/hooks/useEditingLock';
import { format } from 'date-fns';
import { formatHours } from '@/lib/formatHours';
import { reconcileTaskBinding, resolveSubmitTaskId } from '@/lib/taskBinding';
import { getWysiwygPlainText } from '@/lib/wysiwyg';

interface GlobalTimerCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalTimerCompleteDialog: React.FC<GlobalTimerCompleteDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    timerState,
    taskBinding,
    clearTaskBinding,
    getElapsedHours,
    resetTimer,
    cancelCompleteDialog,
  } = useGlobalTimer();
  const { data, createTimeEntry, createTask, createProject, cancelTaskTimer } = useData();
  useEditingLock(open);

  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<'task' | 'meeting'>('task');
  const [loading, setLoading] = useState(false);
  const suppressAutoResumeOnCloseRef = useRef(false);

  const boundTask = taskBinding ? data.tasks.find((task) => task.id === taskBinding.taskId) || null : null;
  const boundProject = boundTask ? data.projects.find((project) => project.id === boundTask.project_id) || null : null;
  const boundClient = boundProject ? data.clients.find((client) => client.id === boundProject.client_id) || null : null;
  const bindingContext = reconcileTaskBinding({
    binding: taskBinding,
    task: boundTask,
    project: boundProject,
    client: boundClient,
  });

  const originTaskId = bindingContext?.taskId || timerState.taskId;
  const hasLockedOriginTask = !!bindingContext?.isValid;
  const originTask = bindingContext?.isValid ? boundTask : (originTaskId ? data.tasks.find((task) => task.id === originTaskId) : null);

  // New task/project fields
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, { projectName: string; clientName: string; tasks: typeof data.tasks }> = {};
    
    data.projects.forEach(project => {
      const client = data.clients.find(c => c.id === project.client_id);
      const projectTasks = data.tasks.filter(t => t.project_id === project.id && t.status !== 'completed');
      
      if (projectTasks.length > 0) {
        grouped[project.id] = {
          projectName: project.name,
          clientName: client?.company || client?.name || 'Cliente desconhecido',
          tasks: projectTasks,
        };
      }
    });
    
    return grouped;
  }, [data]);

  const resetFormState = () => {
    setSelectedTaskId(originTaskId || '');
    setDescription('');
    setEntryType('task');
    setLinkMode('existing');
    setNewTaskName('');
    setSelectedProjectId('');
    setCreateNewProject(false);
    setNewProjectName('');
    setSelectedClientId('');
  };

  useEffect(() => {
    if (!open) return;

    if (originTaskId) {
      setLinkMode('existing');
      setSelectedTaskId(originTaskId);
    }
  }, [open, originTaskId]);

  // Called when user cancels or closes the dialog without saving
  const handleClose = () => {
    if (suppressAutoResumeOnCloseRef.current) {
      suppressAutoResumeOnCloseRef.current = false;
      onOpenChange(false);
      return;
    }

    // Resume timer if it was running before opening dialog
    cancelCompleteDialog();
    resetFormState();
  };

  // Called after successful registration - doesn't resume timer
  const handleSuccessClose = () => {
    suppressAutoResumeOnCloseRef.current = true;
    onOpenChange(false);
    resetFormState();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const hours = getElapsedHours();

      if (!entryType) {
        toast.error('Selecione o tipo de registro (Tarefa ou Reunião).');
        setLoading(false);
        return;
      }

      if (!description.trim()) {
        toast.error('Preencha a descrição para finalizar o registro.');
        setLoading(false);
        return;
      }

      let taskId = (hasLockedOriginTask ? bindingContext?.taskId : null) || selectedTaskId;

      const submitResolution = resolveSubmitTaskId({
        bindingContext,
        selectedTaskId,
        linkMode,
      });

      if (submitResolution.blocked) {
        toast.error('A tarefa vinculada não existe mais. Selecione outra tarefa ou crie uma nova.');
        setLoading(false);
        return;
      }

      if (!hasLockedOriginTask && submitResolution.taskId) {
        taskId = submitResolution.taskId;
      }

      // Create new project if needed
      if (linkMode === 'new') {
        if (createNewProject) {
          if (!newProjectName.trim() || !selectedClientId) {
            toast.error('Preencha o nome do projeto e selecione um cliente.');
            setLoading(false);
            return;
          }

          const newProject = await createProject({
            name: newProjectName.trim(),
            client_id: selectedClientId,
            description: null,
            status: 'active',
            custom_fields: {},
          });

          if (!newProject) {
            toast.error('Falha ao criar projeto.');
            setLoading(false);
            return;
          }

          // Create new task in new project
          if (!newTaskName.trim()) {
            toast.error('Preencha o nome da tarefa.');
            setLoading(false);
            return;
          }

          const newTask = await createTask({
            name: newTaskName.trim(),
            project_id: newProject.id,
            description: null,
            status: 'in_progress',
          });

          if (!newTask) {
            toast.error('Falha ao criar tarefa.');
            setLoading(false);
            return;
          }

          taskId = newTask.id;
        } else {
          // Create task in existing project
          if (!selectedProjectId || !newTaskName.trim()) {
            toast.error('Selecione um projeto e preencha o nome da tarefa.');
            setLoading(false);
            return;
          }

          const newTask = await createTask({
            name: newTaskName.trim(),
            project_id: selectedProjectId,
            description: null,
            status: 'in_progress',
          });

          if (!newTask) {
            toast.error('Falha ao criar tarefa.');
            setLoading(false);
            return;
          }

          taskId = newTask.id;
        }
      }

      if (!taskId) {
        toast.error('Selecione ou crie uma tarefa.');
        setLoading(false);
        return;
      }

      // Create time entry
      const createdEntry = await createTimeEntry({
        task_id: taskId,
        hours,
        description: description.trim(),
        date: format(new Date(), 'yyyy-MM-dd'),
        entry_type: entryType,
      });

      if (!createdEntry) {
        throw new Error('Falha ao registrar horas.');
      }

      clearTaskBinding();
      await resetTimer();
      toast.success(`Vínculo aplicado na finalização: ${formatHours(hours)} registradas com sucesso.`);
      handleSuccessClose();
    } catch (error) {
      console.error('Error completing timer:', error);
      toast.error('Falha ao aplicar vínculo na finalização e registrar tempo.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDiscard = async () => {
    setLoading(true);
    try {
      // If linked to a task timer, cancel it in the database
      if (timerState.taskId) {
        await cancelTaskTimer(timerState.taskId);
      }
      clearTaskBinding();
      await resetTimer();
      // Don't call handleClose as it would try to resume the timer
      // Just close the dialog and reset form state
      suppressAutoResumeOnCloseRef.current = true;
      onOpenChange(false);
      resetFormState();
      toast.info('Registro descartado');
    } catch (error) {
      console.error('Error discarding timer:', error);
      toast.error('Falha ao descartar o registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Registro</DialogTitle>
          <DialogDescription>
            Tempo decorrido: <span className="font-mono font-semibold text-primary">{formatTime(timerState.elapsedSeconds)}</span>
            {' '}({formatHours(getElapsedHours())})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entry type toggle */}
          <div className="space-y-2">
            <Label>Tipo de registro</Label>
            <ToggleGroup
              type="single"
              value={entryType}
              onValueChange={(value) => value && setEntryType(value as 'task' | 'meeting')}
              className="justify-start"
            >
              <ToggleGroupItem value="task" aria-label="Tarefa" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Tarefa
              </ToggleGroupItem>
              <ToggleGroupItem value="meeting" aria-label="Reunião" className="gap-2">
                <Users className="h-4 w-4" />
                Reunião
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Mode toggle - only show if not linked to a task */}
          {!hasLockedOriginTask && (
            <div className="space-y-2">
              <Label>Vincular a</Label>
              <ToggleGroup
                type="single"
                value={linkMode}
                onValueChange={(value) => value && setLinkMode(value as 'existing' | 'new')}
                className="justify-start"
              >
                <ToggleGroupItem value="existing" aria-label="Tarefa existente">
                  Tarefa existente
                </ToggleGroupItem>
                <ToggleGroupItem value="new" aria-label="Nova tarefa" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Nova tarefa
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {/* Existing task selection */}
          {linkMode === 'existing' && !hasLockedOriginTask && (
            <div className="space-y-2">
              <Label>Selecionar tarefa</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tasksByProject).map(([projectId, { projectName, clientName, tasks }]) => (
                    <div key={projectId}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {projectName} - {clientName}
                      </div>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New task creation */}
          {linkMode === 'new' && !hasLockedOriginTask && (
            <div className="space-y-4">
              {/* Create new project toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createNewProject"
                  checked={createNewProject}
                  onCheckedChange={(checked) => setCreateNewProject(checked === true)}
                />
                <Label htmlFor="createNewProject" className="cursor-pointer text-sm">
                  Criar novo projeto
                </Label>
              </div>

              {createNewProject ? (
                <>
                  {/* Client selection */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* New project name */}
                  <div className="space-y-2">
                    <Label>Nome do projeto</Label>
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Nome do novo projeto"
                    />
                  </div>
                </>
              ) : (
                /* Existing project selection */
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.projects.map(project => {
                        const client = data.clients.find(c => c.id === project.client_id);
                        return (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {client?.company || client?.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* New task name */}
              <div className="space-y-2">
                <Label>Nome da tarefa</Label>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Nome da nova tarefa"
                />
              </div>
            </div>
          )}

          {bindingContext && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs space-y-1">
              <div>
                <span className="font-medium text-foreground">Título:</span> {bindingContext.title.value}
                {bindingContext.title.source === 'snapshot' && <span className="ml-1 text-amber-700">(snapshot)</span>}
              </div>
              <div>
                <span className="font-medium text-foreground">Descrição:</span> {getWysiwygPlainText(bindingContext.description.value) || 'Sem descrição'}
                {bindingContext.description.source === 'snapshot' && <span className="ml-1 text-amber-700">(snapshot)</span>}
              </div>
              <div>
                <span className="font-medium text-foreground">Projeto/Cliente:</span> {bindingContext.project.value} - {bindingContext.client.value}
                {(bindingContext.project.source === 'snapshot' || bindingContext.client.source === 'snapshot') && <span className="ml-1 text-amber-700">(snapshot)</span>}
              </div>
              {!bindingContext.isValid && <div className="text-amber-700">Tarefa original não encontrada. Escolha outra tarefa para registrar.</div>}
            </div>
          )}

          {!bindingContext && originTask && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">Tarefa de origem:</span> {originTask.name}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o trabalho realizado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            onClick={handleDiscard} 
            disabled={loading}
            className="text-destructive hover:text-destructive sm:mr-auto"
          >
            Descartar
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1 sm:flex-initial">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-initial">
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
