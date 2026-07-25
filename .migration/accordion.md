# accordion

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/accordion.tsx` — overwritten via `shadcn add accordion --overwrite`; restored CaretDownIcon/CaretUpIcon `weight="fill"`
- `features/audit-logs/components/audit-log-accordion.tsx` — `type="single" collapsible` → `multiple` with value wrapped in array

## Left alone

(none)

## Behavior changes

- Base UI accordion uses `multiple` boolean instead of `type="single" collapsible`. Multiple items can be open simultaneously unless `multiple={false}`.
- `value` is always an array in Multi mode

## Verify by hand

- Open/close accordion items in audit log view
- Verify smooth enter/exit animations
