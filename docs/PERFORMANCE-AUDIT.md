# Performance Audit — Indexing & Slow Loading

> Status: **findings + recommendation — no code changed**
> Created: 2026-09-30
> Scope: `convex/schema.ts`, all `convex/**/queries.ts`, `convex/lib/fetch_entities.ts`,
> `convex/migrations.ts`, and every page route's read set
> Companions: [`N-1-QUERY-AUDIT.md`](./N-1-QUERY-AUDIT.md) (per-row fan-out),
> [`SPRINT-PLAN.md`](./SPRINT-PLAN.md) §4–5 (this work + the stress-test harness)

**Structure:** Part I states the problems in detail. Part II is the recommendation.
Part III is Convex's own documented opinion, checked against this codebase.

---

## Method

Static code audit of every query in the codebase, cross-referenced against:

| Source | Path |
|---|---|
| Generated Convex guidelines | `convex/_generated/ai/guidelines.md` |
| Convex performance-audit skill (vendored) | `.agents/skills/convex-performance-audit/` |
| Hard transaction limits | `.agents/skills/convex-performance-audit/references/function-budget.md` |
| Index/migration/denormalization rules | `.agents/skills/convex-performance-audit/references/hot-path-rules.md` |
| OCC behaviour | `.agents/skills/convex-performance-audit/references/occ-conflicts.md` |
| Reactive subscription cost | `.agents/skills/convex-performance-audit/references/subscription-cost.md` |
| Live enforcement (unused) | `convex-test@0.0.51` → `transactionLimits` option |

**Not yet done (required before implementation):** capture a live baseline with

```bash
npx convex insights --details
```

and paste the per-function bytes-read / duration table into this document. Every
finding below is derived from code, not from a live deployment.

---

# Part I — The Problems

15 findings, ordered by impact. Each: **symptom → evidence → why it is slow →
which limit it threatens → blast radius.**

---

## P1 — `/inventory` is driven by an unindexed full-table scan

**Evidence** — `convex/products/queries.ts:9-18`

```ts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const products = await ctx.db.query("products").collect()   // ← no withIndex, no bound
```

**Why it is slow.** No index, no range, no limit. Every document in the table is
read regardless of what the user filtered for. The schema *has* the index that
would serve this — `products.by_status` (`convex/schema.ts:53`) — and its sibling
`listActive` (`:52-64`) already uses it. `list` does not.

**Compounding waste.** `list` returns **archived** products too, and the default
client filter (`features/inventory/hooks/use-inventory-filters.ts:29`,
`DEFAULT_STATUS = "active"`) discards them immediately. Bandwidth is spent on rows
the default view never renders.

**Limit threatened.** 32,000 documents scanned, 16 MiB read
(`function-budget.md:22,24`).

**Blast radius.** `/inventory` is the owner product table. It re-executes on every
product or batch patch.

---

## P2 — The staff landing page does 2 index ranges + every active batch per product

**Evidence** — `convex/products/queries.ts:107-155` (full breakdown in
[`N-1-QUERY-AUDIT.md` F1](./N-1-QUERY-AUDIT.md))

```ts
const products = await ctx.db
  .query("products")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .collect()                                    // ← unbounded, N docs

return await Promise.all(
  products.map(async (product) => {
    const [lastBatch, activeBatches] = await Promise.all([
      ctx.db.query("batches")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .order("desc").first(),                 // ← range 1, to recover ONE field
      ctx.db.query("batches")
        .withIndex("by_product_status", (q) => q.eq("productId", product._id).eq("status", "active"))
        .order("asc").collect(),                 // ← range 2, every active batch
    ])
```

**Why it is slow.** Per product: 2 index ranges, all active batch documents, and a
`ctx.storage.getUrl` network call. Nothing is paginated.

**Blast radius.** `/products` is where **staff** land — `proxy.ts:55` redirects them
there from every owner-only route. It is the highest-traffic non-owner page in the
app, and it is a live subscription, so it re-runs on every dispatch, adjustment and
stock-in in the system.

---

## P3 — `dashboard.productMovement`: unguarded N+1 with a stale volume estimate

**Evidence** — `convex/dashboard/queries.ts:200-225`

```ts
const dispatches = await fetchDispatches(ctx, startMs, endMs, "completed")

// TODO(scale): N+1 query — one dispatchItems read per dispatch. At current
// volume (~50/month) this is fine. ...
const unitsByProduct = new Map<Id<"products">, number>()
await Promise.all(
  dispatches.map(async (d) => {
    const items = await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
      .collect()
```

**Why it is slow.** One `dispatchItems` range per dispatch, with no denormalized
short-circuit — unlike its siblings `dailyDispatchVolume` (`:91`) and `weeklyDemand`
(`:272`), which both skip the read when `d.totalQuantity !== undefined`.

**The comment is wrong by an order of magnitude.** It says "~50/month". The seed
generates `DENSE_DAYS = 90` with `DAILY_DISPATCH_MIN/MAX = 20/25`
(`convex/lib/constants.ts:37-40`) — i.e. **20–25 dispatches per day**, so a
one-month range is ~500–750 dispatches, not 50. Someone sized this against
pre-dense-seed data and never revisited it.

**Duplicate range read.** `fetchDispatches(ctx, startMs, endMs, "completed")` at
`:200` is **byte-identical** to the call at `:85` in `dailyDispatchVolume`. They are
separate function references, so the shared query cache in
`features/dashboard/hooks/use-dashboard-data.ts:72-82` **cannot dedupe them** — the
same `by_status_createdAt` month range is read twice per dashboard load.

**Limit threatened.** 4,096 index ranges. A 3-month dashboard range crosses it.

---

## P4 — The global stock banner forces a full active-products scan on every owner page

**Evidence** — `components/stock-banner.tsx:27-30`

```ts
const stats = useQuery(
  api.dashboard.queries.summaryStats,
  isAuthenticated ? ({} as const) : ("skip" as const)
)
```

mounted at `components/dashboard-shell.tsx:118` — i.e. in the **shared dashboard
layout**, so it is subscribed on `/inventory`, `/products`, `/suppliers`,
`/reports`, `/dispatch-history`, `/users`, `/audit-logs`.

The query it calls — `convex/dashboard/queries.ts:27-52`:

```ts
const products = await ctx.db
  .query("products")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .collect()
// …then a single pass summing totalAssetValue, collecting categories,
// and building the full stockAlerts array
```

**Why it is slow.** The banner only ever reads `stockAlerts`
(`components/stock-banner.tsx:52-61`). It never touches `totalAssetValue`,
`activeProductCount` or `categoryCount` — but pays for the full aggregation.

**Invalidation amplification.** Product documents are patched by every dispatch
(`convex/dispatches/mutations.ts:151`), every stock adjustment
(`convex/stock_adjustments/mutations.ts:73`) and every stock-in
(`convex/batches/mutations.ts:172-182`). So this transaction **re-executes on
essentially every write in the app, for every connected client**, on pages that
render no stock data at all.

Per `hot-path-rules.md:379-389` (Aggregates):

> Reactive global counts invalidate frequently on busy tables. Prefer one-shot
> aggregate fetches … for global stats that do not need live updates every second.

