import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Clock, ChevronDown, MoreVertical, Calendar } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatHours } from '@/lib/formatHours';
import { cn } from '@/lib/utils';
import { WysiwygContent } from '@/components/ui/wysiwyg-editor';
import { Badge } from '@/components/ui/badge';

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
    due_date?: string | null;
    created_by: string | null;
    is_pending_approval?: boolean;
    approval_label?: string;
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
  onRequestEdit?: () => void;
  compact?: boolean;
  showStatus?: boolean;
  iconOnly?: boolean;
  allowTaskEdit?: boolean;
  allowTaskDelete?: boolean;
  showRegisterTimeButton?: boolean;
  allowTimeEntryEdit?: boolean;
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
  onRequestEdit,
  compact = false,
  showStatus = false,
  iconOnly = false,
  allowTaskEdit = true,
  allowTaskDelete = true,
  showRegisterTimeButton = true,
  allowTimeEntryEdit = true,
}) => {
  const [entriesOpen, setEntriesOpen] = React.useState(false);

  // Due date status calculation
  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    
    const dueDate = parseISO(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return 'overdue';
    }
    
    const daysUntilDue = differenceInDays(dueDate, today);
    if (daysUntilDue <= 3) {
      return 'near';
    }
    
    return 'normal';
  };

  const dueDateStatus = getDueDateStatus();

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
      case 'archived': return { name: 'Arquivo', color: '#64748b' };
      default: return { name: status, color: null };
    }
  };

  const stageInfo = getStageInfo(task.status);
  const isPendingApproval = Boolean(task.is_pending_approval);

  return (
    <div className="bg-card border rounded-lg p-3 group relative">
      {/* Actions */}
      {(allowTaskEdit || allowTaskDelete || onRequestEdit) && (
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allowTaskEdit && (
                <DropdownMenuItem onClick={onEditTask}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onRequestEdit && (
                <DropdownMenuItem onClick={onRequestEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Solicitar edição
                </DropdownMenuItem>
              )}
              {allowTaskDelete && (
                <DropdownMenuItem className="text-destructive" onClick={onDeleteTask}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="pr-16">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h4 className="font-medium text-sm text-foreground">{task.name}</h4>
          {isPendingApproval && (
            <Badge variant="outline" className="text-[10px] h-5">
              {task.approval_label || 'Aguardando aprovação'}
            </Badge>
          )}
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
          <WysiwygContent content={task.description} className="text-xs text-muted-foreground mb-2 line-clamp-2" />
        )}

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TaskTimer
            taskId={task.id}
            taskStatus={task.status}
            activeTimer={activeTimer}
            onStart={onStartTimer}
            onStop={onStopTimer}
            onComplete={onCompleteTask}
            iconOnly={iconOnly}
          />
          {showRegisterTimeButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRegisterTime(task.id)} 
                  className="h-7 px-2 text-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar tempo</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">{formatHours(taskHours)}</span>
          <span>por {getCreatorName(task.created_by)}</span>
          {task.due_date && task.status !== 'completed' && task.status !== 'done' && task.status !== 'archived' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "flex items-center gap-1 font-medium",
                  dueDateStatus === 'overdue' && "text-red-500",
                  dueDateStatus === 'near' && "text-amber-500",
                  dueDateStatus === 'normal' && "text-muted-foreground"
                )}>
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(task.due_date), "dd/MM", { locale: ptBR })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {dueDateStatus === 'overdue' && "Prazo vencido: "}
                  {dueDateStatus === 'near' && "Prazo próximo: "}
                  {format(parseISO(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
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
                className={cn(
                  "group/entry relative text-xs bg-muted/50 rounded px-2 py-1.5",
                  allowTimeEntryEdit && "pr-8 cursor-pointer hover:bg-muted"
                )}
                onClick={() => allowTimeEntryEdit && onRegisterTime(task.id, { id: entry.id, hours: entry.hours, description: entry.description, date: entry.date, entry_type: entry.entry_type })}
              >
                {allowTimeEntryEdit && (
                  <div className="absolute top-1 right-1 md:opacity-0 md:group-hover/entry:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Pencil className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-foreground">{formatHours(entry.hours)}</span>
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
