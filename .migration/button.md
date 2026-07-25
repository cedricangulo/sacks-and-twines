# button

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/button.tsx` — overwritten via `shadcn add button --overwrite`; now uses `@base-ui/react/button` with `useRender` + `mergeProps`; no longer supports `asChild`
- Consumer files converted from `asChild` → `render`:
  - `app/(dashboard)/products/_client-layout.tsx` (Button+Link)
  - `app/forbidden.tsx` (Button+Link)
  - `components/dashboard-shell.tsx` (Button+Link back)
  - `components/staff-header.tsx` (2× Button+Link)
  - `features/dispatch-history/components/dispatch-filter-bar.tsx` (Button+Link)
  - `components/ui/pagination.tsx` — `PaginationLink` component
  - `components/ui/date-picker.tsx` — PopoverTrigger+Button
  - `components/ui/combobox.tsx` — InputGroupButton+ComboboxTrigger

## Left alone

(none)

## Behavior changes

- Button no longer accepts `asChild` — use `render` prop instead
- Button is now a `useRender` component

## Verify by hand

- All buttons render and function correctly
- Links styled as buttons work (e.g., staff-header "Back to Dashboard")
