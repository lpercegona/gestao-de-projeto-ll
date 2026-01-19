import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalTimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null; // If linked to a task
}

interface GlobalTimerContextType {
  timerState: GlobalTimerState;
  startGlobalTimer: () => void;
  pauseGlobalTimer: () => void;
  resumeGlobalTimer: () => void;
  completeGlobalTimer: () => void;
  hasActiveTimer: boolean;
  showCompleteDialog: boolean;
  setShowCompleteDialog: (show: boolean) => void;
  getElapsedHours: () => number;
  resetTimer: () => void;
  syncWithTaskTimer: (taskId: string, startedAt: string) => void;
}

const GlobalTimerContext = createContext<GlobalTimerContextType | undefined>(undefined);

const initialState: GlobalTimerState = {
  isRunning: false,
  isPaused: false,
  elapsedSeconds: 0,
  startTime: null,
  pausedElapsed: 0,
  taskId: null,
};

export const GlobalTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data } = useData();
  const [timerState, setTimerState] = useState<GlobalTimerState>(initialState);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Sync with any active task timer from the database
  useEffect(() => {
    if (!user || !data.taskTimers) return;
    
    // Find any active timer for the current user
    const activeTaskTimer = data.taskTimers.find(t => t.user_id === user.id);
    
    if (activeTaskTimer && !timerState.isRunning && !timerState.isPaused) {
      // Sync global timer with the active task timer
      const startTime = new Date(activeTaskTimer.started_at).getTime();
      setTimerState({
        isRunning: true,
        isPaused: false,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
        startTime,
        pausedElapsed: 0,
        taskId: activeTaskTimer.task_id,
      });
    } else if (!activeTaskTimer && timerState.taskId) {
      // Task timer was stopped externally, reset if linked
      setTimerState(initialState);
    }
  }, [user, data.taskTimers]);

  // Update elapsed seconds every second when running
  useEffect(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    const interval = setInterval(() => {
      if (timerState.startTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - timerState.startTime) / 1000) + timerState.pausedElapsed;
        setTimerState(prev => ({ ...prev, elapsedSeconds: elapsed }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.pausedElapsed]);

  const startGlobalTimer = useCallback(() => {
    // Don't allow starting if already running
    if (timerState.isRunning) return;

    setTimerState({
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: Date.now(),
      pausedElapsed: 0,
      taskId: null,
    });
  }, [timerState.isRunning]);

  const pauseGlobalTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pausedElapsed: prev.elapsedSeconds,
      startTime: null,
    }));
  }, [timerState.isRunning, timerState.isPaused]);

  const resumeGlobalTimer = useCallback(() => {
    if (!timerState.isPaused) return;

    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      startTime: Date.now(),
    }));
  }, [timerState.isPaused]);

  const completeGlobalTimer = useCallback(() => {
    setShowCompleteDialog(true);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerState(initialState);
    setShowCompleteDialog(false);
  }, []);

  const getElapsedHours = useCallback(() => {
    const hours = timerState.elapsedSeconds / 3600;
    // Round to nearest 0.25 hours
    return Math.max(0.25, Math.round(hours * 4) / 4);
  }, [timerState.elapsedSeconds]);

  const syncWithTaskTimer = useCallback((taskId: string, startedAt: string) => {
    const startTime = new Date(startedAt).getTime();
    setTimerState({
      isRunning: true,
      isPaused: false,
      elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
      startTime,
      pausedElapsed: 0,
      taskId,
    });
  }, []);

  const hasActiveTimer = timerState.isRunning || timerState.isPaused;

  return (
    <GlobalTimerContext.Provider
      value={{
        timerState,
        startGlobalTimer,
        pauseGlobalTimer,
        resumeGlobalTimer,
        completeGlobalTimer,
        hasActiveTimer,
        showCompleteDialog,
        setShowCompleteDialog,
        getElapsedHours,
        resetTimer,
        syncWithTaskTimer,
      }}
    >
      {children}
    </GlobalTimerContext.Provider>
  );
};

export const useGlobalTimer = (): GlobalTimerContextType => {
  const context = useContext(GlobalTimerContext);
  if (!context) {
    throw new Error('useGlobalTimer must be used within a GlobalTimerProvider');
  }
  return context;
};
