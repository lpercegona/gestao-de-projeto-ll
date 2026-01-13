import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { Task } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
    deleteTimeEntry,
    getTaskHours,
    getProjectHours
  } = useData();

  const project = data.projects.find(p => p.id === projectId);
  const client = project ? data.clients.find(c => c.id === project.client_id) : null;
  const tasks = data.tasks.filter(t => t.project_id === projectId);
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    status: 'pending',
  });
  
  const [timeForm, setTimeForm] = useState({
    hours: 1,
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

  const handleOpenTimeDialog = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTimeForm({ hours: 1, description: '', date: format(new Date(), 'yyyy-MM-dd') });
    setIsTimeDialogOpen(true);
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createTimeEntry({
      task_id: selectedTaskId,
      hours: timeForm.hours,
      description: timeForm.description,
      date: timeForm.date,
    });
    toast.success('Horas registradas com sucesso!');
    setSubmitting(false);
    setIsTimeDialogOpen(false);
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
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <PageHeader
        title={project.name}
        description={`Cliente: ${client.name} • ${getProjectHours(project.id)}h registradas`}
        actions={
          <Button onClick={() => handleOpenTaskDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        }
      />

      {project.description && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
        
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
            
            return (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{task.name}</CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenTimeDialog(task.id)}>
                        <Clock className="w-4 h-4 mr-1" />
                        Registrar Horas
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTaskDialog(task)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeletingTask(task); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <span className="font-medium text-foreground">{taskHours}h registradas</span>
                  </div>
                  {taskTimeEntries.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Registros de horas:</p>
                      <div className="space-y-2">
                        {taskTimeEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium text-foreground">{entry.hours}h</span>
                              <span className="text-muted-foreground mx-2">•</span>
                              <span className="text-muted-foreground">{format(new Date(entry.date), "dd 'de' MMM", { locale: ptBR })}</span>
                              {entry.description && <><span className="text-muted-foreground mx-2">•</span><span className="text-muted-foreground">{entry.description}</span></>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await deleteTimeEntry(entry.id); toast.success('Registro excluído!'); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
          <DialogHeader><DialogTitle>Registrar Horas</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitTime}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Horas</Label>
                <Input id="hours" type="number" min="0.25" step="0.25" value={timeForm.hours} onChange={(e) => setTimeForm({ ...timeForm, hours: Number(e.target.value) })} required disabled={submitting} />
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
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Registrar</Button>
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
    </div>
  );
};
