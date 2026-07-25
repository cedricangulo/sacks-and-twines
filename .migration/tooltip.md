# tooltip

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/tooltip.tsx` — overwritten via `shadcn add tooltip --overwrite`; uses `@base-ui/react/tooltip` (Root, Trigger, Popup, Arrow); no `TooltipProvider` needed; `delayDuration` → `delay`
- `features/inventory/components/table/inventory-table-container.tsx` — `TooltipTrigger asChild` → `render` (×2)

## Left alone

(none)

## Behavior changes

- No `TooltipProvider` wrapper required
- `delayDuration` prop renamed to `delay`
- Uses `data-open`/`data-closed` presence attrs

## Verify by hand

- Tooltip appears on hover with correct delay
- Tooltip arrow renders correctly
- Tooltip disappears on mouse leave
