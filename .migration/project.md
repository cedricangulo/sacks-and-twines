# Project: sacks-and-twines → Base UI

2026-07-24, whole-project golden pair via CLI + consumer sweep, **complete**

## Strategy

1. Flipped `components.json` style: `radix-luma` → `base-luma`
2. Ran `shadcn add --overwrite` per component (21 wrappers: button, separator, label, toggle, badge, button-group, checkbox, avatar, progress, radio-group, tabs, toggle-group, tooltip, popover, accordion, dialog, alert-dialog, sheet, dropdown-menu, select, sidebar + bonus input.tsx, skeleton.tsx)
3. Restored phosphor icon weights lost during overwrite (accordion, checkbox, dialog, dropdown-menu, select, sheet, sidebar)
4. Consumer sweep: `asChild` → `render` across all app code
5. Consumer sweep: `onSelect` → `closeOnClick` on DropdownMenuCheckboxItem
6. Removed Radix-only Dialog callbacks (`onPointerDownOutside`, `onInteractOutside`, `onFocusOutside`)
7. `radix-ui` removed from `package.json`
8. Fixed type errors: `Badge` success/warning variants, `Select` onValueChange null handling, `Progress` value required, `render` prop type narrowing
9. Final typecheck: 0 errors; lint: 3 pre-existing errors (sidebar.tsx exhaustive deps ×2, convex test unused vars ×2)

## Files touched

- `components.json` — style flipped
- `components/ui/*.tsx` (23 files) — overwritten with base-luma variants
- 20+ consumer files in `features/`, `app/`, `components/` — asChild→render and prop migrations
- `features/audit-logs/components/audit-log-filter-bar.tsx` — AlertDialogDescription render removed, Select null guards
- `features/inventory/hooks/use-inventory-dialog.ts` — Select null guard
- `package.json` — removed `radix-ui`

## Remaining on Radix



## Pre-existing lint errors (not from migration)

- `components/ui/sidebar.tsx` — 2 exhaustive-deps warnings (setOpenMobile)
- `convex/dispatches/mutations.test.ts:610` — unused batchId
- `convex/suppliers/mutations.test.ts:98,182` — unused supplierId, phantomId
