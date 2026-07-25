# alert-dialog

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/alert-dialog.tsx` — overwritten via `shadcn add alert-dialog --overwrite`; maps to `@base-ui/react/alert-dialog` (Root, Trigger, Backdrop, Popup, Close — no Action/Overlay/Cancel)
- `features/audit-logs/components/audit-log-filter-bar.tsx` — `AlertDialogDescription asChild` → removed (Base UI Description doesn't support render); content wrapped differently
- `features/users/components/staff-table-actions.tsx` — `AlertDialogTrigger asChild` → `render`

## Left alone

(none)

## Behavior changes

- No `AlertDialogAction` component in base-luma (use `Close` + `onClick`)
- No `AlertDialogOverlay` — replaced by `AlertDialogBackdrop`
- No `AlertDialogCancel` — replaced by `AlertDialogClose`

## Verify by hand

- Deactivate staff user flow
- Export audit logs confirmation dialog
