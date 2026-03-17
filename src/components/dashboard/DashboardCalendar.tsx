import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Maximize2, FolderKanban, ListTodo, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useData } from '@/contexts/DataContext';
import { isSameDay, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const DashboardCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const { data } = useData();

  // Separate dates by type for dot indicators
  const { datesWithProjectsOrTasks, datesWithReminders } = useMemo(() => {
    const projTaskDates: Date[] = [];
    const reminderDates: Date[] = [];
    
    data.projects.forEach(p => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived') {
        projTaskDates.push(parseISO(p.due_date));
      }
    });
    
    data.tasks.forEach(t => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived') {
        const project = data.projects.find(p => p.id === t.project_id);
        if (project && project.status !== 'archived') {
          projTaskDates.push(parseISO(t.due_date));
        }
      }
    });

    data.reminders.forEach(r => {
      reminderDates.push(parseISO(r.reminder_date));
    });
    
    return { datesWithProjectsOrTasks: projTaskDates, datesWithReminders: reminderDates };
  }, [data.projects, data.tasks, data.reminders]);

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    const items: { type: 'project' | 'task' | 'reminder'; name: string; id: string; isOverdue: boolean; projectId?: string }[] = [];
    
    data.projects.forEach(p => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived' && isSameDay(parseISO(p.due_date), date)) {
        const due = parseISO(p.due_date);
        items.push({ type: 'project', name: p.name, id: p.id, isOverdue: isPast(due) && !isToday(due) });
      }
    });
    
    data.tasks.forEach(t => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived' && isSameDay(parseISO(t.due_date), date)) {
        const project = data.projects.find(p => p.id === t.project_id);
        if (!project || project.status === 'archived') return;
        const due = parseISO(t.due_date);
        items.push({ type: 'task', name: t.name, id: t.id, isOverdue: isPast(due) && !isToday(due), projectId: t.project_id });
      }
    });

    data.reminders.forEach(r => {
      if (isSameDay(parseISO(r.reminder_date), date)) {
        const due = parseISO(r.reminder_date);
        items.push({ type: 'reminder', name: r.title, id: r.id, isOverdue: isPast(due) && !isToday(due) });
      }
    });
    
    return items;
  }, [data.projects, data.tasks, data.reminders, date]);

  const getItemIcon = (type: 'project' | 'task' | 'reminder') => {
    switch (type) {
      case 'project': return <FolderKanban className="h-3 w-3 text-primary" />;
      case 'task': return <ListTodo className="h-3 w-3 text-secondary-foreground" />;
      case 'reminder': return <Bell className="h-3 w-3 text-amber-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => navigate('/calendar')}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          locale={ptBR}
          className="rounded-md w-full"
          components={{
            DayContent: ({ date: dayDate }) => {
              const hasProjTask = datesWithProjectsOrTasks.some(d => isSameDay(d, dayDate));
              const hasReminder = datesWithReminders.some(d => isSameDay(d, dayDate));
              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  {dayDate.getDate()}
                  {(hasProjTask || hasReminder) && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {hasProjTask && (
                        <div className="w-1 h-1 rounded-full bg-primary" />
                      )}
                      {hasReminder && (
                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                      )}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
        
        {/* Selected date items */}
        {selectedDateItems.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Entregas nesta data:
            </p>
            <div className="space-y-1.5">
              {selectedDateItems.slice(0, 3).map(item => (
                <div 
                  key={`${item.type}-${item.id}`}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-md p-1.5 -mx-1.5 overflow-hidden",
                    item.type === 'reminder'
                      ? "bg-amber-50 dark:bg-amber-950/30"
                      : item.type !== 'reminder' ? 'cursor-pointer hover:bg-accent/50' : ''
                  )}
                  onClick={() => {
                    if (item.type === 'project') {
                      navigate(`/projects/${item.id}`);
                    } else if (item.type === 'task' && item.projectId) {
                      navigate(`/projects/${item.projectId}`);
                    }
                  }}
                >
                  {getItemIcon(item.type)}
                  {item.isOverdue && (
                    <span className="text-[10px] text-destructive font-medium shrink-0">
                      Atrasado
                    </span>
                  )}
                  <span className="break-words line-clamp-1 min-w-0">{item.name}</span>
                </div>
              ))}
              {selectedDateItems.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{selectedDateItems.length - 3} mais...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
