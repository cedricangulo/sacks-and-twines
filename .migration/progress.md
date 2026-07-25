# progress

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/progress.tsx` — overwritten via `shadcn add progress --overwrite`; uses `@base-ui/react/progress` (Root, Track, Indicator, Label, Value)
- Made `value` prop optional with default `null` (Base UI requires `value: number | null`; `null` = indeterminate state)

## Left alone

(none)

## Behavior changes

- `value` is required (typed as `number | null`); `null` for indeterminate
- Uses `aria-valuenow` for accessibility

## Verify by hand

- PDF export dialog shows progress bar during generation
- Indeterminate progress (no value) renders correctly
