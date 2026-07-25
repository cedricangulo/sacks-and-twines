# separator

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/separator.tsx` — overwritten via `shadcn add separator --overwrite`; uses native `<hr>` or `<div>` with `role="separator"` (no Base UI dependency needed by base-luma)

## Behavior changes

- No longer a Radix primitive; uses native HTML separator element
- Orientation handled via CSS classes (`data-orientation`)

## Verify by hand

- Separators render between sections
