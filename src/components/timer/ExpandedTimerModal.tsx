import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getWysiwygPlainText } from '@/lib/wysiwyg';

interface ExpandedTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpandedTimerModal: React.FC<ExpandedTimerModalProps> = ({ open, onOpenChange }) => {
  const [distractionFree, setDistractionFree] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const { data, completeTask } = useData();
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer: buActiveTimer,
    taskBinding,
    setTaskBinding,
  } = useGlobalTimer();

  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;
  const canStartNewTaskTimer = !buActiveTimer;
  const [shouldAnimateIntroText, setShouldAnimateIntroText] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setModalReady(true));
      return () => { cancelAnimationFrame(raf); };
    } else {
      setModalReady(false);
      setImageLoaded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setShouldAnimateIntroText(false);
      return;
    }

    const shouldHideIntroText = buActiveTimer || distractionFree;
    if (!shouldHideIntroText) {
      setShouldAnimateIntroText(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setShouldAnimateIntroText(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open, buActiveTimer, distractionFree]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const currentTaskInfo = useMemo(() => {
    if (taskBinding) {
      return {
        taskName: taskBinding.snapshot.taskTitle,
        projectName: taskBinding.snapshot.projectName || 'Sem projeto',
        clientName: taskBinding.snapshot.clientName || 'Sem cliente',
      };
    }

    if (!timerState.taskId) return null;

    const task = data.tasks.find((item) => item.id === timerState.taskId);
    if (!task) return null;

    const project = data.projects.find((item) => item.id === task.project_id);
    const client = project ? data.clients.find((item) => item.id === project.client_id) : null;

    return {
      taskName: task.name,
      projectName: project?.name || 'Sem projeto',
      clientName: client?.company || client?.name || 'Sem cliente',
    };
  }, [taskBinding, timerState.taskId, data.tasks, data.projects, data.clients]);

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

      const isSamePendingTask = taskBinding?.taskId === taskId;
      if (buActiveTimer && !isSamePendingTask) {
        toast.error('Já existe um registro em andamento. Finalize o timer atual antes de iniciar outro.');
        return;
      }

      setProcessingTaskId(taskId);

      if (!buActiveTimer) {
        await startGlobalTimer();
      }

      setTaskBinding({
        taskId,
        snapshot: {
          taskTitle: task.name,
          taskDescription: task.description || null,
          projectName: task.projectName || 'Sem projeto',
          clientName: task.clientName || 'Sem cliente',
        },
      });

      setProcessingTaskId(null);
    },
    [upcomingTasks, taskBinding?.taskId, buActiveTimer, startGlobalTimer, setTaskBinding],
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
        style={{
          animation: open ? 'modal-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : undefined,
        }}
      >
        <DialogTitle className="sr-only">Timer expandido</DialogTitle>

        <div className="relative flex h-full w-full min-h-0 flex-col px-5 pb-5 pt-4 md:px-8 md:pb-6 md:pt-6">
          <div
            className="mb-2 flex items-center justify-between md:mb-3"
            style={{
              opacity: modalReady ? 1 : 0,
              transform: modalReady ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'opacity 0.4s ease-out 0.15s, transform 0.4s ease-out 0.15s',
            }}
          >
            <Button
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
              className={`h-9 w-9 rounded-full p-0 [&_svg]:h-9 [&_svg]:w-9 ${highContrast ? 'text-white hover:bg-white/10 hover:text-white' : 'text-[#64748b] hover:bg-transparent hover:text-[#475569]'}`}
              onClick={() => onOpenChange(false)}
              aria-label="Fechar modal"
            >
              <X className="stroke-[1.8]" />
            </Button>
          </div>

          <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col">
            <p
              className={`overflow-hidden text-center text-sm font-semibold leading-tight transition-all duration-500 md:text-2xl ${highContrast ? 'text-white' : 'text-[#64748b]'} ${
                shouldAnimateIntroText
                  ? 'pointer-events-none -translate-y-8 opacity-0 max-h-0 mb-0'
                  : 'translate-y-0 opacity-100 max-h-24 mb-5 md:mb-8'
              }`}
              style={{
                opacity: modalReady && !shouldAnimateIntroText ? 1 : shouldAnimateIntroText ? 0 : 0,
                transform: modalReady && !shouldAnimateIntroText ? 'translateY(0) scale(1)' : shouldAnimateIntroText ? 'translateY(-32px)' : 'translateY(16px) scale(0.95)',
                transition: 'opacity 0.5s ease-out 0.2s, transform 0.5s ease-out 0.2s, max-height 0.5s ease-out, margin 0.5s ease-out',
              }}
            >
              Inicie o timer para começar
              <br />
              um novo registro
            </p>

            <div
              className={`flex items-center justify-center transition-all duration-500 ${
                distractionFree ? 'mb-3 min-h-[160px] -translate-y-3 md:mb-4 md:min-h-[240px] md:-translate-y-5' : 'mb-5 min-h-[200px] translate-y-0 md:mb-8 md:min-h-[320px]'
              }`}
              style={{
                opacity: modalReady ? 1 : 0,
                transform: modalReady ? undefined : 'scale(0.85)',
                transition: 'opacity 0.6s ease-out 0.25s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s',
              }}
            >
              <div className="relative flex aspect-square w-full max-w-[400px] items-center justify-center" style={{ width: "min(400px, calc(100vw - 4rem))" }}>
                <img
                  src={fundoTimer}
                  alt=""
                  aria-hidden="true"
                  onLoad={() => setImageLoaded(true)}
                  className="pointer-events-none absolute h-full w-full animate-[spin_24s_linear_infinite]"
                  style={{
                    animationDirection: 'reverse',
                    filter: 'drop-shadow(0 0 32px rgba(16,185,129,0.35))',
                    opacity: imageLoaded ? 0.75 : 0,
                    transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />

                <Button
                  onClick={() => startGlobalTimer()}
                  className={`absolute z-10 flex h-[52%] w-[52%] max-h-[220px] max-w-[220px] items-center justify-center rounded-full border border-white/40 text-white shadow-none transition-all duration-300 hover:scale-[1.02] [&_svg]:h-[clamp(40px,16vw,90px)] [&_svg]:w-[clamp(40px,16vw,90px)]  ${
                    buActiveTimer ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.45) 100%)',
                    backdropFilter: 'blur(24px) saturate(1.6)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  aria-label="Iniciar timer rápido"
                  title="Iniciar timer rápido"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-icon lucide-play stroke-[1.0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]" style={{ width: 'clamp(40px,16vw,90px)', height: 'clamp(40px,16vw,90px)' }} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>
                </Button>

                <div
                  className={`absolute z-10 flex h-[52%] w-[52%] max-h-[220px] max-w-[220px] flex-col items-center justify-center rounded-full border-2 border-[#e2e8f0] bg-white text-[#64748b] transition-all duration-300 ${
                    buActiveTimer ? 'scale-100 opacity-100' : 'pointer-events-none scale-110 opacity-0'
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
                buActiveTimer ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
              }`}
              style={{
                opacity: modalReady && buActiveTimer ? 1 : 0,
                transform: modalReady && buActiveTimer ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.9)',
                transition: 'opacity 0.4s ease-out 0.35s, transform 0.4s ease-out 0.35s',
              }}
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
                <div className="mx-auto w-full max-w-[66.666vw]">
                  <p className={`text-sm font-semibold leading-snug break-words whitespace-normal ${highContrast ? 'text-white' : 'text-[#0f172a]'}`}>{currentTaskInfo.taskName}</p>
                  <p className={`text-xs font-medium break-words whitespace-normal ${highContrast ? 'text-gray-300' : 'text-[#64748b]'}`}>
                    Projeto: {currentTaskInfo.projectName} • Cliente: {currentTaskInfo.clientName}
                  </p>
                </div>
              ) : null}
            </div>

            <div
              className="relative z-10 mt-auto min-h-0"
              style={{
                opacity: modalReady ? 1 : 0,
                transform: modalReady ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease-out 0.4s, transform 0.5s ease-out 0.4s',
              }}
            >
              <div className="mb-2 flex items-center justify-end gap-2 transition-all duration-300">
                <Label
                  htmlFor="distraction-free"
                  className={`text-xs font-medium transition-all duration-300 ${highContrast ? 'text-white' : 'text-[#64748b]'} ${
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
  className={`overflow-y-auto scrollbar-none transition-all duration-500 ${
    distractionFree
      ? 'pointer-events-none max-h-0 translate-y-12 opacity-0'
      : 'max-h-[420px] translate-y-0 opacity-100'
  }`}
>
                <h3 className={`mb-3 text-xs font-semibold ${highContrast ? 'text-white' : 'text-[#64748b]'}`}>Próximas atividades</h3>
                <ScrollArea className="h-[28vh] min-h-[180px] max-h-[320px]">
                  <div className="space-y-2 pb-2 pr-2">
                    {upcomingTasks.length > 0 ? (
                      upcomingTasks.map((task, index) => {
                        const isCurrentTaskTimer = (taskBinding?.taskId || timerState.taskId) === task.id;
                        const isLoading = processingTaskId === task.id;

                        return (
                          <Card
                            key={task.id}
                            className={`flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 shadow-none ${highContrast ? 'border-white bg-black' : 'border-[#d6dee8] bg-transparent'}`}
                            style={{
                              opacity: modalReady ? 1 : 0,
                              transform: modalReady ? 'translateY(0)' : 'translateY(12px)',
                              transition: `opacity 0.35s ease-out ${0.45 + index * 0.04}s, transform 0.35s ease-out ${0.45 + index * 0.04}s`,
                            }}
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
                              <p className={`text-[0.6rem] font-medium uppercase tracking-wide break-words whitespace-normal ${highContrast ? 'text-gray-300' : 'text-[#64748b]'}`}>
                                {task.projectName || 'Sem projeto'} - {task.clientName || 'Sem cliente'}
                              </p>
                            </div>

                            {(!isRunning || isCurrentTaskTimer) && (
                              <div className="ml-0.5 flex shrink-0 items-center gap-0.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={isCurrentTaskTimer ? 'default' : 'ghost'}
                                  className={`h-7 w-7 rounded-full p-0 [&_svg]:h-3.5 [&_svg]:w-3.5 ${highContrast && !isCurrentTaskTimer ? 'text-white hover:bg-white/10' : ''}`}
                                  onClick={() => handleStartTaskTimer(task.id)}
                                  disabled={isLoading || (!isCurrentTaskTimer && !canStartNewTaskTimer)}
                                  aria-label={`Iniciar registro da tarefa ${task.name}`}
                                  title="Iniciar registro para esta tarefa"
                                >
                                  <Play className={isCurrentTaskTimer ? 'fill-current' : ''} />
                                </Button>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={`h-7 w-7 rounded-full p-0 [&_svg]:h-3.5 [&_svg]:w-3.5 ${highContrast ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-700'}`}
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={isLoading || task.status === 'completed' || task.status === 'done'}
                                  aria-label={`Concluir tarefa ${task.name}`}
                                  title="Concluir tarefa"
                                >
                                  <Check/>
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
