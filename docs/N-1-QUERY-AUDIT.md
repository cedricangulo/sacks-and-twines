# N+1 Query Audit

> Status: **findings only — no code changed**
> Created: 2026-09-30
> Scope: every `ctx.db.get` / `ctx.db.query` executed inside a per-row loop or
> `Promise.all(map(...))` in `convex/**/queries.ts`
> Companion to: [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md) (indexing,
> unbounded collects, duplicate range reads)

---

## 1. Why this matters here

From `.agents/skills/convex-performance-audit/references/function-budget.md:25`:

> **Index ranges read per transaction: 4,096** (each `db.get` and `db.query` call)

Every per-row read is a *separate* index range. An N+1 over 4,000 rows is not slow
— it throws. At 500 rows it is already 25% of the budget, spent on data the client
never asked for.

The same file, `:6-10`:

> **Core Principle** — Convex functions run inside transactions with budgets for
> time, reads, and writes. Staying well within these limits is not just about
> avoiding errors, it reduces latency and contention.

And from `hot-path-rules.md:23-30`:

> Every byte read or written multiplies with concurrency. Think:
> `cost x calls_per_second x 86400`

This app is read-heavy on **reactive** queries (`useQuery` = live subscription, not
one-shot), so an N+1 doesn't run once per page load — it re-runs on every write to
any document in its read set.