**Net effect.** `/dashboard` itself is fine (the shared cache dedupes with the page's
own call). The other six owner routes pay it for nothing.

> **⚠️ Correction (2026-09-30) — splitting the query does not fix the invalidation.**
>
> Splitting `summaryStats` into `summaryStats` + `stockAlerts` saves aggregation CPU
> and payload, but the banner would still issue one point read per active product, so
> every product patch re-triggers it. Convex has **no field projections** (§III.5), so
> the split cannot narrow the read set.
>
> The invalidation fix is to **stop subscribing** — mount `StockBanner` only where
> stock data is shown, or read it point-in-time. Do the split too, but for the CPU
> reason, and do not count it as the P4 fix.

---

## P5 — `/reports` reads the same month twice and the same adjustments twice

**Evidence** — `convex/reports/queries.ts:23-26` and `:54`, `:82`

```ts
// calendarSummary (mounted by app/(dashboard)/reports/page.tsx:10)
const [dispatches, adjustments] = await Promise.all([
  fetchDispatches(ctx, startMs, endMs),        // by_createdAt
  fetchAdjustments(ctx, startMs, endMs),       // stockAdjustments.by_createdAt
])

// monthlyAggregates (mounted by monthly-stats-bar.tsx:42, same month)
const merged = await fetchDispatches(ctx, startMs, endMs, "completed")  // by_status_createdAt
…
const adjustments = await fetchAdjustments(ctx, startMs, endMs)         // ← same call again
```

**Why it is slow.** Both components are mounted simultaneously and receive the same
`startMs`/`endMs` from `report-filters-context.tsx`. Result:
`stockAdjustments.by_createdAt` is read **twice**, and the dispatch month range is
read **twice** through two different indexes. `hot-path-rules.md:23-27`:

> Every byte read or written multiplies with concurrency. Think:
> `cost x calls_per_second x 86400`

**Missing index context.** `monthlyAggregates` uses `by_status_createdAt` (filtering
`status = "completed"`); `calendarSummary` uses `by_createdAt` (all statuses). They
are not the same set, but the union of the two ranges is read on every page load,
and only the `dispatchTimestamps` / `adjustmentTimestamps` outputs are actually
needed from the second.

---

## P6 — A 500-document table scan to populate one `<Select>` — and it silently drops options

**Evidence** — `convex/auditLogs/queries.ts:239-252`

```ts
export const listActions = query({
  args: {},
  handler: async (ctx) => {
    …
    const logs = await ctx.db.query("auditLogs").order("desc").take(500)   // ← no index
    const actions = [...new Set(logs.map((l) => l.action))]
    return actions.sort()
  },
})
```

**Why it is slow.** 500 **full** audit-log documents — including the long JSON
`description`, `userAgent` and `ipAddress` fields — read on every `/audit-logs` load
and every filter-bar mount, purely to build a deduplicated string list. The
`by_createdAt` index exists (`:150`) and is not used; `.order("desc")` with no
`withIndex` falls back to implicit `_creationTime` ordering.

**Correctness bug, not just perf.** The action dropdown is built from the newest 500
logs only. Once an action type stops appearing in recent traffic — e.g.
`batch_update` after a quiet week — **it vanishes from the filter with no
indication**, making historical rows unreachable through the UI.

**Fix is trivial.** Every action string is already hardcoded at the
`ctx.runMutation(internal.auditLogs.mutations.log, …)` callsites
(`convex/dispatches/mutations.ts:159`, `convex/batches/mutations.ts:381`,
`convex/stock_adjustments/mutations.ts:83`, `convex/products/mutations.ts:82`,
`convex/auditLogs/mutations.ts:58`). Move the list to `convex/lib/constants.ts` next
to the existing enums and delete the query.

---

## P7 — The audit-log user filter does 30 identical reads of one document

**Evidence** — `convex/auditLogs/queries.ts:219-231`

```ts
const result = await base.order("desc").paginate(paginationOpts)

return {
  ...result,
  page: await Promise.all(
    result.page.map(async (log) => {
      let userName: string | null = null
      if (log.userId) {
        const user = await ctx.db.get(log.userId)   // ← always the same document
        userName = user?.name ?? null
      }
      return { ...log, userName }
    })
  ),
}
```

**Why it is slow.** `caller` is already loaded at `:183`. Every index branch
(`:191`, `:199`, `:205`, `:212`) is `eq("userId", callerId)`, so every log on the
page provably has `log.userId === callerId`. `userName` is a **constant**. 30
point reads per page turn, for a value already in scope.

**Root cause.** `auditLogs` has no denormalized `userName`, so the join is
unavoidable in the general case — and someone then wrote the *constant* case as if
it were the general one. See
[`N-1-QUERY-AUDIT.md` F4](./N-1-QUERY-AUDIT.md).

---

## P8 — Audit-log date filters never reach storage in 3 of 4 branches

**Evidence** — `convex/auditLogs/queries.ts:41-79`

```ts
if (action && userId) {
  base = ctx.db.query("auditLogs").withIndex("by_action_userId", …)
} else if (action) {
  base = ctx.db.query("auditLogs").withIndex("by_action", …)      // ← no createdAt
} else if (userId) {
  base = ctx.db.query("auditLogs").withIndex("by_userId", …)      // ← no createdAt
} else {
  base = ctx.db.query("auditLogs").withIndex("by_createdAt", (q) =>
    q.gte("createdAt", dateFrom ?? 0).lte("createdAt", dateTo ?? Number.MAX_SAFE_INTEGER))
}

// Date bounds are pushed into the `by_createdAt` index above. The
// action/userId branches use their own indexes that lack `createdAt`, so
// the range must be filtered here instead.
if (dateFrom !== undefined && (action !== undefined || userId !== undefined)) {
  base = base.filter((q) => q.gte(q.field("createdAt"), dateFrom))
}
```

**Why it is slow.** The code is self-aware — and the workaround costs exactly what
the index would have saved. `hot-path-rules.md:44-50`:

> Both JavaScript `.filter()` and the Convex query `.filter()` method after a DB
> scan mean you already paid for the read. The Convex `.filter()` method has the
> same performance as filtering in JS, it does not push the predicate to the
> storage layer. Only `.withIndex()` and `.withSearchIndex()` actually reduce the
> documents scanned.

So `by_action` + a 7-day date filter still reads **every** `batch_update` log ever
written, then discards all but 30. Same defect in `fetchExportLogs` (`:281-308`).

**The `by_userId` branch is worse than it looks.** `by_userId_createdAt` **already
exists** (`:151`) and `listByUser` (`:188-215`) uses it correctly with full range
push-down. The capability is right there; it was simply never copied into `list`.

**Fix.** Add `.index("by_action_createdAt", ["action", "createdAt"])` and route the
`action`-only branch through it; route the `userId`-only branch through the existing
`by_userId_createdAt`.

---

## P9 — Report exports: full scans plus *serialized* N+1

**Evidence** — six export queries in `convex/reports/queries.ts`.

Full-table collects with JS date filtering:

