/**
 * Transaction-limit stress harness.
 *
 * Seeds the database at production volume (mirroring `convex/lib/constants.ts`)
 * and runs every hot read path with Convex's **real** transaction limits
 * enforced. `convex-test`'s `transactionLimits` defaults are identical to the
 * documented Convex limits — 32,000 documents read, 4,096 index ranges, 16 MiB
 * read, 16,000 documents written — which turns every finding in
 * `docs/PERFORMANCE-AUDIT.md` and `docs/N-1-QUERY-AUDIT.md` into a test
 * assertion instead of a comment.
 *
 * Two deliberate choices:
 *
 * 1. **Budgets are on `databaseQueries`, not `bytesRead`.** Bytes move for
 *    harmless reasons (a payload trim, a formatter change). `databaseQueries`
 *    counts index ranges, so it moves only when reads are added or removed.
 *    Per `docs/PERFORMANCE-AUDIT.md` §III.5, Convex has no field projections,
 *    so payload and read set are independent.
 * 2. **`mockResolvedValue`, not `mockResolvedValueOnce`.** These tests issue
 *    several queries; the `Once` variant returns `undefined` on the second call
 *    and fails with a confusing `Must provide arg 1 'id' to 'get'`.
 */
import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { DAILY_DISPATCH_MIN, DENSE_DAYS } from "../lib/constants"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./auditLogs/queries.ts": () => import("../auditLogs/queries"),
  "./batches/queries.ts": () => import("../batches/queries"),
  "./dashboard/queries.ts": () => import("../dashboard/queries"),
  "./dispatches/queries.ts": () => import("../dispatches/queries"),
  "./products/queries.ts": () => import("../products/queries"),
  "./reports/queries.ts": () => import("../reports/queries"),
  "./users/queries.ts": () => import("../users/queries"),
}

// Seeding ~17k records across many transactions takes far longer than the
// 20s default in vitest.config.ts, and Vitest 4 no longer accepts a trailing
// per-test timeout. Raise it for this file instead.
vi.setConfig({ testTimeout: 180_000 })

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()
  return { ...actual, getAuthUserId: authMocks.getAuthUserId }
})

/** Documents per seed transaction — safely under the 16,000-doc write limit. */
const SEED_CHUNK = 2_000

const NUM_PRODUCTS = 40
const NUM_SUPPLIERS = 3
/** Seed dispatches across the dense window the production seed generates. */
const NUM_DISPATCHES = DENSE_DAYS * DAILY_DISPATCH_MIN // 90 × 20 = 1,800

const DAY = 86_400_000
/** Anchor so timestamps are deterministic across runs. */
const T0 = 1_700_000_000_000
const WINDOW_END = T0 + DENSE_DAYS * DAY

type TestInstance = ReturnType<typeof makeTest>

function makeTest(
  transactionLimits?: Partial<{
    documentsRead: number
    documentsWritten: number
    databaseQueries: number
  }>
) {
  return convexTest({
    schema,
    modules,
    ...(transactionLimits ? { transactionLimits } : {}),
  })
}

/**
 * Instance used for seeding and for the plain limit-enforcement tests.
 *
 * `databaseQueries` is generous enough for the seed's own bookkeeping reads but
 * nowhere near enough to hide an N+1: at `NUM_DISPATCHES` = 1,800, the old
 * unguarded per-dispatch read in `dashboard.productMovement` would issue ~1,800
 * index ranges and throw.
 */
function makeSeedInstance() {
  return makeTest({
    documentsWritten: 16_000,
    documentsRead: 32_000,
    databaseQueries: 500,
  })
}

interface SeedRefs {
  ownerId: Id<"users">
  productIds: Id<"products">[]
  supplierIds: Id<"suppliers">[]
  batchIds: Id<"batches">[]
}

/**
 * Seeds at production volume using the array-of-promises + single `Promise.all`
 * pattern from `convex/seed.ts:434-485`, chunked at `SEED_CHUNK` docs per
 * transaction to stay under Convex's 16,000-documents-written limit.
 */