> **Important qualifier (added 2026-09-30).** Convex has **no field projections** —
> verified against `convex@1.43`, whose database interface exposes no
> `withProjection()` / `projectFields()` (`node_modules/convex/dist/cjs-types/server/database.d.ts`).
> Consequences for this document:
>
> - Invalidation is **document-level**. A `ctx.db.get(productId)` re-triggers the
>   query when *any* field of that product changes, even fields the query never
>   reads. You cannot narrow a point read to the fields you need.
> - Therefore every fix below is justified by **narrowing the read set** (fewer
>   `ctx.db.get` / `ctx.db.query` calls), **not** by trimming the returned shape.
>   Projecting the return value reduces bytes over the wire but leaves invalidation
>   and server-side reads untouched.
> - Measure these fixes on `databaseQueries` (index-range count), not on `bytesRead`
>   or response size. See §5.
>
> Full treatment: [`PERFORMANCE-AUDIT.md` §III.5](./PERFORMANCE-AUDIT.md#iii5-no-field-projections--which-lever-actually-reduces-invalidation).

### Concretely, at the current seed size

Seed volume is defined in `convex/lib/constants.ts:37-43`: 90 dense days × 20–25
dispatches/day ≈ **~2,000 dispatches**, ~77 batches, ~80 adjustments, one audit log
per dispatch → **~17k records** total.

| Site | N+1 factor at current volume | Index ranges per invocation |
|---|---|---|
| `products.list` | N products (~20) | ~41 |
| `products.listDispatchReady` | N products (~20) | ~61 + B batch docs |
| `dashboard.productMovement` | D dispatches in range (up to ~22 for one month) | ~23 + I item docs |
| `auditLogs.list` | 30 (page size) | ~31 |
| `auditLogs.listByUser` | 30 (page size) | ~31 — **all on 1 document** |
| `reports.exportBatches` | B batches (all) | 1 + 3B |
| `reports.exportDispatchItems` | D × items, **serialized** | 2D + 2I, sequential |
| `reports.exportMonthlyReport` | D × items, **serialized** | 2D + 2I, sequential |

None of these are close to the 4,096 ceiling **today**. That is exactly the problem:
they are invisible, so nobody fixes them, and they scale linearly until they aren't.

---

## 2. The correct pattern is already in this codebase

Two working implementations exist. Copy these; do not invent a third.

### Reference A — `convex/stock_adjustments/queries.ts:31-45`

Dedupe foreign keys through a `Set` before reading:

```ts
const uniqueProductIds = [...new Set(filtered.map((a) => a.productId))]
const uniqueBatchIds = [...new Set(filtered.map((a) => a.batchId))]
const uniqueUserIds = [...new Set(filtered.map((a) => a.userId))]

const [productMap, batchMap, userMap] = await Promise.all([
  Promise.all(
    uniqueProductIds.map(async (id) => [id, await ctx.db.get(id)] as const)
  ).then(Object.fromEntries),
  Promise.all(
    uniqueBatchIds.map(async (id) => [id, await ctx.db.get(id)] as const)
  ).then(Object.fromEntries),
  Promise.all(
    uniqueUserIds.map(async (id) => [id, await ctx.db.get(id)] as const)
  ).then(Object.fromEntries),
])

return filtered.map((adjustment) => ({
  ...adjustment,
  productName: productMap[adjustment.productId]?.name ?? "Unknown",
  batchCode: batchMap[adjustment.batchId]?.batchCode ?? "Unknown",
  userName: userMap[adjustment.userId]?.name ?? "Unknown",
}))
```

### Reference B — `convex/auditLogs/queries.ts:322-342` (`fetchExportLogs`)

Same idea, `Map` form, and it keeps the `filter(id !== undefined)` type guard:

```ts
const userIdSet = new Set(
  logs
    .map((log) => log.userId)
    .filter((id): id is Id<"users"> => id !== undefined)
)
const userMap = new Map<string, { name: string | null; email: string; role: string | null }>()
await Promise.all(
  [...userIdSet].map(async (id) => {
    const user = await ctx.db.get(id)
    if (user) {
      userMap.set(id, { name: user.name ?? null, email: user.email, role: user.role ?? null })
    }
  })
)
```

Note the `if (user) userMap.set(...)` — it deliberately leaves holes rather than
storing `null`, so the fallback path stays reachable. `hot-path-rules.md:202-219`
calls this out explicitly:

> Bad lookup map pattern: `const ownersById = { [project.ownerId]: { ownerName: null } }`
> — that blocks fallback because the map says "I have data" when it does not.

---

## 3. Findings

Ordered by impact. Each entry: **site → evidence → cost → fix**.

---

### F1 — `products.listDispatchReady` — 2 index ranges per product, on the staff landing page

`convex/products/queries.ts:112-155`

```ts
return await Promise.all(
  products.map(async (product) => {
    // `lastBatch` and `activeBatches` are independent — fetch in parallel.
    const [lastBatch, activeBatches] = await Promise.all([
      ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .order("desc")
        .first(),                                             // ← range 1
      ctx.db
        .query("batches")
        .withIndex("by_product_status", (q) =>
          q.eq("productId", product._id).eq("status", "active")
        )
        .order("asc")
        .collect(),                                           // ← range 2
    ])

    const fifoBatches = activeBatches.filter((b) => b.quantityRemaining > 0)

    let imageUrl: string | undefined
    if (product.imagePath) {
      try {
        const url = await ctx.storage.getUrl(product.imagePath)   // ← storage call
        imageUrl = url ?? undefined
      } catch { imageUrl = undefined }
    }
    ...
```

**Cost:** 2N index ranges + B batch documents (every active batch of every
product) + N `ctx.storage.getUrl` network calls, all in one transaction. This is the
**single highest read-amplification query in the app**, and it is on `/products` —
the page staff are redirected to (`proxy.ts:55`).

**Aggravating factor:** it is a live `useQuery` subscription
(`app/(dashboard)/products/page.tsx:21-24`). Product and batch documents are patched
by every dispatch (`convex/dispatches/mutations.ts:151`), every stock adjustment
(`convex/stock_adjustments/mutations.ts:73`) and every stock-in
(`convex/batches/mutations.ts:172-182`) — so this whole transaction re-executes on
essentially every write in the system, for every connected client.

**Fix, in order of value:**

1. **Denormalize `lastSupplierId` onto `products`.** Range 1 exists solely to
   recover one field. `batches.stockIn` already has the supplier doc in hand at
   `convex/batches/mutations.ts:165` — one extra line in the existing patch removes
   N index ranges. Requires a `backfillProductLastSupplierId` migration.
2. **Defer `availableBatches` per card.** The payload is only needed when a
   `ProductCard` is actually rendered. Move it behind a `useQuery` inside the card
   component, or return only a count and load the FIFO list on interaction.
3. Until then, at minimum `.take(N)` with a visible "showing N of M" affordance so
   growth is observable instead of silent.

---

### F2 — `dashboard.productMovement` — unguarded N+1, self-documented

`convex/dashboard/queries.ts:206-220`

```ts
// TODO(scale): N+1 query — one dispatchItems read per dispatch. At current
// volume (~50/month) this is fine. If it grows, denormalize a
// productBreakdown field on dispatches at write time (same pattern as
// totalQuantity) and read it directly here.
const unitsByProduct = new Map<Id<"products">, number>()
await Promise.all(
  dispatches.map(async (d) => {
    const items = await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
      .collect()
    for (const item of items) {
      unitsByProduct.set(
        item.productId,
        (unitsByProduct.get(item.productId) ?? 0) + item.quantityDeducted
      )
    }
  })
)
```

**Cost:** D index ranges + I item documents, where D = completed dispatches in the
selected range. The `TODO` says "~50/month" but the seed generates **20–25 dispatches
*per day*** (`convex/lib/constants.ts:39-40`), so a single-month range is already
~500–750 dispatches → ~500+ index ranges per dashboard load. The comment's estimate
is stale by an order of magnitude.

**Why unguarded is the problem:** `dispatches` already carries denormalized
`itemCount` / `totalQuantity` / `totalValue` fields, and sibling queries read them
with a short-circuit. `dailyDispatchVolume` (`:91`) and `weeklyDemand` (`:272`) both
guard:

```ts
const totalQty = d.totalQuantity
if (totalQty !== undefined) { /* use it, skip the read */ }
```

`productMovement` has no such guard, and even if it did, per-product units are not
in any existing field.

**Fix:** write a `productUnits` aggregate at dispatch-submit time, alongside the
existing denormalized patch at `convex/dispatches/mutations.ts:177-181`:

```ts
const productUnits = new Map<string, number>()
for (const item of items) {
  productUnits.set(item.productId, (productUnits.get(item.productId) ?? 0) + item.quantityDeducted)
}
// patch dispatches with:
productUnits: [...productUnits].map(([productId, units]) => ({ productId, units }))
```

Then read it directly. **Constraint:** do *not* nest this as an array of unbounded
length — `guidelines.md:156` forbids it:

> Do not store unbounded lists as an array field inside a document (e.g.
> `v.array(v.object({...}))`). As the array grows it will hit the 1MB document size
> limit, and every update rewrites the entire document.

For realistic dispatch sizes (tens of lines) an array is fine, but a separate
aggregate table keyed by dispatch is the safe shape if line counts are ever unbounded.

---

### F3 — `products.list` / `products.listActive` — N index ranges for one field

`convex/products/queries.ts:20-44` and `:66-90` — identical shape:

```ts
const products = await ctx.db.query("products").collect()      // ← also an unbounded scan (see PERFORMANCE-AUDIT P1)

return await Promise.all(
  products.map(async (product) => {
    const lastBatch = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .order("desc")
      .first()
    let imageUrl: string | undefined
    if (product.imagePath) {
      try { imageUrl = (await ctx.storage.getUrl(product.imagePath)) ?? undefined }
      catch { imageUrl = undefined }
    }
    return { ...product, lastSupplierId: lastBatch?.supplierId ?? undefined, imageUrl }
  })
)
```

**Cost:** N index ranges + N storage calls, to recover exactly one field
(`lastSupplierId`) plus a storage URL.

**Consistency note:** `hot-path-rules.md:32-42` (Consistency Rule):

> If you fix a hot-path pattern for one function, audit sibling functions touching
> the same tables for the same pattern.

`list` and `listActive` must be fixed together, or the fix is immediately
inconsistent. `listActive` (`:52`) is used by the add-inventory dialog
(`features/inventory/hooks/use-inventory-dialog.ts:66`), `list` (`:9`) by
`app/(dashboard)/inventory/page.tsx:23-26`.

**Fix:** same as F1 step 1 — one denormalized `lastSupplierId` field serves all
three product list queries.

---

### F4 — `auditLogs.listByUser` — 30 identical reads of one document

`convex/auditLogs/queries.ts:221-231`

```ts
const result = await base.order("desc").paginate(paginationOpts)

return {
  ...result,
  page: await Promise.all(
    result.page.map(async (log) => {
      let userName: string | null = null
      if (log.userId) {
        const user = await ctx.db.get(log.userId)
        userName = user?.name ?? null
      }
      return { ...log, userName }
    })
  ),
}
```

**This is pure waste, not merely inefficient.** Three facts make it redundant:

1. `caller` — the user doc — is **already loaded** at `:183`:
   `const caller = await ctx.db.get(callerId)`.
2. Every index branch at `:191`, `:199`, `:205`, `:212` is
   `eq("userId", callerId)`. Every log on the page provably has
   `log.userId === callerId`.
3. Therefore `userName` is a **constant** across the page.

30 guaranteed-same-document point reads per page turn, for a value that is already
in scope.

**Fix:** delete the `map`/`Promise.all` entirely and return a constant.

```ts
return {
  ...result,
  page: result.page.map((log) => ({
    ...log,
    userName: log.userId === callerId ? (caller.name ?? null) : null,
  })),
}
```

Reduces 30 index ranges to 0.

---

### F5 — `auditLogs.list` — 30 reads, no dedup, ≤5 distinct documents

`convex/auditLogs/queries.ts:95-104`

Same `map` pattern as F4, but here the page genuinely mixes users, so a constant
does not work. However the users table has 2–5 rows, so 30 reads resolve to at most
5 distinct documents — **up to 6× redundant**.

**Fix:** apply Reference A (the `Set`-dedup pattern) from
`convex/stock_adjustments/queries.ts:31-45`. Fix F4 and F5 together.

---

### F6 — `reports.exportBatches` — full scan + 3 point reads per row, no dedup

`convex/reports/queries.ts:168-196`

```ts
const allBatches = await ctx.db.query("batches").collect()     // ← unbounded scan
const batches = allBatches.filter((b) => {
  const ts = b.createdAt ?? b._creationTime
  return ts >= startMs && ts <= endMs
})

const enriched = await Promise.all(
  batches.map(async (b) => {
    const [product, supplier, user] = await Promise.all([
      ctx.db.get(b.productId),
      ctx.db.get(b.supplierId),
      ctx.db.get(b.userId),
    ])
    ...
```

**Cost:** 1 unbounded collect + **3B index ranges** for B batches, with B/3 of them
resolving to the same handful of suppliers and users. This is the highest absolute
index-range count of any query in the codebase and it grows with the table forever.

**Fix, two independent steps:**

1. `Set`-dedup all three foreign keys (Reference A). Collapses 3B reads to
   ~|distinct products| + |distinct suppliers| + |distinct users| + 1.
2. Add `.index("by_createdAt", ["createdAt"])` to `batches` and replace the
   collect + JS filter with an index range. **Blocked on the write path** —
   `batches.createdAt` is never written today (§ F10 / `PERFORMANCE-AUDIT.md` P12).

---

### F7 — `reports.exportDispatchItems` — sequential `for...of`, not `Promise.all`

`convex/reports/queries.ts:312-345`

```ts
for (const d of merged) {
  const items = await ctx.db
    .query("dispatchItems")
    .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
    .collect()

  let userName = d.userName ?? ""
  if (!userName) {
    const user = await ctx.db.get(d.userId)
    if (user) userName = user.name ?? ""
  }

  for (const item of items) {
    const [product, batch] = await Promise.all([
      ctx.db.get(item.productId),
      ctx.db.get(item.batchId),
    ])
    rows.push({ ... })
  }
}
```

**Cost is worse than the index-range count suggests.** The inner
`Promise.all` parallelizes the two gets *within one item*, but the outer loop is
`await`ed **serially** — D dispatches is a chain of D+1 round trips. Per the Convex
time budget (1 s user-code execution, `function-budget.md:20`), this is the query
most likely to time out first as volume grows.

It also has no dedup: `item.productId` repeats across every line of a dispatch and
across dispatches.

**Fix:** `Promise.all` the outer loop, then `Set`-dedup the item-level product/batch
reads. Note that the surrounding module already uses the correct
`Promise.all` + dedup shape for `adjustmentItemsList` at `:466-467` — this one loop
is the outlier.

---

### F8 — `reports.exportMonthlyReport` — same sequential defect as F7

`convex/reports/queries.ts:426-464`

```ts
for (const d of mergedDispatches) {
  const items = await ctx.db
    .query("dispatchItems")
    .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
    .collect()
  let userName = d.userName ?? ""
  if (!userName) {
    const user = await ctx.db.get(d.userId)
    if (user) userName = user.name ?? ""
  }
  totalItems += d.itemCount ?? items.length
  for (const item of items) {
    const [product, batch] = await Promise.all([
      ctx.db.get(item.productId),
      ctx.db.get(item.batchId),
    ])
    ...
```

Identical shape to F7, plus it accumulates `totalValue` inside the loop, so the
result ordering is load-bearing for nothing — it can be computed from the collected
rows.

**Fix:** same as F7. Fix both together (Consistency Rule).

---

### F9 — `reports.exportProducts` — per-product scan + supplier get, re-deriving stored data

`convex/reports/queries.ts:114-151`

```ts
const productsWithSupplier = await Promise.all(
  products.map(async (p) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", p._id))
      .collect()                                    // ← range per product

    const activeBatches = batches.filter((b) => b.status === "active")
    const lastSupplierId = activeBatches.length > 0
      ? [...activeBatches].sort((a, b) => b._creationTime - a._creationTime)[0].supplierId
      : null

    let lastSupplierName = ""
    if (lastSupplierId) {
      const supplier = await ctx.db.get(lastSupplierId)   // ← range per product
      if (supplier) lastSupplierName = supplier.companyName
    }

    return { ..., lastSupplier: lastSupplierName, batchCount: activeBatches.length }
  })
)
```

**Cost:** 2 index ranges per product, and it reads *every batch of every product*
just to pick the most recent active one and count actives.

**Note the irony:** `activeBatches.length` is `batchCount`, which the product
document **already stores** (`convex/schema.ts:48`, written at
`convex/batches/mutations.ts:176`, backfilled by `backfillProductBatchCounts` at
`convex/migrations.ts:124`). The query re-derives a denormalized field it could
read directly.

**Fix:**
- read `p.batchCount` instead of counting batches (with a `=== undefined` fallback
  per the Fallback Rule, `hot-path-rules.md:183-199`);
- read the F1-proposed `p.lastSupplierId` instead of scanning;
- drop the `ctx.db.get(lastSupplierId)` in favour of a `Set`-dedup supplier map.

---

### F10 — `dispatches.getItemsByDispatch` — 2 gets per item, no dedup

`convex/dispatches/queries.ts:147-163`

```ts
return Promise.all(
  items.map(async (item) => {
    const [product, batch] = await Promise.all([
      ctx.db.get(item.productId),
      ctx.db.get(item.batchId),
    ])
    return { ...item, productName: product?.name ?? "Unknown", productSku: product?.skuCode ?? "", batchCode: batch?.batchCode ?? "", ... }
  })
)
```

**Cost:** 2 gets per dispatch line. Modest in absolute terms (per-dispatch query,
opened one row at a time) but it is on the expandable-row path of
`/dispatch-history`, and the batch lookup is 1:1 non-deduplicable — a dispatch of 8
lines from 2 batches does 8 batch reads for 2 documents.

**Fix:** `Set`-dedup the product ids (products repeat heavily across lines of a
dispatch). Batch ids are mostly distinct per line, so a dedup there gains little —
the better fix is to denormalize `productName`/`productSku`/`batchCode` onto
`dispatchItems` at submit time, since `submit` already holds all three.

**Priority: low.** Not a hot path; fix opportunistically when touching the file.

---

### F11 — Not N+1, but adjacent: `dispatches.list` has a *guarded* N+1

`convex/dispatches/queries.ts:41-72`

Correctly short-circuits when all three denormalized fields are present:

```ts
if (
  dispatch.userName !== undefined &&
  dispatch.itemCount !== undefined &&
  dispatch.totalQuantity !== undefined
) {
  return { ...dispatch, userName: dispatch.userName, itemCount: dispatch.itemCount, totalQuantity: dispatch.totalQuantity }
}
const [user, items] = await Promise.all([
  ctx.db.get(dispatch.userId),
  ctx.db.query("dispatchItems").withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id)).collect(),
])
```

**Listed for the pattern, not the cost.** This is the model the other sites should
copy: denormalize at write time, guard at read time, fall back to the live join
only for pre-migration rows. `report/queries.ts:59-68` (`monthlyAggregates`) and
`dashboard/queries.ts:91` / `:272` follow the same shape.

---

## 3b. Remediation Status

| # | Site | Status |
|---|------|--------|
| F1 | `listDispatchReady` | **Partially fixed** — `lastSupplierId` denormalized; one of the two per-product ranges removed. `availableBatches` remains one range per product (deliberate — the payload is only needed when a card renders) |
| F2 | `productMovement` | **Fixed** — `dispatches.productUnits` denormalized at submit; read is a local aggregation with a live fallback for pre-backfill rows |
| F3 | `list` / `listActive` | **Fixed** — same `lastSupplierId` field serves all three; `list` also dropped its full-table collect |
| F4 | `listByUser` | **Fixed** — returns `caller.name`; 31 index ranges → 1 |
| F5 | `auditLogs.list` | **Fixed** — `Set`-dedup over the page's user ids |
| F6 | `exportBatches` | **Fixed** — deduplicated to \|products\| + \|suppliers\| + \|users\| + 1 |
| F7 | `exportDispatchItems` | **Fixed** — serial loop parallelised **and** the per-dispatch range removed via a new `dispatchItems.by_createdAt` index path, with a completeness check that falls back to per-dispatch ranges until `backfillDispatchItemCreatedAt` has run |
| F8 | `exportMonthlyReport` | **Fixed** — same shared helper |
| F9 | `exportProducts` | **Partially fixed** — `lastSupplierId` now read directly; `batchCount` still re-derived (the export needs active-only counts, which `batchCount` does not distinguish) |
| F10 | `getItemsByDispatch` | **Deferred** — low priority, not a hot path |
| F11 | `dispatches.list` | **Unchanged** — already the correct pattern |

**F7/F8 are the notable ones.** Parallelising the loops was necessary but not
sufficient: `merged.map(d => …by_dispatch…)` still costs one index range per
dispatch. The static pass in this document ranked them "Medium" on serialisation
alone; running the stress harness at production volume showed the index-range
count was the actual cliff (1,800 ranges). `fetchItemsByDispatch` in
`convex/reports/queries.ts` now reads the whole window in one range and verifies
completeness against the denormalized `itemCount` before trusting it.

Regression budgets are pinned in `convex/stress/transaction-limits.test.ts`.

---

## 4. Summary

| # | Site | N+1 factor | Redundant? | Fix | Priority |
|---|------|-----------|-----------|-----|----------|
| F1 | `products/queries.ts:112-155` `listDispatchReady` | 2N + storage | No | Denormalize `products.lastSupplierId`; lazy-load `availableBatches` | **High** |
| F2 | `dashboard/queries.ts:206-220` `productMovement` | D | No (stale TODO) | Denormalize per-product units on `dispatches` | **High** |
| F3 | `products/queries.ts:20-44, 66-90` `list`/`listActive` | N + storage | No | Same field as F1 | **High** |
| F4 | `auditLogs/queries.ts:221-231` `listByUser` | 30 | **Yes — constant** | Return `caller.name` | **High** (trivial) |
| F5 | `auditLogs/queries.ts:95-104` `list` | 30 | Yes (≤5 distinct) | `Set`-dedup | Medium |
| F6 | `reports/queries.ts:174-196` `exportBatches` | 3B | Yes | `Set`-dedup + `by_createdAt` index | Medium |
| F7 | `reports/queries.ts:312-345` `exportDispatchItems` | 2D + 2I, **serial** | Yes | `Promise.all` + dedup | Medium |
| F8 | `reports/queries.ts:426-464` `exportMonthlyReport` | 2D + 2I, **serial** | Yes | Same as F7 | Medium |
| F9 | `reports/queries.ts:114-151` `exportProducts` | 2 per product | **Yes — `batchCount` exists** | Read denormalized field | Medium |
| F10 | `dispatches/queries.ts:147-163` `getItemsByDispatch` | 2 per item | Partly | Denormalize on `dispatchItems` | Low |
| F11 | `dispatches/queries.ts:41-72` `list` | D, **guarded** | No | — (already correct) | — |

**Cheapest highest-value wins:** F4 (delete 30 reads, one line change) and F5
(copy an existing 15-line pattern). **Highest blast radius:** F1 — it is the staff
landing page and a live subscription.

---

## 5. How to verify a fix

Do not eyeball it. Three mechanisms, cheapest first:

1. **`convex-test` regression budgets.** `convex-test@0.0.51` accepts
   `transactionLimits` (currently **unused anywhere in this repo** — 0 occurrences).
   Its defaults are Convex's real limits: 32,000 documents read, 4,096 index ranges.
   Pass a per-query budget and a future N+1 fails the test:

   ```ts
   const t = convexTest({
     schema,
     modules,
     transactionLimits: { documentsRead: 500, databaseQueries: 60 },
   })
   ```

   **Assert on `databaseQueries`, not `bytesRead`.** `databaseQueries` is the
   index-range counter, so it moves only when reads are added or removed — which is
   the thing these fixes are about. A `bytesRead` budget would also trip on a
   harmless return-shape trim, and (per §1) return-shape trims do not fix an N+1.

   Note `databaseQueries` is the metric that catches N+1 specifically — it counts
   index ranges, so an added per-row `db.get` fails immediately.

2. **Live evidence.** `npx convex insights --details` before and after — look at
   bytes read and index ranges for the affected function names.

3. **Static sweep.** After each fix, re-grep for the anti-pattern:

   ```bash
   rg -n '\.map\(async' convex --glob '*.ts' -A6 | rg 'ctx\.db'
   ```

   Any `ctx.db` inside a `.map(async ...)` is a candidate N+1. Expect the list to
   shrink to the audited set above plus the two intentional `Promise.all` shapes in
   `stock_adjustments/queries.ts:31-45` and `auditLogs/queries.ts:322-342`.

---

## 6. Related

- [`PERFORMANCE-AUDIT.md`](./PERFORMANCE-AUDIT.md) — the indexing/limits audit that
  this file's schema-level fixes (F6, F9, F10) depend on: missing `by_createdAt`
  indexes on `batches` / `products`, and the `createdAt` write-path gap that blocks
  them.
- [`SPRINT-PLAN.md`](./SPRINT-PLAN.md) §5 — the transaction-limit stress-test
  harness that these budgets belong in.