| Line | Query | Scan |
|---|---|---|
| `:108` | `exportProducts` | `ctx.db.query("products").collect()` → JS filter on `p.createdAt ?? p._creationTime` |
| `:168` | `exportBatches` | `ctx.db.query("batches").collect()` → JS filter |
| `:213` | `exportSuppliers` | `ctx.db.query("suppliers").collect()` → JS filter on `s._creationTime` |
| `:511` | `exportMonthlyReport` | `ctx.db.query("products").collect()` |
| `:525` | `exportMonthlyReport` | `ctx.db.query("suppliers").collect()` |

Sequential loops instead of `Promise.all`:

```ts
// :312  exportDispatchItems        and        :426  exportMonthlyReport
for (const d of merged) {
  const items = await ctx.db
    .query("dispatchItems")
    .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
    .collect()
  …
  for (const item of items) {
    const [product, batch] = await Promise.all([
      ctx.db.get(item.productId),
      ctx.db.get(item.batchId),
    ])
```

**Why it is slow.** Two compounding problems. The outer `for` is `await`ed
**serially** — D dispatches is a chain of D+1 round trips, against a 1-second
user-code budget (`function-budget.md:20`). And the `.filter()`-after-collect
pattern means the date range never reduces the scan. The same module already
implements the correct shape at `:466-467` (`adjustmentItemsList` uses
`Promise.all`); these two loops are the outliers.

**Mitigating factor.** `report-export-button.tsx:45` currently renders
`<DropdownMenuTrigger render={<Button disabled />}>` — "Export temporarily disabled
— quota protection while on free-tier deployment". So the blast radius today is
zero, but the cost lands the moment export is re-enabled.

---

## P10 — Dispatch history silently truncates at 500, then searches the truncated set

**Evidence**

`convex/dispatches/queries.ts:34-35` and `convex/lib/fetch_entities.ts:38-51`:

```ts
: .withIndex("by_userId_createdAt", …).order("desc").take(500)      // user-filtered branch
: await fetchDispatchesOrdered(ctx, startMs, endMs, 500)            // default branch
```

`features/dispatch-history/hooks/use-dispatch-history-filters.ts:41-49`:

```ts
if (search) {
  const q = search.toLowerCase()
  result = result.filter(
    (d) => (d.customerReference?.toLowerCase() ?? "").includes(q) ||
          d.userName.toLowerCase().includes(q) ||
          d.itemCount.toString().toLowerCase().includes(q)
  )
}
```

**Why it is a correctness problem, not just perf.** The client search corpus is the
newest 500 dispatches of the day. A search for an older customer reference returns
nothing and the UI shows "no results match" — indistinguishable from "does not
exist". No truncation indicator anywhere.

**Contributing factor.** `use-dispatches.ts:11-20` hardcodes `todayRange()`, so a
page called "Dispatch History" only ever shows today. That limits today's exposure
to 500/day, but the cap is the thing that would bite.

**Also redundant:** `convex/dispatches/queries.ts:36-39` re-applies the date filter
in JS *after* an already index-bounded read:

```ts
const dispatches = allDispatches.filter((d) => {
  const date = d.createdAt ?? d._creationTime
  return date >= startMs && date <= endMs
})
```

---

## P11 — Shared read helpers have no limit parameter, and "All Time" passes `Infinity`

**Evidence** — `convex/lib/fetch_entities.ts:12-17` and `:56-67`

```ts
export async function fetchDispatches(
  ctx: QueryCtx, startMs: number, endMs: number, status?: "completed" | "voided"
): Promise<Doc<"dispatches">[]> {
  …
  return ctx.db.query("dispatches").withIndex("by_status_createdAt", (q) =>
    q.eq("status", status).gte("createdAt", startMs).lte("createdAt", endMs)
  ).collect()          // ← no limit param at all
}
```

`fetchAdjustments` (`:56-67`) is identically unbounded.

**Why it matters.** `features/reports/constants.ts:61-62` resolves the "All Time"
preset to `{ startMs: 0, endMs: Infinity }`. Every unbounded caller then reads the
**entire table**:

- `reports/queries.ts:241` `exportDispatches`
- `reports/queries.ts:295` `exportDispatchItems`
- `reports/queries.ts:405` `exportMonthlyReport`
- `reports/queries.ts:54` `monthlyAggregates` (via `getStatsRange("all")`)

**Limit threatened.** 32,000 documents scanned / 16 MiB read. At the current
~17k-record seed, a single "All Time" reports load is within an order of magnitude
of the ceiling.

**Resolution.** All three helpers take a `limit` defaulting to
`UNBOUNDED_RANGE_LIMIT` (5,000) and return `{ docs, truncated }` — over-fetching
by one so the cut is detectable. Callers that only need the rows destructure
`.docs`; the report exports propagate `truncated` into their return envelope.
Note the cap alone was not sufficient: `fetchItemsByDispatch`'s
`dispatchItems.by_createdAt` window read was unbounded regardless of the dispatch
cap, and is now bounded separately (see the follow-ups above).

---

## P12 — Two `createdAt` fields exist in the schema and are never written

**Evidence**

`convex/schema.ts:49` — `products.createdAt: v.optional(v.number())`.
`convex/schema.ts:78` — `batches.createdAt: v.optional(v.number())`.

Neither is set by any write path:

- `convex/products/mutations.ts:68-79` (`create`) — no `createdAt`
- `convex/batches/mutations.ts:151-161` (`stockIn`) — no `createdAt`

**Why it matters.** Every consumer already knows this and works around it with a
fallback:

```ts
// convex/reports/queries.ts:110, 170, 331, 193
const ts = p.createdAt ?? p._creationTime
```

So the field is **dead weight** — and it blocks the obvious index fix. There is no
`by_createdAt` index on either table, so `exportProducts` / `exportBatches` cannot
push a date range to storage even after adding one, because a legacy doc with
`createdAt === undefined` will not match the index entry. `hot-path-rules.md:100-124`:

> New indexes on partially backfilled fields can create correctness bugs during
> rollout. Important Convex detail: `undefined !== false` — if an older document is
> missing a field entirely, it will not match a compound index entry that expects
> `false`. **Do not trust old comments saying a field is "not backfilled" or "already
> backfilled". Verify.**

**This is the single hard blocker for the receiving-history feature.** A
date-ranged, paginated stock-in history page is impossible until the write path
writes `createdAt` and a backfill has run.

**Related write-path gap.** `products.create` also never sets `batchCount`, so every
product created through that path permanently has `batchCount === undefined` and
forces the fallback `batches.by_product` collect in
`convex/products/queries.ts:190-199` on every `getEditDetail` call. `batchCount` is
only ever initialised by `batches.stockIn` (`convex/batches/mutations.ts:176`).

---

## P13 — The audit-log export caps at 2000 and writes the truncated count into the audit trail

**Evidence** — `convex/auditLogs/queries.ts:320`

```ts
const logs = await base.order("desc").take(2000)
```

**Why it is serious.** This is a **compliance export**. The returned length flows
straight into the audit record of the export itself (`:184-193`), so at exactly 2000
the system permanently records "2000 records downloaded" for a dataset that has
more. `hot-path-rules.md:184-189` is about not losing correctness through a
shortcut; this loses it inside the audit of record.

`features/audit-logs/hooks/use-audit-log-export.ts:207` reports
`recordCount = exportData?.length ?? 0` to the user with no truncation flag.

