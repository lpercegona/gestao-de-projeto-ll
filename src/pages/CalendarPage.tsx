import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectDetailDialogContent } from '@/components/projects/ProjectDetailDialogContent';
import { TaskDetailDialogContent } from '@/components/projects/TaskDetailDialogContent';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isSameDay, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FolderKanban, ListTodo, ChevronLeft, ChevronRight, Plus, Bell, CalendarIcon, MoreVertical, Pencil, Trash2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeadlineStatus } from '@/lib/deadlineUtils';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Reminder } from '@/contexts/DataContext';

interface CalendarItem {
  id: string;
  type: 'project' | 'task' | 'reminder';
  name: string;
  due_date: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  status: 'overdue' | 'near' | 'normal';
  originalReminderId?: string;
  recurrence?: 'none' | 'monthly' | 'yearly';
}

export const CalendarPage: React.FC = () => {
  const { data, createReminder, updateReminder, deleteReminder, getProjectHours, getTaskHours, getCreatorName, getClientColumns } = useData();
  const { isClient, isAdminOrMaster, user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderDescription, setReminderDescription] = useState('');
  const [reminderClientId, setReminderClientId] = useState<string>('');
  const [reminderRecurrence, setReminderRecurrence] = useState<'none' | 'monthly' | 'yearly'>('none');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailDialogItem, setDetailDialogItem] = useState<CalendarItem | null>(null);

  // Handle project request submission for clients
  const handleSubmitRequest = async (title: string, briefing: string, customFields: Record<string, string>, desiredDeadline?: string) => {
    if (!user) return;

    const [{ data: clientData }, { data: clientUserData }] = await Promise.all([
    supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
    supabase.from('client_users').select('client_id').eq('user_id', user.id).maybeSingle()]
    );

    const resolvedClientId = clientData?.id || clientUserData?.client_id;

    if (!resolvedClientId) {
      toast.error('Erro: Cliente não encontrado');
      return;
    }

    const { error } = await supabase.
    from('project_requests').
    insert({
      client_id: resolvedClientId,
      title,
      briefing,
      desired_deadline: desiredDeadline || null,
      created_by: user.id
    });

    if (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação');
      return;
    }

    toast.success('Solicitação enviada com sucesso!');
  };

  const handleOpenReminderDialog = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminderId(reminder.id);
      setReminderTitle(reminder.title);
      setReminderDate(parseISO(reminder.reminder_date));
      setReminderDescription(reminder.description || '');
      setReminderClientId(reminder.client_id || 'none');
      setReminderRecurrence(reminder.recurrence || 'none');
    } else {
      setEditingReminderId(null);
      setReminderTitle('');
      setReminderDate(selectedDate);
      setReminderDescription('');
      setReminderClientId('');
      setReminderRecurrence('none');
    }
    setShowReminderDialog(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderTitle.trim() || !reminderDate) {
      toast.error('Preencha o título e a data');
      return;
    }

    const payload = {
      title: reminderTitle.trim(),
      reminder_date: format(reminderDate, 'yyyy-MM-dd'),
      description: reminderDescription.trim() || null,
      client_id: reminderClientId && reminderClientId !== 'none' ? reminderClientId : null,
      recurrence: reminderRecurrence
    };

    if (editingReminderId) {
      const result = await updateReminder(editingReminderId, payload);
      if (result) {
        toast.success('Lembrete atualizado!');
        setShowReminderDialog(false);
      } else {
        toast.error('Erro ao atualizar lembrete');
      }
    } else {
      const result = await createReminder(payload);
      if (result) {
        toast.success('Lembrete criado com sucesso!');
        setShowReminderDialog(false);
      } else {
        toast.error('Erro ao criar lembrete');
      }
    }
  };

  const handleDeleteReminder = async () => {
    if (!deleteConfirmId) return;
    const success = await deleteReminder(deleteConfirmId);
    if (success) {
      toast.success('Lembrete excluído');
    } else {
      toast.error('Erro ao excluir lembrete');
    }
    setDeleteConfirmId(null);
  };

  // Get all items with deadlines, expanding recurring reminders
  const allItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];

    data.projects.
    filter((p) => p.due_date && p.status !== 'completed' && p.status !== 'archived').
    forEach((p) => {
      const client = data.clients.find((c) => c.id === p.client_id);
      const status = getDeadlineStatus(p.due_date!);
      items.push({
        id: p.id,
        type: 'project',
        name: p.name,
        due_date: p.due_date!,
        clientName: isClient ? undefined : (client as any)?.company || client?.name,
        status: status || 'normal'
      });
    });

    data.tasks.
    filter((t) => {
      if (!t.due_date || t.status === 'completed' || t.status === 'archived') return false;
      const parentProject = data.projects.find((p) => p.id === t.project_id);
      return parentProject && parentProject.status !== 'archived';
    }).
    forEach((t) => {
      const project = data.projects.find((p) => p.id === t.project_id);
      const client = project ? data.clients.find((c) => c.id === project.client_id) : null;
      const status = getDeadlineStatus(t.due_date!);
      items.push({
        id: t.id,
        type: 'task',
        name: t.name,
        due_date: t.due_date!,
        projectId: t.project_id,
        projectName: project?.name,
        clientName: isClient ? undefined : (client as any)?.company || client?.name,
        status: status || 'normal'
      });
    });

    // Add reminders with recurrence expansion (only for admin/master_admin)
    if (!isClient) {
      data.reminders.forEach((r) => {
        const client = r.client_id ? data.clients.find((c) => c.id === r.client_id) : null;
        const clientName = client ? (client as any)?.company || client?.name : undefined;
        const baseDate = parseISO(r.reminder_date);
        const recurrence = r.recurrence || 'none';

        const addReminderItem = (dateStr: string, keySuffix: string) => {
          const status = getDeadlineStatus(dateStr);
          items.push({
            id: `${r.id}${keySuffix}`,
            type: 'reminder',
            name: r.title,
            due_date: dateStr,
            clientName,
            status: status || 'normal',
            originalReminderId: r.id,
            recurrence
          });
        };

        if (recurrence === 'monthly') {
          // Original + 12 months ahead
          for (let i = 0; i < 13; i++) {
            const d = addMonths(baseDate, i);
            addReminderItem(format(d, 'yyyy-MM-dd'), i === 0 ? '' : `-m${i}`);
          }
        } else if (recurrence === 'yearly') {
          // Original + 2 years ahead
          for (let i = 0; i < 3; i++) {
            const d = addYears(baseDate, i);
            addReminderItem(format(d, 'yyyy-MM-dd'), i === 0 ? '' : `-y${i}`);
          }
        } else {
          addReminderItem(r.reminder_date, '');
        }
      });
    }

    return items.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [data.projects, data.tasks, data.clients, data.reminders, isClient]);

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    return allItems.filter((item) => isSameDay(parseISO(item.due_date), selectedDate));
  }, [allItems, selectedDate]);

  // Calendar days for the month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleNavigate = (item: CalendarItem) => {
    if (item.type === 'reminder') return;
    const basePath = isClient ? '/my-projects' : '/projects';

    if (item.type === 'project') {
      navigate(`${basePath}/${item.id}`);
    } else if (item.projectId) {
      navigate(`${basePath}/${item.projectId}`);
    }
  };

  const getStatusColor = (status: CalendarItem['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-[hsl(var(--primary)/1)] text-primary-foreground';
      case 'near':
        return 'bg-[hsl(var(--primary)/0.8)] text-primary-foreground';
      default:
        return 'bg-[hsl(var(--primary)/0.65)] text-primary-foreground';
    }
  };

  const getItemIcon = (type: CalendarItem['type']) => {
    switch (type) {
      case 'project':return <FolderKanban className="h-3.5 w-3.5" />;
      case 'task':return <ListTodo className="h-3.5 w-3.5" />;
      case 'reminder':return <Bell className="h-3.5 w-3.5" />;
    }
  };

  const getItemBadge = (type: CalendarItem['type']) => {
    switch (type) {
      case 'project':return <FolderKanban className="h-3.5 w-3.5 text-primary" />;
      case 'task':return <ListTodo className="h-3.5 w-3.5 text-secondary-foreground" />;
      case 'reminder':return <Bell className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getReminderById = (id: string): Reminder | undefined => {
    return data.reminders.find((r) => r.id === id);
  };

  const renderItemCard = (item: CalendarItem, showDate = false) =>
  <div
    key={`${item.type}-${item.id}`}
    className={cn(
      "group flex flex-col items-start gap-2 p-3 rounded-lg border transition-colors sm:flex-row sm:items-center sm:justify-between",
      item.type === 'reminder' ?
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50" :
      "cursor-pointer hover:bg-accent/50"
    )}
    onClick={() => {
      if (item.type === 'project') {
        setDetailDialogItem(item);
      } else if (item.type === 'task') {
        setDetailDialogItem(item);
      }
    }}>
    
      <div className="gap-3 min-w-0 w-full sm:w-auto overflow-hidden flex items-start justify-start">
        <div className={cn("p-1.5 rounded shrink-0", getStatusColor(item.status))}>
          {getItemIcon(item.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm break-words line-clamp-2 pt-0">{item.name}</p>
            {item.recurrence && item.recurrence !== 'none' &&
          <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
          }
          </div>
          <p className="text-xs text-muted-foreground break-words line-clamp-1">
            {[item.clientName, item.projectName].filter(Boolean).join(' • ')}
          </p>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:shrink-0">
        {item.status === 'overdue' &&
      <Badge variant="destructive" className="text-xs shrink-0">Atrasado</Badge>
      }
        {showDate &&
      <span className="text-xs text-muted-foreground">
            {format(parseISO(item.due_date), "dd/MM", { locale: ptBR })}
          </span>
      }
        
        {item.type === 'reminder' && isAdminOrMaster &&
      <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}>
            
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => {
            const reminder = getReminderById(item.originalReminderId || item.id);
            if (reminder) handleOpenReminderDialog(reminder);
          }}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteConfirmId(item.originalReminderId || item.id)}>
            
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      }
      </div>
    </div>;


  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Calendar View */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}>
                  
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              className="rounded-md w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-4",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "flex-1 h-12 text-center text-sm p-0 relative",
                day: "h-12 w-full p-0 font-normal rounded-md aria-selected:opacity-100"
              }}
              components={{
                DayContent: ({ date: dayDate }) => {
                  const dayItems = allItems.filter((item) => isSameDay(parseISO(item.due_date), dayDate));
                  const hasDeadlines = dayItems.length > 0;
                  const isSelected = isSameDay(dayDate, selectedDate);
                  const isCurrentMonth = isSameMonth(dayDate, currentMonth);

                  return (
                    <div className={cn(
                      "relative w-full h-full flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-accent",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                      !isCurrentMonth && "text-muted-foreground opacity-50"
                    )}>
                      <span className="font-mono font-medium">{dayDate.getDate()}</span>
                      {hasDeadlines &&
                      <div className="absolute bottom-1 flex gap-0.5">
                          {dayItems.slice(0, 3).map((item, i) =>
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            item.status === 'overdue' ? "bg-[hsl(var(--primary)/1)]" :
                            item.status === 'near' ? "bg-[hsl(var(--primary)/0.8)]" :
                            isSelected ? "bg-primary-foreground" : "bg-[hsl(var(--primary)/0.65)]"
                          )} />

                        )}
                        </div>
                      }
                    </div>);

                }
              }} />
            
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              {(isClient || isAdminOrMaster) &&
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                    if (isClient) {
                      setShowRequestForm(true);
                    } else {
                      navigate('/projects?new=true');
                    }
                  }}>
                      <FolderKanban className="h-4 w-4 mr-2" />
                      Projeto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    if (isClient) {
                      setShowRequestForm(true);
                    } else {
                      navigate('/projects?newTask=true');
                    }
                  }}>
                      <ListTodo className="h-4 w-4 mr-2" />
                      Tarefa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenReminderDialog()}>
                      <Bell className="h-4 w-4 mr-2" />
                      Lembrete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateItems.length === 0 ?
            <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega para esta data
              </p> :

            <div className="space-y-3">
                {selectedDateItems.map((item) => renderItemCard(item))}
              </div>
            }
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {allItems.filter((i) => i.type !== 'reminder').slice(0, 10).map((item) => renderItemCard(item, true))}
            {allItems.filter((i) => i.type !== 'reminder').length === 0 &&
            <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega programada
              </p>
            }
          </div>
        </CardContent>
      </Card>

      {/* Project Request Form for clients */}
      {isClient &&
      <ProjectRequestForm
        open={showRequestForm}
        onOpenChange={setShowRequestForm}
        onSubmit={handleSubmitRequest} />

      }

      {/* Reminder Dialog for admins (create/edit) */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReminderId ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Título *</Label>
              <Input
                id="reminder-title"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                placeholder="Título do lembrete" />
              
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !reminderDate && "text-muted-foreground"
                    )}>
                    
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reminderDate ? format(reminderDate, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={setReminderDate}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")} />
                  
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={reminderRecurrence} onValueChange={(v) => setReminderRecurrence(v as 'none' | 'monthly' | 'yearly')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem recorrência</SelectItem>
                  <SelectItem value="monthly">Mensal (mesmo dia, todo mês)</SelectItem>
                  <SelectItem value="yearly">Anual (mesmo dia e mês, todo ano)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-description">Descrição</Label>
              <Textarea
                id="reminder-description"
                value={reminderDescription}
                onChange={(e) => setReminderDescription(e.target.value)}
                placeholder="Descrição opcional"
                rows={3} />
              
            </div>
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Select value={reminderClientId} onValueChange={setReminderClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum cliente vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {data.clients.map((client) =>
                  <SelectItem key={client.id} value={client.id}>
                      {(client as any).company || client.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveReminder}>
              {editingReminderId ? 'Salvar' : 'Criar Lembrete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lembrete será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReminder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project/Task Detail Dialog */}
      <Dialog open={!!detailDialogItem} onOpenChange={(open) => !open && setDetailDialogItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl">
          {detailDialogItem?.type === 'project' && (() => {
            const project = data.projects.find((p) => p.id === detailDialogItem.id);
            if (!project) return null;
            const projectData = {
              ...project,
              custom_fields: (project.custom_fields || {}) as Record<string, string>
            };
            return (
              <ProjectDetailDialogContent
                project={projectData}
                clients={data.clients as any[]}
                tasks={data.tasks as any[]}
                timeEntries={data.timeEntries as any[]}
                projectColumns={data.projectColumns as any[]}
                kanbanStages={data.kanbanStages as any[]}
                taskTimers={data.taskTimers as any[]}
                projectAccess={data.projectAccess as any[]}
                profilesByUserId={{}}
                projectMembers={[]}
                isAdminOrMaster={isAdminOrMaster}
                isClientMode={isClient}
                hasPerTaskPermissions={false}
                currentUserId={user?.id}
                getProjectHours={getProjectHours}
                getTaskHours={getTaskHours}
                getCreatorName={getCreatorName}
                getClientColumns={getClientColumns}
                getStatusLabel={(s: string) => s === 'active' ? 'Ativo' : s === 'paused' ? 'Pausado' : s === 'archived' ? 'Arquivado' : s === 'completed' ? 'Concluído' : s}
                getStatusColor={(s: string) => s === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : s === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-muted text-muted-foreground'}
                onEditProject={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.id}`);}}
                onDeleteProject={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.id}`);}}
                onArchiveProject={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.id}`);}}
                onEditTask={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.id}`);}}
                onDeleteTask={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.id}`);}}
                onClose={() => setDetailDialogItem(null)} />);


          })()}
          {detailDialogItem?.type === 'task' && (() => {
            const task = data.tasks.find((t) => t.id === detailDialogItem.id);
            if (!task) return null;
            return (
              <TaskDetailDialogContent
                task={task as any}
                timeEntries={data.timeEntries as any[]}
                kanbanStages={data.kanbanStages as any[]}
                isAdminOrMaster={isAdminOrMaster}
                isClientMode={isClient}
                currentUserId={user?.id}
                getTaskHours={getTaskHours}
                getCreatorName={getCreatorName}
                onEditTask={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.projectId || task.project_id}`);}}
                onDeleteTask={() => {setDetailDialogItem(null);navigate(`/projects/${detailDialogItem.projectId || task.project_id}`);}}
                onClose={() => setDetailDialogItem(null)} />);


          })()}
        </DialogContent>
      </Dialog>
    </div>);

};