# TODO

## Inventory (Stock-In) — Products + Batches

### Phase 1 ✅ — Convex Backend (78 tests passing)

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

**Shot 1 ✅ — Foundation (typecheck + 78/78 tests passing)**
- [x] `validation.ts` — shared Zod schemas (`StockInSchema`, `BatchUpdateSchema`), types (`Product`, `Batch`, `BatchDetail`), `validateStockIn()`, `validateBatchUpdate()`
- [x] `hooks/use-products.ts` — `useQuery(api.products.queries.list)`
- [x] `hooks/use-batches.ts` — `useQuery(api.batches.queries.listByProduct, productId)`
- [x] `hooks/use-batch-detail.ts` — `useQuery(api.batches.queries.getById, batchId)`
- [x] `hooks/use-create-stock-in.ts` — `useMutation(api.batches.mutations.stockIn)` + sileo toast
- [x] `hooks/use-update-batch.ts` — `useMutation(api.batches.mutations.update)` + sileo toast
- [x] `hooks/use-void-batch.ts` — `useMutation(api.batches.mutations.voidBatch)` + sileo toast
- [x] `components/product-combobox.tsx` — searchable combobox with filtering, "Add New Item" button

**Shot 2 ✅ — Components (typecheck clean, 78/78 tests)**
- [x] `components/batch-actions-menu.tsx` — popover with Edit/Void actions (only for active batches)
- [x] `components/batch-details-row.tsx` — expandable batch sub-table (sortable, fetched via `useBatches`)
- [x] `components/add-inventory-dialog.tsx` — dual-mode dialog (existing/new product + supplier + qty/cost)
- [x] `components/edit-batch-dialog.tsx` — edit with dirty tracking + history lock warning
- [x] `components/void-batch-dialog.tsx` — void with effect warnings + optional reason
- [x] `components/inventory-table-row.tsx` — product row with expand chevron
- [x] `components/inventory-table.tsx` — main product table with TanStack sorting/search/filter, expandable batch sub-rows, low stock indicator

**Shot 3 ✅ — Refactoring (typecheck clean, 78/78 tests)**
- [x] `hooks/use-inventory-dialog.ts` — extracted state + submit logic from dialog into standalone hook
- [x] `components/field-card.tsx` — extracted right panel into `React.memo`-wrapped component
- [x] `components/supplier-combobox.tsx` — custom Popover + Input combobox (no library dependency, no backdrop blur)
- [x] `components/product-combobox.tsx` — replaced Base UI Combobox with custom Popover (fixes "Add New Item" not clickable)
- [x] `components/add-inventory-dialog.tsx` — slimmed 553→148 lines, pure orchestrator wiring hook → sub-components
- [x] `useEffect` → event handler for field sync (`handleSelectProduct`)
- [x] `useMemo` on filtered combobox lists (skip `.filter()` on every render)
- [x] Single `useState<FieldValues>` object instead of 5 individual setters

### Phase 4 ✅ — Page

- [x] `app/(dashboard)/inventory/layout.tsx` — title + AddInventoryDialog (same pattern as users/suppliers)
- [x] `app/(dashboard)/inventory/page.tsx` — search input + auth guard + skeleton loading + InventoryTable

---

## Next Up (future features in priority order)

### Products (Dispatch / Stock-Out)

- [ ] `convex/products-queries.ts` — active products for dispatch grid
- [ ] `convex/batches/queries.ts` — active batches in FIFO order for dispatch
- [ ] `convex/dispatches/mutations.ts` — `createDispatch` (atomic: deduct from batches + create dispatch items + decrement product stock)
- [ ] `convex/dispatches/validators.ts`
- [ ] `features/products/` — two-panel UI (product grid + dispatch queue)
- [ ] `app/(dashboard)/products/page.tsx` — replace placeholder

### Dispatch History

- [ ] `convex/dispatches/queries.ts` — list dispatches with items
- [ ] `features/dispatch-history/`
- [ ] `app/(dashboard)/dispatch-history/page.tsx`

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

- [ ] `convex/stock-adjustments/queries.ts`
- [ ] `convex/stock-adjustments/mutations.ts`
- [ ] `features/stock-adjustments/`
- [ ] `app/(dashboard)/stock-adjustments/page.tsx`

### Reports

- [ ] Backend queries
- [ ] Frontend page
