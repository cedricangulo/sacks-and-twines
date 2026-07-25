# button-group / avatar / radio-group / input / skeleton

2026-07-24, golden pair via CLI, **complete**

## button-group

- `components/ui/button-group.tsx` — overwritten; uses `useRender` + `mergeProps`

## avatar

- `components/ui/avatar.tsx` — overwritten; uses `useRender` + `mergeProps`; no Base UI primitive
- Fallback rendering pattern unchanged

## radio-group

- `components/ui/radio-group.tsx` — overwritten; uses `@base-ui/react/radio-group`
- Uses `data-checked` instead of `data-state`
- No consumer-side changes needed

## input

- `components/ui/input.tsx` — bonus overwrite; uses native `<input>`; no Base UI dependency

## skeleton

- `components/ui/skeleton.tsx` — bonus overwrite; CSS-only; no Base UI dependency
- No behavior changes

## Verify by hand

- Radio group selection works
- Avatar fallback renders when no image
