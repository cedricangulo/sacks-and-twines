# badge

2026-07-24, golden pair via CLI + manual patch, **complete**

## Changed

- `components/ui/badge.tsx` — overwritten via `shadcn add badge --overwrite`; added `success` and `warning` variant classes that existed in radix-luma but were missing from base-luma:
  - `success`: green-100/green-800 light, green-900/green-300 dark
  - `warning`: yellow-100/yellow-800 light, yellow-900/yellow-300 dark

## Left alone

(none)

## Behavior changes

- Badge now uses `useRender` + `mergeProps` instead of simple `<span>`

## Verify by hand

- Status badges (Active, Archived, Good, Low Stock) render with correct colors
- All badge variant classes available: default, secondary, destructive, outline, ghost, link, success, warning