---

## P14 — Dead and redundant indexes (write cost, not read cost)

**Evidence** — `convex/schema.ts`

| Index | Line | Status |
|---|---|---|
| `dispatches.by_userId` | `:96` | **Never read.** No query references it; `by_userId_createdAt` (`:97`) serves the same `eq("userId", …)` prefix lookup. |
| `stockAdjustments.by_userId` | `:134` | **Never read.** |
| `auditLogs.by_action` | `:147` | Strict prefix of `by_action_userId` (`:149`). |
| `auditLogs.by_userId` | `:148` | Strict prefix of `by_userId_createdAt` (`:151`). |
| `dispatchItems.createdAt` | `:114` | **Field declared but never written** (`dispatches/mutations.ts:117-125` omits it) and never read. |

**Why it matters.** `hot-path-rules.md:131-137`:

> Indexes like `by_foo` and `by_foo_and_bar` are usually redundant. You only need
> `by_foo_and_bar` … Extra indexes add storage cost and write overhead on every
> insert, patch, and delete.

`auditLogs` is written by **every mutation in the app** (audit logging is
mandatory), so its two redundant indexes are an index write on every single write.
On a free tier with a 1 GB/month budget, that is not free.

**Exception — do NOT remove `batches.by_product` (`:80`).** It is *not* covered by
`by_product_status` (`:81`): `products/queries.ts:24-26, 70-72, 118-120` need
`.order("desc").first()`, i.e. ordering by `_creationTime`, which the status-prefixed
index cannot provide. `hot-path-rules.md:153-157` documents exactly this carve-out.

---

## P15 — A dead query that collects full documents to return a number

**Evidence** — `convex/batches/queries.ts:75-88`

```ts
export const getCountByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    …
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect()
    return batches.length          // ← reads full docs for a count
  },
})
```

**Two problems.** It has no client callsite (verified: no `useQuery` or
`api.batches.queries.getCountByProduct` anywhere in `app/`, `features/`, or
`components/`). And it violates `guidelines.md` outright:

> Never use `.collect().length` to count rows. Convex has no built-in count
> operator, so if you need a count that stays efficient at scale, maintain a
> denormalized counter in a separate document and update it in your mutations.

`products.batchCount` (`convex/schema.ts:48`) already **is** that counter.

**Fix:** delete the query.

---

# Implementation Status

**Shipped in this change set.** See `git diff` for detail.

| # | Finding | Status |
|---|---------|--------|
| P1 | `products.list` unindexed collect | **Fixed** — `status` arg pushes to `by_status`; `"all"` reads both ranges |
| P2 | `listDispatchReady` 2N ranges | **Partially fixed** — `lastSupplierId` denormalized, halving the ranges. `availableBatches` still one range per product |
| P3 | `productMovement` unguarded N+1 | **Fixed** — `dispatches.productUnits` denormalized; stale `TODO(scale): ~50/month` comment removed |
| P4 | Banner forces full scan on every owner page | **Fixed** — split into `dashboard.stockAlerts` and converted to a point-in-time `useConvex().query` read |
| P5 | `/reports` double month-range reads | **Fixed** — `calendarSummary` folded into `monthlyAggregates` |
| P6 | `listActions` 500-doc scan + dropped dropdown items | **Fixed** — `AUDIT_LOG_ACTIONS` constant; query deleted |
| P7 | `listByUser` 30 identical reads | **Fixed** — returns `caller.name`; `list` uses Set-dedup |
| P8 | audit-log date filters not pushed to storage | **Partially fixed** — `userId` branch now uses the existing `by_userId_createdAt`. `action` branch still filters in JS; needs `by_action_createdAt` (deferred with the rollout order) |
| P9 | Export full scans + serial loops | **Partially fixed** — serial loops parallelised, per-row reads deduplicated, `dispatchItems.by_createdAt` index + write path + backfill added. Full scan → index range cutover deferred to the rollout order |
| P10 | Dispatch history `.take(500)` + search on truncated set | **Deferred** — not changed (see below) |
| P11 | Unbounded fetch helpers / "All Time" | **Fixed** — `UNBOUNDED_RANGE_LIMIT` default cap on all three helpers, each returning `{ docs, truncated }` so a capped read is visible to its caller. Cap lowered 5,000 → 1,000 and `order` added so list/export callers keep the newest rows |
| P12 | `createdAt` never written | **Fixed** — written for `batches`, `products`, `dispatchItems`; 5 backfill migrations added |
| P13 | Audit export caps at 2000, lies in audit trail | **Fixed** — `truncated` surfaced in JSON, CSV footer and the audit record |
| P14 | Dead/redundant indexes | **Deferred** — removal must follow a production `insights` check, not a code review |
| P15 | `getCountByProduct` dead query | **Fixed** — deleted |

## Follow-ups from the export-envelope pass

- **Report exports now return `{ records, truncated, limit }`** (P11/P13 pattern
  applied to `convex/reports/queries.ts`). The CSV carries a `# TRUNCATED:` footer
  row, the PDF dialog states the cap, and `monthlyAggregates` reports `truncated`
  next to its totals — rendered as a warning in the stats bar, which was the one
  consumer still discarding the flag. `exportProducts` / `exportSuppliers` still
  scan their catalog table — they have no `createdAt` to range on — but the
  result is now capped and flagged instead of unbounded.
- **`fetchItemsByDispatch` is bounded and per-dispatch verified** (P9). The window
  read is `take(min(expectedItems + 1, 20_000))` in descending order, and
  completeness is checked per dispatch (`byDispatch.get(d._id)?.length ===
  itemCount`) rather than by an aggregate sum. The aggregate check passed while
  dropping rows whenever one dispatch lacked `itemCount` and its items also
  lacked `createdAt` — reachable mid-migration.
- **`batches.by_status_createdAt` added; the receiver filter was removed.** The
  receiving-history filters were applied *after* pagination, so `isDone` and
  `continueCursor` described the unfiltered range and a filtered-empty page was
  unreachable — the UI rendered no pagination controls in that state. One filter
  is now the index prefix (supplier → status); the rest stay as residual page
  filters, and the page keeps its pagination controls mounted whenever
  `hasNext || hasPrev`. The planned receiver filter and its
  `by_userId_createdAt` index were dropped instead: `batches.mutations.stockIn`
  requires owner, `/receiving-history` is owner-only, and `users.mutations.create`
  hardcodes `role: "staff"`, so a second owner cannot exist and the filter could
  only ever select everything. `receivedBy` survives as a display field.
- **P5 is not a straight win on every range.** `monthlyAggregates` always issues
  both a filtered and an unfiltered dispatch read. When the two consumers' ranges
  coincide (the default month view) the shared cache collapses them; when the
  stats range is `year`/`all`, or a day outside the browsed month is selected,
  they do not, and the query issues 6 index ranges against 4 before the fold.
  Measure on the non-default paths before treating P5 as settled.

## Capped reads: which end they keep, and how large the cap is

`capRead` returns whichever end of the index range the query traversed first.
`fetchDispatches` defaulted to ascending, so any range wide enough to hit the cap
returned the **oldest** dispatches and dropped the newest — a CSV that looked
complete while omitting the most recent activity. The helper now takes
`order: "asc" | "desc" = "asc"`:

