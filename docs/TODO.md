# TODO

## Inventory (Stock-In) — Products + Batches

### Phase 1 ✅ — Convex Backend (154 tests passing)

- [X] `convex/products/validators.ts`
- [X] `convex/batches/validators.ts`
- [X] `convex/products/queries.ts` — `list`, `getById`
- [X] `convex/products/mutations.ts` — `create` (SKU generation), `update`
- [X] `convex/batches/queries.ts` — `listByProduct`, `getById` (with computed fields), `getCountByProduct`
- [X] `convex/batches/mutations.ts` — `stockIn` (existing/new product + batch, atomic), `update` (history lock), `void`
- [X] Update `convex/rate_limiter.ts` — activate batch limits
- [X] `convex/products/queries.test.ts` — 7 tests
- [X] `convex/products/mutations.test.ts` — 8 tests
- [X] `convex/batches/queries.test.ts` — 6 tests
- [X] `convex/batches/mutations.test.ts` — 15 tests

### Phase 2 — Generated API

- [X] `npx convex dev` — let codegen pick up new modules

### Phase 3 — Frontend Feature (`features/inventory/`)

**Shot 1 ✅ — Foundation (typecheck + 154/154 tests passing)**
**Shot 2 ✅ — Components (typecheck clean, 154/154 tests)**
**Shot 3 ✅ — Refactoring (typecheck clean, 154/154 tests)**
- [X] `hooks/use-inventory-dialog.ts` — extracted state + submit logic from dialog into standalone hook
- [X] `components/field-card.tsx` — extracted right panel into `React.memo`-wrapped component
- [X] `components/supplier-combobox.tsx` — custom Popover + Input combobox (no library dependency, no backdrop blur)
- [X] `components/product-combobox.tsx` — replaced Base UI Combobox with custom Popover (fixes "Add New Item" not clickable)
- [X] `components/add-inventory-dialog.tsx` — slimmed 553→148 lines, pure orchestrator wiring hook → sub-components
- [X] `useEffect` → event handler for field sync (`handleSelectProduct`)
- [X] `useMemo` on filtered combobox lists (skip `.filter()` on every render)
- [X] Single `useState<FieldValues>` object instead of 5 individual setters

### Phase 4 ✅ — Page

- [X] `app/(dashboard)/inventory/layout.tsx` — title + AddInventoryDialog (same pattern as users/suppliers)
- [X] `app/(dashboard)/inventory/page.tsx` — search input + auth guard + skeleton loading + InventoryTable

---

## Next Up (future features in priority order)

### Products (Dispatch / Stock-Out) ✅

- [X] `convex/products/queries.ts` — `listDispatchReady` (active products + FIFO batches)
- [X] `convex/batches/queries.ts` — `listForDispatch` (active batches for FIFO deduction)
- [X] `convex/dispatches/mutations.ts` — `submit` (atomic: deduct from batches + create dispatch items + decrement + audit log)
- [X] `convex/dispatches/validators.ts` — Zod args (`customerReference`, `items`)
- [X] `convex/dispatches/mutations.test.ts` — 11 tests
- [X] `features/dispatches/` — two-panel UI (product grid + dispatch queue sidebar + mobile sheet)
- [X] `app/(dashboard)/products/page.tsx` — dispatch-ready product grid with filter bar
- [X] `lib/error-handler.ts` — centralized error handling (23+ patterns, 32 tests)
- [X] **Refactoring**: hook extractions (`useProductCard`, `useDispatchSubmit`, `useAddStaffForm`, `useEditBatchForm`, `useVoidBatchDialog`), file reorganization, prop reductions (7→1, 11→5), empty states on all pages, URL-synced filters via nuqs, shared `useSearchFilter` hook

### Dispatch History

- [X] `convex/dispatches/queries.ts` — list dispatches with items
- [X] `features/dispatch-history/`
- [X] `app/(dashboard)/dispatch-history/page.tsx`

### Archive / Unarchive Products ✅

Allow owners to archive and unarchive products to hide them from dispatch and block new stock-in while preserving transaction history.

- [X] `convex/products/mutations.ts` — `archive` (set `status: "archived"`) + `unarchive` (set `status: "active"`)
- [X] `convex/products/mutations.test.ts` — 14 tests for archive + unarchive
- [X] `convex/products/validators.ts` — `archiveProductArgs`, `unarchiveProductArgs`
- [X] `convex/rate_limiter.ts` — `archiveProduct` rate limit entry
- [X] `features/products/hooks/use-archive-product.ts` — `useArchiveProduct` + `useUnarchiveProduct` with toast
- [X] `features/inventory/components/table/product-table-actions.tsx` — Archive/Unarchive buttons with confirmation dialogs
- [X] `features/inventory/components/inventory-filter-bar.tsx` — status/category/stock filter bar
- [X] `features/inventory/hooks/use-inventory-filters.ts` — nuqs URL-synced filters (status default: Active)
- [X] `app/(dashboard)/inventory/page.tsx` — filter bar + empty states for filtered results

### Audit Logs Viewer

- [ ] `convex/audit-logs/queries.ts` — filtered, paginated, sortable
- [ ] `convex/audit-logs/export` — CSV export mutation
- [ ] `features/audit-logs/`
- [ ] `app/(dashboard)/audit-logs/page.tsx` — replace placeholder

### Dashboard Widgets

- [ ] `convex/dashboard/queries.ts` — stats (asset value, efficiency, low stock, top products, dispatch history)
- [ ] `features/dashboard/` — stat cards, charts
- [ ] `app/(dashboard)/dashboard/page.tsx` — enhance placeholder

### Stock Adjustments UI

- [ ] `convex/stock_adjustments/queries.ts`
- [ ] `convex/stock_adjustments/mutations.ts`
- [ ] `features/stock-adjustments/`
- [ ] `app/(dashboard)/stock-adjustments/page.tsx`

### Reports

- [ ] Backend queries
- [ ] Frontend page
