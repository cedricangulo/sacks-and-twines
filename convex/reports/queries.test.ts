import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { UNBOUNDED_RANGE_LIMIT } from "../lib/fetch_entities"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./reports/queries.ts": () => import("./queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()
  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides?: Partial<{
    email: string
    name: string
    role: "owner" | "staff"
    status: "active" | "deactivated"
  }>
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: overrides?.email ?? "owner@test.com",
      name: overrides?.name ?? "Test Owner",
      role: overrides?.role ?? "owner",
      status: overrides?.status ?? "active",
    })
  })
}

async function createProduct(
  t: ReturnType<typeof convexTest>,
  overrides?: Partial<{
    skuCode: string
    name: string
    category: "sacks" | "twines" | "thread"
    baseUom: "piece" | "roll" | "meter"
    currentQuantity: number
    totalAssetValue: number
    lowStockThreshold: number
    conversionFactor: number
    status: "active" | "archived"
  }>
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      skuCode: overrides?.skuCode ?? "SKU-001",
      name: overrides?.name ?? "Test Product",
      category: overrides?.category ?? "sacks",
      baseUom: overrides?.baseUom ?? "piece",
      currentQuantity: overrides?.currentQuantity ?? 100,
      totalAssetValue: overrides?.totalAssetValue ?? 5000,
      lowStockThreshold: overrides?.lowStockThreshold ?? 10,
      conversionFactor: overrides?.conversionFactor ?? 1,
      status: overrides?.status ?? "active",
    })
  })
}

async function createSupplier(
  t: ReturnType<typeof convexTest>,
  overrides?: Partial<{
    companyName: string
    contactPerson: string
    contactNumber: string
    address: string
  }>
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("suppliers", {
      companyName: overrides?.companyName ?? "Test Supplier",
      contactPerson: overrides?.contactPerson ?? "John Contact",
      contactNumber: overrides?.contactNumber ?? "123-456-7890",
      address: overrides?.address ?? "123 Test St",
    })
  })
}

async function createBatch(
  t: ReturnType<typeof convexTest>,
  args: {
    productId: Id<"products">
    supplierId: Id<"suppliers">
    userId: Id<"users">
    batchCode?: string
    totalProcurementCost?: number
    unitCost?: number
    quantityReceived?: number
    quantityRemaining?: number
    status?: "active" | "depleted" | "voided"
    createdAt?: number
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("batches", {
      productId: args.productId,
      supplierId: args.supplierId,
      userId: args.userId,
      batchCode: args.batchCode ?? "BATCH-001",
      totalProcurementCost: args.totalProcurementCost ?? 1000,
      unitCost: args.unitCost ?? 10,
      quantityReceived: args.quantityReceived ?? 100,
      quantityRemaining: args.quantityRemaining ?? 80,
      status: args.status ?? "active",
      createdAt: args.createdAt,
    })
  })
}

async function createDispatch(
  t: ReturnType<typeof convexTest>,
  args: {
    userId: Id<"users">
    customerReference?: string
    userName?: string
    itemCount?: number
    createdAt?: number
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("dispatches", {
      userId: args.userId,
      customerReference: args.customerReference,
      userName: args.userName,
      itemCount: args.itemCount,
      createdAt: args.createdAt,
    })
  })
}

async function createDispatchItem(
  t: ReturnType<typeof convexTest>,
  args: {
    dispatchId: Id<"dispatches">
    batchId: Id<"batches">
    productId: Id<"products">
    dispatchUom?: "piece" | "roll" | "meter"
    dispatchQuantity?: number
    quantityDeducted?: number
    unitCost?: number
    createdAt?: number
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("dispatchItems", {
      dispatchId: args.dispatchId,
      batchId: args.batchId,
      productId: args.productId,
      dispatchUom: args.dispatchUom ?? "piece",
      dispatchQuantity: args.dispatchQuantity ?? 5,
      quantityDeducted: args.quantityDeducted ?? 5,
      unitCost: args.unitCost ?? 10,
      createdAt: args.createdAt,
    })
  })
}

async function createAdjustment(
  t: ReturnType<typeof convexTest>,
  args: {
    batchId: Id<"batches">
    productId: Id<"products">
    userId: Id<"users">
    quantityAdjusted?: number
    reason?: "damaged" | "lost" | "recount" | "system_reversal"
    status?: "applied" | "voided"
    createdAt?: number
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("stockAdjustments", {
      batchId: args.batchId,
      productId: args.productId,
      userId: args.userId,
      quantityAdjusted: args.quantityAdjusted ?? 5,
      reason: args.reason ?? "damaged",
      status: args.status ?? "applied",
      createdAt: args.createdAt,
    })
  })
}

describe("monthlyAggregates — calendar timestamps", () => {
  // The timestamps previously came from a separate `calendarSummary` query,
  // which re-read the same month range (and the same adjustment range) on every
  // reports load. They are folded in here. See docs/PERFORMANCE-AUDIT.md P5.

  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  it("rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)
    await expect(
      t.query(api.reports.queries.monthlyAggregates, {
        startMs: 0,
        endMs: Date.now() + 86_400_000,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns empty timestamp arrays when no data in range", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: 0,
      endMs: 1,
    })

    expect(result.dispatchTimestamps).toEqual([])
    expect(result.adjustmentTimestamps).toEqual([])
  })

  it("returns timestamps for records in range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const now = Date.now()

    const _dispatchId = await createDispatch(t, {
      userId: ownerId,
      createdAt: now,
    })
    const _adjustmentId = await createAdjustment(t, {
      batchId,
      productId,
      userId: ownerId,
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchTimestamps).toHaveLength(1)
    expect(result.dispatchTimestamps[0]).toBeGreaterThan(0)
    expect(result.adjustmentTimestamps).toHaveLength(1)
    expect(result.adjustmentTimestamps[0]).toBeGreaterThan(0)
  })

  it("counts every dispatch in the totals and the calendar timestamps", async () => {
    // The calendar grid marks any day with a dispatch and `dispatchCount`
    // counts the same rows — a single read serves both, with no status split.
    const t = makeTest()
    const ownerId = await createUser(t)
    const now = Date.now()

    await createDispatch(t, { userId: ownerId, createdAt: now })
    await createDispatch(t, { userId: ownerId, createdAt: now })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchTimestamps).toHaveLength(1)
    expect(result.dispatchCount).toBe(2)
  })
})

