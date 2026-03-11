/**
 * Centralized bidirectional mapping between DB task statuses and Kanban stage names.
 *
 * Legacy statuses stored in DB: "pending", "in_progress", "completed"
 * Custom stages stored in DB by their UUID id.
 */

export interface KanbanStageBase {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

/** Legacy DB status → default stage display name */
export const LEGACY_STATUS_TO_NAME: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

/** Default stage display name → legacy DB status */
export const STAGE_NAME_TO_LEGACY: Record<string, string> = {
  'Pendente': 'pending',
  'Em Andamento': 'in_progress',
  'Concluída': 'completed',
};

/**
 * Convert a DB status value to the kanban stage display name.
 * Handles legacy keys, custom stage UUIDs, and values already stored as stage names.
 */
export const getStageKeyFromStatus = (
  status: string,
  stages: KanbanStageBase[],
): string => {
  // 1. Legacy status (pending / in_progress / completed)
  if (LEGACY_STATUS_TO_NAME[status]) {
    return LEGACY_STATUS_TO_NAME[status];
  }
  // 2. Custom stage stored by id
  const byId = stages.find((s) => s.id === status);
  if (byId) return byId.name;
  // 3. Value is already a stage name
  const byName = stages.find((s) => s.name === status);
  if (byName) return byName.name;
  // Fallback
  return stages[0]?.name || 'Pendente';
};

/**
 * Convert a kanban stage display name back to the DB status value.
 * Default stages return legacy keys; custom stages return their UUID id.
 */
export const getStatusFromStageKey = (
  stageName: string,
  stages: KanbanStageBase[],
): string => {
  // 1. Default stage → legacy status key
  if (STAGE_NAME_TO_LEGACY[stageName]) {
    return STAGE_NAME_TO_LEGACY[stageName];
  }
  // 2. Custom stage → use its id
  const stage = stages.find((s) => s.name === stageName);
  if (stage) return stage.id;
  return 'pending';
};

/**
 * Convert a KanbanStage to its DB status value (used when cycling statuses).
 */
export const stageToDbStatus = (stage: KanbanStageBase): string => {
  return STAGE_NAME_TO_LEGACY[stage.name] || stage.id;
};

/**
 * Get stage info (name, color) from a DB status value.
 * Uses the stages array dynamically — no hardcoded fallbacks for custom stages.
 */
export const getStageInfoFromStatus = (
  status: string,
  stages: KanbanStageBase[],
): { name: string; color: string | null } => {
  const stageName = getStageKeyFromStatus(status, stages);
  const stage = stages.find((s) => s.name === stageName);
  if (stage) {
    return { name: stage.name, color: stage.color };
  }
  // Legacy fallbacks only when no stages are provided
  switch (status) {
    case 'pending': return { name: 'Pendente', color: '#eab308' };
    case 'in_progress': return { name: 'Em Andamento', color: '#3b82f6' };
    case 'completed': return { name: 'Concluída', color: '#22c55e' };
    case 'archived': return { name: 'Arquivo', color: '#64748b' };
    default: return { name: status, color: null };
  }
};

/**
 * Check if a given DB status corresponds to the last (completed) stage.
 */
export const isCompletedStatus = (
  status: string,
  stages: KanbanStageBase[],
): boolean => {
  if (stages.length === 0) return status === 'completed';
  const sorted = [...stages].sort((a, b) => a.order_position - b.order_position);
  const lastStage = sorted[sorted.length - 1];
  const dbStatus = stageToDbStatus(lastStage);
  return status === dbStatus || status === lastStage.name;
};

/**
 * Get the DB status value for the last (completed) kanban stage.
 */
export const getCompletedDbStatus = (stages: KanbanStageBase[]): string => {
  if (stages.length === 0) return 'completed';
  const sorted = [...stages].sort((a, b) => a.order_position - b.order_position);
  return stageToDbStatus(sorted[sorted.length - 1]);
};
