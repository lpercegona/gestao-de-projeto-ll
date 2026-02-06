import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { formatHours } from '@/lib/formatHours';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const UltimosRegistrosPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data } = useData();

  // Get recent time entries with task, project, and client info
  const recentTimeEntries = data.timeEntries.slice(0, 5).map(entry => {
    const task = data.tasks.find(t => t.id === entry.task_id);
    const project = task ? data.projects.find(p => p.id === task.project_id) : null;
    const client = project ? data.clients.find(c => c.id === project.client_id) : null;
    return {
      ...entry,
      taskName: task?.name || 'Tarefa não encontrada',
      projectName: project?.name || 'Projeto não encontrado',
      clientName: (client as any)?.company || client?.name || 'Cliente não encontrado',
    };
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Últimos Registros
              </CardTitle>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {recentTimeEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum registro de horas ainda.</p>
            ) : (
              <ul className="space-y-3">
                {recentTimeEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{entry.taskName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.projectName} • {entry.clientName}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap sm:shrink-0 min-w-0">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(entry.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        {formatHours(entry.hours)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