| Caller | Order | Why |
| --- | --- | --- |
| `dailyDispatchVolume`, `weeklyVelocity`, `productMovement`, `weeklyDemand`, `monthlyAggregates`, `exportMonthlyReport` | `asc` (default) | Aggregate — row order cannot change a count or sum |
| `dispatches.listByDateRange` (reports detail panel) | `desc` | Row list |
| `reports.exportDispatches`, `exportDispatchItems` | `desc` | CSV export |

`.order("desc")` costs nothing extra: it traverses the same index range in
reverse, so the scan still stops after `limit` documents. That also lets
`fetchItemsByDispatch`'s descending window read line up with the export dispatch
list, so its `itemCount` completeness check can succeed instead of always falling
back to per-dispatch reads.

`UNBOUNDED_RANGE_LIMIT` dropped **5,000 → 1,000**. Convex treats loading 1,000+
documents in one query as potentially unbounded and advises keeping routine
reactive scans well under a few hundred; at ~1 KB/document the old ceiling let a
single capped read approach ~5 MB against a free-tier budget of ~33 MB/day, so
six or seven uncached dashboard loads could exhaust a day's allocation. The new
ceiling bounds one read to roughly 1 MB. The cost is that `year` and `all` ranges
truncate more often on busy data — which is why `monthlyAggregates.truncated` is
now surfaced in the stats bar rather than merely computed, and why its
`totalValue` is `number | null`: a partial sum must not render as a real currency
figure.

### Phase 2 — not built, recorded here

Consulted Convex AI on two questions this audit could not settle from the code.

**Concurrency is a non-issue.** Dispatch submission is human-driven, so OCC
conflicts on a same-day bucket row stay rare and Convex retries them. Worth
recording that *coarser* buckets make contention **worse**, not better — they
widen the window in which writes collide.

**The timezone fork is unresolved.** A UTC-midnight bucket key cannot reproduce
the calendar grid, which buckets by *client-local* day: a dispatch at
`2026-10-05T23:00Z` is Oct 6 in PHT. Options are hourly buckets (aggregable to
any integer offset, at 24× the row count) or standardising the grid on UTC.

**The cheaper alternative may be to bound ranges instead.** Convex officially
recommends requiring bounded filters over unbounded ones; capping the maximum
selectable range removes the unbounded scan with no schema change, no write
contention and no backfill. That is a product call, not a technical one, and it
may be sufficient on its own — see the next section.

### Taken: the stats bar's year / all-time ranges were removed

Rather than waiting on Phase 2, the stats bar's `This Year` / `All Time` toggle
was deleted (`features/reports/components/calendar/monthly-stats-bar.tsx`).
`getStatsRange` now resolves only to the browsed month or the selected day, and
the unused `TimeRange` union went with it.

The reason is that `monthlyAggregates` builds its totals by summing
`itemCount`/`totalValue` across every dispatch document in the period, so cost
scales with the range and a year or all-time span cannot be answered within the
read ceiling at this table's size. Offering a control that can only ever produce
partial figures is worse than not offering it — the app now has **no** view of
year-to-date or lifetime dispatch totals.

Two caveats worth keeping:

- The sizes above are **seed assumptions, not measurements**. They justify the
  removal; they do not prove a year range is unservable on real data. If
  production volume turns out to be far lighter, these ranges were never
  inherently broken — only unrepresentable at the volume we designed against.
- The export dialogs keep their own presets, including `All Time` and
  `Last 90 Days`. Those already surface truncation through the CSV footer row
  and the PDF dialog, so they answer honestly rather than silently.

Restoring the stats-bar ranges requires Phase 2's rollups.

## New migrations — run before deploying the dependent read paths

```
backfillBatchCreatedAt
backfillProductCreatedAt
backfillBatchDenorm
backfillProductLastSupplierId
backfillDispatchItemCreatedAt
```

Run via `pnpm convex run migrations:run '{"fn":"migrations:<name>"}'` on the target
deployment. Order matters — see `AGENTS.md`.

## What the stress harness caught

`convex/stress/transaction-limits.test.ts` seeds ~17k records at production volume
and runs every hot read path with Convex's real limits enforced. It found a
remaining N+1 the static audit had classified as fixed: `exportDispatchItems`
still issued one `dispatchItems.by_dispatch` range per dispatch (1,800 at
production volume). Parallelising the loop did not remove the ranges — only the
new `by_createdAt` index path did.

Three regression budgets are now pinned in that file (`databaseQueries`): 40 for
`productMovement`, 12 for `listByUser`, 20 for `listHistory`. A reintroduced N+1
fails the suite.

## Still open

- **P10** (dispatch history `.take(500)` then client-side search over the
  truncated set) is a correctness bug but was left alone: fixing it changes the
  query and hook signatures, and the receiving-history page already demonstrates
  the cursor-pagination pattern to copy.
- **P14** (index removal) should be driven by a before/after
  `npx convex insights --details` comparison, not by a code review.
- **P8/P9 index cutovers** are blocked on the backfills above having run on the
  target deployment. That is the documented rollout order, not an oversight.
- **Reports export button** stays disabled per decision; the queries are fixed.

---

# Part II — Recommended Solution

Phased by impact-to-risk. Each phase is independently shippable and independently
verifiable. **Do not skip phases — Phase 4 has a mandated internal order.**

---

## Phase 0 — Capture the baseline (before any code change)

```bash
npx convex insights --details
```

Record per-function bytes read, duration and scan counts for the functions named
throughout this document, then paste the table into this file. Without a baseline
there is no way to prove any of the phases worked.

Also run the static sweep so future regressions are visible:

```bash
rg -n 'ctx\.db\.query\("[a-zA-Z]+"\)\.collect\(\)' convex --glob '*.ts'
rg -n '\.map\(async' convex --glob '*.ts' -A6 | rg 'ctx\.db'
```

---

## Phase 1 — Free wins, zero schema change, no migrations

Highest value-per-risk in the whole plan. All four are deletions or one-line
simplifications.

| Change | Fixes | Why it is safe |
|---|---|---|
| **Delete `auditLogs.listActions`**, move the action list to a constant in `convex/lib/constants.ts` | P6 | Every action string is already hardcoded at the 5 `auditLogs.mutations.log` callsites. Removes a 500-doc scan **and** fixes the silently-missing-dropdown bug. |
| **`auditLogs.listByUser`:** delete the `map`/`Promise.all`, return `caller.name` as a constant | P7 | `caller` is in scope at `:183` and every row is provably `callerId`. 30 reads → 0. |
| **`products.list`:** add `status: v.optional(...)` arg, use `withIndex("by_status", …)` | P1 | `status` is non-optional and always written, so **no migration needed**. Default to `"active"` to match the client default filter. Apply the same to `listActive` (`:52`) per the Consistency Rule. |
| **Delete `batches.getCountByProduct`** | P15 | No callsite. `product.batchCount` is the counter. |

Optional in the same phase: `dispatches.list` — delete the redundant JS date
re-filter at `convex/dispatches/queries.ts:36-39` (the index range already
guarantees it).

---

## Phase 2 — Collapse duplicate reads

