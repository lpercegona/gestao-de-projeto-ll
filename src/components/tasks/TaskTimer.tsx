import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TaskTimerProps {
  taskId: string;
  taskStatus: string;
  activeTimer: { id: string; user_id?: string; started_at: string; paused_at: string | null; paused_elapsed_seconds: number; task_title_snapshot?: string | null; task_description_snapshot?: string | null; project_name_snapshot?: string | null; client_name_snapshot?: string | null } | null;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onComplete: () => Promise<void>;
  onDiscard?: () => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({
  taskId,
  taskStatus,
  activeTimer,
  onStart,
  onStop,
  onComplete,
  onDiscard,
  disabled = false,
  iconOnly = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { 
    hasActiveTimer, 
    timerState, 
    taskBinding,
    syncWithTaskTimer, 
    pauseGlobalTimer, 
    resumeGlobalTimer, 
    completeGlobalTimer,
  } = useGlobalTimer();


  const activeTimerBelongsToCurrentUser = !!activeTimer && !!user && (!activeTimer.user_id || activeTimer.user_id === user.id);
  const foreignActiveTimerOnTask = !!activeTimer && !!user && !!activeTimer.user_id && activeTimer.user_id !== user.id;
  const ownedActiveTimer = activeTimerBelongsToCurrentUser ? activeTimer : null;

  const originTaskId = taskBinding?.taskId || timerState.taskId;
  const isOriginTaskTimer = originTaskId === taskId;
  const hasForeignActiveTimer = hasActiveTimer && !isOriginTaskTimer;

  // Calculate initial elapsed time and update every second
  useEffect(() => {
    if (!ownedActiveTimer) {
      setElapsedSeconds(0);
      return;
    }

    if (ownedActiveTimer.paused_at) {
      setElapsedSeconds(ownedActiveTimer.paused_elapsed_seconds || 0);
      return;
    }

    const startTime = new Date(ownedActiveTimer.started_at).getTime();
    const pausedElapsed = ownedActiveTimer.paused_elapsed_seconds || 0;

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000) + pausedElapsed;
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [ownedActiveTimer]);

  // Sync with global timer when this task has an active timer
  useEffect(() => {
    if (ownedActiveTimer && originTaskId !== taskId) {
      syncWithTaskTimer(taskId, ownedActiveTimer.started_at, ownedActiveTimer.paused_at, ownedActiveTimer.paused_elapsed_seconds || 0, {
        taskName: ownedActiveTimer.task_title_snapshot || undefined,
        taskDescription: ownedActiveTimer.task_description_snapshot || undefined,
        projectName: ownedActiveTimer.project_name_snapshot || undefined,
        clientName: ownedActiveTimer.client_name_snapshot || undefined,
      });
    }
  }, [ownedActiveTimer, taskId, syncWithTaskTimer, originTaskId]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // Check if there's already an active global timer (either standalone or from another task)
    if (hasForeignActiveTimer) {
      toast.error('Timer em andamento: Já existe um cronômetro ativo. Finalize-o antes de iniciar outro.');
      return;
    }

    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

  const handlePause = () => {
    pauseGlobalTimer();
  };

  const handleResume = () => {
    resumeGlobalTimer();
  };

  const handleStop = () => {
    // Use the global timer complete dialog
    completeGlobalTimer();
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete();
    } finally {
      setLoading(false);
    }
  };

  const hasOriginGlobalTimer = isOriginTaskTimer && hasActiveTimer;
  const isTimerActive = !!ownedActiveTimer || hasOriginGlobalTimer;
  const isPaused = hasOriginGlobalTimer ? timerState.isPaused : !!ownedActiveTimer?.paused_at;
  const showPlayButton = taskStatus !== 'completed' && !isTimerActive && !isPaused;
  const showTimerControls = isTimerActive;
  const showCompleteButton = taskStatus === 'in_progress' && !isTimerActive && !isPaused;

  // Check if another timer is running (disable play if so)
  const anotherTimerRunning = hasForeignActiveTimer;

  // Get display time from global timer for origin task, otherwise local/owned timer
  const displayTime = hasOriginGlobalTimer
    ? timerState.elapsedSeconds
    : isPaused
      ? (ownedActiveTimer?.paused_elapsed_seconds ?? 0)
      : elapsedSeconds;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Timer display when active or paused */}
      {showTimerControls && (
        <div className={cn(
          "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-mono text-xs sm:text-sm font-medium",
          isPaused 
            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" 
            : "bg-primary/10 text-primary animate-pulse"
        )}>
          {formatTime(displayTime)}
        </div>
      )}

      {/* Play button - start timer */}
      {showPlayButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStart}
              disabled={loading || disabled || anotherTimerRunning || foreignActiveTimerOnTask}
              className={cn(
                "w-8 h-8 text-primary hover:text-primary hover:bg-primary/10 px-2 sm:px-3",
                (anotherTimerRunning || foreignActiveTimerOnTask) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="w-3.5 h-3.5" />
              {!iconOnly && <span className="hidden sm:inline ml-2">Iniciar</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent className={iconOnly ? "" : "sm:hidden"}>
            {foreignActiveTimerOnTask
              ? 'Outro usuário está registrando nesta tarefa'
              : anotherTimerRunning
                ? 'Outro timer está ativo em uma tarefa diferente'
                : 'Iniciar'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Timer controls: Pause/Resume and Stop */}
      {showTimerControls && (
        <>
          {isPaused ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResume}
                  disabled={loading || disabled || hasForeignActiveTimer}
                  className="w-8 h-8 text-primary hover:text-primary hover:bg-primary/10 px-2 sm:px-3"
                >
                  <Play className="w-3.5 h-3.5" />
                  {!iconOnly && <span className="hidden sm:inline ml-2">Retomar</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent className={iconOnly ? "" : "sm:hidden"}>Retomar</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePause}
                  disabled={loading || disabled || hasForeignActiveTimer}
                  className="w-8 h-8 text-orange-600 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 px-2 sm:px-3"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {!iconOnly && <span className="hidden sm:inline ml-2">Pausar</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent className={iconOnly ? "" : "sm:hidden"}>Pausar</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStop}
                disabled={loading || disabled || hasForeignActiveTimer}
                className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 px-2 sm:px-3"
              >
                <Square className="w-3.5 h-3.5" />
                {!iconOnly && <span className="hidden sm:inline ml-2">Concluir</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent className={iconOnly ? "" : "sm:hidden"}>Concluir</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Complete task button (when not timing) */}
      {showCompleteButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              disabled={loading || disabled}
              className="w-8 h-8 text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 px-2 sm:px-3"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {!iconOnly && <span className="hidden sm:inline ml-2">Finalizar</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent className={iconOnly ? "" : "sm:hidden"}>Finalizar Tarefa</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
