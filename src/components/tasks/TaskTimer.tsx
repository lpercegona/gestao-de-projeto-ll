import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { GlobalTimerCompleteDialog } from '@/components/timer/GlobalTimerCompleteDialog';
import { toast } from 'sonner';

interface TaskTimerProps {
  taskId: string;
  taskStatus: string;
  activeTimer: { id: string; started_at: string; paused_at?: string | null; paused_elapsed_seconds?: number | null } | null;
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
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const { 
    hasActiveTimer, 
    timerState, 
    syncWithTaskTimer, 
    pauseGlobalTimer, 
    resumeGlobalTimer, 
    completeGlobalTimer,
  } = useGlobalTimer();

  // Calculate initial elapsed time and update every second
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    if (activeTimer.paused_at) {
      setElapsedSeconds(activeTimer.paused_elapsed_seconds ?? 0);
      return;
    }

    const startTime = new Date(activeTimer.started_at).getTime();
    const pausedElapsed = activeTimer.paused_elapsed_seconds ?? 0;

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000) + pausedElapsed;
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Sync with global timer when this task has an active timer
  useEffect(() => {
    if (activeTimer && timerState.taskId !== taskId) {
      syncWithTaskTimer(
        taskId,
        activeTimer.started_at,
        activeTimer.paused_at ?? null,
        activeTimer.paused_elapsed_seconds ?? 0
      );
    }
  }, [activeTimer, taskId, syncWithTaskTimer, timerState.taskId]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // Check if there's already an active global timer (either standalone or from another task)
    if (hasActiveTimer && timerState.taskId !== taskId) {
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

  const isTimerActive = !!activeTimer;
  const isThisTaskTimer = timerState.taskId === taskId;
  const isPaused = isThisTaskTimer && timerState.isPaused;
  const showPlayButton = taskStatus !== 'completed' && !isTimerActive && !isPaused;
  const showTimerControls = isTimerActive || isPaused;
  const showCompleteButton = taskStatus === 'in_progress' && !isTimerActive && !isPaused;

  // Check if another timer is running (disable play if so)
  const anotherTimerRunning = hasActiveTimer && timerState.taskId !== taskId && !isTimerActive;

  // Get display time - use global timer elapsed if paused, otherwise local elapsed
  const displayTime = isPaused ? timerState.elapsedSeconds : elapsedSeconds;

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
              disabled={loading || disabled || anotherTimerRunning}
              className={cn(
                "text-primary hover:text-primary hover:bg-primary/10 px-2 sm:px-3",
                anotherTimerRunning && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" />
              {!iconOnly && <span className="hidden sm:inline ml-2">Iniciar</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent className={iconOnly ? "" : "sm:hidden"}>
            {anotherTimerRunning ? 'Outro timer em andamento' : 'Iniciar'}
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
                  disabled={loading || disabled}
                  className="text-primary hover:text-primary hover:bg-primary/10 px-2 sm:px-3"
                >
                  <Play className="w-4 h-4" />
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
                  disabled={loading || disabled}
                  className="text-orange-600 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 px-2 sm:px-3"
                >
                  <Pause className="w-4 h-4" />
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
                disabled={loading || disabled}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 sm:px-3"
              >
                <Square className="w-4 h-4" />
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
              className="text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 px-2 sm:px-3"
            >
              <CheckCircle className="w-4 h-4" />
              {!iconOnly && <span className="hidden sm:inline ml-2">Finalizar</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent className={iconOnly ? "" : "sm:hidden"}>Finalizar Tarefa</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
