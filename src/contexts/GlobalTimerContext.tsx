import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TaskBinding } from '@/lib/taskBinding';

const TIMER_STORAGE_KEY = 'oras-global-timer';

interface GlobalTimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  startTime: number | null;
  pausedElapsed: number;
  taskId: string | null;
  dbTimerId: string | null;
}

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
  pendingTaskLink?: LegacyPendingTaskLink | null;
}

interface TaskTimerSyncRow {
  id: string;
  task_id: string | null;
  user_id: string;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
  task_title_snapshot?: string | null;
  task_description_snapshot?: string | null;
  project_name_snapshot?: string | null;
  client_name_snapshot?: string | null;
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
  syncWithTaskTimer: (
    taskId: string,
    startedAt: string,
    pausedAt?: string | null,
    pausedElapsedSeconds?: number,
    snapshots?: {
      taskName?: string;
      taskDescription?: string;
      projectName?: string;
      clientName?: string;
    }
  ) => void;
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

const toTaskBinding = (link?: LegacyPendingTaskLink | TaskBinding | null): TaskBinding | null => {
  if (!link || !link.taskId) return null;

  if ('snapshot' in link) {
    return {
      taskId: link.taskId,
      snapshot: {
        taskTitle: link.snapshot.taskTitle || 'Tarefa',
        taskDescription: link.snapshot.taskDescription || null,
        projectName: link.snapshot.projectName || null,
        clientName: link.snapshot.clientName || null,
      },
    };
  }

  return {
    taskId: link.taskId,
    snapshot: {
      taskTitle: link.taskName || 'Tarefa',
      taskDescription: link.taskDescription || null,
      projectName: link.projectName || null,
      clientName: link.clientName || null,
    },
  };
};

const getStoredTaskBinding = (parsed: PersistedTimerState): TaskBinding | null => {
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

const loadPersistedTaskBinding = (): TaskBinding | null => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedTimerState;
    const hasActiveTimer = parsed.isRunning || parsed.isPaused;
    if (!hasActiveTimer) return null;

    return getStoredTaskBinding(parsed);
  } catch {
    return null;
  }
};

const persistState = (state: GlobalTimerState) => {
  let persistedBinding: TaskBinding | null = null;

  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedTimerState;
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
    delete parsed.pendingTaskLink;
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // noop
  }
};

const clearPersistedState = () => {
  localStorage.removeItem(TIMER_STORAGE_KEY);
};

const getSnapshotColumns = (binding: TaskBinding | null) => ({
  task_id: binding?.taskId || null,
  task_title_snapshot: binding?.snapshot.taskTitle || null,
  task_description_snapshot: binding?.snapshot.taskDescription || null,
  project_name_snapshot: binding?.snapshot.projectName || null,
  client_name_snapshot: binding?.snapshot.clientName || null,
});

