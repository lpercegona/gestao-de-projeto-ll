import React, { useState } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { GlobalTimerCompleteDialog } from './GlobalTimerCompleteDialog';

export const GlobalTimerButton: React.FC = () => {
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
    showCompleteDialog,
    setShowCompleteDialog,
  } = useGlobalTimer();

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMainAction = () => {
    if (!hasActiveTimer) {
      startGlobalTimer();
    } else if (timerState.isPaused) {
      resumeGlobalTimer();
    } else {
      pauseGlobalTimer();
    }
  };

  // If not running and not paused, show play button
  if (!hasActiveTimer) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={startGlobalTimer}
              className="relative text-muted-foreground hover:text-primary"
              aria-label="Iniciar cronômetro"
            >
              <Play className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Iniciar cronômetro</TooltipContent>
        </Tooltip>
        <GlobalTimerCompleteDialog 
          open={showCompleteDialog} 
          onOpenChange={setShowCompleteDialog} 
        />
      </>
    );
  }

  // Timer is active (running or paused)
  return (
    <>
      <div className="flex items-center gap-1">
        {/* Timer display */}
        <div className={cn(
          "px-2 py-1 rounded-md font-mono text-xs font-medium",
          "bg-primary/10 text-primary",
          timerState.isRunning && !timerState.isPaused && "animate-pulse"
        )}>
          {formatTime(timerState.elapsedSeconds)}
        </div>

        {/* Pause/Resume button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMainAction}
              className={cn(
                "h-8 w-8",
                timerState.isPaused 
                  ? "text-primary hover:text-primary hover:bg-primary/10" 
                  : "text-orange-600 hover:text-orange-600 hover:bg-orange-100"
              )}
              aria-label={timerState.isPaused ? "Retomar" : "Pausar"}
            >
              {timerState.isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{timerState.isPaused ? "Retomar" : "Pausar"}</TooltipContent>
        </Tooltip>

        {/* Complete button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={completeGlobalTimer}
              className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-100"
              aria-label="Concluir registro"
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Concluir registro</TooltipContent>
        </Tooltip>
      </div>

      <GlobalTimerCompleteDialog 
        open={showCompleteDialog} 
        onOpenChange={setShowCompleteDialog} 
      />
    </>
  );
};
