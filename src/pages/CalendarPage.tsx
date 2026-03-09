import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isSameDay, parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FolderKanban, ListTodo, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeadlineStatus } from '@/lib/deadlineUtils';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarItem {
  id: string;
  type: 'project' | 'task';
  name: string;
  due_date: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  status: 'overdue' | 'near' | 'normal';
}

export const CalendarPage: React.FC = () => {
  const { data } = useData();
  const { isClient, user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Handle project request submission for clients
  const handleSubmitRequest = async (title: string, briefing: string, customFields: Record<string, string>, desiredDeadline?: string) => {
    if (!user) return;

    const [{ data: clientData }, { data: clientUserData }] = await Promise.all([
      supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('client_users').select('client_id').eq('user_id', user.id).maybeSingle(),
    ]);

    const resolvedClientId = clientData?.id || clientUserData?.client_id;

    if (!resolvedClientId) {
      toast.error('Erro: Cliente não encontrado');
      return;
    }

    const { error } = await supabase
      .from('project_requests')
      .insert({
        client_id: resolvedClientId,
        title,
        briefing,
        desired_deadline: desiredDeadline || null,
        created_by: user.id,
      });

    if (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação');
      return;
    }

    toast.success('Solicitação enviada com sucesso!');
  };

  // Get all items with deadlines
  const allItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    
    data.projects
      .filter(p => p.due_date && p.status !== 'completed' && p.status !== 'archived' && p.status !== 'archived')
      .forEach(p => {
        const client = data.clients.find(c => c.id === p.client_id);
        const status = getDeadlineStatus(p.due_date!);
        items.push({
          id: p.id,
          type: 'project',
          name: p.name,
          due_date: p.due_date!,
          // Only show client name for non-client users
          clientName: isClient ? undefined : ((client as any)?.company || client?.name),
          status: status || 'normal',
        });
      });
    
    data.tasks
      .filter(t => t.due_date && t.status !== 'completed' && t.status !== 'done' && t.status !== 'archived')
      .forEach(t => {
        const project = data.projects.find(p => p.id === t.project_id);
        const client = project ? data.clients.find(c => c.id === project.client_id) : null;
        const status = getDeadlineStatus(t.due_date!);
        items.push({
          id: t.id,
          type: 'task',
          name: t.name,
          due_date: t.due_date!,
          projectId: t.project_id,
          projectName: project?.name,
          // Only show client name for non-client users
          clientName: isClient ? undefined : ((client as any)?.company || client?.name),
          status: status || 'normal',
        });
      });
    
    return items.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [data.projects, data.tasks, data.clients]);

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    return allItems.filter(item => isSameDay(parseISO(item.due_date), selectedDate));
  }, [allItems, selectedDate]);

  // Get dates with deadlines for the calendar
  const datesWithDeadlines = useMemo(() => {
    return allItems.map(item => parseISO(item.due_date));
  }, [allItems]);

  // Calendar days for the month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleNavigate = (item: CalendarItem) => {
    // For clients, navigate to /my-projects instead of /projects
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
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
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
                day: "h-12 w-full p-0 font-normal aria-selected:opacity-100",
              }}
              components={{
                DayContent: ({ date: dayDate }) => {
                  const dayItems = allItems.filter(item => isSameDay(parseISO(item.due_date), dayDate));
                  const hasDeadlines = dayItems.length > 0;
                  const isSelected = isSameDay(dayDate, selectedDate);
                  const isCurrentMonth = isSameMonth(dayDate, currentMonth);
                  
                  return (
                    <div className={cn(
                      "relative w-full h-full flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-accent",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                      !isCurrentMonth && "text-muted-foreground opacity-50"
                    )}>
                      <span>{dayDate.getDate()}</span>
                      {hasDeadlines && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {dayItems.slice(0, 3).map((item, i) => (
                            <div 
                              key={i}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                item.status === 'overdue' ? "bg-[hsl(var(--primary)/1)]" :
                                item.status === 'near' ? "bg-[hsl(var(--primary)/0.8)]" : 
                                isSelected ? "bg-primary-foreground" : "bg-[hsl(var(--primary)/0.65)]"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              {isClient && (
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => setShowRequestForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
      
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega para esta data
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateItems.map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={cn(
                      "flex flex-col items-start gap-2 p-3 rounded-lg border transition-colors sm:flex-row sm:items-center sm:justify-between",
                      !isClient && "cursor-pointer hover:bg-accent/50"
                    )}
                    onClick={() => !isClient && handleNavigate(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto overflow-hidden">
                      <div className={cn("p-1.5 rounded shrink-0", getStatusColor(item.status))}>
                        {item.type === 'project' ? (
                          <FolderKanban className="h-3.5 w-3.5" />
                        ) : (
                          <ListTodo className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm break-words line-clamp-2">{item.name}</p>
                        <p className="text-xs text-muted-foreground break-words line-clamp-1">
                          {[item.clientName, item.projectName].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-end sm:shrink-0">
                      {item.status === 'overdue' && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Atrasado
                        </Badge>
                      )}
                      <Badge variant={item.type === 'project' ? 'default' : 'secondary'} className="text-xs">
                        {item.type === 'project' ? 'Projeto' : 'Tarefa'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {allItems.slice(0, 10).map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className={cn(
                  "flex flex-col items-start gap-2 p-3 rounded-lg border transition-colors sm:flex-row sm:items-center sm:justify-between",
                  !isClient && "cursor-pointer hover:bg-accent/50"
                )}
                onClick={() => !isClient && handleNavigate(item)}
              >
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                  <div className={cn("p-1.5 rounded", getStatusColor(item.status))}>
                    {item.type === 'project' ? (
                      <FolderKanban className="h-3.5 w-3.5" />
                    ) : (
                      <ListTodo className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[item.clientName, item.projectName].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(item.due_date), "dd/MM", { locale: ptBR })}
                  </span>
                  <Badge variant={item.type === 'project' ? 'default' : 'secondary'} className="text-xs">
                    {item.type === 'project' ? 'Projeto' : 'Tarefa'}
                  </Badge>
                </div>
              </div>
            ))}
            {allItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma entrega programada
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Request Form for clients */}
      {isClient && (
        <ProjectRequestForm 
          open={showRequestForm} 
          onOpenChange={setShowRequestForm}
          onSubmit={handleSubmitRequest}
        />
      )}
    </div>
  );
};
