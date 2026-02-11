import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

const TIMER_STORAGE_KEY = 'oras-global-timer';

interface GlobalTimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null; // If linked to a task
}

interface PersistedTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null;
}

interface GlobalTimerContextType {
  timerState: GlobalTimerState;
  startGlobalTimer: () => void;
  pauseGlobalTimer: () => void;
  resumeGlobalTimer: () => void;
  completeGlobalTimer: () => void;
  cancelCompleteDialog: () => void;
  hasActiveTimer: boolean;
  showCompleteDialog: boolean;
  setShowCompleteDialog: (show: boolean) => void;
  getElapsedHours: () => number;
  resetTimer: () => void;
  syncWithTaskTimer: (taskId: string, startedAt: string) => void;
  wasPausedBeforeComplete: boolean;
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

// Load persisted state from localStorage
const loadPersistedState = (): GlobalTimerState => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return initialState;
    
    const parsed: PersistedTimerState = JSON.parse(stored);
    
    // If running, calculate elapsed time since start
    if (parsed.isRunning && parsed.startTime) {
      const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000) + parsed.pausedElapsed;
      return {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: elapsed,
        startTime: parsed.startTime,
        pausedElapsed: parsed.pausedElapsed,
        taskId: parsed.taskId,
      };
    }
    
    // If paused, restore paused state
    if (parsed.isPaused) {
      return {
        isRunning: true, // Still considered "active"
        isPaused: true,
        elapsedSeconds: parsed.pausedElapsed,
        startTime: null,
        pausedElapsed: parsed.pausedElapsed,
        taskId: parsed.taskId,
      };
    }
    
    return initialState;
  } catch {
    return initialState;
  }
};

// Persist state to localStorage
const persistState = (state: GlobalTimerState) => {
  const toPersist: PersistedTimerState = {
    isRunning: state.isRunning && !state.isPaused,
    isPaused: state.isPaused,
    startTime: state.startTime,
    pausedElapsed: state.pausedElapsed,
    taskId: state.taskId,
  };
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(toPersist));
};

// Clear persisted state
const clearPersistedState = () => {
  localStorage.removeItem(TIMER_STORAGE_KEY);
};

export const GlobalTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data } = useData();
  const [timerState, setTimerState] = useState<GlobalTimerState>(() => loadPersistedState());
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [wasPausedBeforeComplete, setWasPausedBeforeComplete] = useState(false);

  // Sync with any active task timer from the database
  useEffect(() => {
    if (!user || !data.taskTimers) return;
    
    // Find any active timer for the current user
    const activeTaskTimer = data.taskTimers.find(t => t.user_id === user.id);
    
    if (activeTaskTimer) {
      // There's an active task timer - sync with it
      const startTime = new Date(activeTaskTimer.started_at).getTime();
      const newState: GlobalTimerState = {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
        startTime,
        pausedElapsed: 0,
        taskId: activeTaskTimer.task_id,
      };
      setTimerState(newState);
      persistState(newState);
    } else if (timerState.taskId && !timerState.isPaused) {
      // Task timer was stopped externally, reset if it was linked to a task
      setTimerState(initialState);
      clearPersistedState();
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

    const newState: GlobalTimerState = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: Date.now(),
      pausedElapsed: 0,
      taskId: null,
    };
    setTimerState(newState);
    persistState(newState);
  }, [timerState.isRunning]);

  const pauseGlobalTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    const newState: GlobalTimerState = {
      ...timerState,
      isPaused: true,
      pausedElapsed: timerState.elapsedSeconds,
      startTime: null,
    };
    setTimerState(newState);
    persistState(newState);
  }, [timerState]);

  const resumeGlobalTimer = useCallback(() => {
    if (!timerState.isPaused) return;

    const newState: GlobalTimerState = {
      ...timerState,
      isPaused: false,
      startTime: Date.now(),
    };
    setTimerState(newState);
    persistState(newState);
  }, [timerState]);

  const completeGlobalTimer = useCallback(() => {
    // Store if timer was paused before showing dialog
    setWasPausedBeforeComplete(timerState.isPaused);
    
    // Auto-pause timer when showing complete dialog
    if (!timerState.isPaused && timerState.isRunning) {
      const newState: GlobalTimerState = {
        ...timerState,
        isPaused: true,
        pausedElapsed: timerState.elapsedSeconds,
        startTime: null,
      };
      setTimerState(newState);
      persistState(newState);
    }
    
    setShowCompleteDialog(true);
  }, [timerState]);

  const cancelCompleteDialog = useCallback(() => {
    setShowCompleteDialog(false);
    
    // Resume timer only if it wasn't paused before opening dialog
    if (!wasPausedBeforeComplete && timerState.isPaused) {
      const newState: GlobalTimerState = {
        ...timerState,
        isPaused: false,
        startTime: Date.now(),
      };
      setTimerState(newState);
      persistState(newState);
    }
  }, [wasPausedBeforeComplete, timerState]);

  const resetTimer = useCallback(() => {
    setTimerState(initialState);
    setShowCompleteDialog(false);
    clearPersistedState();
  }, []);

  const getElapsedHours = useCallback(() => {
    const hours = timerState.elapsedSeconds / 3600;
    // Round to nearest 0.25 hours
    return Math.max(0.25, Math.round(hours * 4) / 4);
  }, [timerState.elapsedSeconds]);

  const syncWithTaskTimer = useCallback((taskId: string, startedAt: string) => {
    const startTime = new Date(startedAt).getTime();
    const newState: GlobalTimerState = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
      startTime,
      pausedElapsed: 0,
      taskId,
    };
    setTimerState(newState);
    persistState(newState);
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
        cancelCompleteDialog,
        hasActiveTimer,
        showCompleteDialog,
        setShowCompleteDialog,
        getElapsedHours,
        resetTimer,
        syncWithTaskTimer,
        wasPausedBeforeComplete,
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
