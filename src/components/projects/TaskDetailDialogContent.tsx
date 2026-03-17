import React from "react";
import { TaskCard } from "./TaskCard";

interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  due_date?: string | null;
  created_by: string | null;
  created_at: string;
  is_pending_approval?: boolean;
  approval_label?: string;
  pending_request_id?: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  description: string | null;
  date: string;
  created_by: string | null;
  entry_type?: 'task' | 'meeting';
}

interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

interface TaskTimer {
  id: string;
  task_id: string | null;
  started_at: string;
  paused_at: string | null;
  paused_elapsed_seconds: number;
}

export interface TaskDetailDialogContentProps {
  task: Task;
  timeEntries: TimeEntry[];
  kanbanStages: KanbanStage[];
  isAdminOrMaster: boolean;
  isClientMode: boolean;
  currentUserId?: string;
  getTaskHours: (taskId: string) => number;
  getCreatorName: (userId: string | null) => string;
  getActiveTimer?: (taskId: string) => TaskTimer | null;
  onEditTask: (task: any) => void;
  onDeleteTask: (task: any) => void;
  onRegisterTime?: (taskId: string, entry?: { id: string; hours: number; description: string | null; date: string; entry_type?: 'task' | 'meeting' }) => void;
  onStartTimer?: (taskId: string) => Promise<void>;
  onStopTimer?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onRequestTaskEdit?: (task: any) => void;
  onClose: () => void;
}

export const TaskDetailDialogContent: React.FC<TaskDetailDialogContentProps> = ({
  task,
  timeEntries,
  kanbanStages,
  isAdminOrMaster,
  isClientMode,
  currentUserId,
  getTaskHours,
  getCreatorName,
  getActiveTimer,
  onEditTask,
  onDeleteTask,
  onRegisterTime,
  onStartTimer,
  onStopTimer,
  onCompleteTask,
  onRequestTaskEdit,
  onClose,
}) => {
  const taskTimeEntries = timeEntries.filter((e) => e.task_id === task.id);
  const activeTimer = getActiveTimer?.(task.id) || null;
  const isPendingApproval = Boolean(task.is_pending_approval);
  const ownTask = currentUserId ? task.created_by === currentUserId : true;
  const hasPerTaskPermissions = !!currentUserId && !isAdminOrMaster;

  return (
    <div className="pt-2">
      <TaskCard
        task={task}
        taskHours={getTaskHours(task.id)}
        timeEntries={taskTimeEntries}
        activeTimer={activeTimer}
        kanbanStages={kanbanStages}
        getCreatorName={getCreatorName}
        onEditTask={() => { onClose(); onEditTask(task); }}
        onDeleteTask={() => { onClose(); onDeleteTask(task); }}
        onRequestEdit={
          !isPendingApproval && !ownTask && onRequestTaskEdit
            ? () => { onClose(); onRequestTaskEdit(task); }
            : undefined
        }
        onRegisterTime={onRegisterTime || (() => {})}
        onStartTimer={() => (isPendingApproval || !onStartTimer ? Promise.resolve() : onStartTimer(task.id))}
        onStopTimer={() => (isPendingApproval || !onStopTimer ? Promise.resolve() : onStopTimer(task.id))}
        onCompleteTask={() => (isPendingApproval || !onCompleteTask ? Promise.resolve() : onCompleteTask(task.id))}
        showStatus
        showTimeControls={hasPerTaskPermissions ? ownTask : !isClientMode}
        allowTaskEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        allowTaskDelete={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        showRegisterTimeButton={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
        allowTimeEntryEdit={!isPendingApproval && (hasPerTaskPermissions ? ownTask : !isClientMode)}
      />
    </div>
  );
};
