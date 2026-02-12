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
import simboloOras from '@/assets/svg-fundo-play.svg';

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
          projectName: project?.name,
          clientName: client?.company || client?.name,
        };
      });
  }, [data.tasks, data.projects, data.clients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-screen !max-w-none !h-screen rounded-none border-0 bg-[#F4F7FB] p-0 text-[#64748b] [&>button]:hidden">
        <DialogTitle className="sr-only">Timer expandido</DialogTitle>

        <div className="relative flex h-full w-full flex-col px-5 pb-6 pt-6 md:px-8">
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#64748b] hover:bg-transparent hover:text-[#475569]"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar modal"
            >
              <X className="h-7 w-7 stroke-[1.8]" />
            </Button>
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
            <p className="mb-8 text-center text-xl font-semibold leading-tight text-[#64748b] md:text-2xl">
              Inicie o timer para começar
              <br />
              um novo registro
            </p>

            <div className="mb-8 flex min-h-[320px] items-center justify-center">
              <div className="relative flex items-center justify-center h-[400px] w-[400px]">
                <img
                  src={simboloOras}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute  animate-[spin_24s_linear_infinite] opacity-35"
                  style={{ animationDirection: 'reverse', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.45))' }}
                />

                {!hasActiveTimer ? (
                  <Button
                    onClick={() => startGlobalTimer()}
                    className="relative z-10 h-82 w-82 rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b] shadow-none transition-transform duration-300 hover:scale-[1.02] hover:bg-white"
                  >
                    <Play className="h-64 w-64 stroke-[2.4]" />
                  </Button>
                ) : (
                  <div className="relative z-10 flex h-82 w-82 flex-col items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b]">
                    <span className={`text-3xl font-semibold tabular-nums ${isRunning ? 'animate-pulse' : ''}`}>
                      {formatTime(timerState.elapsedSeconds)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {hasActiveTimer ? (
              <div className="mb-6 flex items-center justify-center gap-3">
                {isPaused ? (
                  <Button onClick={() => resumeGlobalTimer()} className="gap-2 rounded-full">
                    <Play className="h-64 w-64" />
                    Retomar
                  </Button>
                ) : (
                  <Button onClick={() => pauseGlobalTimer()} variant="outline" className="gap-2 rounded-full bg-white">
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )}
                <Button onClick={() => completeGlobalTimer()} variant="destructive" className="gap-2 rounded-full">
                  <Square className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            ) : null}

            <div className="mt-auto">
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="distraction-free" className="text-sm font-medium text-[#64748b]">
                  Sem distrações
                </Label>
                <Switch id="distraction-free" checked={distractionFree} onCheckedChange={setDistractionFree} />
              </div>

              <Separator className="mb-3 bg-[#dce4ee]" />

              <div className={`${distractionFree ? 'hidden' : 'block'}`}>
                <h3 className="mb-3 text-xl font-semibold text-[#64748b]">Próximas atividades</h3>
                <ScrollArea className="max-h-[32vh] pr-2">
                  <div className="space-y-3 pb-2">
                    {upcomingTasks.length > 0 ? (
                      upcomingTasks.map((task) => (
                        <Card
                          key={task.id}
                          className="flex items-center justify-between rounded-2xl border border-[#d6dee8] bg-transparent px-4 py-3 shadow-none"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold leading-tight text-[#0f172a]">{task.name}</p>
                            <p className="truncate text-base font-medium text-[#64748b]">
                              {task.projectName || 'Sem projeto'} - {task.clientName || 'Sem cliente'}
                            </p>
                          </div>
                          <Play className="h-6 w-6 shrink-0 text-[#64748b]" />
                        </Card>
                      ))
                    ) : (
                      <p className="text-xl text-[#64748b]">Nenhuma tarefa pendente no momento.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