| Change | Fixes | Effect |
|---|---|---|
| **Stop subscribing the banner.** Mount `StockBanner` only on routes that render stock data, or convert it to a point-in-time read. | P4 | The only change that actually narrows the **read set / invalidation surface**. See the correction below — splitting the query alone does not. |
| Split `dashboard.summaryStats` into `summaryStats` (page) + `stockAlerts` (banner, `.take(20)`) | P4 | **CPU + payload only.** Stops computing `totalAssetValue` / `categoryCount` / `activeProductCount` that the banner discards. Does **not** change invalidation, because the banner would still read all N product docs. Per `hot-path-rules.md:379-389`, a low-churn alert banner is a good candidate for a point-in-time read. |

> **⚠️ Correction (2026-09-30) — the P4 invalidation fix is un-subscription, not query splitting.**
>
> The original version of this document recommended the `summaryStats` split as *the*
> fix for P4. That is imprecise. Because Convex returns **whole documents with no
> field projection** (§III.5), a split query still issues one `ctx.db.get` per active
> product, so every product patch re-triggers the banner exactly as before. The split
> removes aggregation work and payload; it does **not** remove the read set.
>
> Only two things narrow invalidation: **fewer reads** (`F1`/`F3`/`F9` via
> denormalization) or **no subscription** (this row). Ship the split as a CPU
> optimisation, and ship the un-subscription as the actual P4 fix.
| Have `dailyDispatchVolume` and `productMovement` share one server-side month-range helper — or merge into one `dashboard.summary` query | P3 | Removes the duplicated `fetchDispatches` call. Merging also takes `/dashboard` from 6 invocations to 4. |
| Fold `calendarSummary`'s outputs into `monthlyAggregates`; delete `calendarSummary` + `useCalendarSummary` | P5 | `/reports` from 3 invocations to 2; removes both duplicate range reads. `monthlyAggregates` already has the dispatch and adjustment sets for the month — it just needs to also return the per-day buckets. |
| `auditLogs.list`: add `Set`-dedup for the `userId` page enrichment (copy `stock_adjustments/queries.ts:31-45`) | P7 sibling | 30 reads → ≤5. |

---

## Phase 3 — Denormalization

All three add a field that the write path **already has in hand**, so there is no
new source of truth and no new mutation logic — only a wider patch.

| Field | Written at | Removes | Fixes |
|---|---|---|---|
| `products.lastSupplierId` | `batches.stockIn` — supplier doc already fetched at `:165` | N index ranges from `products.list`, `listActive`, `listDispatchReady`, and N from `exportProducts` | P2, [`N+1` F1/F3/F9](./N-1-QUERY-AUDIT.md) |
| `dispatches.productUnits` | `dispatches.submit`, alongside the existing denormalized patch at `:177-181` | D index ranges + I docs from `dashboard.productMovement` | P3 |
| `batches.productName` / `supplierName` / `receivedBy` | `batches.stockIn` — product at `:132`, supplier at `:165`, caller known | N×3 index ranges on the new receiving-history list | Sprint §1b |

**Constraints.**

- **Fallback rule** (`hot-path-rules.md:183-199`): denormalized data is an
  *optimization*; live data is the correctness path. Read
  `batch.productName ?? (await ctx.db.get(batch.productId))?.name`, never
  `?? "Unknown"` as a substitute. In lookup maps, only insert **fully populated**
  entries so the fallback stays reachable.
- **`productUnits` must not be an unbounded array** — `guidelines.md:156` forbids it
  and every patch would rewrite the whole document. For realistic dispatch sizes
  (tens of lines) an array is fine; if line counts could grow, use a separate
  aggregate table keyed by dispatch.
- **"Skip no-op writes"** (`hot-path-rules.md` §4): diff before patching, or these
  new fields become a source of extra write amplification themselves.

---

## Phase 4 — Schema + indexes + backfills (strict internal order)

**The order is not negotiable.** `hot-path-rules.md:229-234`:

> Rollout order:
> 1. Update schema
> 2. Update write path
> 3. Backfill
> 4. Switch read path

Skipping to step 4 drops every legacy row whose `createdAt` is `undefined`, because
such a row does not match the index entry.

### New indexes

```ts
// convex/schema.ts — batches (add after :83)
.index("by_createdAt", ["createdAt"])
.index("by_supplier_createdAt", ["supplierId", "createdAt"])

// convex/schema.ts — products (add after :53)
.index("by_createdAt", ["createdAt"])

// convex/schema.ts — auditLogs (add after :151)
.index("by_action_createdAt", ["action", "createdAt"])
```

### Write-path changes (step 2)

| Location | Change |
|---|---|
| `convex/batches/mutations.ts:151-161` | `createdAt: Date.now()` in the batch insert; also the Phase 3 denorm fields |
| `convex/products/mutations.ts:68-79` | `createdAt: Date.now()` **and** `batchCount: 0` in `create` |
| `convex/dispatchItems` writer `convex/dispatches/mutations.ts:117-125` | either write `createdAt` or **remove the field** from the schema (`:114`) — an unwritten, unread field is a permanent lie |

### New migrations (step 3) — `convex/migrations.ts`

| Migration | Sets | Prepares |
|---|---|---|
| `backfillBatchCreatedAt` | `batches.createdAt = _creationTime` | `batches.by_createdAt`, `by_supplier_createdAt` |
| `backfillProductCreatedAt` | `products.createdAt = _creationTime` | `products.by_createdAt` |
| `backfillBatchDenorm` | `productName` / `supplierName` / `receivedBy` | receiving-history list |
| `backfillProductLastSupplierId` | `products.lastSupplierId` | product list queries |

Register **all four** in the deploy backfill checklist in `AGENTS.md`.

### Read-path cutover (step 4) — only after backfills have run

```ts
// convex/reports/queries.ts:168  — replaces collect + JS filter
const batches = await ctx.db
  .query("batches")
  .withIndex("by_createdAt", (q) => q.gte("createdAt", startMs).lte("createdAt", endMs))
  .collect()
```

Apply the same to `exportProducts` (`:108`), `exportSuppliers` (`:213` — needs a
`createdAt` field added to `suppliers` first, it has none), `exportMonthlyReport`
(`:511`), and `auditLogs` `action` branch + `fetchExportLogs` (`:47-50`, `:289-292`).

⚠️ The `?? _creationTime` fallbacks at `:110, :170, :193, :331` must be **removed in
the same commit** as the cutover. Leaving them means the code still reads unindexed
rows, giving the illusion of a fix.

### Index cleanup (step 4, same deploy)

Remove `dispatches.by_userId` (`:96`), `stockAdjustments.by_userId` (`:134`),
`auditLogs.by_action` (`:147`), `auditLogs.by_userId` (`:148`) — but **only after**
every query has been repointed. `batches.by_product` stays (§ P14 exception).

---

## Phase 5 — Pagination and truncation honesty

Three separate correctness issues, all about silently losing data.

