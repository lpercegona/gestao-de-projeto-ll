import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TaskBinding } from '@/lib/taskBinding';
import type { TaskTimerBinding } from '@/types';

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

export interface PendingTaskLink extends TaskTimerBinding {}

interface LegacyPendingTaskLink {
  taskId: string;
  taskName: string;
  taskDescription?: string | null;
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
  taskBinding?: TaskBinding | null;
  taskBinding?: TaskTimerBinding | null;
  pendingTaskLink?: LegacyPendingTaskLink | null;
}

interface TaskTimerSyncRow {
  id: string;
  task_id: string | null;
  user_id: string;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
  task_name_snapshot?: string | null;
  task_description_snapshot?: string | null;
  project_name_snapshot?: string | null;
  client_name_snapshot?: string | null;
}

interface TaskBindingResolution {
  taskId: string | null;
  pendingTaskLink: PendingTaskLink | null;
  shouldWarnMissingTask: boolean;
}

interface GlobalTimerContextType {
  timerState: GlobalTimerState;
  taskBinding: TaskBinding | null;
  setTaskBinding: (binding: TaskBinding | null) => void;
  clearTaskBinding: () => void;
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
  syncWithTaskTimer: (taskId: string, startedAt: string, pausedAt?: string | null, pausedElapsedSeconds?: number, snapshots?: Partial<PendingTaskLink>) => void;
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
const toTaskBinding = (link?: LegacyPendingTaskLink | TaskTimerBinding | null): TaskTimerBinding | null => {
  if (!link || !link.taskId) return null;

  if ('taskTitleSnapshot' in link) {
    return {
      taskId: link.taskId,
      taskTitleSnapshot: link.taskTitleSnapshot,
      taskDescriptionSnapshot: link.taskDescriptionSnapshot || '',
      projectNameSnapshot: link.projectNameSnapshot || '',
      clientNameSnapshot: link.clientNameSnapshot || '',
      boundAt: typeof link.boundAt === 'number' ? link.boundAt : Date.now(),
    };
  }

  return {
    taskId: link.taskId,
    taskTitleSnapshot: link.taskName || '',
    taskDescriptionSnapshot: '',
    projectNameSnapshot: link.projectName || '',
    clientNameSnapshot: link.clientName || '',
    boundAt: Date.now(),
  };
};

const getStoredTaskBinding = (parsed: PersistedTimerState): TaskTimerBinding | null => {
  return toTaskBinding(parsed.taskBinding) || toTaskBinding(parsed.pendingTaskLink);
};

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
  let persistedBinding: TaskBinding | null = null;
  let persistedBinding: TaskTimerBinding | null = null;

  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedTimerState;
      persistedBinding = parsed.taskBinding || null;
      persistedBinding = getStoredTaskBinding(parsed);
    }
  } catch {
    persistedBinding = null;
  }

  const toPersist: PersistedTimerState = {
    isRunning: state.isRunning && !state.isPaused,
    isPaused: state.isPaused,
    startTime: state.startTime,
    pausedElapsed: state.pausedElapsed,
    taskId: state.taskId,
    dbTimerId: state.dbTimerId,
    taskBinding: persistedBinding,
  };

  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(toPersist));
};

const clearPersistedState = () => {
  localStorage.removeItem(TIMER_STORAGE_KEY);
};


const loadPersistedTaskBinding = (): TaskBinding | null => {
const loadPersistedPendingTaskLink = (): PendingTaskLink | null => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedTimerState;
    const hasActiveTimer = parsed.isRunning || parsed.isPaused;
    if (!hasActiveTimer) return null;

    const binding = parsed.taskBinding;
    if (!binding?.taskId || !binding?.snapshot?.taskTitle) {
      return null;
    }

    return binding;
    return getStoredTaskBinding(parsed);
  } catch {
    return null;
  }
};

const persistTaskBinding = (binding: TaskBinding | null) => {
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

    parsed.taskBinding = binding;
    parsed.taskBinding = link;
    delete parsed.pendingTaskLink;
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // noop
  }
};


const getSnapshotColumns = (link: PendingTaskLink | null) => ({
  task_id: link?.taskId || null,
  task_title_snapshot: link?.taskName || null,
  task_description_snapshot: link?.taskDescription || null,
  project_name_snapshot: link?.projectName || null,
  client_name_snapshot: link?.clientName || null,
});

