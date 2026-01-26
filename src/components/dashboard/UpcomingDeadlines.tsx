import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, FolderKanban, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DeadlineStatus, getDeadlineClasses, getDeadlineTextColor } from '@/lib/deadlineUtils';

export interface DeadlineItem {
  id: string;
  type: 'task' | 'project';
  name: string;
  due_date: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  status: DeadlineStatus;
}

interface UpcomingDeadlinesProps {
  items: DeadlineItem[];
  emptyMessage?: string;
}

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ 
  items,
  emptyMessage = 'Nenhuma entrega com prazo definido.'
}) => {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} className="py-2 border-b border-border last:border-0">
          <Link 
            to={item.type === 'project' ? `/projects/${item.id}` : `/projects/${item.projectId}`}
            className="block hover:bg-muted/50 rounded-md -mx-2 px-2 py-1 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-md flex-shrink-0",
                  getDeadlineClasses(item.status)
                )}>
                  {item.type === 'project' ? (
                    <FolderKanban className="h-4 w-4" />
                  ) : (
                    <ListTodo className="h-4 w-4" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate text-sm">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.type === 'task' && item.projectName && (
                      <>{item.projectName}</>
                    )}
                    {item.type === 'task' && item.projectName && item.clientName && ' • '}
                    {item.clientName && <>{item.clientName}</>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                  getDeadlineClasses(item.status)
                )}>
                  <Calendar className="h-3 w-3" />
                  <span>{format(parseISO(item.due_date), "dd/MM", { locale: ptBR })}</span>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  {item.type === 'project' ? 'Projeto' : 'Tarefa'}
                </Badge>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};
