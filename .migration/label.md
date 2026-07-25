# label

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/label.tsx` — overwritten via `shadcn add label --overwrite`; uses native `<label>` element (no Base UI dependency needed by base-luma)

## Behavior changes

- No longer a Radix primitive; uses native `<label>`
- Uses `useRender` + `mergeProps`

## Verify by hand

- Labels correctly associated with form controls
