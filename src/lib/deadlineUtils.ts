import { parseISO, isPast, isToday, differenceInDays } from 'date-fns';

export type DeadlineStatus = 'overdue' | 'near' | 'normal';

/**
 * Determines the status of a deadline based on the due date.
 * - 'overdue': Past due date (not today)
 * - 'near': Due within 3 days (including today)
 * - 'normal': Due in more than 3 days
 */
export function getDeadlineStatus(dueDate: string | null | undefined): DeadlineStatus | null {
  if (!dueDate) return null;
  
  const due = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(due) && !isToday(due)) return 'overdue';
  if (differenceInDays(due, today) <= 3) return 'near';
  return 'normal';
}

/**
 * Returns Tailwind CSS classes based on the deadline status.
 */
export function getDeadlineClasses(status: DeadlineStatus | null): string {
  switch (status) {
    case 'overdue':
      return 'text-red-500 bg-red-500/10';
    case 'near':
      return 'text-amber-500 bg-amber-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

/**
 * Returns Tailwind CSS text color only based on the deadline status.
 */
export function getDeadlineTextColor(status: DeadlineStatus | null): string {
  switch (status) {
    case 'overdue':
      return 'text-red-500';
    case 'near':
      return 'text-amber-500';
    default:
      return 'text-muted-foreground';
  }
}
