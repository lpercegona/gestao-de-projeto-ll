import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Clock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { Task } from '@/types';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { 
    data,
    loading,
    createTask, 
    updateTask, 
    deleteTask, 
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTaskHours,
    getProjectHours,
    getCreatorName,
    startTaskTimer,
    stopTaskTimer,
    getActiveTimer,
    completeTask
  } = useData();

  const project = data.projects.find(p => p.id === projectId);
  const client = project ? data.clients.find(c => c.id === project.client_id) : null;
  const tasks = data.tasks.filter(t => t.project_id === projectId);
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [pauseDescription, setPauseDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    status: 'pending',
  });
  
  const [timeForm, setTimeForm] = useState({
    hours: 0,
    minutes: 15,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Projeto não encontrado.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Projetos
        </Button>
      </div>
    );
  }

  const handleOpenTaskDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        name: task.name,
        description: task.description || '',
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setTaskForm({ name: '', description: '', status: 'pending' });
    }
    setIsTaskDialogOpen(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (editingTask) {
      await updateTask(editingTask.id, taskForm);
      toast.success('Tarefa atualizada com sucesso!');
    } else {
      await createTask({ ...taskForm, project_id: project.id });
      toast.success('Tarefa criada com sucesso!');
    }
    setSubmitting(false);
    setIsTaskDialogOpen(false);
  };

  const handleDeleteTask = async () => {
    if (deletingTask) {
      await deleteTask(deletingTask.id);
      toast.success('Tarefa excluída com sucesso!');
      setIsDeleteDialogOpen(false);
      setDeletingTask(null);
    }
  };

  const handleOpenTimeDialog = (taskId: string, entryToEdit?: { id: string; hours: number; description: string | null; date: string }) => {
    setSelectedTaskId(taskId);
    if (entryToEdit) {
      // Editing existing entry - convert decimal hours to hours + minutes
      const totalMinutes = Math.round(entryToEdit.hours * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round((totalMinutes % 60) / 15) * 15; // Round to nearest 15
      setEditingTimeEntryId(entryToEdit.id);
      setTimeForm({ 
        hours, 
        minutes, 
        description: entryToEdit.description || '', 
        date: entryToEdit.date 
      });
    } else {
      setEditingTimeEntryId(null);
      setTimeForm({ hours: 0, minutes: 15, description: '', date: format(new Date(), 'yyyy-MM-dd') });
    }
    setIsTimeDialogOpen(true);
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = timeForm.hours + (timeForm.minutes / 60);
    if (totalHours <= 0) {
      toast.error('Selecione pelo menos 15 minutos.');
      return;
    }
    setSubmitting(true);
    
    if (editingTimeEntryId) {
      // Update existing entry
      await updateTimeEntry(editingTimeEntryId, {
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
      });
      toast.success('Registro atualizado com sucesso!');
    } else {
      // Create new entry
      await createTimeEntry({
        task_id: selectedTaskId,
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
      });
      toast.success('Horas registradas com sucesso!');
    }
    
    setSubmitting(false);
    setIsTimeDialogOpen(false);
    setEditingTimeEntryId(null);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div>
      {/* Header com Voltar + Título na mesma linha */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Cliente: {client.name} • {getProjectHours(project.id)}h registradas
          </p>
        </div>
      </div>

      {project.description && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
          <Button onClick={() => handleOpenTaskDialog()} size="sm" className="px-3">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Nova Tarefa</span>
          </Button>
        </div>
        
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma tarefa criada ainda.</p>
              <Button onClick={() => handleOpenTaskDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira tarefa
              </Button>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const taskHours = getTaskHours(task.id);
            const taskTimeEntries = data.timeEntries.filter(te => te.task_id === task.id);
            const activeTimer = getActiveTimer(task.id);

            const handleStartTimer = async () => {
              await startTaskTimer(task.id);
              toast.success('Timer iniciado!');
            };

            const handleStopTimer = async (): Promise<void> => {
              setPausingTaskId(task.id);
              setPauseDescription('');
              setIsPauseDialogOpen(true);
            };

            const handleCompleteTask = async () => {
              const timer = getActiveTimer(task.id);
              await completeTask(task.id);
              if (timer) {
                toast.success('Timer parado e tarefa concluída!');
              } else {
                toast.success('Tarefa concluída!');
              }
            };
            
            return (
              <Card key={task.id} className="relative">
                {/* Ações no canto superior direito */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenTaskDialog(task)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setDeletingTask(task); setIsDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <CardHeader className="pb-2 pr-24">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <CardTitle className="text-base">{task.name}</CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Timer Controls */}
                      <TaskTimer
                        taskId={task.id}
                        taskStatus={task.status}
                        activeTimer={activeTimer}
                        onStart={handleStartTimer}
                        onStop={handleStopTimer}
                        onComplete={handleCompleteTask}
                      />
                      {/* Manual Hour Entry - Icon only on mobile */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenTimeDialog(task.id)} className="px-2 sm:px-3">
                            <Clock className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1">Registrar Horas</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="sm:hidden">Registrar Horas</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm mb-4">
                    <span className="font-medium text-foreground">{taskHours}h registradas</span>
                    <span className="text-muted-foreground text-xs">Criada por: {getCreatorName(task.created_by)}</span>
                  </div>
                  {taskTimeEntries.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Registros de horas:</p>
                      <div className="space-y-2">
                        {taskTimeEntries.map((entry) => (
                          <div key={entry.id} className="relative text-sm bg-muted/50 rounded px-3 py-2 pr-16">
                            {/* Botões de editar/excluir no canto superior direito */}
                            <div className="absolute top-1 right-1 flex items-center gap-0.5">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => handleOpenTimeDialog(task.id, { id: entry.id, hours: entry.hours, description: entry.description, date: entry.date })}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive" 
                                onClick={async () => { await deleteTimeEntry(entry.id); toast.success('Registro excluído!'); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-medium text-foreground">{entry.hours}h</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{format(parseISO(entry.date), "dd 'de' MMM", { locale: ptBR })}</span>
                                {entry.description && <><span className="text-muted-foreground hidden sm:inline">•</span><span className="text-muted-foreground block sm:inline">{entry.description}</span></>}
                              </div>
                              <span className="text-xs text-muted-foreground/70">por {getCreatorName(entry.created_by)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTask}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="taskName">Nome da Tarefa</Label>
                <Input id="taskName" value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Descrição</Label>
                <Textarea id="taskDescription" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskStatus">Status</Label>
                <Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value })} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTask ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTimeEntryId ? 'Editar Registro' : 'Registrar Horas'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTime}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Horas</Label>
                  <Input 
                    id="hours" 
                    type="number" 
                    min="0" 
                    step="1" 
                    value={timeForm.hours} 
                    onChange={(e) => setTimeForm({ ...timeForm, hours: Math.max(0, parseInt(e.target.value) || 0) })} 
                    disabled={submitting} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutes">Minutos</Label>
                  <Select 
                    value={String(timeForm.minutes)} 
                    onValueChange={(value) => setTimeForm({ ...timeForm, minutes: Number(value) })} 
                    disabled={submitting}
                  >
                    <SelectTrigger id="minutes">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">00</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeDescription">Descrição (opcional)</Label>
                <Input id="timeDescription" value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} placeholder="O que foi feito?" disabled={submitting} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTimeDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTimeEntryId ? 'Salvar' : 'Registrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa "{deletingTask?.name}" e todos os seus registros de horas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pause Timer Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pauseDescription">O que foi feito? (opcional)</Label>
              <Textarea
                id="pauseDescription"
                value={pauseDescription}
                onChange={(e) => setPauseDescription(e.target.value)}
                placeholder="Descreva brevemente o que foi realizado..."
                rows={3}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!pausingTaskId) return;
                setSubmitting(true);
                const result = await stopTaskTimer(pausingTaskId, pauseDescription.trim() || undefined);
                if (result) {
                  toast.success(`${result.hours}h registradas!`);
                }
                setSubmitting(false);
                setIsPauseDialogOpen(false);
                setPausingTaskId(null);
                setPauseDescription('');
              }}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar Pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
