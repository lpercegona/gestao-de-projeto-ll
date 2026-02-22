import React, { useMemo } from 'react';
import { Play, Pause, Square, Clock, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { useData } from '@/contexts/DataContext';

import { MarqueeText } from './MarqueeText';

export const HeaderTimerDisplay: React.FC = () => {
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
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

  // If not running and not paused, show play button only
  if (!hasActiveTimer) {
    return (
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
    );
  }

  // Timer is active (running or paused)
  return (
      <div className="flex items-center gap-1">
        {/* Timer display */}
        <div className={cn(
          "px-2 py-1 rounded-md font-mono text-xs font-medium",
          timerState.isPaused 
            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" 
            : "bg-primary/10 text-primary animate-pulse"
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
                  : "text-orange-600 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30"
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
              className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
              aria-label="Concluir registro"
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Concluir registro</TooltipContent>
        </Tooltip>
      </div>
  );
};

// Component that shows task info with slide animation
export const HeaderTimerTaskInfo: React.FC = () => {
  const { timerState, hasActiveTimer, taskBinding } = useGlobalTimer();
  const { data } = useData();
  const originTaskId = taskBinding?.taskId || timerState.taskId;

  const linkedInfo = useMemo(() => {
    if (!originTaskId) return null;

    const task = data.tasks.find((t) => t.id === originTaskId);
    if (!task) return null;

    const project = data.projects.find((p) => p.id === task.project_id);
    const client = project ? data.clients.find((c) => c.id === project.client_id) : null;

    return {
      taskName: task.name,
      projectName: project?.name || 'Projeto',
      clientName: client?.name || 'Cliente',
    };
  }, [originTaskId, data.tasks, data.projects, data.clients]);

  if (!hasActiveTimer) return null;

  const displayText = linkedInfo 
    ? `${linkedInfo.taskName} • ${linkedInfo.projectName} • ${linkedInfo.clientName}`
    : 'Registro não vinculado';

  return (
    <div 
      className={cn(
        "flex items-center gap-2 text-xs overflow-hidden",
        "animate-in slide-in-from-left duration-300"
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 max-w-[200px] overflow-hidden">
            {linkedInfo ? (
              <LinkIcon className="h-3 w-3 flex-shrink-0 text-primary" />
            ) : (
              <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
            <MarqueeText
              text={displayText}
              className={cn(
                "font-medium",
                linkedInfo ? "text-foreground" : "text-muted-foreground italic"
              )}
              pauseDuration={3000}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          {linkedInfo ? (
            <div className="space-y-1 text-xs">
              <p className="font-medium">{linkedInfo.taskName}</p>
              <p className="text-muted-foreground">{linkedInfo.projectName} • {linkedInfo.clientName}</p>
            </div>
          ) : (
            <span>Registro não vinculado a nenhuma tarefa</span>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};