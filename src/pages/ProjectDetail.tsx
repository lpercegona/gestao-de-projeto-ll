import React, { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WysiwygContent, WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormSheet } from '@/components/ui/form-sheet';
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
import { ArrowLeft, Plus, Pencil, Trash2, Clock, Loader2, ClipboardList, Users, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { Task } from '@/types';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHours } from '@/lib/formatHours';

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setTaskBinding, startGlobalTimer } = useGlobalTimer();
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
    stopTaskTimer,
    getActiveTimer,
    completeTask
  } = useData();

  const project = data.projects.find(p => p.id === projectId);
  const client = project ? data.clients.find(c => c.id === project.client_id) : null;
  const tasks = data.tasks.filter(t => t.project_id === projectId);

  const getCurrentUserActiveTimer = useCallback((taskId: string) => {
    const timer = getActiveTimer(taskId);
    if (!timer || !user) return null;
    return timer.user_id === user.id ? timer : null;
  }, [getActiveTimer, user]);
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteTimeEntryDialogOpen, setIsDeleteTimeEntryDialogOpen] = useState(false);
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
    time: '00:15',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    entry_type: 'task' as 'task' | 'meeting',
  });

  // Helper functions for HH:mm conversion
  const parseTimeToHours = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const formatHoursToTime = (decimalHours: number): string => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

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

  const handleOpenTimeDialog = (taskId: string, entryToEdit?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => {
    setSelectedTaskId(taskId);
    if (entryToEdit) {
      setEditingTimeEntryId(entryToEdit.id);
      setTimeForm({ 
        time: formatHoursToTime(entryToEdit.hours),
        description: entryToEdit.description || '', 
        date: entryToEdit.date,
        entry_type: entryToEdit.entry_type || 'task',
      });
    } else {
      setEditingTimeEntryId(null);
      setTimeForm({ time: '00:15', description: '', date: format(new Date(), 'yyyy-MM-dd'), entry_type: 'task' });
    }
    setIsTimeDialogOpen(true);
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = parseTimeToHours(timeForm.time);
    if (totalHours <= 0) {
      toast.error('Insira um tempo válido maior que zero.');
      return;
    }
    setSubmitting(true);
    
    if (editingTimeEntryId) {
      await updateTimeEntry(editingTimeEntryId, {
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
        entry_type: timeForm.entry_type,
      });
      toast.success('Registro atualizado com sucesso!');
    } else {
      await createTimeEntry({
        task_id: selectedTaskId,
        hours: totalHours,
        description: timeForm.description,
        date: timeForm.date,
        entry_type: timeForm.entry_type,
      });
      toast.success('Horas registradas com sucesso!');
    }
    
    setSubmitting(false);
    setIsTimeDialogOpen(false);
    setEditingTimeEntryId(null);
  };

  const handleDeleteTimeEntry = async () => {
    if (editingTimeEntryId) {
      await deleteTimeEntry(editingTimeEntryId);
      toast.success('Registro excluído!');
      setIsDeleteTimeEntryDialogOpen(false);
      setIsTimeDialogOpen(false);
      setEditingTimeEntryId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluída';
      case 'archived': return 'Arquivo';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-slate-200 text-slate-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div>
      {/* Header com Voltar + Título na mesma linha */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(client ? `/clients/${client.id}` : '/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Cliente: {client.company || client.name} • {getProjectHours(project.id)}h registradas
          </p>
        </div>
      </div>

      {project.description && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <WysiwygContent content={project.description} className="text-muted-foreground" />
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
            const activeTimer = getCurrentUserActiveTimer(task.id);

            const handleStartTimer = async () => {
              setTaskBinding({
                taskId: task.id,
                snapshot: {
                  taskTitle: task.name,
                  taskDescription: task.description,
                  projectName: project.name,
                  clientName: client.company || client.name,
                },
              });
              await startGlobalTimer();
              toast.success('Timer iniciado!');
            };

            const handleStopTimer = async (): Promise<void> => {
              setPausingTaskId(task.id);
              setPauseDescription('');
              setIsPauseDialogOpen(true);
            };

            const handleCompleteTask = async () => {
              const timer = getCurrentUserActiveTimer(task.id);
              await completeTask(task.id);
              if (timer) {
                toast.success('Timer parado e tarefa concluída!');
              } else {
                toast.success('Tarefa concluída!');
              }
            };
            
            return (
              <Card key={task.id} className="relative group">
                {/* Ações no canto superior direito */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenTaskDialog(task)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => { setDeletingTask(task); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  {task.description && (
                    <WysiwygContent content={task.description} className="text-sm text-muted-foreground mb-3" />
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm mb-4">
                    <span className="font-medium text-foreground">{formatHours(taskHours)} registradas</span>
                    <span className="text-muted-foreground text-xs">Criada por: {getCreatorName(task.created_by)}</span>
                  </div>
                  {taskTimeEntries.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Registros de horas:</p>
                      <div className="space-y-2">
                        {taskTimeEntries.map((entry) => (
                          <div key={entry.id} className="group/entry relative text-sm bg-muted/50 rounded px-3 py-2 pr-10">
                            {/* Menu de ações */}
                            <div className="absolute top-1 right-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenTimeDialog(task.id, { id: entry.id, hours: entry.hours, description: entry.description, date: entry.date, entry_type: entry.entry_type })}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive" 
                                    onClick={() => { 
                                      setEditingTimeEntryId(entry.id);
                                      setIsDeleteTimeEntryDialogOpen(true); 
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-medium text-foreground">{formatHours(entry.hours)}</span>
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

      <FormSheet
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" form="task-form-pd" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTask ? 'Salvar' : 'Criar'}</Button>
          </>
        }
      >
          <form id="task-form-pd" onSubmit={handleSubmitTask}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskName">Nome da Tarefa</Label>
                <Input id="taskName" value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Descrição</Label>
                <WysiwygEditor value={taskForm.description} onChange={(value) => setTaskForm({ ...taskForm, description: value })} disabled={submitting} minHeight="80px" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskStatus">Status</Label>
                <Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value })} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="archived">Arquivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
      </FormSheet>

      <FormSheet
        open={isTimeDialogOpen}
        onOpenChange={setIsTimeDialogOpen}
        title={editingTimeEntryId ? 'Editar Registro' : 'Registrar Horas'}
        footer={
          <>
            {editingTimeEntryId && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setIsDeleteTimeEntryDialogOpen(true)} 
                disabled={submitting}
                className="w-full sm:w-auto sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setIsTimeDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" form="time-form-pd" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingTimeEntryId ? 'Salvar' : 'Registrar'}</Button>
          </>
        }
      >
          <form id="time-form-pd" onSubmit={handleSubmitTime}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="time">Tempo (HH:mm)</Label>
                <Input 
                  id="time" 
                  type="time"
                  value={timeForm.time} 
                  onChange={(e) => setTimeForm({ ...timeForm, time: e.target.value })} 
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} required disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <ToggleGroup type="single" value={timeForm.entry_type} onValueChange={(v) => v && setTimeForm({ ...timeForm, entry_type: v as 'task' | 'meeting' })} className="justify-start">
                  <ToggleGroupItem value="task" className="gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Tarefa
                  </ToggleGroupItem>
                  <ToggleGroupItem value="meeting" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Reunião
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeDescription">Descrição (opcional)</Label>
                <Input id="timeDescription" value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} placeholder="O que foi feito?" disabled={submitting} />
              </div>
            </div>
          </form>
      </FormSheet>

      <AlertDialog open={isDeleteTimeEntryDialogOpen} onOpenChange={setIsDeleteTimeEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O registro de horas será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTimeEntry}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Complete Timer Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto pr-1">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsPauseDialogOpen(false);
                setPausingTaskId(null);
                setPauseDescription('');
              }} 
              disabled={submitting}
              className="text-destructive hover:text-destructive sm:mr-auto"
            >
              Descartar
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)} disabled={submitting} className="flex-1 sm:flex-initial">
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
                className="flex-1 sm:flex-initial"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Registrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
