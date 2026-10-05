# Sprint Plan — Receiving History, Table Alignment, Dashboard Alerts, Indexing, Stress Test

> Status: **implemented, uncommitted** — all 5 tickets shipped in one changeset.
> Not yet done: schema deploy + the 5 backfills on the target deployment.
> Created: 2026-09-30
> Scope: 5 tickets from the QA/backlog review

## Ticket index

| # | Ticket | Section | Deliverable | State |
|---|--------|---------|-------------|-------|
| 1 | Add receiving products history similar to dispatch | [§1](#1-receiving-history-stock-ins) | New `/receiving-history` route | Shipped |
| 1b | Right-align cost in the table | [§2](#2-right-align-all-numericcurrency-columns-repo-wide) | Repo-wide alignment sweep | Shipped |
| 2 | Dashboard: make low/out-of-stock clickable | [§3](#3-dashboard-clickable-statuses) | Tiles + banner links | Shipped |
| 3 | Optimization: check database indexing for slow loading | [§4](#4-optimization--docsperformance-auditmd) | `docs/PERFORMANCE-AUDIT.md` | Shipped (P5 caveat noted) |
| 4 | QA: perform a system stress test | [§5](#5-qa--system-stress-test) | `convex/stress/*` harness | Shipped |

### What shipped after the plan was written

Recorded here because the sections below describe the plan, not the result.

- **§1 — receiving history.** Built as specified, plus two corrections found in
  review. `status`/`receivedBy` were originally applied *after* pagination, so a
  filtered-empty page was unreachable (no pagination controls rendered in that
  state); `batches.by_status_createdAt` and `batches.by_userId_createdAt` now carry
  one filter as the index prefix, and the pagination bar stays mounted whenever
  `hasNext || hasPrev`. Separately, `batches.receivedBy` writes the literal
  `"Unknown"` when the receiving user has no name — `users.name` is optional, and
  an absent field is indistinguishable from "never backfilled", so every read of
  such a row re-issued a fallback point read.
- **§1 addendum — receiver filter removed.** The receiver filter built here was
  unusable and has been deleted, taking `by_userId_createdAt` on `batches` with
  it. `batches.mutations.stockIn` requires owner, `/receiving-history` is
  owner-only, and `users.mutations.create` hardcodes `role: "staff"` — so no
  second owner can exist, every batch's `userId` is the one seeded owner, and the
  filter could only ever select "everything". It also cost a `users.listNames`
  subscription on a page that had no use for it. `receivedBy` survives as a
  display field, shown in the row actions dialog.
- **§1 addendum — table width.** 11 nowrap columns had a ~1,545px min-content
  width against ~1,131px available at 1440px, so the page scrolled sideways.
  Root cause was `SidebarInset` sizing to that min-content as a flex item
  (`min-width: auto`); fixed with `min-w-0` on the inset, not by clipping
  `sidebar-wrapper`. Five secondary columns then moved into a row actions dialog,
  leaving 6 + actions. See `features/receiving-history/`.
- **§2 — alignment.** Done via `lib/table-alignment.ts` (`headClassName` /
  `sortButtonAlignClass`) rather than per-cell classes. One bug fixed here: the
  dispatch loading skeleton spread `DISPATCH_TABLE_COLUMNS`, which is ordered for
  the Columns dropdown, so Status/Dispatched By and Total Qty/Dispatched At
  rendered swapped against the loaded table.
- **§3 — dashboard links.** Tiles and banner chips link to
  `/inventory?stock=…`, and the banner is a point-in-time `useConvex().query`
  rather than a `useQuery` subscription (P4). One correction: the banner, the
  stat tiles and the inventory/product filters each defined the stock buckets
  differently, so a negative quantity counted in a tile but matched no filter.
  `lib/stock-level.ts` is now the single definition, used in six places.
- **§3 addendum — layout.** `<main>` in `components/dashboard-shell.tsx` had
  `overflow-y-auto`, which makes `overflow-x` compute to `auto` and put a second
  horizontal scroller next to the one every table already owns. Both role branches
  now use `overflow-x-clip`.
- **§4 — optimization.** `PERFORMANCE-AUDIT.md` carries the per-finding status
  table. Still open by design: P2 (part), P8 (part), P9 (part), P10, P14, F1
  (part), F9, F10. P5 is a win only when the two consumers' date ranges coincide.
- **§5 — stress tests.** `pnpm test:stress` runs 22 tests over
  `transaction-limits.test.ts` (production-volume `databaseQueries` budgets) and
  `concurrency.test.ts` (OCC invariants against the real rate limiter).

### Deploy checklist (not yet done)

Per `AGENTS.md`, the order is not optional — a document missing an optional field
does not match its index entry, so cutting a read path over early silently drops
rows.

1. `pnpm convex:deploy` — schema indexes + write paths
2. Run all five backfills on the target deployment
3. Deploy the read paths that trust the new fields/indexes

```
backfillBatchCreatedAt      backfillProductCreatedAt     backfillBatchDenorm
backfillProductLastSupplierId                            backfillDispatchItemCreatedAt
```

---

## Context

Findings that shape the work:

- **No "receiving" entity exists.** Inbound stock is the `batches` table
  (`batches.mutations.stockIn`, audit action `stock_in`, UI label "Add Inventory").
  `/products` is actually the *Dispatch* page (there's a TODO about it at
  `app/(dashboard)/products/layout.tsx:8`); the real product table is `/inventory`.
  Confirmed zero hits repo-wide for receiving/receipt/GRN/purchase-order.
- **"Receiving products history" = a dedicated stock-in history screen over
  `batches`** (agreed). Adjustments stay in audit logs.
- **Blocking gap:** `batches.createdAt` exists (`convex/schema.ts:78`) but is
  **never written** — the insert at `convex/batches/mutations.ts:151-161` omits it
  — and there is **no `by_createdAt` index**. A date-ranged, paginated history page
  is impossible without a schema change + backfill.
- **Cost alignment is already inconsistent:** `features/inventory/` right-aligns;
  `dispatch-history` and `reports` left-align. Worse, `SkeletonTable` right-aligns
  `number`/`currency` cells (`components/ui/skeleton-table.tsx:62-73`), so
  dispatch/reports tables currently show right-aligned skeletons and left-aligned
  values.

---

## 1. Receiving history (stock-ins) — new `/receiving-history`

**Owner-only** (stock-in is owner-only via `requireOwner`), unlike
`/dispatch-history` which is staff-visible.

### 1a. Schema + write path + migration (strict order)

1. `convex/schema.ts:79-83` — add to `batches`:
   - `.index("by_createdAt", ["createdAt"])`
   - `.index("by_supplier_createdAt", ["supplierId", "createdAt"])`
2. `convex/batches/mutations.ts:151-161` — write `createdAt: Date.now()` in the
   batch insert.
3. `convex/migrations.ts` — add `backfillBatchCreatedAt` (after
   `backfillStockAdjustmentCreatedAt` at `:200`), setting `createdAt = _creationTime`.
4. Register `backfillBatchCreatedAt` in the **deploy checklist** in `AGENTS.md`.

> Order matters (`.agents/skills/convex-performance-audit/references/hot-path-rules.md`):
> deploy schema → deploy writes → run backfill → *only then* cut the read path.
> Cutting over early loses rows whose `createdAt` is `undefined` (they don't match
> the index).

### 1b. Denormalize to avoid N+1

`batches` currently stores no display fields, so a history list needs per-row
`product`/`supplier`/`user` reads. Add three optional strings — **all data is
already in hand inside `stockIn`** (product at `:132`, supplier at `:165`, caller
known):

```ts
productName: v.optional(v.string())
supplierName: v.optional(v.string())
receivedBy: v.optional(v.string())
```

Write them in `stockIn`; backfill with a new `backfillBatchDenorm` migration.
Precedent: `dispatches` already denormalizes `userName` / `itemCount` /
`totalQuantity` / `totalValue`. As a safety net the read path keeps a Set-dedup
fallback (the proven pattern at `convex/stock_adjustments/queries.ts:31-45`).

### 1c. New query `batches.queries.listHistory`

```ts
args: {
  paginationOpts: paginationOptsValidator,
  startMs: v.number(), endMs: v.number(),
  supplierId: v.optional(v.id("suppliers")),
  status: v.optional(v.union(v.literal("active"), v.literal("depleted"), v.literal("voided"))),
}
```

- `supplierId` set → `by_supplier_createdAt`
- else → `by_createdAt`, `.order("desc").paginate(paginationOpts)`
- `status` stays **client-side** (dispatch does the same) to avoid index sprawl.
- Owner gate: `getAuthUserId` → `caller.role !== "owner"` → throw.
- Returns `page` enriched for the table.

> Superseded: the plan also specified a `receivedBy` arg with a
> `by_userId_createdAt` prefix. That arg, the index and the filter UI were all
> removed — see the §1 addendum above.

### 1d. UI files (mirror the dispatch-history module)

```
app/(dashboard)/receiving-history/layout.tsx        <- copy dispatch-history/layout.tsx
app/(dashboard)/receiving-history/page.tsx
features/receiving-history/constants.ts             <- RECEIVING_TABLE_COLUMNS + STATUS_OPTIONS
features/receiving-history/validation.ts
features/receiving-history/components/receiving-filter-bar.tsx
features/receiving-history/components/table/receiving-table-container.tsx
features/receiving-history/components/table/receiving-table.tsx
features/receiving-history/components/table/receiving-table-row.tsx
features/receiving-history/components/receiving-pagination.tsx
features/receiving-history/components/receiving-date-range.tsx
features/receiving-history/hooks/use-receiving-batches.ts
features/receiving-history/hooks/use-receiving-filters.ts
```

- **Pagination:** copy `features/audit-logs/hooks/use-audit-logs.ts` (cursor stack,
  `ITEMS_PER_PAGE = 30`, the `filtersKey` reset-on-filter-change effect) +
  `audit-log-pagination.tsx`. Use real cursor pagination — **not** dispatch's
  `.take(500)`.
- **Date range:** reuse `QUICK_RANGES` / `computeQuickRange` from
  `features/reports/constants.ts:331-408`.
- **Icons:** `@phosphor-icons/react` (repo standard; AGENTS.md still says lucide).
- **No expandable sub-row** — a batch has no line items.

### 1e. Columns

| id | Header | Cell |
|----|--------|------|
| `batchCode` | Batch Code | `font-mono`, `enableHiding: false` |
| `productName` | Product | `font-medium` |
| `skuCode` | SKU | `font-mono` |
| `supplierName` | Supplier | |
| `quantityReceived` | Qty Received | `block w-full text-right font-mono tabular-nums` |
| `quantityRemaining` | Qty Remaining | same |
| `unitCost` | Unit Cost | same, `formatCurrency` |
| `totalProcurementCost` | Total Cost | same, `formatCurrency` |
| `receivedBy` | Received By | |
| `createdAt` | Received At | `formatDateTime`, muted |
| `status` | Status | Badge — active→success, depleted→secondary, voided→destructive (mirror `batch-details-row.tsx:112-135`) |
| `actions` | — | display, empty |

> Superseded: this 11-column layout is what shipped first and then had to be
> reworked. `productSku`, `supplierName`, `quantityRemaining`, `unitCost` and
> `receivedBy` moved into a row actions dialog, leaving 6 columns + `actions`
> (which now opens that dialog rather than being empty). See the §1 addendum
> above.

### 1f. Wiring

- `proxy.ts` — add `"/receiving-history(.*)"` to **both** `isProtectedRoute` (`:9`)
  and `isOwnerOnlyRoute` (`:21`).
- `app/(dashboard)/inventory/layout.tsx` — add a "History" header button beside
  "Add Inventory", matching `app/(dashboard)/products/_client-layout.tsx:21-28`.
- Optional: sidebar entry in `components/app-sidebar.tsx` (dispatch-history has
  none, so this would be an improvement — say the word).

### 1g. Tests

Extend `convex/batches/queries.test.ts`: unauth → throws; non-owner → throws;
date-range bounds (uses `createdAt`, not `_creationTime`); desc ordering; cursor
pagination (`isDone` / `continueCursor`); supplier filter selects
`by_supplier_createdAt`; status filter; denormalized-field short-circuit.

---

## 2. Right-align all numeric/currency columns (repo-wide)

**Canonical class:** `"block w-full text-right font-mono tabular-nums"` (use the
`batch-details-row.tsx` ordering and normalize `inventory-table-container.tsx` to
match).

### Cells to change (left → right)

- `features/dispatch-history/components/table/dispatch-items-row.tsx:111` Qty,
  `:128` Unit Cost, `:137` Line Total
- `features/dispatch-history/components/table/dispatch-table-container.tsx:91`
  Total Items, `:100` Total Qty
- `features/reports/components/tables/report-dispatch-table-container.tsx:50`
  Items, `:58` Value
- `features/reports/components/tables/report-adjustment-table-container.tsx:51` Qty

### Deliberately kept left (identifiers, not measures)

- OR Number (`dispatch-table-container.tsx:56`, `report-dispatch-table-container.tsx:41`)
- Contact Number (`supplier-table-container.tsx:56`)

### Header alignment (the real fix)

`components/ui/table.tsx:73` hardcodes `text-left align-middle` on every
`TableHead`, so today headers are left while values are right. Add a per-column
alignment meta and read it in each pure table:

```ts
// column def
columnHelper.accessor("unitCost", { header: "Unit Cost", meta: { align: "right" }, ... })

// pure table, TableHead
className={cn("text-muted-foreground", align === "right" && "text-right")}
// and the sort button needs justify-end when right-aligned
```

Pure tables to update: `inventory-table.tsx`, `dispatch-table.tsx`,
`dispatch-items-row.tsx`, `report-dispatch-table.tsx`,
`report-adjustment-table.tsx`, new `receiving-table.tsx`.

### Skeleton parity

`SkeletonCell` already right-aligns `number`/`currency`. Add those `type`s to the
dispatch/reports column constants and fix
`app/(dashboard)/dispatch-history/page.tsx:74-84` to spread
`DISPATCH_TABLE_COLUMNS` instead of hardcoding (compare
`inventory/page.tsx:71-78`, which already spreads).

---

## 3. Dashboard clickable statuses

### 3a. Stat tiles — `features/dashboard/components/stat-cards.tsx`

`Card` is a plain `div` (`components/ui/card.tsx:5-21`) with **no `render` prop**,
and `components/ui/` is shadcn-managed — so don't wrap the whole card in a `<Link>`
(it contains a per-item list; nested anchors are invalid).

Extract a `StatTile` sub-component taking `title`, `count`, `href`, `icon`, `tone`,
`items[]`:

- **Label + count + icon block** → the primary link
  (`hover:bg-muted/40 focus-visible:ring-2 rounded-2xl transition-colors`,
  `transitionTypes={["nav-forward"]}` for the existing ViewTransition,
  `data-cuelume-press`/`data-cuelume-release` per repo sound convention).
- **Each product name** in the list → its own link to `/inventory?search=<sku>`.
- Hrefs: `/inventory?stock=out_of_stock`, `/inventory?stock=low_stock`. Count parity
  is exact — `summaryStats` (`convex/dashboard/queries.ts:44`, `qty <= threshold`)
  and `use-inventory-filters.ts:87-89` (`qty > 0 && qty <= threshold`) agree after
  the `qty === 0` split.
- Widen `StatCardsProps["stockAlerts"]` (currently `:19-24`) to include `productId`,
  `currentQuantity`, `lowStockThreshold`; add `skuCode` to the alert payload at
  `convex/dashboard/queries.ts:45-50` (the query already returns `productId` — the
  narrow prop type erases it).

### 3b. Banner refresh — `components/stock-banner.tsx`

Current: a `<div>` with a muted `<p>` string and a bare X. It reads as static text.
New:

- `role="region"` + `aria-label="Stock alerts"`; `flex flex-wrap items-center gap-2`.
- Replace `parts.join(", ")` with **two anchor chips** — `3 Out of stock` →
  `/inventory?stock=out_of_stock`, `7 Low on stock` →
  `/inventory?stock=low_stock` — styled
  `rounded-full ring-1 ring-current/25 px-2 py-0.5 hover:bg-foreground/5 transition-colors focus-visible:ring-2 cursor-pointer`.
- Trailing `ArrowRightIcon` with `group-hover:translate-x-0.5 transition-transform`
  so hover reads as navigable.
- Keep the dismiss X as a **sibling** (not nested) so the chips stay valid anchors;
  preserve localStorage dismissal + cross-tab sync as-is.
- Keep red/amber severity icon.

---

## 4. Optimization → `docs/PERFORMANCE-AUDIT.md`

> **This section is a summary.** The full problem statement, evidence, and phased
> solution live in [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md). The per-row
> fan-out findings live in [`N-1-QUERY-AUDIT.md`](./N-1-QUERY-AUDIT.md).

Written **problem-first**, per request. Structure:

### Part I — The problems

15 findings, each: symptom → evidence `file:line` → why it's slow → which Convex
limit it threatens → current blast radius.

| # | Problem | Evidence |
|---|---------|----------|
| P1 | `products.list` = unindexed full-table collect driving `/inventory`; also returns archived rows the default filter immediately drops | `convex/products/queries.ts:18` |
| P2 | `products.listDispatchReady` = 2N index ranges + every active batch, on the staff landing page, live-subscribed — re-runs on every write | `convex/products/queries.ts:112-155` |
| P3 | `dashboard.productMovement` unguarded N+1, **plus** a byte-identical month range already read by `dailyDispatchVolume` (separate fn refs ⇒ no cache dedupe) | `convex/dashboard/queries.ts:206-220` vs `:85`/`:200` |
| P4 | `StockBanner` forces a full `products.by_status` range read on **every owner page** | `components/stock-banner.tsx:27-30` + `dashboard-shell.tsx:118` |
| P5 | `/reports` reads the same month twice and the same adjustments twice, via two different functions | `convex/reports/queries.ts:25/54`, `:82/24` |
| P6 | `auditLogs.listActions` = 500-doc scan to build a dropdown, and it **silently drops** action types absent from the newest 500 | `convex/auditLogs/queries.ts:248` |
| P7 | `auditLogs.listByUser` = up to 30 identical point reads on one document | `convex/auditLogs/queries.ts:221-231` |
| P8 | audit-log date filters applied in JS **after** an index scan — no `by_action_createdAt` | `convex/auditLogs/queries.ts:68-79`, `:303-308` |
| P9 | Report exports = full scans + **sequential** `for` loops instead of `Promise.all` + 2–3 gets/row | `convex/reports/queries.ts:108,168,213,511,525,312,426` |
| P10 | `dispatches.list` `.take(500)` then client-side search **over the truncated set** — searches silently miss older rows | `convex/dispatches/queries.ts:34`, `lib/fetch_entities.ts:50`, `use-dispatch-history-filters.ts:41-49` |
| P11 | `fetchDispatches`/`fetchAdjustments` have no limit param and are called `{0, Infinity}` on "All Time" | `convex/lib/fetch_entities.ts:12-17,56-67` |
| P12 | `products.createdAt` and `batches.createdAt` are **never written** by the app, so their existing fields are dead | `convex/products/mutations.ts:68-79`, `convex/batches/mutations.ts:151` |
| P13 | Audit export caps at 2000 **and writes the truncated count into the audit trail** | `convex/auditLogs/queries.ts:320`, `:184-193` |
| P14 | Dead/redundant indexes: `dispatches.by_userId`, `stockAdjustments.by_userId` never read; `auditLogs.by_action`/`by_userId` are prefixes of compound indexes → write amplification on every mutation | `convex/schema.ts:96,134,147,148` |
| P15 | `batches.getCountByProduct` collects full docs for `.length` and has no callsite | `convex/batches/queries.ts:75-88` |

### Part II — Recommended solution, phased by impact/risk

- **Phase 0** — capture `npx convex insights --details` as the baseline before
  touching anything.
- **Phase 1 — no schema change.** `listActions` → static constant in
  `convex/lib/constants.ts`, delete the query; `listByUser` → return `caller.name`;
  `products.list` → take a `status` arg and use `withIndex("by_status")`; delete the
  dead `getCountByProduct` / `listForDispatch`.
- **Phase 2 — collapse duplicate reads.** Merge `dailyDispatchVolume` +
  `productMovement`; split `summaryStats` into `summaryStats` (dashboard) +
  `stockAlerts` (banner, `.take(20)`); fold `reports.calendarSummary` into
  `monthlyAggregates`.
- **Phase 3 — denormalize.** `products.lastSupplierId` (supplier already fetched in
  `stockIn`); `dispatches.productUnits` aggregate;
  `batches.productName`/`supplierName`/`receivedBy` (already required by §1b).
- **Phase 4 — schema + migrations** in the mandated order:
  `batches.by_createdAt`, `batches.by_supplier_createdAt`, `products.by_createdAt`,
  `auditLogs.by_action_createdAt`; new backfills `backfillBatchCreatedAt`,
  `backfillBatchDenorm`, `backfillProductCreatedAt`,
  `backfillProductLastSupplierId`, all registered in the AGENTS.md deploy checklist.
- **Phase 5 — pagination & truncation honesty.** Convert `dispatches.list` to cursor
  pagination; surface or remove the 2000-row audit export cap and stop recording the
  truncated count; require a start date for "All Time"; add limit params to the
  fetch helpers.
- **Phase 6 — reports exports.** Sequential loops → `Promise.all`; per-row gets →
  Set-dedup.

### Part III — Convex's own opinion

Quote `convex/_generated/ai/guidelines.md:241-247` ("Do NOT use `filter` in
queries"; "ALWAYS return a bounded collection instead of `.collect()`"; "Never use
`.collect().length` to count rows"), `:155-158` (index naming/field-order; "Do not
store unbounded lists as an array field"), and the limits table from
`.agents/skills/convex-performance-audit/references/function-budget.md` (1 s
execution, 16 MiB read, 32,000 docs scanned, 4,096 index ranges, 16,000 docs
written). Note this repo already violates three of those rules today, and that the
`.agents/skills/convex-performance-audit/` skill (already vendored) should be run to
validate the doc's claims against a live deployment.

### Part IV — Expected effect & verification

Which `convex insights` metrics should move; before/after invocation counts per
route.

### Part V — Explicitly rejected options

And why — e.g. keeping `.take(500)`; adding a new `receipts` table; adding a
denormalized `dispatchItems` array on `dispatches` (violates
`guidelines.md:156`).

---

## 5. QA — system stress test

### Layer A — transaction-limit harness (highest value, CI-able)

`convex-test@0.0.51` supports `transactionLimits`, which this repo **never uses**
(0 occurrences). Its defaults match Convex's real limits exactly: 16 MiB read /
16 MiB written / 32,000 docs read / 4,096 index ranges / 16,000 docs written /
1,000 scheduled functions.

- New `convex/stress/transaction-limits.test.ts` with
  `convexTest({ schema, modules, transactionLimits: true })`.
- Seed at production scale, mirroring `convex/lib/constants.ts:37-43`: 90 dense days
  × 20–25 dispatches ≈ ~2,000 dispatches, ~77 batches, ~80 adjustments, 1 audit log
  per dispatch → **~17k records**. Use the array-of-promises + single `Promise.all`
  inside one `t.run` pattern from `convex/seed.ts:434-485`, chunked at ~2,000 docs
  per `t.run` to stay under the 16,000-doc write limit (same chunking as
  `seedAction.ts:165-183`).
- Assert every hot query runs **without** a limit error: `products.list`,
  `listDispatchReady`, `dashboard.summaryStats`, `productMovement`,
  `dispatches.list`, `listByDateRange`, `reports.monthlyAggregates`,
  `calendarSummary`, `auditLogs.list`, `listActions`, `batches.listHistory`.
- Then tighten to **explicit regression budgets** per query
  (`transactionLimits: { documentsRead: N, databaseQueries: M }`) so a future N+1
  fails loudly instead of degrading silently. This is the durable artifact.
- Add `transactionLimits: true` as a second pass to the existing query test files.

### 5. Layer B — concurrency / OCC

- Concurrent `dispatches.mutations.submit` against the same product's FIFO batches →
  assert no negative stock, correct `quantityRemaining` / `totalAssetValue`. This
  also exercises the OCC retry path documented in
  `.agents/skills/convex-performance-audit/references/occ-conflicts.md`.
- Concurrent `batches.mutations.stockIn` + `stock_adjustments.mutations.create` on
  one product — the read-modify-write on `products.currentQuantity`
  (`convex/batches/mutations.ts:172-182`, `convex/stock_adjustments/mutations.ts:71-79`)
  is the contention point.
- **Rate-limiter caveat:** `globalMutations` is 120/min sustained, 240 burst
  (`convex/rate_limiter.ts:82-95`), so any real concurrency test trips it. Plan:
  swap `./rate_limiter.ts` in the module map for a permissive test double
  (deterministic isolation), **plus** one dedicated test using `vi.useFakeTimers()`
  (currently used zero times in this repo) asserting the real bucket *does* trip.
- **`mockResolvedValueOnce` hazard:** existing tests use it for `getAuthUserId`; a
  concurrent query calling it twice gets `undefined`. Use `mockResolvedValue` in
  stress tests.

### Layer C — live-deployment smoke (manual, not in CI)

Before/after `npx convex insights --details` for function timing, plus an optional
`scripts/` Node ESM harness using `ConvexHttpClient` to fire N concurrent queries
against a dev deployment. Note the 1 GB/month free-tier I/O budget the seed is
already careful about.

### Scripts

Add `"test:stress": "vitest --run convex/stress"`.

### Verification for every item

`pnpm test`, `pnpm test:verbose`, `pnpm typecheck`, `pnpm check`, plus a manual a11y
pass on the new banner/tiles (focus order, Enter activation, screen-reader labels).

---

## Notes / open items

- `AGENTS.md` is stale in three places this work touches: it says lucide (repo uses
  `@phosphor-icons/react`), documents `SkeletonTable` as taking `headers: string[]`
  (real API is `columns: {label,type}[]`), and its deploy backfill list needs
  `backfillBatchCreatedAt` + the new denorm backfills. Will update it.
- Ordering: §1b's denormalization and §4's Phase 3 overlap — do the batch denorm
  once, inside §1.
- Sidebar entry for `/receiving-history`: say whether wanted (dispatch-history
  doesn't have one).
