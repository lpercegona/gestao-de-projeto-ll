import React, { useCallback, useMemo, useState } from 'react';
import { Play, Pause, Square, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useData } from '@/contexts/DataContext';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';

interface ExpandedTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpandedTimerModal: React.FC<ExpandedTimerModalProps> = ({ open, onOpenChange }) => {
  const [distractionFree, setDistractionFree] = useState(false);
  const { data } = useData();
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
  } = useGlobalTimer();

  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const linkedTask = timerState.taskId ? data.tasks.find((task) => task.id === timerState.taskId) : null;
  const linkedProject = linkedTask ? data.projects.find((project) => project.id === linkedTask.project_id) : null;
  const linkedClient = linkedProject ? data.clients.find((client) => client.id === linkedProject.client_id) : null;

  const upcomingTasks = useMemo(() => {
    return [...data.tasks]
      .filter((task) => task.status !== 'completed' && task.status !== 'done')
      .sort((a, b) => {
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }

        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      })
      .slice(0, 20)
      .map((task) => {
        const project = data.projects.find((item) => item.id === task.project_id);
        const client = project ? data.clients.find((item) => item.id === project.client_id) : null;

        return {
          id: task.id,
          name: task.name,
          dueDate: task.due_date,
          projectName: project?.name,
          clientName: client?.company || client?.name,
        };
      });
  }, [data.tasks, data.projects, data.clients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Timer expandido</DialogTitle>
        <div className="h-full flex flex-col bg-background">
          <div className="flex justify-end p-4">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 gap-6 transition-all duration-300">
            <div
              className={`w-full max-w-2xl flex flex-col items-center gap-4 transition-all duration-300 ${
                isRunning ? 'scale-100' : 'scale-95'
              }`}
            >
              {!hasActiveTimer ? (
                <Button
                  onClick={() => startGlobalTimer()}
                  className="rounded-full w-[33vw] max-w-[360px] min-w-[220px] aspect-square text-2xl"
                >
                  <Play className="h-14 w-14" />
                </Button>
              ) : (
                <>
                  <div className="rounded-full border border-primary/40 w-[66vw] max-w-[640px] min-w-[260px] aspect-square flex items-center justify-center">
                    <span className={`text-5xl md:text-7xl font-mono font-bold tabular-nums ${isRunning ? 'animate-pulse' : ''}`}>
                      {formatTime(timerState.elapsedSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-4 w-full">
                    {isPaused ? (
                      <Button onClick={() => resumeGlobalTimer()} className="w-1/4 min-w-[130px] gap-2">
                        <Play className="h-4 w-4" />
                        Retomar
                      </Button>
                    ) : (
                      <Button onClick={() => pauseGlobalTimer()} variant="outline" className="w-1/4 min-w-[130px] gap-2">
                        <Pause className="h-4 w-4" />
                        Pausar
                      </Button>
                    )}
                    <Button onClick={() => completeGlobalTimer()} variant="destructive" className="w-1/4 min-w-[130px] gap-2">
                      <Square className="h-4 w-4" />
                      Concluir
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div
              className={`w-full max-w-2xl transition-all duration-300 ${
                distractionFree ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-72'
              }`}
            >
              <Separator className="mb-4" />
              {hasActiveTimer ? (
                timerState.taskId && linkedTask ? (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-center">
                    <p className="font-medium text-foreground truncate">{linkedTask.name}</p>
                    <p className="truncate">
                      {linkedProject?.name} • {linkedClient?.company || linkedClient?.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">Registro não vinculado a nenhuma tarefa</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center">Inicie o timer para começar um novo registro.</p>
              )}
            </div>
          </div>

          <div className="border-t p-4 space-y-3 transition-all duration-300">
            <div className="flex items-center justify-between">
              <Label htmlFor="distraction-free" className="text-sm text-muted-foreground">
                sem distrações
              </Label>
              <Switch id="distraction-free" checked={distractionFree} onCheckedChange={setDistractionFree} />
            </div>

            <div
              className={`transition-all duration-300 ${
                distractionFree ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[32vh] opacity-100'
              }`}
            >
              <ScrollArea className="max-h-[32vh] pr-3">
                <div className="space-y-2">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map((task) => (
                      <Card key={task.id} className="border bg-transparent shadow-none px-3 py-2">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.projectName || 'Sem projeto'} • {task.clientName || 'Sem cliente'}
                        </p>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente no momento.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
