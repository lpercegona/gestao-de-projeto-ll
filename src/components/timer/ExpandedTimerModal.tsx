import React, { useCallback, useMemo, useState } from 'react';
import { Play, Pause, Square, X, Check, Contrast } from 'lucide-react';
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
import { toast } from 'sonner';

interface ExpandedTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpandedTimerModal: React.FC<ExpandedTimerModalProps> = ({ open, onOpenChange }) => {
  const [distractionFree, setDistractionFree] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const { data, completeTask } = useData();
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
    pendingTaskLink,
    setPendingTaskLink,
  } = useGlobalTimer();

  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;
  const canStartNewTaskTimer = !hasActiveTimer;

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const currentTaskInfo = useMemo(() => {
    if (pendingTaskLink) {
      return {
        taskName: pendingTaskLink.taskTitleSnapshot,
        taskDescription: pendingTaskLink.taskDescriptionSnapshot || `${pendingTaskLink.projectNameSnapshot || 'Sem projeto'} - ${pendingTaskLink.clientNameSnapshot || 'Sem cliente'}`,
      };
    }

    if (!timerState.taskId) return null;

    const task = data.tasks.find((item) => item.id === timerState.taskId);
    if (!task) return null;

    const project = data.projects.find((item) => item.id === task.project_id);
    const client = project ? data.clients.find((item) => item.id === project.client_id) : null;

    return {
      taskName: task.name,
      taskDescription: `${project?.name || 'Sem projeto'} - ${client?.company || client?.name || 'Sem cliente'}`,
    };
  }, [pendingTaskLink, timerState.taskId, data.tasks, data.projects, data.clients]);

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
          status: task.status,
          description: task.description,
          projectName: project?.name,
          clientName: client?.company || client?.name,
        };
      });
  }, [data.tasks, data.projects, data.clients]);

  const handleStartTaskTimer = useCallback(
    async (taskId: string) => {
      const task = upcomingTasks.find((item) => item.id === taskId);
      if (!task) return;

      const isSamePendingTask = pendingTaskLink?.taskId === taskId;
      if (hasActiveTimer && !isSamePendingTask) {
        toast.error('Já existe um registro em andamento. Finalize o timer atual antes de iniciar outro.');
        return;
      }

      setProcessingTaskId(taskId);

      if (!hasActiveTimer) {
        await startGlobalTimer();
      }

      setPendingTaskLink({
        taskId,
        taskTitleSnapshot: task.name,
        taskDescriptionSnapshot: `${task.projectName || 'Sem projeto'} - ${task.clientName || 'Sem cliente'}`,
        projectNameSnapshot: task.projectName || 'Sem projeto',
        clientNameSnapshot: task.clientName || 'Sem cliente',
        boundAt: Date.now(),
      });

      setProcessingTaskId(null);
    },
    [upcomingTasks, pendingTaskLink?.taskId, hasActiveTimer, startGlobalTimer, setPendingTaskLink],
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      setProcessingTaskId(taskId);
      await completeTask(taskId);
      setProcessingTaskId(null);
    },
    [completeTask],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`!inset-0 !h-screen !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden rounded-none border-0 p-0 [&>button]:hidden ${
          highContrast ? 'bg-black text-white' : 'bg-[#F4F7FB] text-[#64748b]'
        }`}
      >
        <DialogTitle className="sr-only">Timer expandido</DialogTitle>

        <div className="relative flex h-full w-full min-h-0 flex-col px-5 pb-5 pt-4 md:px-8 md:pb-6 md:pt-6">
          <div className="mb-2 flex items-center justify-between md:mb-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-9 w-9 rounded-lg ${highContrast ? 'border-white bg-black text-white hover:bg-white hover:text-black' : 'border-[#64748b] bg-white text-[#64748b] hover:bg-[#e2e8f0]'}`}
              onClick={() => setHighContrast((value) => !value)}
              aria-label="Alternar alto contraste"
              title="Alternar alto contraste"
            >
              <Contrast className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full ${highContrast ? 'text-white hover:bg-white/10 hover:text-white' : 'text-[#64748b] hover:bg-transparent hover:text-[#475569]'}`}
              onClick={() => onOpenChange(false)}
              aria-label="Fechar modal"
            >
              <X className="h-7 w-7 stroke-[1.8]" />
            </Button>
          </div>

          <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col">
            <p
              className={`overflow-hidden text-center text-sm font-semibold leading-tight transition-all duration-500 md:text-2xl ${highContrast ? 'text-white' : 'text-[#64748b]'} ${
                hasActiveTimer || distractionFree
                  ? 'pointer-events-none -translate-y-8 opacity-0 max-h-0 mb-0'
                  : 'translate-y-0 opacity-100 max-h-24 mb-5 md:mb-8'
              }`}
            >
              Inicie o timer para começar
              <br />
              um novo registro
            </p>

            <div
              className={`flex items-center justify-center transition-all duration-500 ${
                hasActiveTimer ? 'mb-3 min-h-[160px] -translate-y-3 md:mb-4 md:min-h-[240px] md:-translate-y-5' : 'mb-5 min-h-[200px] translate-y-0 md:mb-8 md:min-h-[320px]'
              }`}
            >
              <div className="relative flex h-[min(82vw,400px)] w-[min(82vw,400px)] items-center justify-center">
                <img
                  src={fundoTimer}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute h-full w-full animate-pulse-scale animate-[spin_24s_linear_infinite] opacity-35"
                  style={{ animationDirection: 'reverse', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.45))' }}
                />

                <Button
                  onClick={() => startGlobalTimer()}
                  className={`absolute z-10 flex h-[min(46vw,220px)] w-[min(46vw,220px)] items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b] shadow-none transition-all duration-300 hover:scale-[1.02] hover:bg-white ${
                    hasActiveTimer ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  aria-label="Iniciar timer rápido"
                  title="Iniciar timer rápido"
                >
                  <Play className="h-[clamp(40px,16vw,90px)] w-[clamp(40px,16vw,90px)] stroke-[2.4]" />
                </Button>

                <div
                  className={`absolute z-10 flex h-[min(46vw,220px)] w-[min(46vw,220px)] flex-col items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b] transition-all duration-300 ${
                    hasActiveTimer ? 'scale-100 opacity-100' : 'pointer-events-none scale-110 opacity-0'
                  }`}
                >
                  <span className={`font-mono text-2xl tabular-nums md:text-3xl ${isRunning ? 'animate-pulse' : ''}`}>
                    {formatTime(timerState.elapsedSeconds)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`relative z-20 mb-4 flex items-center justify-center gap-2 transition-all duration-300 md:mb-6 ${
                hasActiveTimer ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
              }`}
            >
              {isPaused ? (
                <Button
                  type="button"
                  onClick={() => resumeGlobalTimer()}
                  className={`h-10 w-10 rounded-lg p-0 ${highContrast ? 'bg-white text-black hover:bg-gray-200' : ''}`}
                  aria-label="Retomar timer"
                  title="Retomar timer"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => pauseGlobalTimer()}
                  variant="outline"
                  className={`h-10 w-10 rounded-lg p-0 ${highContrast ? 'border-white bg-black text-white hover:bg-white/10' : 'bg-white'}`}
                  aria-label="Pausar timer"
                  title="Pausar timer"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                onClick={() => completeGlobalTimer()}
                variant="destructive"
                className={`h-10 w-10 rounded-lg p-0 ${highContrast ? 'bg-white text-black hover:bg-gray-200' : ''}`}
                aria-label="Concluir timer"
                title="Concluir timer"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>

            <div
              className={`overflow-hidden text-center transition-all duration-300 ${
                currentTaskInfo ? 'mb-4 max-h-24 translate-y-0 opacity-100' : 'mb-0 max-h-0 -translate-y-2 opacity-0'
              }`}
            >
              {currentTaskInfo ? (
                <>
                  <p className={`line-clamp-2 text-sm font-semibold ${highContrast ? 'text-white' : 'text-[#0f172a]'}`}>{currentTaskInfo.taskName}</p>
                  <p className={`truncate text-xs font-medium ${highContrast ? 'text-gray-300' : 'text-[#64748b]'}`}>{currentTaskInfo.taskDescription}</p>
                </>
              ) : null}
            </div>

            <div className="relative z-10 mt-auto min-h-0">
              <div className="mb-2 flex items-center justify-end gap-2 transition-all duration-300">
                <Label
                  htmlFor="distraction-free"
                  className={`text-sm font-medium transition-all duration-300 ${highContrast ? 'text-white' : 'text-[#64748b]'} ${
                    distractionFree ? 'pointer-events-none max-w-0 -translate-x-2 overflow-hidden opacity-0' : 'max-w-[160px] translate-x-0 opacity-100'
                  }`}
                >
                  Sem distrações
                </Label>
                <Switch id="distraction-free" checked={distractionFree} onCheckedChange={setDistractionFree} />
              </div>

              <Separator
                className={`mb-3 transition-all duration-500 ${highContrast ? 'bg-white/30' : 'bg-[#dce4ee]'} ${
                  distractionFree ? 'opacity-0' : 'opacity-100'
                }`}
              />

              <div
                className={`overflow-hidden transition-all duration-500 ${
                  distractionFree ? 'pointer-events-none max-h-0 translate-y-12 opacity-0' : 'max-h-[420px] translate-y-0 opacity-100'
                }`}
              >
                <h3 className={`mb-3 text-sm font-semibold ${highContrast ? 'text-white' : 'text-[#64748b]'}`}>Próximas atividades</h3>
                <ScrollArea className="h-[28vh] min-h-[180px] max-h-[320px]">
                  <div className="space-y-2 pb-2 pr-2">
                    {upcomingTasks.length > 0 ? (
                      upcomingTasks.map((task) => {
                        const isCurrentTaskTimer = (pendingTaskLink?.taskId || timerState.taskId) === task.id;
                        const isLoading = processingTaskId === task.id;

                        return (
                          <Card
                            key={task.id}
                            className={`flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 shadow-none ${highContrast ? 'border-white bg-black' : 'border-[#d6dee8] bg-transparent'}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-semibold leading-tight ${highContrast ? 'text-white' : 'text-[#0f172a]'}`}
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {task.name}
                              </p>
                              <p className={`truncate text-[0.5rem] font-medium uppercase tracking-wide ${highContrast ? 'text-gray-300' : 'text-[#64748b]'}`}>
                                {task.projectName || 'Sem projeto'} - {task.clientName || 'Sem cliente'}
                              </p>
                            </div>

                            {(!isRunning || isCurrentTaskTimer) && (
                              <div className="ml-1 flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={isCurrentTaskTimer ? 'default' : 'ghost'}
                                  className={`h-9 w-9 rounded-full ${highContrast && !isCurrentTaskTimer ? 'text-white hover:bg-white/10' : ''}`}
                                  onClick={() => handleStartTaskTimer(task.id)}
                                  disabled={isLoading || (!isCurrentTaskTimer && !canStartNewTaskTimer)}
                                  aria-label={`Iniciar registro da tarefa ${task.name}`}
                                  title="Iniciar registro para esta tarefa"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={`h-9 w-9 rounded-full ${highContrast ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-700'}`}
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={isLoading || task.status === 'completed' || task.status === 'done'}
                                  aria-label={`Concluir tarefa ${task.name}`}
                                  title="Concluir tarefa"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </Card>
                        );
                      })
                    ) : (
                      <p className={`text-base md:text-xl ${highContrast ? 'text-gray-300' : 'text-[#64748b]'}`}>Nenhuma tarefa pendente no momento.</p>
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