async function seedAtProductionVolume(t: TestInstance): Promise<SeedRefs> {
  const ownerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "owner@stress.test",
      name: "Stress Owner",
      role: "owner",
      status: "active",
    })
  })

  const supplierIds = await t.run(async (ctx) => {
    const ids: Id<"suppliers">[] = []
    for (let i = 0; i < NUM_SUPPLIERS; i++) {
      ids.push(
        await ctx.db.insert("suppliers", {
          companyName: `Supplier ${i}`,
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
          batchCount: 0,
        })
      )
    }
    return ids
  })

  await t.run(async (ctx) => {
    const promises: Array<Promise<unknown>> = []
    for (let i = 0; i < NUM_PRODUCTS; i++) {
      promises.push(
        ctx.db.insert("products", {
          skuCode: `SKU-${i.toString().padStart(4, "0")}`,
          name: `Product ${i}`,
          category: i % 3 === 0 ? "twines" : "sacks",
          baseUom: i % 3 === 0 ? "roll" : "piece",
          conversionFactor: 1,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: 10,
          status: "active",
          batchCount: 0,
          createdAt: T0 + i,
          lastSupplierId: supplierIds[i % supplierIds.length],
        })
      )
    }
    await Promise.all(promises)
  })

  const productIds = await t.run(async (ctx) => {
    const rows = await ctx.db.query("products").collect()
    return rows.map((p) => p._id)
  })

  // Batches — 3 per product, spread across the window.
  const NUM_BATCHES = NUM_PRODUCTS * 3
  const batchIds: Id<"batches">[] = []
  for (let start = 0; start < NUM_BATCHES; start += SEED_CHUNK) {
    const inserted = await t.run(async (ctx) => {
      const promises: Array<Promise<Id<"batches">>> = []
      for (let i = start; i < Math.min(start + SEED_CHUNK, NUM_BATCHES); i++) {
        const productIndex = i % NUM_PRODUCTS
        const dayOffset = Math.floor(i / NUM_PRODUCTS)
        const ts = T0 + dayOffset * DAY
        promises.push(
          ctx.db.insert("batches", {
            productId: productIds[productIndex],
            supplierId: supplierIds[productIndex % supplierIds.length],
            userId: ownerId,
            batchCode: `BAT-STRESS-${i}`,
            totalProcurementCost: 100 * 25,
            unitCost: 25,
            quantityReceived: 100,
            quantityRemaining: 100,
            status: "active",
            createdAt: ts,
            productName: `Product ${productIndex}`,
            productSku: `SKU-${productIndex.toString().padStart(4, "0")}`,
            supplierName: `Supplier ${productIndex % supplierIds.length}`,
            receivedBy: "Stress Owner",
          })
        )
      }
      return await Promise.all(promises)
    })
    batchIds.push(...inserted)
  }

  // Dispatches, one dispatchItem and one auditLog each, chunked.
  for (let start = 0; start < NUM_DISPATCHES; start += SEED_CHUNK) {
    await t.run(async (ctx) => {
      // Insert the dispatches first, keeping their ids, then the items and audit
      // logs in one parallel batch. Chunks stay under the 16,000-doc write limit.
      const inserted = await Promise.all(
        Array.from(
          { length: Math.min(SEED_CHUNK, NUM_DISPATCHES - start) },
          (_, k) => {
            const i = start + k
            const productIndex = i % NUM_PRODUCTS
            const ts = T0 + Math.floor(i / DAILY_DISPATCH_MIN) * DAY + (i % DAY)
            return ctx.db.insert("dispatches", {
              userId: ownerId,
              customerReference: `PO-${i}`,
              orNumber: `OR-${i}`,
              status: i % 17 === 0 ? "voided" : "completed",
              userName: "Stress Owner",
              itemCount: 1,
              totalQuantity: 5,
              totalValue: 125,
              createdAt: ts,
              productUnits: [{ productId: productIds[productIndex], units: 5 }],
            })
          }
        )
      )

      const writes: Array<Promise<unknown>> = []
      for (let k = 0; k < inserted.length; k++) {
        const i = start + k
        const productIndex = i % NUM_PRODUCTS
        const ts = T0 + Math.floor(i / DAILY_DISPATCH_MIN) * DAY + (i % DAY)

        writes.push(
          ctx.db.insert("dispatchItems", {
            dispatchId: inserted[k],
            batchId: batchIds[productIndex % batchIds.length],
            productId: productIds[productIndex],
            dispatchUom: productIndex % 3 === 0 ? "roll" : "piece",
            dispatchQuantity: 5,
            quantityDeducted: 5,
            unitCost: 25,
            createdAt: ts,
          })
        )
        writes.push(
          ctx.db.insert("auditLogs", {
            userId: ownerId,
            action: "dispatch_submit",
            description: `Dispatch ${i}`,
            createdAt: ts,
          })
        )
      }
      await Promise.all(writes)
    })
  }

  return { ownerId, productIds, supplierIds, batchIds }
}