| Change | Fixes |
|---|---|
| Convert `dispatches.list` (`:14-74`) and `fetchDispatchesOrdered` to `paginationOptsValidator` + `.paginate()`. Copy `features/audit-logs/hooks/use-audit-logs.ts` (cursor stack, `filtersKey` reset effect). | P10 |
| Add a `limit` param to `fetchDispatches` / `fetchAdjustments` (`convex/lib/fetch_entities.ts:12, :56`) and require a start date for the "All Time" preset in `features/reports/constants.ts:61-62` | P11 |
| Audit export: either paginate past 2000, or return `{ rows, truncated }` **and** record the true count in `logExport`. Never write a truncated count to the audit trail. | P13 |

**This phase is also the unblocker for the receiving-history page** (Sprint §1c) —
both need real cursor pagination, and the audit-logs implementation is the
in-repo reference.

---

## Phase 6 — Report export internals

- `exportDispatchItems` (`:312`) and `exportMonthlyReport` (`:426`): outer
  `for...of` → `await Promise.all(merged.map(async (d) => …))`; hoist the inner
  per-item product/batch reads into `Set`-dedup maps. Copy `:466-467`, which
  already does it correctly in the same module.
- `exportBatches` (`:174-196`): `Set`-dedup all three foreign keys.
- `exportProducts` (`:114-151`): read `p.batchCount` and the new
  `p.lastSupplierId` instead of re-deriving both from a full batch scan.

---

# Part III — Convex's Own Opinion

Checked against the guidance vendored into this repo. **This codebase violates
three of Convex's explicit rules today.**

## III.1 Violated rules in the current code

| `guidelines.md` | Rule | Status here |
|---|---|---|
| `:242` | **"Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead."** | ❌ Violated at `auditLogs/queries.ts:68-79, 303-308` (P8), and by the collect-then-`Array.filter` pattern at `reports/queries.ts:109, 169, 214` (P9) and `suppliers/queries.ts:43`. `hot-path-rules.md:44-50` adds that Convex's `.filter()` costs the same as JS filtering — it does **not** push to storage. |
| `:243` | **"If the user does not explicitly tell you to return all results from a query you should ALWAYS return a bounded collection instead. So that is instead of using `.collect()` you should use `.take()` or paginate."** | ❌ Violated by **every** unbounded collect in the codebase: `products/queries.ts:18, 64, 110`; `suppliers/queries.ts:14, 40`; `dashboard/queries.ts:30, 225`; `reports/queries.ts:108, 168, 213, 511, 525`; `lib/fetch_entities.ts:24, 31, 62, 66`. Only **2 of ~20** list queries are paginated (`auditLogs.list` `:91`, `auditLogs.listByUser` `:217`). |
| `:244` | **"Never use `.collect().length` to count rows … maintain a denormalized counter."** | ❌ Violated at `batches/queries.ts:84-88` (P15) and `products/queries.ts:194-198`. The correct counters (`products.batchCount`, `suppliers.batchCount`) already exist — these sites just ignore them. |
| `:247` | Bounded reads via `withIndex`; use `.unique()` for single docs | ⚠️ Partially. `withIndex` usage is good where it exists; the problem is the fields it can't reach (P12). |
| `:155-158` | "Always include all index fields in the index name"; "Index fields must be queried in the same order they are defined."; "Do not store unbounded lists as an array field" | ✅ Names comply. ⚠️ P14 shows the inverse problem — indexes that carry *no* information the compound index lacks. ⚠️ Phase 3's `productUnits` must respect the array rule. |
| `:253` | "Document queries that use indexes … can avoid slow table scans." | ⚠️ Holds only for the 3 of 8 tables with usable date indexes (`dispatches`, `stockAdjustments`, `auditLogs`). `products`, `batches`, `suppliers`, `dispatchItems`, `users` have **no** date index. |

## III.2 The budget being defended

`function-budget.md:18-28` — verified independently by `convex-test`'s
`DEFAULT_TRANSACTION_LIMITS` (`node_modules/convex-test/dist/transactionMetrics.js:1-10`):

| Resource | Limit | Most likely to be hit |
|---|---|---|
| Query/mutation execution time | **1 second** (user code only) | `reports.exportDispatchItems` / `exportMonthlyReport` (P9, serial loops) |
| Data read per transaction | **16 MiB** | `listActions` (P6, 500 fat docs), full-scan exports (P9) |
| **Documents scanned per transaction** | **32,000** (incl. `.filter`ed-out docs) | every unbounded collect (P1, P9, P11) |
| **Index ranges read per transaction** | **4,096** (each `db.get` and `db.query`) | all N+1 sites — see `N-1-QUERY-AUDIT.md` |
| Documents written per transaction | **16,000** | seed chunking already respects this |
| Individual document size | **1 MiB** | the array rule (III.1) |
| Function return value size | **16 MiB** | `listDispatchReady` (P2) on a large catalog |

**Convex's diagnosis checklist** (`function-budget.md:30-36`) maps directly onto this
audit:

> - "Function execution took too long" errors → P9
> - "Transaction too large" or read/write set size errors → P1, P6, P9, P11
> - Slow queries that read many documents → P1, P2, P3, P4, P5
> - Client receiving large payloads that slow down page load → P2
> - `npx convex insights --details` showing high bytes read → P6, P9

**Fix order prescribed by Convex** (`function-budget.md:59-162`): 1) bound your
reads, 2) read smaller shapes, 3) batch large mutations, 4) move heavy work to
actions, 5) trim return values. This plan is ordered the same way, and adds
pagination (per `guidelines.md:243`) and index push-down (per `hot-path-rules.md:44`)
as the two mechanisms for step 1.

## III.3 OCC — why the full scans are worse than they look

`occ-conflicts.md:8-11` and `:28-33`:

> Convex uses optimistic concurrency control. When two transactions read or write
> overlapping data, one succeeds and the other retries automatically. High
> contention means wasted work and increased latency.
>
> Broad read sets causing false conflicts: A query that scans a large table range
> creates a broad read set. If any write touches that range, the query's
> transaction conflicts even if the specific document the query cared about was not
> modified.

Every full-table collect (P1, P6, P9) is a **maximum-surface read set**. The
denormalization in Phase 3 is the fix on both axes at once: fewer reads *and* a
narrower conflict surface.

## III.4 Getting Convex's live opinion

The three Convex-native signals that should be run before and after, to replace
inference with measurement:

```bash
# 1. Per-function cost: bytes read, duration, scan counts
npx convex insights --details

# 2. The vendored audit skill, run against the live deployment
#    (.agents/skills/convex-performance-audit/ — SKILL.md documents the
#     insights entry point; the references/ dir is the rule set this doc cites)

# 3. Local enforcement, in CI
#    convex-test@0.0.51 exposes transactionLimits, whose defaults equal the
#    limits in III.2. Currently 0 usages in this repo. Turning it on converts
#    every finding above into a test assertion.
```

Convex also maintains generated guidance at `convex/_generated/ai/guidelines.md`,
regenerated by `npx convex ai-files install`. It should be re-checked if the
dependency version changes, since the rules quoted in III.1 are version-bound.

## III.5 No field projections — which lever actually reduces invalidation

**Verified against the installed runtime.** `convex@1.43`'s database interface
(`node_modules/convex/dist/cjs-types/server/database.d.ts`) exposes
`.withIndex()`, `.paginate()`, `.collect()`, `.take()`, `.first()`, `.unique()` —
and **no `withProjection()`, `projectFields()`, or any other partial-read API**.

