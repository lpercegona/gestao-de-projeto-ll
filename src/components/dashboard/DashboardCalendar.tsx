import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Maximize2, FolderKanban, ListTodo, Bell, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { isSameDay, parseISO, isPast, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ProjectDetailSheet } from '@/components/projects/ProjectDetailSheet';

export const DashboardCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const { data, refreshData } = useData();
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);

  const handleCompleteReminder = async (reminderId: string, occurrenceDate?: string) => {
    const reminder = data.reminders.find((r) => r.id === reminderId);
    if (!reminder) return;
    if (reminder.recurrence !== 'none' && occurrenceDate) {
      const newDates = [...(reminder.completed_dates || []), occurrenceDate];
      await supabase.from('reminders').update({ completed_dates: newDates }).eq('id', reminderId);
    } else {
      await supabase.from('reminders').update({ status: 'completed' }).eq('id', reminderId);
    }
    refreshData();
  };

  const { datesWithProjectsOrTasks, datesWithReminders } = useMemo(() => {
    const projTaskDates: Date[] = [];
    const reminderDates: Date[] = [];

    data.projects.forEach((p) => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived') projTaskDates.push(parseISO(p.due_date));
    });
    data.tasks.forEach((t) => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived') {
        const project = data.projects.find((p) => p.id === t.project_id);
        if (project && project.status !== 'archived') projTaskDates.push(parseISO(t.due_date));
      }
    });
    data.reminders.filter((r) => r.status !== 'completed').forEach((r) => {
      const baseDate = parseISO(r.reminder_date);
      if (r.recurrence === 'monthly') {
        for (let i = 0; i < 13; i++) { const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate()); if (!r.completed_dates?.includes(d.toISOString().slice(0, 10))) reminderDates.push(d); }
      } else if (r.recurrence === 'yearly') {
        for (let i = 0; i < 3; i++) { const d = new Date(baseDate.getFullYear() + i, baseDate.getMonth(), baseDate.getDate()); if (!r.completed_dates?.includes(d.toISOString().slice(0, 10))) reminderDates.push(d); }
      } else { reminderDates.push(baseDate); }
    });
    return { datesWithProjectsOrTasks: projTaskDates, datesWithReminders: reminderDates };
  }, [data.projects, data.tasks, data.reminders]);

  const selectedDateItems = useMemo(() => {
    const items: { type: 'project' | 'task' | 'reminder'; name: string; id: string; isOverdue: boolean; projectId?: string; reminderDate?: string; recurrence?: string }[] = [];
    data.projects.forEach((p) => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived' && isSameDay(parseISO(p.due_date), date)) {
        const due = parseISO(p.due_date);
        items.push({ type: 'project', name: p.name, id: p.id, isOverdue: isPast(due) && !isToday(due) });
      }
    });
    data.tasks.forEach((t) => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived' && isSameDay(parseISO(t.due_date), date)) {
        const project = data.projects.find((p) => p.id === t.project_id);
        if (!project || project.status === 'archived') return;
        const due = parseISO(t.due_date);
        items.push({ type: 'task', name: t.name, id: t.id, isOverdue: isPast(due) && !isToday(due), projectId: t.project_id });
      }
    });
    data.reminders.filter((r) => r.status !== 'completed').forEach((r) => {
      const baseDate = parseISO(r.reminder_date);
      const addIfMatch = (d: Date) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (isSameDay(d, date) && !r.completed_dates?.includes(dateStr)) {
          items.push({ type: 'reminder', name: r.title, id: r.id, isOverdue: isPast(d) && !isToday(d), reminderDate: dateStr, recurrence: r.recurrence });
        }
      };
      if (r.recurrence === 'monthly') { for (let i = 0; i < 13; i++) addIfMatch(new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())); }
      else if (r.recurrence === 'yearly') { for (let i = 0; i < 3; i++) addIfMatch(new Date(baseDate.getFullYear() + i, baseDate.getMonth(), baseDate.getDate())); }
      else { addIfMatch(baseDate); }
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

  const handleItemClick = (item: { type: string; id: string; projectId?: string }) => {
    if (item.type === 'project') setDetailProjectId(item.id);
    else if (item.type === 'task' && item.projectId) setDetailProjectId(item.projectId);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate('/calendar')}>
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
                const hasProjTask = datesWithProjectsOrTasks.some((d) => isSameDay(d, dayDate));
                const hasReminder = datesWithReminders.some((d) => isSameDay(d, dayDate));
                return (
                  <div className="relative w-full h-full flex items-center justify-center font-mono font-medium">
                    {dayDate.getDate()}
                    {(hasProjTask || hasReminder) &&
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasProjTask && <div className="w-1 h-1 rounded-full bg-primary" />}
                        {hasReminder && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                      </div>
                    }
                  </div>
                );
              }
            }}
          />

          {selectedDateItems.length > 0 &&
            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Entregas nesta data:</p>
              <div className="space-y-1.5">
                {selectedDateItems.slice(0, 3).map((item) =>
                  <div
                    key={`${item.type}-${item.id}`}
                    className={cn(
                      "flex items-center gap-2 text-sm rounded-md p-1.5 -mx-1.5 overflow-hidden",
                      item.type === 'reminder' ? "bg-amber-50 dark:bg-amber-950/30" : 'cursor-pointer hover:bg-accent/50'
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    {getItemIcon(item.type)}
                    {item.isOverdue && <span className="text-[10px] text-destructive font-medium shrink-0">Atrasado</span>}
                    <span className="break-words line-clamp-1 min-w-0 flex-1">{item.name}</span>
                    {item.type === 'reminder' &&
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-green-600" title="Concluir lembrete"
                        onClick={(e) => { e.stopPropagation(); handleCompleteReminder(item.id, item.reminderDate); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  </div>
                )}
                {selectedDateItems.length > 3 && <p className="text-xs text-muted-foreground">+{selectedDateItems.length - 3} mais...</p>}
              </div>
            </div>
          }
        </CardContent>
      </Card>

      <ProjectDetailSheet
        projectId={detailProjectId}
        open={!!detailProjectId}
        onOpenChange={(open) => { if (!open) setDetailProjectId(null); }}
      />
    </>
  );
};
