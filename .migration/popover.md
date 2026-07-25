# popover

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/popover.tsx` — overwritten via `shadcn add popover --overwrite`; uses `@base-ui/react/popover` (Root, Trigger, Popup, Arrow, Title, Description)
- `features/inventory/components/table/batch-actions-menu.tsx` — `PopoverTrigger asChild` → `render`
- `features/inventory/components/table/product-table-actions.tsx` — `PopoverTrigger asChild` → `render`
- `features/suppliers/components/supplier-table-actions.tsx` — `PopoverTrigger asChild` → `render`

## Left alone

(none)

## Behavior changes

- Content is now `Popup` instead of `Content`
- Uses `data-open`/`data-closed` instead of `data-state`
- Animation uses `data-starting-style`/`data-ending-style`

## Verify by hand

- Action menus open on click
- Popover positions correctly relative to trigger
- Click outside closes popover
