import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskTimerProps {
  taskId: string;
  taskStatus: string;
  activeTimer: { id: string; started_at: string } | null;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onComplete: () => Promise<void>;
  disabled?: boolean;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({
  taskId,
  taskStatus,
  activeTimer,
  onStart,
  onStop,
  onComplete,
  disabled = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calculate initial elapsed time and update every second
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeTimer.started_at).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await onStop();
    } finally {
      setLoading(false);
    }
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
  const showPlayButton = taskStatus !== 'completed' && !isTimerActive;
  const showPauseButton = isTimerActive;
  const showCompleteButton = taskStatus === 'in_progress';

  return (
    <div className="flex items-center gap-2">
      {/* Timer display when active */}
      {isTimerActive && (
        <div className={cn(
          "px-3 py-1.5 rounded-md font-mono text-sm font-medium",
          "bg-primary/10 text-primary",
          "animate-pulse"
        )}>
          {formatTime(elapsedSeconds)}
        </div>
      )}

      {/* Play button */}
      {showPlayButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStart}
          disabled={loading || disabled}
          className="text-primary hover:text-primary hover:bg-primary/10"
        >
          <Play className="w-4 h-4 mr-1" />
          Iniciar
        </Button>
      )}

      {/* Pause button */}
      {showPauseButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          disabled={loading || disabled}
          className="text-orange-600 hover:text-orange-600 hover:bg-orange-100"
        >
          <Pause className="w-4 h-4 mr-1" />
          Pausar
        </Button>
      )}

      {/* Complete button */}
      {showCompleteButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleComplete}
          disabled={loading || disabled}
          className="text-green-600 hover:text-green-600 hover:bg-green-100"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Concluir
        </Button>
      )}
    </div>
  );
};