describe("monthlyAggregates", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  it("rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)
    await expect(
      t.query(api.reports.queries.monthlyAggregates, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns zeros when no data in range", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toMatchObject({
      dispatchCount: 0,
      adjustmentCount: 0,
      totalItems: 0,
      totalValue: 0,
    })
  })

  it("calculates aggregates from dispatch items", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const now = Date.now()

    const dispatchId = await createDispatch(t, {
      userId: ownerId,
      createdAt: now,
    })

    for (let i = 0; i < 3; i++) {
      await createDispatchItem(t, {
        dispatchId,
        batchId,
        productId,
        dispatchQuantity: 10,
        quantityDeducted: 10,
        unitCost: 5,
      })
    }

    await createAdjustment(t, {
      batchId,
      productId,
      userId: ownerId,
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchCount).toBe(1)
    expect(result.adjustmentCount).toBe(1)
    expect(result.totalItems).toBe(3)
    expect(result.totalValue).toBe(150) // 10 * 5 * 3
    expect(result.truncated).toBe(false)
  })

  // The client renders this flag instead of presenting a partial sum as a real
  // currency figure, so the query must actually set it when the range exceeds
  // the read ceiling — and clear it when it does not.
  it("flags truncated when the range exceeds the read cap", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const now = Date.now()

    await t.run(async (ctx) => {
      for (let i = 0; i < UNBOUNDED_RANGE_LIMIT + 1; i++) {
        await ctx.db.insert("dispatches", {
          userId: ownerId,
          userName: "Owner",
          itemCount: 1,
          totalValue: 10,
          createdAt: now - (UNBOUNDED_RANGE_LIMIT + 1 - i),
        })
      }
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.truncated).toBe(true)
    // Totals cover only the capped subset, never the full seeded set.
    expect(result.dispatchCount).toBe(UNBOUNDED_RANGE_LIMIT)
    expect(result.totalValue).toBe(UNBOUNDED_RANGE_LIMIT * 10)
  })
})

describe("exportDispatchReport", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  it("rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)
    await expect(
      t.query(api.reports.queries.exportDispatchReport, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns headers and lines in one snapshot", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Dispatcher" })
    const productId = await createProduct(t, { name: "Product X" })
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BATCH-123",
    })

    const now = Date.now()

    const dispatchId = await createDispatch(t, {
      userId: ownerId,
      customerReference: "REF-002",
      userName: "Dispatcher",
      createdAt: now,
    })

    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      dispatchUom: "meter",
      dispatchQuantity: 20,
      quantityDeducted: 20,
      unitCost: 15,
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportDispatchReport, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.truncated).toBe(false)
    expect(result.dispatches).toHaveLength(1)
    expect(result.dispatches[0]).toMatchObject({
      customerRef: "REF-002",
      dispatchedBy: "Dispatcher",
      itemCount: 1,
      totalQuantity: 20,
      totalValue: 300,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      dispatchId,
      orNumber: "",
      customerRef: "REF-002",
      dispatchedBy: "Dispatcher",
      product: "Product X",
      batchCode: "BATCH-123",
      dispatchUom: "meter",
      dispatchQty: 20,
      qtyDeducted: 20,
      unitCost: 15,
      lineTotal: 300,
    })
  })
  it("finds items whose createdAt is missing via the per-dispatch fallback", async () => {
    // The window fast path is only trusted when every item carries `createdAt`.
    // Without that, the per-dispatch fallback has to supply the rows — this is
    // the path a partially-migrated deployment takes.
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t, { skuCode: "SKU-LEGACY" })
    const supplierId = await createSupplier(t, {
      companyName: "Legacy Supplier",
    })
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      createdAt: 1_700_000_000_000,
    })
    const dispatchId = await createDispatch(t, {
      userId: ownerId,
      userName: "Owner",
      itemCount: 1,
      createdAt: 1_700_000_000_000,
    })
    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      // No createdAt — as it exists before `backfillDispatchItemCreatedAt`.
    })

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportDispatchReport, {
      startMs: 1_699_999_000_000,
      endMs: 1_700_000_001_000,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].batchCode).toBe("BATCH-001")
    expect(result.truncated).toBe(false)
  })

  it("returns what genuinely exists when itemCount cannot be proven complete", async () => {
    // `itemCount` says 2, only one item exists, so the window read cannot satisfy
    // the count. The per-dispatch fallback returns what genuinely exists rather
    // than the fast path's guess.
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t, { skuCode: "SKU-MISMATCH" })
    const supplierId = await createSupplier(t, {
      companyName: "Mismatch Supplier",
    })
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      createdAt: 1_700_000_000_000,
    })
    const dispatchId = await createDispatch(t, {
      userId: ownerId,
      userName: "Owner",
      itemCount: 2,
      createdAt: 1_700_000_000_000,
    })
    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      createdAt: 1_700_000_000_000,
    })

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportDispatchReport, {
      startMs: 1_699_999_000_000,
      endMs: 1_700_000_001_000,
    })

    expect(result.items).toHaveLength(1)
    expect(result.truncated).toBe(false)
  })
})
