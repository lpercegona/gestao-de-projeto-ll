import React, { useCallback, useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useGlobalTimer } from '@/contexts/GlobalTimerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Clock, Expand } from 'lucide-react';
import { GlobalTimerCompleteDialog } from '@/components/timer/GlobalTimerCompleteDialog';
import { ExpandedTimerModal } from '@/components/timer/ExpandedTimerModal';

export const QuickTimeTracker: React.FC = () => {
  const [expandedTimerOpen, setExpandedTimerOpen] = useState(false);
  const { data } = useData();
  const { 
    timerState, 
    startGlobalTimer, 
    pauseGlobalTimer, 
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
    taskBinding,
    showCompleteDialog,
    setShowCompleteDialog,
  } = useGlobalTimer();

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleStart = () => {
    startGlobalTimer();
  };

  const handlePause = () => {
    pauseGlobalTimer();
  };

  const handleResume = () => {
    resumeGlobalTimer();
  };

  const handleStop = () => {
    completeGlobalTimer();
  };

  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;
  const originTaskId = taskBinding?.taskId || timerState.taskId;
  const isLinkedToTask = !!originTaskId;

  // Get linked task info
  const linkedTask = useMemo(
    () => (originTaskId ? data.tasks.find((t) => t.id === originTaskId) : null),
    [data.tasks, originTaskId],
  );
  const linkedProject = linkedTask ? data.projects.find(p => p.id === linkedTask.project_id) : null;
  const linkedClient = linkedProject ? data.clients.find(c => c.id === linkedProject.client_id) : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Registro Rápido
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpandedTimerOpen(true)}
              title="Expandir timer"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3">
            <div className={`text-3xl font-mono tabular-nums font-bold text-foreground ${isRunning ? 'animate-pulse' : ''}`}>
              {formatTime(timerState.elapsedSeconds)}
            </div>
            
            {/* Show linked task info or status */}
            {hasActiveTimer && (
              <div className="w-full text-center">
                {isLinkedToTask && linkedTask ? (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <p className="font-medium text-foreground truncate">{linkedTask.name}</p>
                    <p className="truncate">{linkedProject?.name} • {linkedClient?.company || linkedClient?.name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Registro não vinculado a nenhuma tarefa
                  </p>
                )}
              </div>
            )}
            
            {!hasActiveTimer ? (
              <Button onClick={handleStart} className="w-full gap-2">
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                {isPaused ? (
                  <Button onClick={handleResume} className="flex-1 gap-2">
                    <Play className="h-4 w-4" />
                    Retomar
                  </Button>
                ) : (
                  <Button onClick={handlePause} variant="outline" className="flex-1 gap-2">
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )}
                <Button 
                  onClick={handleStop} 
                  variant="destructive" 
                  className="flex-1 gap-2"
                  title="Concluir registro"
                >
                  <Square className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExpandedTimerModal open={expandedTimerOpen} onOpenChange={setExpandedTimerOpen} />

      <GlobalTimerCompleteDialog 
        open={showCompleteDialog} 
        onOpenChange={setShowCompleteDialog} 
      />
    </>
  );
};
