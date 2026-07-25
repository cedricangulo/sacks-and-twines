# dropdown-menu

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/dropdown-menu.tsx` — overwritten via `shadcn add dropdown-menu --overwrite`; restored CheckIcon `weight="bold"` (×2) and CaretRightIcon `weight="fill"`; maps to `@base-ui/react/menu` (Menu)
- `features/audit-logs/components/audit-log-filter-bar.tsx` — `DropdownMenuTrigger asChild` → `render`
- `features/dispatch-history/components/dispatch-filter-bar.tsx` — `DropdownMenuTrigger asChild` → `render`; `onSelect={(e) => e.preventDefault()}` → `closeOnClick={false}`
- `features/inventory/components/inventory-filter-bar.tsx` — `DropdownMenuTrigger asChild` → `render`; `onSelect` → `closeOnClick={false}`
- `features/reports/components/export/report-export-button.tsx` — `DropdownMenuTrigger asChild` → `render`
- `features/suppliers/components/supplier-filter-bar.tsx` — same as above
- `features/users/components/staff-filter-bar.tsx` — same as above

## Left alone

(none)

## Behavior changes

- `onSelect` event does not exist on Base UI Menu items. Use `closeOnClick={false}` to keep menu open after selection (replaces `onSelect={(e) => e.preventDefault()}`)

## Verify by hand

- Column visibility toggles in table filter bars — menu stays open
- Export menu — items close menu on click
- Keyboard navigation + typeahead within menus
