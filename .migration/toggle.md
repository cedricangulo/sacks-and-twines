# toggle / toggle-group

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/toggle.tsx` — overwritten via `shadcn add toggle --overwrite`; uses `@base-ui/react/toggle` (Root)
- `components/ui/toggle-group.tsx` — overwritten via `shadcn add toggle-group --overwrite`; uses `@base-ui/react/toggle-group` (Root)

## Behavior changes

- Toggle uses `pressed` prop (not `aria-pressed` pattern)
- Toggle group uses `value` (not `type="multiple"`)
- Uses `data-pressed`/`data-toggled` instead of `data-state`

## Verify by hand

- Toggle buttons switch state correctly