export const GlobalTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data, pauseTaskTimer, resumeTaskTimer } = useData();
  const [timerState, setTimerState] = useState<GlobalTimerState>(() => loadPersistedState());
  const [taskBinding, setTaskBindingState] = useState<TaskBinding | null>(() => loadPersistedTaskBinding());
  const [pendingTaskLink, setPendingTaskLinkState] = useState<PendingTaskLink | null>(null);
  const [rehydrationChecked, setRehydrationChecked] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [wasPausedBeforeComplete, setWasPausedBeforeComplete] = useState(false);

  const resolveTaskBinding = useCallback((
    activeTaskTimer: TaskTimerSyncRow,
    tasks: typeof data.tasks,
    persistedState: PersistedTimerState | null,
  ): TaskBindingResolution => {
    // Quick timer (task_id = null): never populate binding metadata
    if (!activeTaskTimer.task_id) {
      return {
        taskId: null,
        pendingTaskLink: null,
        shouldWarnMissingTask: false,
      };
    }

    const task = tasks.find((item) => item.id === activeTaskTimer.task_id);
    if (task) {
      const project = data.projects.find((item) => item.id === task.project_id);
      const client = project ? data.clients.find((item) => item.id === project.client_id) : null;

      return {
        taskId: task.id,
        pendingTaskLink: {
          taskId: task.id,
          taskName: task.name,
          projectName: project?.name || 'Sem projeto',
          clientName: client?.company || client?.name || 'Sem cliente',
        },
        shouldWarnMissingTask: false,
      };
    }

    const hasSnapshot = !!(
      activeTaskTimer.task_name_snapshot ||
      activeTaskTimer.task_description_snapshot ||
      activeTaskTimer.project_name_snapshot ||
      activeTaskTimer.client_name_snapshot
    );

    if (hasSnapshot) {
      return {
        taskId: null,
        pendingTaskLink: {
          taskId: activeTaskTimer.task_id,
          taskName: activeTaskTimer.task_name_snapshot || 'Tarefa indisponível',
          projectName: activeTaskTimer.project_name_snapshot || activeTaskTimer.task_description_snapshot || 'Sem projeto',
          clientName: activeTaskTimer.client_name_snapshot || 'Sem cliente',
        },
        shouldWarnMissingTask: true,
      };
    }

    const fallbackLink = persistedState?.pendingTaskLink;
    if (fallbackLink?.taskName) {
      return {
        taskId: null,
        pendingTaskLink: {
          taskId: fallbackLink.taskId || activeTaskTimer.task_id,
          taskName: fallbackLink.taskName,
          projectName: fallbackLink.projectName || 'Sem projeto',
          clientName: fallbackLink.clientName || 'Sem cliente',
        },
        shouldWarnMissingTask: true,
      };
    }

    return {
      taskId: null,
      pendingTaskLink: {
        taskId: activeTaskTimer.task_id,
        taskName: 'Tarefa indisponível',
        projectName: 'Sem projeto',
        clientName: 'Sem cliente',
      },
      shouldWarnMissingTask: true,
    };
  }, [data.tasks, data.projects, data.clients]);

  // Sync with any active task timer from the database (including unlinked quick timers)
  useEffect(() => {
    if (!user || !data.taskTimers) return;

    const activeTaskTimer = data.taskTimers.find(t => t.user_id === user.id) as TaskTimerSyncRow | undefined;

    if (activeTaskTimer) {
      if (activeTaskTimer.task_id) {
        setTaskBindingState(null);
        persistTaskBinding(null);
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
        taskId: resolvedBinding.taskId,
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
      setRehydrationChecked(true);
    } else if (timerState.dbTimerId || timerState.taskId) {
      // Timer was stopped externally (from another device), reset
      setTimerState(initialState);
      setTaskBindingState(null);
      persistTaskBinding(null);
      clearPersistedState();
      setRehydrationChecked(true);
    } else if (!rehydrationChecked) {
      const localTimer = loadPersistedState();
      const localPendingLink = loadPersistedPendingTaskLink();
      if (localTimer.isRunning || localTimer.isPaused) {
        setTimerState(localTimer);
      }
      setPendingTaskLinkState(localPendingLink);
      setRehydrationChecked(true);
    }
  }, [user, data.taskTimers, rehydrationChecked, timerState.dbTimerId, timerState.taskId]);

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
      taskId: pendingTaskLink?.taskId || null,
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
        ...getSnapshotColumns(pendingTaskLink),
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
  }, [timerState.isRunning, user, pendingTaskLink]);

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
          ...getSnapshotColumns(pendingTaskLink),
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
          ...getSnapshotColumns(pendingTaskLink),
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
    const originTaskId = taskBinding?.taskId || timerState.taskId;
    const fallbackTimerId = data.taskTimers.find((timer) => {
      if (!user) return false;
      if (timer.user_id !== user.id) return false;
      if (dbTimerId) return timer.id === dbTimerId;
      if (originTaskId) return timer.task_id === originTaskId;
      return !timer.task_id;
    })?.id;
    const timerIdToDelete = dbTimerId || fallbackTimerId;

    setTimerState(initialState);
    setTaskBindingState(null);
    persistTaskBinding(null);
    setShowCompleteDialog(false);
    clearPersistedState();

    if (timerIdToDelete) {
      await supabase
        .from('task_timers')
        .delete()
        .eq('id', timerIdToDelete);
    }
  }, [timerState.dbTimerId, timerState.taskId, taskBinding?.taskId, data.taskTimers, user]);

  const getElapsedHours = useCallback(() => {
    const hours = timerState.elapsedSeconds / 3600;
    return Math.max(0.25, Math.round(hours * 4) / 4);
  }, [timerState.elapsedSeconds]);

  const syncWithTaskTimer = useCallback((
    taskId: string,
    startedAt: string,
    pausedAt: string | null = null,
    pausedElapsedSeconds = 0,
    snapshots: Partial<PendingTaskLink> = {},
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
    setTaskBindingState(null);
    persistTaskBinding(null);
    persistState(newState);
  }, [pendingTaskLink]);

  const setTaskBinding = useCallback((binding: TaskBinding | null) => {
    setTaskBindingState(binding);
    persistTaskBinding(binding);
  }, []);

  const clearTaskBinding = useCallback(() => {
    setTaskBindingState(null);
    persistTaskBinding(null);
  }, []);

  const hasActiveTimer = timerState.isRunning || timerState.isPaused;

  return (
    <GlobalTimerContext.Provider
      value={{
        timerState,
        taskBinding,
        setTaskBinding,
        clearTaskBinding,
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
