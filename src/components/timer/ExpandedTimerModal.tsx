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
import fundoTimer from '@/assets/fundo-timer.webp';

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
      <DialogContent className="!inset-0 !h-screen !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden rounded-none border-0 bg-[#F4F7FB] p-0 text-[#64748b] [&>button]:hidden">
        <DialogTitle className="sr-only">Timer expandido</DialogTitle>

        <div className="relative flex h-full w-full min-h-0 flex-col px-5 pb-5 pt-4 md:px-8 md:pb-6 md:pt-6">
          <div className="mb-2 flex justify-end md:mb-3">
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

          <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col">
            <p className="mb-5 text-center text-sm font-semibold leading-tight text-[#64748b] md:mb-8 md:text-2xl">
              Inicie o timer para começar
              <br />
              um novo registro
            </p>

            <div className="mb-5 flex min-h-[200px] items-center justify-center md:mb-8 md:min-h-[320px]">
              <div className="relative flex h-[min(82vw,400px)] w-[min(82vw,400px)] items-center justify-center">
                <img
                  src={fundoTimer}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute h-full w-full animate-pulse-scale animate-[spin_24s_linear_infinite] opacity-35"
                  style={{ animationDirection: 'reverse', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.45))' }}
                />

                {!hasActiveTimer ? (
                  <Button
                    onClick={() => startGlobalTimer()}
                    className="relative z-10 flex h-[min(46vw,220px)] w-[min(46vw,220px)] items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b] shadow-none transition-transform duration-300 hover:scale-[1.02] hover:bg-white"
                  >
                    <Play className="h-[min(26vw,128px)] w-[min(26vw,128px)] stroke-[2.4]" />
                  </Button>
                ) : (
                  <div className="relative z-10 flex h-[min(46vw,220px)] w-[min(46vw,220px)] flex-col items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b]">
                    <span className={`text-2xl tabular-nums md:text-3xl ${isRunning ? 'animate-pulse' : ''}`}>
                      {formatTime(timerState.elapsedSeconds)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {hasActiveTimer ? (
              <div className="mb-4 flex items-center justify-center gap-3 md:mb-6">
                {isPaused ? (
                  <Button onClick={() => resumeGlobalTimer()} className="gap-2 rounded-full">
                    <Play className="h-4 w-4" />
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

            <div className="mt-auto min-h-0">
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="distraction-free" className="text-sm font-medium text-[#64748b]">
                  Sem distrações
                </Label>
                <Switch id="distraction-free" checked={distractionFree} onCheckedChange={setDistractionFree} />
              </div>

              <Separator className="mb-3 bg-[#dce4ee]" />

              <div className={`${distractionFree ? 'hidden' : 'block'}`}>
                <h3 className="mb-3 text-sm font-semibold text-[#64748b]">Próximas atividades</h3>
                <div className="rounded-2xl border border-[#d6dee8] bg-white/40 p-3">
                  <ScrollArea className="h-[28vh] min-h-[180px] max-h-[320px] pr-2">
                    <div className="space-y-3 pb-2">
                      {upcomingTasks.length > 0 ? (
                        upcomingTasks.map((task) => (
                          <Card
                            key={task.id}
                            className="flex items-center justify-between rounded-2xl border border-[#d6dee8] bg-transparent px-4 py-3 shadow-none"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold leading-tight text-[#0f172a] md:text-lg">{task.name}</p>
                              <p className="truncate text-sm font-medium text-[#64748b] md:text-base">
                                {task.projectName || 'Sem projeto'} - {task.clientName || 'Sem cliente'}
                              </p>
                            </div>
                            <Play className="h-6 w-6 shrink-0 text-[#64748b]" />
                          </Card>
                        ))
                      ) : (
                        <p className="text-base text-[#64748b] md:text-xl">Nenhuma tarefa pendente no momento.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
