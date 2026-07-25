# select

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/select.tsx` — overwritten via `shadcn add select --overwrite`; restored CaretDownIcon `weight="fill"` (trigger), CheckIcon `weight="bold"`, CaretUpIcon `weight="fill"`; second CaretDownIcon (scroll arrow) has no weight; maps to `@base-ui/react/select`; `alignItemWithTrigger` replaces `position="popper"`
- Consumer files: `onValueChange` now passes `(value: string | null, eventDetails) => void`. All call sites updated with null guards:
  - `features/audit-logs/components/audit-log-filter-bar.tsx`
  - `features/dispatch-history/components/dispatch-filter-bar.tsx`
  - `features/inventory/components/field-card.tsx`
  - `features/inventory/hooks/use-inventory-dialog.ts` — `handleCategoryChange` accepts `string | null`
  - `features/stock-adjustments/components/dialogs/adjust-stock-dialog.tsx`

## Left alone

(none)

## Behavior changes

- `onValueChange` fires with `null` when selection is cleared (Base UI behavior)
- `alignItemWithTrigger` is a boolean, replacing Radix's `position="popper"`

## Verify by hand

- All Select dropdowns open correctly
- Value selection works in add/edit forms
- Category/unit selects in inventory dialog
