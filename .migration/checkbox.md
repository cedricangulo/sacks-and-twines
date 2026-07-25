# checkbox

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/checkbox.tsx` — overwritten via `shadcn add checkbox --overwrite`; restored CheckIcon `weight="bold"`
- No consumer-side changes needed (checkbox used directly in forms, no asChild patterns)

## Left alone

(none)

## Behavior changes

- Uses `@base-ui/react/checkbox` primitives
- Uses `data-checked`/`data-unchecked` instead of `data-state`
- Indicator is a slot child, rendered conditionally via `props.checked`

## Verify by hand

- Checkbox toggle works in forms
- Checked/unchecked visual state correct
