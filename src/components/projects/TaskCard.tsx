import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Clock, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  entry_type?: 'task' | 'meeting';
  created_by: string | null;
}

interface TaskTimer {
  id: string;
  task_id: string;
  started_at: string;
}

interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_by: string | null;
  };
  taskHours: number;
  timeEntries: TimeEntry[];
  activeTimer: TaskTimer | null;
  kanbanStages?: KanbanStage[];
  getCreatorName: (userId: string | null) => string;
  onEditTask: () => void;
  onDeleteTask: () => void;
  onRegisterTime: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer: () => Promise<void>;
  onStopTimer: () => Promise<void>;
  onCompleteTask: () => Promise<void>;
  compact?: boolean;
  showStatus?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  taskHours,
  timeEntries,
  activeTimer,
  kanbanStages = [],
  getCreatorName,
  onEditTask,
  onDeleteTask,
  onRegisterTime,
  onStartTimer,
  onStopTimer,
  onCompleteTask,
  compact = false,
  showStatus = false,
}) => {
  const [entriesOpen, setEntriesOpen] = React.useState(false);

  // Find the kanban stage for this task's status
  const getStageInfo = (status: string) => {
    const stage = kanbanStages.find(s => s.name === status);
    if (stage) {
      return { name: stage.name, color: stage.color };
    }
    // Fallback for legacy status values
    switch (status) {
      case 'pending': return { name: 'Pendente', color: '#eab308' };
      case 'in_progress': return { name: 'Em Andamento', color: '#3b82f6' };
      case 'completed': return { name: 'Concluída', color: '#22c55e' };
      default: return { name: status, color: null };
    }
  };

  const stageInfo = getStageInfo(task.status);

  return (
    <div className="bg-card border rounded-lg p-3 group relative">
      {/* Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditTask}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDeleteTask}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="pr-16">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h4 className="font-medium text-sm text-foreground">{task.name}</h4>
          {showStatus && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: stageInfo.color ? `${stageInfo.color}20` : 'hsl(var(--muted))',
                color: stageInfo.color || 'hsl(var(--muted-foreground))',
                border: `1px solid ${stageInfo.color || 'hsl(var(--border))'}40`
              }}
            >
              {stageInfo.name}
            </span>
          )}
        </div>

        {task.description && !compact && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TaskTimer
            taskId={task.id}
            taskStatus={task.status}
            activeTimer={activeTimer}
            onStart={onStartTimer}
            onStop={onStopTimer}
            onComplete={onCompleteTask}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onRegisterTime(task.id)} 
            className="h-7 px-2 text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{taskHours}h</span>
          <span>por {getCreatorName(task.created_by)}</span>
        </div>
      </div>

      {/* Time entries dropdown */}
      {timeEntries.length > 0 && (
        <Collapsible open={entriesOpen} onOpenChange={setEntriesOpen} className="mt-2 pt-2 border-t">
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full">
            <ChevronDown className={`w-3 h-3 transition-transform ${entriesOpen ? 'rotate-180' : ''}`} />
            {timeEntries.length} {timeEntries.length === 1 ? 'registro' : 'registros'} de horas
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5">
            {timeEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="group/entry relative text-xs bg-muted/50 rounded px-2 py-1.5 pr-8 cursor-pointer hover:bg-muted"
                onClick={() => onRegisterTime(task.id, { id: entry.id, hours: entry.hours, description: entry.description, date: entry.date, entry_type: entry.entry_type })}
              >
                <div className="absolute top-1 right-1 md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-foreground">{entry.hours}h</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{format(parseISO(entry.date), "dd/MM", { locale: ptBR })}</span>
                  {entry.entry_type === 'meeting' && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-primary font-medium">Reunião</span>
                    </>
                  )}
                  {entry.description && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground truncate max-w-[100px]">{entry.description}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
