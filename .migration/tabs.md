# tabs

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/tabs.tsx` — overwritten via `shadcn add tabs --overwrite`; uses `@base-ui/react/tabs` (Root, List, Tab, Panel); no `activationMode` prop
- No consumer-side changes needed

## Left alone

(none)

## Behavior changes

- No `activationMode` prop — Base UI defaults to manual keyboard activation (arrow keys change focus, Enter/Space activates)
- Uses `data-active` instead of `data-state="active"`
- Tab indicator uses CSS `[data-active]` selector

## Verify by hand

- Tabs switch content correctly
- Keyboard navigation works (arrow keys, Enter/Space)