describe("transaction-limit stress", () => {
  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  it("seeds production volume without tripping the write limit", async () => {
    const t = makeSeedInstance()
    const { productIds, supplierIds } = await seedAtProductionVolume(t)

    expect(productIds).toHaveLength(NUM_PRODUCTS)
    expect(supplierIds).toHaveLength(NUM_SUPPLIERS)

    const counts = await t.run(async (ctx) => ({
      dispatches: (await ctx.db.query("dispatches").collect()).length,
      auditLogs: (await ctx.db.query("auditLogs").collect()).length,
    }))

    expect(counts.dispatches).toBe(NUM_DISPATCHES)
    expect(counts.auditLogs).toBe(NUM_DISPATCHES)
  })

  describe("hot read paths run within Convex's real limits", () => {
    it("products.list", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.products.queries.list, {})
      expect(result).toHaveLength(NUM_PRODUCTS)
      // `lastSupplierId` is read from the denormalized field.
      expect(result.every((p) => p.lastSupplierId !== undefined)).toBe(true)
    })

    it("products.listDispatchReady", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.products.queries.listDispatchReady, {})
      expect(result).toHaveLength(NUM_PRODUCTS)
    })

    it("products.list with status=all", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.products.queries.list, { status: "all" })
      expect(result.length).toBeGreaterThanOrEqual(NUM_PRODUCTS)
    })

    it("dashboard.summaryStats", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.dashboard.queries.summaryStats, {})
      expect(result.activeProductCount).toBe(NUM_PRODUCTS)
    })

    it("dashboard.stockAlerts", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.dashboard.queries.stockAlerts, {})
      expect(Array.isArray(result)).toBe(true)
      // Every seeded product has qty 0 against a threshold of 10.
      expect(result).toHaveLength(NUM_PRODUCTS)
    })

    it("dashboard.productMovement over the full 90-day window", async () => {
      // This is the query that used to issue one `dispatchItems.by_dispatch`
      // index range per dispatch (~1,800) and carry a stale "fine at ~50/month"
      // comment. With `productUnits` denormalized it is a local aggregation.
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.dashboard.queries.productMovement, {
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.length).toBeGreaterThan(0)
      expect(result.reduce((sum, r) => sum + r.unitsSold, 0)).toBeGreaterThan(0)
    })

    it("dispatches.list across a full day", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.dispatches.queries.list, {
        startMs: T0,
        endMs: T0 + DAY,
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("batches.listHistory, first page", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: { numItems: 30, cursor: null },
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.page).toHaveLength(30)
      expect(result.isDone).toBe(false)
      // Denormalized fields resolve without any fallback reads.
      expect(result.page[0].productName).toBeTruthy()
      expect(result.page[0].supplierName).toBeTruthy()
      expect(result.page[0].receivedBy).toBe("Stress Owner")
    })

    it("auditLogs.list, first page", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: { numItems: 30, cursor: null },
      })
      expect(result.page).toHaveLength(30)
      expect(result.page[0].userName).toBe("Stress Owner")
    })

    it("auditLogs.listByUser is O(1) in rows", async () => {
      // `userName` used to cost one point read per row. Because every row is
      // provably the caller, it is now a constant derived from `caller`.
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.auditLogs.queries.listByUser, {
        paginationOpts: { numItems: 30, cursor: null },
      })
      expect(result.page).toHaveLength(30)
      expect(new Set(result.page.map((l) => l.userName)).size).toBe(1)
    })

    it("reports.monthlyAggregates with folded calendar timestamps", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.reports.queries.monthlyAggregates, {
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.dispatchCount).toBeGreaterThan(0)
      expect(result.adjustmentCount).toBeGreaterThanOrEqual(0)
      expect(result.dispatchTimestamps.length).toBeGreaterThan(0)
      expect(result.adjustmentTimestamps).toEqual([])
    })

    it("reports.exportBatches — deduplicated point reads", async () => {
      // Was 3 point reads per batch across a full-table collect. Now
      // deduplicated to |products| + |suppliers| + |users|.
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.reports.queries.exportBatches, {
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.records.length).toBeGreaterThan(0)
      expect(result.records[0].productName).toBeTruthy()
      expect(result.records[0].supplier).toBeTruthy()
    })

    it("reports.exportDispatchItems — parallelised, not serialised", async () => {
      const t = makeSeedInstance()
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.reports.queries.exportDispatchItems, {
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.records.length).toBeGreaterThan(0)
      expect(result.records[0].product).toBeTruthy()
      expect(result.records[0].batchCode).toBeTruthy()
    })
  })

  describe("tight index-range budgets catch a reintroduced N+1", () => {
    it("productMovement with a budget far below one-range-per-dispatch", async () => {
      // Budget: 40 index ranges. The old implementation needed ~1,800 for this
      // range; the current one needs about 4. If someone reintroduces a
      // per-dispatch read, this throws.
      const t = makeTest({
        documentsWritten: 16_000,
        documentsRead: 32_000,
        databaseQueries: 40,
      })
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.dashboard.queries.productMovement, {
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("listByUser with a budget that leaves no room for per-row reads", async () => {
      // Budget: 12 index ranges for a 30-row page. Per-row reads would need 30+.
      const t = makeTest({
        documentsWritten: 16_000,
        documentsRead: 32_000,
        databaseQueries: 12,
      })
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.auditLogs.queries.listByUser, {
        paginationOpts: { numItems: 30, cursor: null },
      })
      expect(result.page).toHaveLength(30)
    })

    it("listHistory with a budget that leaves no room for per-row joins", async () => {
      // 30 rows, one page. Budget: 20 index ranges. Per-row product/supplier/user
      // reads would need ~90.
      const t = makeTest({
        documentsWritten: 16_000,
        documentsRead: 32_000,
        databaseQueries: 20,
      })
      const { ownerId } = await seedAtProductionVolume(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: { numItems: 30, cursor: null },
        startMs: T0,
        endMs: WINDOW_END,
      })
      expect(result.page).toHaveLength(30)
    })
  })
})
