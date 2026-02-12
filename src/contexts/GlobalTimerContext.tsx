import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const TIMER_STORAGE_KEY = 'oras-global-timer';

interface GlobalTimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null;
  dbTimerId: string | null; // ID of the task_timers record
}

export interface PendingTaskLink {
  taskId: string;
  taskName: string;
  projectName: string;
  clientName: string;
}

interface PersistedTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null;
  dbTimerId: string | null;
  pendingTaskLink?: PendingTaskLink | null;
}

interface GlobalTimerContextType {
  timerState: GlobalTimerState;
  pendingTaskLink: PendingTaskLink | null;
  setPendingTaskLink: (link: PendingTaskLink | null) => void;
  clearPendingTaskLink: () => void;
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
  syncWithTaskTimer: (taskId: string, startedAt: string, pausedAt?: string | null, pausedElapsedSeconds?: number) => void;
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
  dbTimerId: null,
};

// Load persisted state from localStorage
const loadPersistedState = (): GlobalTimerState => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return initialState;
    
    const parsed: PersistedTimerState = JSON.parse(stored);
    
    if (parsed.isRunning && parsed.startTime) {
      const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000) + parsed.pausedElapsed;
      return {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: elapsed,
        startTime: parsed.startTime,
        pausedElapsed: parsed.pausedElapsed,
        taskId: parsed.taskId,
        dbTimerId: parsed.dbTimerId || null,
      };
    }
    
    if (parsed.isPaused) {
      return {
        isRunning: true,
        isPaused: true,
        elapsedSeconds: parsed.pausedElapsed,
        startTime: null,
        pausedElapsed: parsed.pausedElapsed,
        taskId: parsed.taskId,
        dbTimerId: parsed.dbTimerId || null,
      };
    }
    
    return initialState;
  } catch {
    return initialState;
  }
};

const persistState = (state: GlobalTimerState) => {
  let persistedLink: PendingTaskLink | null = null;

  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedTimerState;
      persistedLink = parsed.pendingTaskLink || null;
    }
  } catch {
    persistedLink = null;
  }

  const toPersist: PersistedTimerState = {
    isRunning: state.isRunning && !state.isPaused,
    isPaused: state.isPaused,
    startTime: state.startTime,
    pausedElapsed: state.pausedElapsed,
    taskId: state.taskId,
    dbTimerId: state.dbTimerId,
    pendingTaskLink: persistedLink,
  };
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(toPersist));
};

const clearPersistedState = () => {
  localStorage.removeItem(TIMER_STORAGE_KEY);
};


const loadPersistedPendingTaskLink = (): PendingTaskLink | null => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedTimerState;
    const hasActiveTimer = parsed.isRunning || parsed.isPaused;
    if (!hasActiveTimer) return null;

    const link = parsed.pendingTaskLink;
    if (!link?.taskId || !link?.taskName) {
      return null;
    }

    return {
      taskId: link.taskId,
      taskName: link.taskName,
      projectName: link.projectName || '',
      clientName: link.clientName || '',
    };
  } catch {
    return null;
  }
};

const persistPendingTaskLink = (link: PendingTaskLink | null) => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    const parsed: PersistedTimerState = stored
      ? JSON.parse(stored)
      : {
          isRunning: false,
          isPaused: false,
          startTime: null,
          pausedElapsed: 0,
          taskId: null,
          dbTimerId: null,
        };

    parsed.pendingTaskLink = link;
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // noop
  }
};

