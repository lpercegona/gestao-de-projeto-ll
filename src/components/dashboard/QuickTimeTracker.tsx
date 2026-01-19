import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Clock, Plus, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const QuickTimeTracker: React.FC = () => {
  const { data, createTimeEntry, createTask, createProject, refreshData } = useData();
  
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkMode, setLinkMode] = useState<'existing' | 'new' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Link to existing task
  const [selectedTaskId, setSelectedTaskId] = useState('');
  
  // Create new task/project
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
    setElapsedSeconds(0);
  };

  const handleStop = () => {
    setIsRunning(false);
    setShowLinkDialog(true);
  };

  const calculateHours = (): number => {
    const hours = elapsedSeconds / 3600;
    // Round to nearest 0.25h
    return Math.round(hours * 4) / 4 || 0.25; // Minimum 0.25h
  };

  const resetState = () => {
    setElapsedSeconds(0);
    setStartTime(null);
    setShowLinkDialog(false);
    setLinkMode(null);
    setDescription('');
    setSelectedTaskId('');
    setNewTaskName('');
    setSelectedProjectId('');
    setCreateNewProject(false);
    setNewProjectName('');
    setSelectedClientId('');
  };

  const handleLinkToExisting = async () => {
    if (!selectedTaskId) {
      toast.error('Selecione uma tarefa');
      return;
    }

    setLoading(true);
    try {
      const hours = calculateHours();
      await createTimeEntry({
        task_id: selectedTaskId,
        hours,
        description: description || null,
        date: new Date().toISOString().split('T')[0],
        entry_type: 'task',
      });
      toast.success(`${hours}h registradas com sucesso!`);
      await refreshData();
      resetState();
    } catch (error) {
      toast.error('Erro ao registrar horas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newTaskName.trim()) {
      toast.error('Informe o nome da tarefa');
      return;
    }

    let projectId = selectedProjectId;

    setLoading(true);
    try {
      // Create new project if needed
      if (createNewProject) {
        if (!newProjectName.trim()) {
          toast.error('Informe o nome do projeto');
          setLoading(false);
          return;
        }
        if (!selectedClientId) {
          toast.error('Selecione um cliente');
          setLoading(false);
          return;
        }
        
        const newProject = await createProject({
          client_id: selectedClientId,
          name: newProjectName.trim(),
          description: null,
          status: 'active',
          custom_fields: {},
        });
        
        if (!newProject) {
          toast.error('Erro ao criar projeto');
          setLoading(false);
          return;
        }
        projectId = newProject.id;
      }

      if (!projectId) {
        toast.error('Selecione um projeto');
        setLoading(false);
        return;
      }

      // Create new task
      const newTask = await createTask({
        project_id: projectId,
        name: newTaskName.trim(),
        description: null,
        status: 'todo',
      });

      if (!newTask) {
        toast.error('Erro ao criar tarefa');
        setLoading(false);
        return;
      }

      // Create time entry
      const hours = calculateHours();
      await createTimeEntry({
        task_id: newTask.id,
        hours,
        description: description || null,
        date: new Date().toISOString().split('T')[0],
        entry_type: 'task',
      });

      toast.success(`Tarefa criada e ${hours}h registradas!`);
      await refreshData();
      resetState();
    } catch (error) {
      toast.error('Erro ao criar tarefa e registrar horas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetState();
  };

  // Group tasks by project for better selection
  const tasksByProject = data.tasks.reduce((acc, task) => {
    const project = data.projects.find(p => p.id === task.project_id);
    if (project) {
      const key = project.id;
      if (!acc[key]) {
        acc[key] = { project, tasks: [] };
      }
      acc[key].tasks.push(task);
    }
    return acc;
  }, {} as Record<string, { project: typeof data.projects[0]; tasks: typeof data.tasks }>);

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Registro Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3">
            <div className="text-3xl font-mono font-bold text-foreground">
              {formatTime(elapsedSeconds)}
            </div>
            {!isRunning ? (
              <Button onClick={handleStart} className="w-full gap-2">
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            ) : (
              <Button onClick={handleStop} variant="destructive" className="w-full gap-2">
                <Square className="h-4 w-4" />
                Parar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar {calculateHours()}h</DialogTitle>
            <DialogDescription>
              Escolha como deseja vincular este registro de horas
            </DialogDescription>
          </DialogHeader>

          {!linkMode && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => setLinkMode('existing')}
              >
                <Link2 className="h-6 w-6" />
                <span className="text-xs text-center">Vincular a Tarefa Existente</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => setLinkMode('new')}
              >
                <Plus className="h-6 w-6" />
                <span className="text-xs text-center">Criar Nova Tarefa</span>
              </Button>
            </div>
          )}

          {linkMode === 'existing' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tarefa</Label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(tasksByProject).map(({ project, tasks }) => (
                      <React.Fragment key={project.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {project.name}
                        </div>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o trabalho realizado..."
                  rows={2}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setLinkMode(null)}>
                  Voltar
                </Button>
                <Button onClick={handleLinkToExisting} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar
                </Button>
              </DialogFooter>
            </div>
          )}

          {linkMode === 'new' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Tarefa</Label>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Nome da nova tarefa"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createNewProject"
                  checked={createNewProject}
                  onChange={(e) => setCreateNewProject(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="createNewProject" className="text-sm font-normal cursor-pointer">
                  Criar novo projeto
                </Label>
              </div>

              {!createNewProject ? (
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.projects.map((project) => {
                        const client = data.clients.find(c => c.id === project.client_id);
                        return (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} {client && `(${client.name})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Nome do Projeto</Label>
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Nome do novo projeto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o trabalho realizado..."
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setLinkMode(null)}>
                  Voltar
                </Button>
                <Button onClick={handleCreateNew} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar e Registrar
                </Button>
              </DialogFooter>
            </div>
          )}

          {!linkMode && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Descartar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