Consequences, in order of importance:

1. **Invalidation is document-level, not field-level.** A reactive query that
   includes `ctx.db.get(productId)` re-executes for every client when **any** field
   of that product changes — including fields the query never reads. There is no way
   to narrow a point read to the two fields you need.
2. **`function-budget.md:159-186` ("trim your return values") is the weaker lever.**
   Mapping `...item` down to `{ name, sku }` reduces bytes over the wire and client
   parse cost. It does **not** reduce documents read, bytes read server-side, or the
   invalidation surface. It is worth doing; it is not a substitute for removing reads.
3. **Therefore the correct lever per finding differs.** An earlier version of this
   document treated the two as interchangeable. They are not:

| Finding | Reducing reads | Trimming return shape | Correct lever |
|---|---|---|---|
| F1 / F3 / F9 | ✅ removes N index ranges | ❌ read set unchanged | **Denormalize** onto `products` — shrinks the read set |
| F4 / F5 | ✅ 31 → 1 index range | ❌ read set unchanged | **Delete the read** (constant / `Set`-dedup) |
| F6 (P6) | ✅ 500 docs → 0 | ✅ also removes the query | **Delete the query** — the strongest available move |
| P4 | ❌ split still reads N docs | ❌ read set unchanged | **Un-subscribe** (point-in-time read, or don't mount) |
| P2 (listDispatchReady) | ✅ removes 1 of 2 ranges | ⚠️ helps payload only | **Denormalize + lazy-load** `availableBatches` |
| P13 | n/a | n/a | **Do not cap**; remove the `.take(2000)` |

4. **Payload trimming still has a place** — just not as the primary fix. For
   `listDispatchReady` the `availableBatches` payload (`:146-152`) is a real
   over-the-wire cost, and `:146-152` already projects rather than spreading the
   whole batch doc. That is the correct reason to keep projecting: it was never
   going to help invalidation.

**Verification.** To prove a read-set reduction rather than a payload reduction,
assert on `databaseQueries` (index-range count) — not on `bytesRead` and not on
response size. This is exactly why the Wave 7 regression budgets in
[`SPRINT-PLAN.md`](./SPRINT-PLAN.md) §5 pin `{ documentsRead, databaseQueries }` per
query. A `databaseQueries` budget catches a reintroduced N+1; a `bytesRead` budget
would also fail on a harmless payload trim.

**Reference.** [`N-1-QUERY-AUDIT.md`](./N-1-QUERY-AUDIT.md) §1 and §5 apply the
same distinction to the N+1 sites: those are fixed by **narrowing read sets**, not by
projecting return shapes.

---

# Part IV — Expected Effect

## IV.1 Function invocations per page load

| Route | Now | After Phases 1–2 | Notes |
|---|---|---|---|
| `/dashboard` | 6 | **4** | Merge volume + movement; split banner stats |
| `/reports` | 3 | **2** | Fold `calendarSummary` into `monthlyAggregates` |
| `/audit-logs` | 3 | 2 | Delete `listActions` |
| `/inventory` | 2 | 2 | Unchanged count, much lower per-invocation cost |
| `/products` | 2 | 2 | Unchanged count, 2N → ~N index ranges |
| other owner routes | +1 (`summaryStats` via banner) | **+0** | P4 fix |

## IV.2 Index ranges per invocation

| Function | Now | After | Mechanism |
|---|---|---|---|
| `products.list` | ~1 + 2N | ~1 + N | `by_status` + drop archived + `lastSupplierId` |
| `products.listDispatchReady` | ~1 + 2N + N storage | ~1 + N | drop the `by_product … first()` range |
| `dashboard.productMovement` | ~2D + I + 2 | **~3** | read `dispatches.productUnits`; shared month range |
| `dashboard.summaryStats` (banner) | N + 1 | **~2** (`.take(20)`) | split query |
| `auditLogs.listByUser` | ~31 | **1** | constant `caller.name` |
| `auditLogs.list` | ~31 | **~6** | `Set`-dedup |
| `auditLogs.listActions` | 500 docs | **0** | static constant |
| `reports.exportBatches` | 1 + 3B | 1 + small | dedup + index |
| `reports.export*DispatchItems*` | 2D + 2I serial | ~1 + small, parallel | `Promise.all` + dedup |

## IV.3 Correctness improvements (not just speed)

- P6 — the audit action dropdown stops silently dropping quiet action types.
- P10 — dispatch-history search stops missing rows beyond the 500 cap.
- P13 — the audit export stops recording a truncated count as truth.
- P12 — the receiving-history feature becomes possible at all.

## IV.4 Verification per phase

1. `npx convex insights --details` before/after — bytes read and duration should
   fall for every function named in IV.2.
2. `convexTest({ transactionLimits: true })` on all query test files, then tightened
   to per-query `{ documentsRead, databaseQueries }` budgets
   (`databaseQueries` is the metric that catches N+1).
3. `pnpm test`, `pnpm typecheck`, `pnpm check`.
4. `hot-path-rules.md:403-411` — confirm: same results as before with no dropped
   records; removed lookups absent from the hot-path read set; fallback behaviour
   covered by tests; migration safety preserved; **sibling functions fixed
   consistently**.

---

# Part V — Considered and Rejected

| Option | Why rejected |
|---|---|
| Keep `.take(500)` and just show a "showing newest 500" note (P10) | Rejected as the *final* state — a history page that cannot be searched is a correctness problem, not a UX one. Accepted only as a **temporary** mitigation if pagination slips a release. |
| Add a new `receipts` / `purchases` table to model receiving | Rejected. `batches` already *is* the receipt record (supplier, receiver, cost, quantities, batch code) and is what `docs/EXPORT-REFERENCE.md:51-72` documents. A parallel table would duplicate the source of truth and require syncing two write paths. Sprint §1 works on `batches`. |
| Denormalize `dispatchItems` as a nested array on `dispatches` for Phase 3 | Rejected. `guidelines.md:156` forbids unbounded arrays (1 MiB doc limit, whole-document rewrite on every patch). A parallel `dispatchItemAggregates` table is the safe shape if line counts could grow. |
| Drop the `dispatches` date-range query in favour of client-side aggregation | Rejected. Moves the 32,000-doc scan limit to the client, ships the whole table over the wire, and forfeits the 1 s / 16 MiB protections. |
| Remove `batches.by_product` along with the other redundant indexes (P14) | Rejected — it is a genuine prefix, but `.order("desc").first()` requires `_creationTime` ordering, which `by_product_status` cannot provide. `hot-path-rules.md:153-157` documents this exact exception. |
| Re-enable the reports export button as part of this work | Rejected as out of scope. It is disabled at `features/reports/components/export/report-export-button.tsx:45` for free-tier quota protection. Fix the queries (Phase 6) **first**, then re-enable deliberately. |
| Fix the `action` index before the `createdAt` backfill (P8) | Rejected. `auditLogs.createdAt` *is* written (`auditLogs/mutations.ts:36`) and `backfillAuditLogCreatedAt` (`migrations.ts:176`) exists, so this one is unblocked — but it must still follow schema → writes → backfill → reads, not be cut over in the same commit as the index. |