export const GlobalTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data, pauseTaskTimer, resumeTaskTimer } = useData();
  const [timerState, setTimerState] = useState<GlobalTimerState>(() => loadPersistedState());
  const [taskBinding, setTaskBindingState] = useState<TaskBinding | null>(() => loadPersistedTaskBinding());
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [wasPausedBeforeComplete, setWasPausedBeforeComplete] = useState(false);

  useEffect(() => {
    if (!user || !data.taskTimers) return;

    const activeTaskTimer = data.taskTimers.find((t) => t.user_id === user.id) as TaskTimerSyncRow | undefined;

    if (activeTaskTimer) {
      const isPaused = !!activeTaskTimer.paused_at;
      const startTime = isPaused ? null : new Date(activeTaskTimer.started_at).getTime();
      const pausedElapsed = activeTaskTimer.paused_elapsed_seconds || 0;
      const elapsedSeconds = isPaused
        ? pausedElapsed
        : Math.floor((Date.now() - new Date(activeTaskTimer.started_at).getTime()) / 1000) + pausedElapsed;

      let resolvedBinding: TaskBinding | null = null;
      if (activeTaskTimer.task_id) {
        const task = data.tasks.find((item) => item.id === activeTaskTimer.task_id);
        if (task) {
          const project = data.projects.find((item) => item.id === task.project_id);
          const client = project ? data.clients.find((item) => item.id === project.client_id) : null;
          resolvedBinding = {
            taskId: task.id,
            snapshot: {
              taskTitle: task.name,
              taskDescription: task.description,
              projectName: project?.name || null,
              clientName: client?.company || client?.name || null,
            },
          };
        } else {
          const persisted = loadPersistedTaskBinding();
          resolvedBinding = {
            taskId: activeTaskTimer.task_id,
            snapshot: {
              taskTitle:
                activeTaskTimer.task_title_snapshot ||
                (persisted?.taskId === activeTaskTimer.task_id ? persisted.snapshot.taskTitle : null) ||
                'Tarefa indisponível',
              taskDescription:
                activeTaskTimer.task_description_snapshot ||
                (persisted?.taskId === activeTaskTimer.task_id ? persisted.snapshot.taskDescription : null) ||
                null,
              projectName:
                activeTaskTimer.project_name_snapshot ||
                (persisted?.taskId === activeTaskTimer.task_id ? persisted.snapshot.projectName : null) ||
                null,
              clientName:
                activeTaskTimer.client_name_snapshot ||
                (persisted?.taskId === activeTaskTimer.task_id ? persisted.snapshot.clientName : null) ||
                null,
            },
          };
          console.warn('Global timer binding fallback: tarefa vinculada não encontrada no catálogo atual.');
        }
      }

      const newState: GlobalTimerState = {
        isRunning: true,
        isPaused,
        elapsedSeconds,
        startTime,
        pausedElapsed,
        taskId: activeTaskTimer.task_id,
        dbTimerId: activeTaskTimer.id,
      };

      setTaskBindingState((prev) => {
        const sameBinding = JSON.stringify(prev) === JSON.stringify(resolvedBinding);
        if (!sameBinding) {
          persistTaskBinding(resolvedBinding);
          return resolvedBinding;
        }
        return prev;
      });

      setTimerState((prev) => {
        if (
          prev.dbTimerId === newState.dbTimerId &&
          prev.isPaused === newState.isPaused &&
          prev.startTime === newState.startTime &&
          prev.pausedElapsed === newState.pausedElapsed
        ) {
          return prev.isRunning === newState.isRunning && prev.elapsedSeconds === newState.elapsedSeconds
            ? prev
            : { ...prev, elapsedSeconds: newState.elapsedSeconds, isRunning: true, taskId: newState.taskId };
        }

        persistState(newState);
        return newState;
      });
    } else if (timerState.dbTimerId || timerState.taskId) {
      setTimerState(initialState);
      setTaskBindingState(null);
      persistTaskBinding(null);
      clearPersistedState();
    }
  }, [user, data.taskTimers, data.tasks, data.projects, data.clients, timerState.dbTimerId, timerState.taskId]);

  useEffect(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    const interval = setInterval(() => {
      if (timerState.startTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - timerState.startTime) / 1000) + timerState.pausedElapsed;
        setTimerState((prev) => ({ ...prev, elapsedSeconds: elapsed }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.pausedElapsed]);

  const startGlobalTimer = useCallback(async () => {
    if (timerState.isRunning || !user) return;

    const now = new Date();
    const nowMs = now.getTime();

    const optimisticState: GlobalTimerState = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: nowMs,
      pausedElapsed: 0,
      taskId: taskBinding?.taskId || null,
      dbTimerId: null,
    };
    setTimerState(optimisticState);
    persistState(optimisticState);

    const { data: timer, error } = await supabase
      .from('task_timers')
      .insert({
        user_id: user.id,
        started_at: now.toISOString(),
        ...getSnapshotColumns(taskBinding),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error starting quick timer:', error);
      return;
    }

    setTimerState((prev) => {
      const updated = { ...prev, dbTimerId: timer.id, taskId: (timer as any).task_id || prev.taskId };
      persistState(updated);
      return updated;
    });
  }, [timerState.isRunning, user, taskBinding]);

  const pauseGlobalTimer = useCallback(async () => {
    if (!timerState.isRunning || timerState.isPaused) return;

    if (timerState.taskId) {
      void pauseTaskTimer(timerState.taskId);
      return;
    }

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
          ...getSnapshotColumns(taskBinding),
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
  }, [timerState, pauseTaskTimer, data.taskTimers, user?.id, taskBinding]);

  const resumeGlobalTimer = useCallback(async () => {
    if (!timerState.isPaused) return;

    if (timerState.taskId) {
      void resumeTaskTimer(timerState.taskId);
      return;
    }

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
          ...getSnapshotColumns(taskBinding),
        } as any)
        .eq('id', timerState.dbTimerId);
    }
  }, [timerState, resumeTaskTimer, taskBinding]);

  const completeGlobalTimer = useCallback(async () => {
    setWasPausedBeforeComplete(timerState.isPaused);

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
              ...getSnapshotColumns(taskBinding),
            } as any)
            .eq('id', timerState.dbTimerId);
        }
      }
    }

    setShowCompleteDialog(true);
  }, [timerState, pauseTaskTimer, taskBinding]);

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
              ...getSnapshotColumns(taskBinding),
            } as any)
            .eq('id', timerState.dbTimerId);
        }
      }
    }
  }, [wasPausedBeforeComplete, timerState, resumeTaskTimer, taskBinding]);

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

    if (timerIdToDelete) {
      const { error } = await supabase.from('task_timers').delete().eq('id', timerIdToDelete);
      if (error) {
        console.error('Error deleting timer on reset:', error);
      }
    }

    setTimerState(initialState);
    setTaskBindingState(null);
    persistTaskBinding(null);
    setShowCompleteDialog(false);
    clearPersistedState();
  }, [timerState.dbTimerId, timerState.taskId, taskBinding?.taskId, data.taskTimers, user]);

  const getElapsedHours = useCallback(() => {
    const hours = timerState.elapsedSeconds / 3600;
    return Math.max(0.25, Math.round(hours * 4) / 4);
  }, [timerState.elapsedSeconds]);

  const syncWithTaskTimer = useCallback(
    (
      taskId: string,
      startedAt: string,
      pausedAt: string | null = null,
      pausedElapsedSeconds = 0,
      snapshots: {
        taskName?: string;
        taskDescription?: string;
        projectName?: string;
        clientName?: string;
      } = {},
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

      const nextBinding: TaskBinding = {
        taskId,
        snapshot: {
          taskTitle: snapshots.taskName || 'Tarefa',
          taskDescription: snapshots.taskDescription || null,
          projectName: snapshots.projectName || null,
          clientName: snapshots.clientName || null,
        },
      };
      setTaskBindingState(nextBinding);
      persistTaskBinding(nextBinding);
      persistState(newState);
    },
    [],
  );

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
