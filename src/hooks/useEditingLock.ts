import { useEffect } from 'react';
import { useData } from '@/contexts/DataContext';

/**
 * Hook that locks DataContext refreshes while a dialog/form is open.
 * Prevents TOKEN_REFRESHED events from wiping user input.
 */
export const useEditingLock = (open: boolean) => {
  const { lockEditing, unlockEditing } = useData();

  useEffect(() => {
    if (open) {
      lockEditing();
    } else {
      unlockEditing();
    }
    return () => unlockEditing();
  }, [open, lockEditing, unlockEditing]);
};
