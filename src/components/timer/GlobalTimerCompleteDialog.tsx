import React, { useState, useMemo } from 'react';
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
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface GlobalTimerCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalTimerCompleteDialog: React.FC<GlobalTimerCompleteDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { timerState, getElapsedHours, resetTimer } = useGlobalTimer();
  const { data, createTimeEntry, createTask, createProject, stopTaskTimer, cancelTaskTimer } = useData();

  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [entryType, setEntryType] = useState<'task' | 'meeting'>('task');
  const [loading, setLoading] = useState(false);

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
          clientName: client?.name || 'Cliente desconhecido',
          tasks: projectTasks,
        };
      }
    });
    
    return grouped;
  }, [data.projects, data.tasks, data.clients]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedTaskId('');
    setDescription('');
    setEntryType('task');
    setLinkMode('existing');
    setNewTaskName('');
    setSelectedProjectId('');
    setCreateNewProject(false);
    setNewProjectName('');
    setSelectedClientId('');
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const hours = getElapsedHours();

      // If linked to a task timer, stop that instead
      if (timerState.taskId) {
        await stopTaskTimer(timerState.taskId, description || 'Timer global', entryType);
        resetTimer();
        toast({
          title: 'Tempo registrado',
          description: `${hours.toFixed(2)}h registradas com sucesso.`,
        });
        handleClose();
        return;
      }

      let taskId = selectedTaskId;

      // Create new project if needed
      if (linkMode === 'new') {
        if (createNewProject) {
          if (!newProjectName.trim() || !selectedClientId) {
            toast({
              title: 'Erro',
              description: 'Preencha o nome do projeto e selecione um cliente.',
              variant: 'destructive',
            });
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
            toast({
              title: 'Erro',
              description: 'Falha ao criar projeto.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }

          // Create new task in new project
          if (!newTaskName.trim()) {
            toast({
              title: 'Erro',
              description: 'Preencha o nome da tarefa.',
              variant: 'destructive',
            });
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
            toast({
              title: 'Erro',
              description: 'Falha ao criar tarefa.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }

          taskId = newTask.id;
        } else {
          // Create task in existing project
          if (!selectedProjectId || !newTaskName.trim()) {
            toast({
              title: 'Erro',
              description: 'Selecione um projeto e preencha o nome da tarefa.',
              variant: 'destructive',
            });
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
            toast({
              title: 'Erro',
              description: 'Falha ao criar tarefa.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }

          taskId = newTask.id;
        }
      }

      if (!taskId) {
        toast({
          title: 'Erro',
          description: 'Selecione ou crie uma tarefa.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create time entry
      await createTimeEntry({
        task_id: taskId,
        hours,
        description: description || 'Timer global',
        date: format(new Date(), 'yyyy-MM-dd'),
        entry_type: entryType,
      });

      resetTimer();
      toast({
        title: 'Tempo registrado',
        description: `${hours.toFixed(2)}h registradas com sucesso.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error completing timer:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao registrar tempo.',
        variant: 'destructive',
      });
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
    // If linked to a task timer, cancel it in the database
    if (timerState.taskId) {
      await cancelTaskTimer(timerState.taskId);
    }
    resetTimer();
    handleClose();
    toast({
      title: 'Registro descartado',
      description: 'O tempo foi descartado e não foi registrado.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Registro</DialogTitle>
          <DialogDescription>
            Tempo decorrido: <span className="font-mono font-semibold text-primary">{formatTime(timerState.elapsedSeconds)}</span>
            {' '}({getElapsedHours().toFixed(2)}h)
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
          {!timerState.taskId && (
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
          {linkMode === 'existing' && !timerState.taskId && (
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
          {linkMode === 'new' && !timerState.taskId && (
            <div className="space-y-4">
              {/* Create new project toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createNewProject"
                  checked={createNewProject}
                  onChange={(e) => setCreateNewProject(e.target.checked)}
                  className="rounded border-input"
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
                            {client.name}
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
                            {project.name} - {client?.name}
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

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
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