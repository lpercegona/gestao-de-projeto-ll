

## Problem

In `ProjectDetailDialogContent.tsx` (line 202), the "Editar" dropdown item calls `onClose()` before `onEditProject(project)`. This closes the FormSheet before `handleStartEdit` in `ProjectDetailSheet` can switch to edit mode.

The same issue exists on line 208 for "Arquivar" and line 211 for "Excluir" — but those are intentional dismissals. Only the edit action needs to stay inline.

## Fix

**File: `src/components/projects/ProjectDetailDialogContent.tsx`**

Remove the `onClose()` call from the "Editar" action for admin users (line 202), so clicking "Editar" triggers `onEditProject(project)` directly, which calls `handleStartEdit` in `ProjectDetailSheet` and switches to edit mode inline.

Change:
```typescript
onClick={() => { onClose(); if (isClientMode) { onEditRequest?.(project); } else { onEditProject(project); } }}
```

To:
```typescript
onClick={() => { if (isClientMode) { onClose(); onEditRequest?.(project); } else { onEditProject(project); } }}
```

This keeps `onClose()` only for the client mode (which opens a separate request form), while admin/master users transition directly to inline editing within the same FormSheet.

**Single file, single line change.**

