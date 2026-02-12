export interface TaskBindingSnapshot {
  taskTitle: string;
  taskDescription: string | null;
  projectName: string | null;
  clientName: string | null;
}

export interface TaskBinding {
  taskId: string;
  snapshot: TaskBindingSnapshot;
}

export interface TaskBindingResolvedContext {
  taskId: string;
  isValid: boolean;
  title: { value: string; source: 'current' | 'snapshot' | 'missing' };
  description: { value: string; source: 'current' | 'snapshot' | 'missing' };
  project: { value: string; source: 'current' | 'snapshot' | 'missing' };
  client: { value: string; source: 'current' | 'snapshot' | 'missing' };
}

interface ReconcileParams {
  binding: TaskBinding | null;
  task: { id: string; name: string; description: string | null; project_id: string } | null;
  project: { id: string; name: string; client_id: string } | null;
  client: { id: string; name: string; company: string | null } | null;
}

const resolveField = (
  currentValue: string | null | undefined,
  snapshotValue: string | null | undefined,
  fallback: string,
) => {
  if (currentValue && currentValue.trim()) {
    return { value: currentValue, source: 'current' as const };
  }

  if (snapshotValue && snapshotValue.trim()) {
    return { value: snapshotValue, source: 'snapshot' as const };
  }

  return { value: fallback, source: 'missing' as const };
};

export const reconcileTaskBinding = ({ binding, task, project, client }: ReconcileParams): TaskBindingResolvedContext | null => {
  if (!binding) return null;

  return {
    taskId: binding.taskId,
    isValid: !!task,
    title: resolveField(task?.name, binding.snapshot.taskTitle, 'Tarefa removida'),
    description: resolveField(task?.description, binding.snapshot.taskDescription, 'Sem descrição'),
    project: resolveField(project?.name, binding.snapshot.projectName, 'Sem projeto'),
    client: resolveField(client?.company || client?.name, binding.snapshot.clientName, 'Sem cliente'),
  };
};


interface ResolveSubmitTaskParams {
  bindingContext: TaskBindingResolvedContext | null;
  selectedTaskId: string;
  linkMode: 'existing' | 'new';
}

export const resolveSubmitTaskId = ({ bindingContext, selectedTaskId, linkMode }: ResolveSubmitTaskParams) => {
  if (bindingContext?.isValid) {
    return { taskId: bindingContext.taskId, blocked: false };
  }

  if (bindingContext && !bindingContext.isValid && linkMode === 'existing' && selectedTaskId === bindingContext.taskId) {
    return { taskId: null, blocked: true };
  }

  return { taskId: selectedTaskId || null, blocked: false };
};
