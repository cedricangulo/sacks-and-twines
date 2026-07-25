# dialog

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/dialog.tsx` — overwritten via `shadcn add dialog --overwrite`; restored XIcon `weight="bold"`; maps to `@base-ui/react/dialog` primitives (Backdrop, Popup, Close)
- `features/inventory/components/dialogs/add-inventory-dialog.tsx` — `DialogTrigger asChild` → `render`; removed `onPointerDownOutside`, `onInteractOutside`, `onFocusOutside` from DialogContent (Radix-only, controlled state handles prevention)
- `features/inventory/components/dialogs/edit-batch-dialog.tsx` — `DialogTrigger asChild` → `render`; removed Radix-only outside-interaction callbacks; `children` type narrowed
- `features/inventory/components/dialogs/void-batch-dialog.tsx` — `DialogTrigger asChild` → `render`; `children` type narrowed
- `features/products/components/dialogs/edit-product-dialog.tsx` — `DialogTrigger asChild` → `render`; `children` type narrowed
- `features/suppliers/components/add-supplier-dialog.tsx` — `DialogTrigger asChild` → `render`
- `features/suppliers/components/edit-supplier-dialog.tsx` — `DialogTrigger asChild` → `render`
- `features/users/components/add-staff-dialog.tsx` — `DialogTrigger asChild` → `render`
- `components/ui/combobox.tsx` — `InputGroupButton asChild` → `render`
- `components/ui/date-picker.tsx` — `PopoverTrigger asChild` → `render`
- `features/inventory/components/dialogs/add-inventory-dialog.tsx` — `DialogTrigger asChild` → `render`

## Left alone

(none)

## Behavior changes

- Radix `onPointerDownOutside`/`onInteractOutside`/`onFocusOutside` have no Base UI equivalent. Removed from non-modal dialogs; controlled `open`/`onOpenChange` state prevents auto-close.
- Non-modal dialog pattern (with explicit DialogBackdrop) preserved

## Verify by hand

- Open add/edit/void inventory dialogs, click outside — should not close (controlled state)
- Open any modal dialog, press Escape — should close
- Tab focus should trap within modal dialogs