export const GlobalTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data, pauseTaskTimer, resumeTaskTimer } = useData();
  const [timerState, setTimerState] = useState<GlobalTimerState>(() => loadPersistedState());
  const [pendingTaskLink, setPendingTaskLinkState] = useState<PendingTaskLink | null>(() => loadPersistedPendingTaskLink());
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [wasPausedBeforeComplete, setWasPausedBeforeComplete] = useState(false);

  // Sync with any active task timer from the database (including unlinked quick timers)
  useEffect(() => {
    if (!user || !data.taskTimers) return;

    const activeTaskTimer = data.taskTimers.find(t => t.user_id === user.id);

    if (activeTaskTimer) {
      if (activeTaskTimer.task_id) {
        setPendingTaskLinkState(null);
        persistPendingTaskLink(null);
      }
      const isPaused = !!activeTaskTimer.paused_at;
      const startTime = isPaused ? null : new Date(activeTaskTimer.started_at).getTime();
      const pausedElapsed = activeTaskTimer.paused_elapsed_seconds || 0;
      const elapsedSeconds = isPaused
        ? pausedElapsed
        : Math.floor((Date.now() - new Date(activeTaskTimer.started_at).getTime()) / 1000) + pausedElapsed;

      const newState: GlobalTimerState = {
        isRunning: true,
        isPaused,
        elapsedSeconds,
        startTime,
        pausedElapsed,
        taskId: activeTaskTimer.task_id,
        dbTimerId: activeTaskTimer.id,
      };

      setTimerState(prev => {
        if (
          prev.dbTimerId === newState.dbTimerId &&
          prev.isPaused === newState.isPaused &&
          prev.startTime === newState.startTime &&
          prev.pausedElapsed === newState.pausedElapsed
        ) {
          return prev.isRunning === newState.isRunning && prev.elapsedSeconds === newState.elapsedSeconds
            ? prev
            : { ...prev, elapsedSeconds: newState.elapsedSeconds, isRunning: true };
        }

        persistState(newState);
        return newState;
      });
    } else if (timerState.dbTimerId || timerState.taskId) {
      // Timer was stopped externally (from another device), reset
      setTimerState(initialState);
      setPendingTaskLinkState(null);
      persistPendingTaskLink(null);
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

  // Start quick timer — insert into DB with task_id = null
  const startGlobalTimer = useCallback(async () => {
    if (timerState.isRunning || !user) return;

    const now = new Date();
    const nowMs = now.getTime();

    // Optimistic local update
    const optimisticState: GlobalTimerState = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: nowMs,
      pausedElapsed: 0,
      taskId: null,
      dbTimerId: null,
    };
    setTimerState(optimisticState);
    persistState(optimisticState);

    // Insert into DB
    const { data: timer, error } = await supabase
      .from('task_timers')
      .insert({
        user_id: user.id,
        started_at: now.toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error starting quick timer:', error);
      return;
    }

    // Update with real DB ID
    setTimerState(prev => {
      const updated = { ...prev, dbTimerId: timer.id };
      persistState(updated);
      return updated;
    });
  }, [timerState.isRunning, user]);

  // Pause timer
  const pauseGlobalTimer = useCallback(async () => {
    if (!timerState.isRunning || timerState.isPaused) return;

    if (timerState.taskId) {
      void pauseTaskTimer(timerState.taskId);
      return;
    }

    // Quick timer — update DB
    const elapsedSeconds = timerState.elapsedSeconds;
    const newState: GlobalTimerState = {
      ...timerState,
      isPaused: true,
      pausedElapsed: elapsedSeconds,
      startTime: null,
    };
    setTimerState(newState);
    persistState(newState);

    const fallbackTimerId = data.taskTimers.find((timer) => timer.user_id === user?.id && !timer.task_id)?.id || null;
    const timerIdToPause = timerState.dbTimerId || fallbackTimerId;

    if (timerIdToPause) {
      await supabase
        .from('task_timers')
        .update({
          paused_at: new Date().toISOString(),
          paused_elapsed_seconds: elapsedSeconds,
        } as any)
        .eq('id', timerIdToPause);

      if (!timerState.dbTimerId && fallbackTimerId) {
        setTimerState((prev) => {
          const updated = { ...prev, dbTimerId: fallbackTimerId };
          persistState(updated);
          return updated;
        });
      }
    }
  }, [timerState, pauseTaskTimer, data.taskTimers, user?.id]);

  // Resume timer
  const resumeGlobalTimer = useCallback(async () => {
    if (!timerState.isPaused) return;

    if (timerState.taskId) {
      void resumeTaskTimer(timerState.taskId);
      return;
    }

    // Quick timer — update DB
    const now = new Date();
    const newState: GlobalTimerState = {
      ...timerState,
      isPaused: false,
      startTime: now.getTime(),
    };
    setTimerState(newState);
    persistState(newState);

    if (timerState.dbTimerId) {
      await supabase
        .from('task_timers')
        .update({
          started_at: now.toISOString(),
          paused_at: null,
        } as any)
        .eq('id', timerState.dbTimerId);
    }
  }, [timerState, resumeTaskTimer]);

  const completeGlobalTimer = useCallback(async () => {
    setWasPausedBeforeComplete(timerState.isPaused);
    
    // Auto-pause timer when showing complete dialog
    if (!timerState.isPaused && timerState.isRunning) {
      if (timerState.taskId) {
        void pauseTaskTimer(timerState.taskId);
      } else {
        const elapsedSeconds = timerState.elapsedSeconds;
        const newState: GlobalTimerState = {
          ...timerState,
          isPaused: true,
          pausedElapsed: elapsedSeconds,
          startTime: null,
        };
        setTimerState(newState);
        persistState(newState);

        if (timerState.dbTimerId) {
          await supabase
            .from('task_timers')
            .update({
              paused_at: new Date().toISOString(),
              paused_elapsed_seconds: elapsedSeconds,
            } as any)
            .eq('id', timerState.dbTimerId);
        }
      }
    }
    
    setShowCompleteDialog(true);
  }, [timerState, pauseTaskTimer]);

  const cancelCompleteDialog = useCallback(async () => {
    setShowCompleteDialog(false);
    
    if (!wasPausedBeforeComplete && timerState.isPaused) {
      if (timerState.taskId) {
        void resumeTaskTimer(timerState.taskId);
      } else {
        const now = new Date();
        const newState: GlobalTimerState = {
          ...timerState,
          isPaused: false,
          startTime: now.getTime(),
        };
        setTimerState(newState);
        persistState(newState);

        if (timerState.dbTimerId) {
          await supabase
            .from('task_timers')
            .update({
              started_at: now.toISOString(),
              paused_at: null,
            } as any)
            .eq('id', timerState.dbTimerId);
        }
      }
    }
  }, [wasPausedBeforeComplete, timerState, resumeTaskTimer]);

  const resetTimer = useCallback(async () => {
    const dbTimerId = timerState.dbTimerId;
    
    setTimerState(initialState);
    setPendingTaskLinkState(null);
    persistPendingTaskLink(null);
    setShowCompleteDialog(false);
    clearPersistedState();

    // Delete from DB if it was a quick timer
    if (dbTimerId && !timerState.taskId) {
      await supabase
        .from('task_timers')
        .delete()
        .eq('id', dbTimerId);
    }
  }, [timerState.dbTimerId, timerState.taskId]);

  const getElapsedHours = useCallback(() => {
    const hours = timerState.elapsedSeconds / 3600;
    return Math.max(0.25, Math.round(hours * 4) / 4);
  }, [timerState.elapsedSeconds]);

  const syncWithTaskTimer = useCallback((
    taskId: string,
    startedAt: string,
    pausedAt: string | null = null,
    pausedElapsedSeconds = 0,
  ) => {
    const isPaused = !!pausedAt;
    const startTime = isPaused ? null : new Date(startedAt).getTime();
    const elapsedSeconds = isPaused
      ? pausedElapsedSeconds
      : Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) + pausedElapsedSeconds;

    const newState: GlobalTimerState = {
      isRunning: true,
      isPaused,
      elapsedSeconds,
      startTime,
      pausedElapsed: pausedElapsedSeconds,
      taskId,
      dbTimerId: null,
    };
    setTimerState(newState);
    setPendingTaskLinkState(null);
    persistPendingTaskLink(null);
    persistState(newState);
  }, []);

  const setPendingTaskLink = useCallback((link: PendingTaskLink | null) => {
    setPendingTaskLinkState(link);
    persistPendingTaskLink(link);
  }, []);

  const clearPendingTaskLink = useCallback(() => {
    setPendingTaskLinkState(null);
    persistPendingTaskLink(null);
  }, []);

  const hasActiveTimer = timerState.isRunning || timerState.isPaused;

  return (
    <GlobalTimerContext.Provider
      value={{
        timerState,
        pendingTaskLink,
        setPendingTaskLink,
        clearPendingTaskLink,
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
