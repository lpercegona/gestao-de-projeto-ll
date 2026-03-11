import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { isSameDay, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DashboardCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const { data } = useData();

  // Get dates with deadlines
  const datesWithDeadlines = useMemo(() => {
    const dates: Date[] = [];
    
    // Projects with due dates
    data.projects.forEach(p => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived') {
        dates.push(parseISO(p.due_date));
      }
    });
    
    // Tasks with due dates
    data.tasks.forEach(t => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived') {
        dates.push(parseISO(t.due_date));
      }
    });
    
    return dates;
  }, [data.projects, data.tasks]);

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    const items: { type: 'project' | 'task'; name: string; id: string; isOverdue: boolean }[] = [];
    
    data.projects.forEach(p => {
      if (p.due_date && p.status !== 'completed' && p.status !== 'archived' && isSameDay(parseISO(p.due_date), date)) {
        const due = parseISO(p.due_date);
        items.push({ type: 'project', name: p.name, id: p.id, isOverdue: isPast(due) && !isToday(due) });
      }
    });
    
    data.tasks.forEach(t => {
      if (t.due_date && t.status !== 'completed' && t.status !== 'archived' && isSameDay(parseISO(t.due_date), date)) {
        const due = parseISO(t.due_date);
        items.push({ type: 'task', name: t.name, id: t.id, isOverdue: isPast(due) && !isToday(due) });
      }
    });
    
    return items;
  }, [data.projects, data.tasks, date]);

  // Custom day renderer to show dots
  const modifiers = {
    hasDeadline: (day: Date) => datesWithDeadlines.some(d => isSameDay(d, day)),
  };

  const modifiersStyles = {
    hasDeadline: {
      position: 'relative' as const,
    },
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
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          components={{
            DayContent: ({ date: dayDate }) => {
              const hasDeadline = datesWithDeadlines.some(d => isSameDay(d, dayDate));
              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  {dayDate.getDate()}
                  {hasDeadline && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
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
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded-md p-1.5 -mx-1.5 overflow-hidden"
                  onClick={() => {
                    if (item.type === 'project') {
                      navigate(`/projects/${item.id}`);
                    } else {
                      const task = data.tasks.find(t => t.id === item.id);
                      if (task) navigate(`/projects/${task.project_id}`);
                    }
                  }}
                >
                  <Badge variant={item.type === 'project' ? 'default' : 'secondary'} className="text-[10px] px-1.5 shrink-0">
                    {item.type === 'project' ? 'Projeto' : 'Tarefa'}
                  </Badge>
                  {item.isOverdue && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 shrink-0">
                      Atrasado
                    </Badge>
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
