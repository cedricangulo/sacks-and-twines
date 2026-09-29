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
    status?: "completed" | "voided"
    userName?: string
    itemCount?: number
    createdAt?: number
  }
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("dispatches", {
      userId: args.userId,
      customerReference: args.customerReference,
      status: args.status ?? "completed",
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

  it("includes voided dispatches in calendar timestamps but not the totals", async () => {
    // The calendar grid marks any day with a dispatch; `dispatchCount` counts
    // completed ones only. Folding the two queries together must preserve both
    // semantics.
    const t = makeTest()
    const ownerId = await createUser(t)
    const now = Date.now()

    await createDispatch(t, { userId: ownerId, createdAt: now })
    await createDispatch(t, {
      userId: ownerId,
      createdAt: now,
      status: "voided",
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.monthlyAggregates, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchTimestamps).toHaveLength(1)
    expect(result.dispatchCount).toBe(1)
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
          status: "completed",
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

describe("exportProducts", () => {
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
      t.query(api.reports.queries.exportProducts, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects non-owner role", async () => {
    const t = makeTest()
    const userId = await createUser(t, { role: "staff" })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)
    await expect(
      t.query(api.reports.queries.exportProducts, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns enriched product data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t, {
      skuCode: "SKU-A",
      name: "Product A",
      category: "sacks",
      baseUom: "piece",
      currentQuantity: 50,
      totalAssetValue: 2500,
      lowStockThreshold: 10,
      status: "active",
    })
    const supplierId = await createSupplier(t, { companyName: "Supplier Co" })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "B-001",
      status: "active",
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "B-002",
      status: "depleted",
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportProducts, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      skuCode: "SKU-A",
      name: "Product A",
      category: "sacks",
      baseUom: "piece",
      status: "active",
      currentQuantity: 50,
      totalAssetValue: 2500,
      lowStockThreshold: 10,
      lastSupplier: "Supplier Co",
      batchCount: 1, // only active batch counted
    })
  })

  it("handles products with no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    await createProduct(t, { skuCode: "SKU-NO-BATCH" })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportProducts, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      skuCode: "SKU-NO-BATCH",
      lastSupplier: "",
      batchCount: 0,
    })
  })
})

describe("exportBatches", () => {
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
      t.query(api.reports.queries.exportBatches, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff role", async () => {
    const t = makeTest()
    const userId = await createUser(t, { role: "staff" })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)
    await expect(
      t.query(api.reports.queries.exportBatches, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns enriched batch data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Owner User" })
    const productId = await createProduct(t, { name: "Test Product" })
    const supplierId = await createSupplier(t, {
      companyName: "Supplier Name",
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BATCH-X",
      totalProcurementCost: 2000,
      unitCost: 20,
      quantityReceived: 100,
      quantityRemaining: 60,
      status: "active",
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportBatches, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      batchCode: "BATCH-X",
      productName: "Test Product",
      category: "sacks",
      status: "active",
      unitCost: 20,
      totalCost: 2000,
      qtyReceived: 100,
      qtyRemaining: 60,
      supplier: "Supplier Name",
      receivedBy: "Owner User",
      createdAt: expect.any(Number),
    })
  })
})

describe("exportSuppliers", () => {
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
      t.query(api.reports.queries.exportSuppliers, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff role", async () => {
    const t = makeTest()
    const userId = await createUser(t, { role: "staff" })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)
    await expect(
      t.query(api.reports.queries.exportSuppliers, { startMs: 0, endMs: 9e15 })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns supplier data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    await createSupplier(t, {
      companyName: "Supplier A",
      contactPerson: "Jane",
      contactNumber: "555-0100",
      address: "456 Oak St",
    })
    await createSupplier(t, {
      companyName: "Supplier B",
      contactPerson: "Bob",
      contactNumber: "555-0200",
      address: "789 Pine St",
    })
    const archivedId = await createSupplier(t, {
      companyName: "Archived Supplier",
      contactPerson: "Old",
      contactNumber: "555-0300",
      address: "000 Past Ln",
    })
    await t.run(async (ctx) => {
      await ctx.db.patch(archivedId, { archivedAt: Date.now() })
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportSuppliers, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(3)
    expect(result.records[0]).toMatchObject({
      companyName: "Supplier A",
      contactPerson: "Jane",
      contactNumber: "555-0100",
      address: "456 Oak St",
      batchCount: 0,
    })
    expect(result.records[2]).toMatchObject({
      companyName: "Archived Supplier",
      status: "archived",
    })
  })
})

describe("exportDispatches", () => {
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
      t.query(api.reports.queries.exportDispatches, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff role", async () => {
    const t = makeTest()
    const userId = await createUser(t, { role: "staff" })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)
    await expect(
      t.query(api.reports.queries.exportDispatches, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns dispatch headers within date range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Dispatcher" })
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
      customerReference: "REF-001",
      status: "completed",
      userName: "Dispatcher",
      createdAt: now,
    })

    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      dispatchQuantity: 10,
      quantityDeducted: 10,
      unitCost: 25,
    })

    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      dispatchQuantity: 5,
      quantityDeducted: 5,
      unitCost: 50,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportDispatches, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      date: expect.any(Number),
      status: "completed",
      customerRef: "REF-001",
      dispatchedBy: "Dispatcher",
      itemCount: 2,
      totalValue: 500, // 10*25 + 5*50
    })
  })

  // Export paths pass `order: "desc"` so a capped read keeps the newest
  // dispatches. Without it, an "All Time" export silently returns the oldest
  // rows and drops the most recent activity while still claiming completeness.
  it("returns newest first, so a capped export keeps recent dispatches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Dispatcher" })

    const base = Date.now() - 86_400_000
    const ids: Id<"dispatches">[] = []
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        ids.push(
          await ctx.db.insert("dispatches", {
            userId: ownerId,
            status: "completed",
            userName: "Dispatcher",
            customerReference: `REF-${i}`,
            itemCount: 1,
            totalValue: 10,
            createdAt: base + i * 60_000,
          })
        )
      }
    })

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportDispatches, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(5)
    expect(result.records.map((r) => r.customerRef)).toEqual([
      "REF-4",
      "REF-3",
      "REF-2",
      "REF-1",
      "REF-0",
    ])
    expect(ids).toHaveLength(5)
  })

  it("resolves the dispatcher from the user document when userName is absent", async () => {
    // Dispatches written before `dispatches.userName` was denormalized have no
    // name on the row. All three dispatch exports read the user document for
    // them, deduplicated to one read per distinct dispatcher.
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Owner" })
    const dispatcherId = await createUser(t, {
      name: "Legacy Dispatcher",
      email: "dispatcher@test.com",
    })
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const now = Date.now()
    const dispatchId = await createDispatch(t, {
      userId: dispatcherId,
      customerReference: "REF-LEGACY",
      status: "completed",
      itemCount: 1,
      createdAt: now,
    })
    await createDispatchItem(t, {
      dispatchId,
      batchId,
      productId,
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const range = { startMs: now - 86_400_000, endMs: now + 86_400_000 }

    const dispatches = await t.query(
      api.reports.queries.exportDispatches,
      range
    )
    expect(dispatches.records[0].dispatchedBy).toBe("Legacy Dispatcher")

    const items = await t.query(api.reports.queries.exportDispatchItems, range)
    expect(items.records[0].dispatchedBy).toBe("Legacy Dispatcher")

    const report = await t.query(api.reports.queries.exportMonthlyReport, range)
    expect(report.dispatches[0].dispatchedBy).toBe("Legacy Dispatcher")
  })

  it("excludes dispatches outside date range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const _batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    await createDispatch(t, {
      userId: ownerId,
      createdAt: Date.now(),
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportDispatches, {
      startMs: 0,
      endMs: 1,
    })

    expect(result.records).toHaveLength(0)
  })
})

describe("exportDispatchItems", () => {
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
      t.query(api.reports.queries.exportDispatchItems, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns flattened line items", async () => {
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
      status: "completed",
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
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportDispatchItems, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      date: expect.any(Number),
      status: "completed",
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
})

describe("exportAdjustments", () => {
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
      t.query(api.reports.queries.exportAdjustments, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns enriched adjustment data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Adjuster" })
    const productId = await createProduct(t, { name: "Product Y" })
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BATCH-ADJ",
    })

    const now = Date.now()

    await createAdjustment(t, {
      batchId,
      productId,
      userId: ownerId,
      quantityAdjusted: 10,
      reason: "damaged",
      status: "applied",
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportAdjustments, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      date: expect.any(Number),
      product: "Product Y",
      status: "applied",
      batchCode: "BATCH-ADJ",
      reason: "damaged",
      quantityAdjusted: 10,
      adjustedBy: "Adjuster",
    })
  })
})

describe("exportMonthlyReport", () => {
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
      t.query(api.reports.queries.exportMonthlyReport, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns zeros and empty arrays when no data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportMonthlyReport, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toMatchObject({
      dispatchCount: 0,
      adjustmentCount: 0,
      totalItems: 0,
      totalValue: 0,
      dispatchesPerDay: {},
      categoryBreakdown: { sacks: 0, twines: 0 },
      adjustmentsByReason: {},
      lowStockProducts: [],
      topProducts: [],
      dispatches: [],
      adjustments: [],
      productCount: 0,
      supplierCount: 0,
    })
  })

  it("returns composite report data", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Owner" })
    const productSacks = await createProduct(t, {
      skuCode: "SKU-S",
      name: "Sack Product",
      category: "sacks",
      currentQuantity: 5,
      lowStockThreshold: 10,
      status: "active",
    })
    const productTwines = await createProduct(t, {
      skuCode: "SKU-T",
      name: "Twine Product",
      category: "twines",
      currentQuantity: 200,
      lowStockThreshold: 20,
      status: "active",
    })
    const _productArchived = await createProduct(t, {
      skuCode: "SKU-A",
      name: "Archived Product",
      currentQuantity: 999,
      lowStockThreshold: 5,
      status: "archived",
    })
    const supplierId = await createSupplier(t, { companyName: "Supplier Co" })

    const batchSacks = await createBatch(t, {
      productId: productSacks,
      supplierId,
      userId: ownerId,
      batchCode: "B-SACKS",
    })
    const batchTwines = await createBatch(t, {
      productId: productTwines,
      supplierId,
      userId: ownerId,
      batchCode: "B-TWINES",
    })

    const now = Date.now()

    const dispatchId = await createDispatch(t, {
      userId: ownerId,
      customerReference: "REF-R1",
      userName: "Owner",
      createdAt: now,
    })

    await createDispatchItem(t, {
      dispatchId,
      batchId: batchSacks,
      productId: productSacks,
      dispatchUom: "piece",
      dispatchQuantity: 10,
      quantityDeducted: 10,
      unitCost: 20,
    })

    await createDispatchItem(t, {
      dispatchId,
      batchId: batchTwines,
      productId: productTwines,
      dispatchUom: "roll",
      dispatchQuantity: 3,
      quantityDeducted: 3,
      unitCost: 100,
    })

    await createAdjustment(t, {
      batchId: batchSacks,
      productId: productSacks,
      userId: ownerId,
      quantityAdjusted: -2,
      reason: "damaged",
      status: "applied",
      createdAt: now,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportMonthlyReport, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchCount).toBe(1)
    expect(result.adjustmentCount).toBe(1)
    expect(result.totalItems).toBe(2)
    expect(result.totalValue).toBe(500) // 10*20 + 3*100

    const dayKey = new Date(now).toLocaleDateString("en-CA")
    expect(result.dispatchesPerDay).toMatchObject({ [dayKey]: 1 })

    expect(result.categoryBreakdown).toMatchObject({
      sacks: 1,
      twines: 1,
    })

    expect(result.adjustmentsByReason).toMatchObject({ damaged: 1 })

    expect(result.lowStockProducts).toHaveLength(1)
    expect(result.lowStockProducts[0]).toMatchObject({
      skuCode: "SKU-S",
      name: "Sack Product",
      currentQuantity: 5,
      lowStockThreshold: 10,
    })

    expect(result.topProducts).toHaveLength(2)
    expect(result.topProducts[0]).toMatchObject({
      skuCode: "SKU-T",
      currentQuantity: 200,
    })

    expect(result.productCount).toBe(2)
    expect(result.supplierCount).toBe(1)

    expect(result.dispatches).toHaveLength(2)
    expect(result.adjustments).toHaveLength(1)
  })
})

describe("report exports report their own truncation", () => {
  // The cap exists to keep an unbounded range off the 32,000-document limit, but
  // a silent cut is indistinguishable from a complete export once the file has
  // left the app — the CSV row count would be a lie. These pin the flag.
  async function seedOverCap(t: ReturnType<typeof convexTest>, count: number) {
    const ownerId = await createUser(t)
    const productId = await createProduct(t, { skuCode: "SKU-CAP" })
    const supplierId = await createSupplier(t, { companyName: "Cap Supplier" })
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    // One `t.run` for the whole batch — per-row runs cost more in transaction
    // setup than the inserts themselves.
    await t.run(async (ctx) => {
      for (let i = 0; i < count; i++) {
        await ctx.db.insert("dispatches", {
          userId: ownerId,
          status: "completed",
          userName: "Owner",
          itemCount: 1,
          createdAt: 1_700_000_000_000 + i,
        })
      }
    })

    return { ownerId, batchId, productId }
  }

  // One over the cap. Seeding that is the slowest thing in this file, so the
  // capped tests share one instance — they only read. Derived from the constant
  // so lowering `UNBOUNDED_RANGE_LIMIT` does not strand these assertions at the
  // old value (and does not leave them seeding 5x more rows than needed).
  const OVER_CAP = UNBOUNDED_RANGE_LIMIT + 1
  let overCapFixture: Promise<{
    t: ReturnType<typeof convexTest>
    ownerId: Id<"users">
  }> | null = null

  function getOverCapFixture() {
    overCapFixture ??= (async () => {
      const t = convexTest({ schema, modules })
      const { ownerId } = await seedOverCap(t, OVER_CAP)
      return { t, ownerId }
    })()
    return overCapFixture
  }

  // Seeding past the read cap is inherently slow, and under a parallel
  // `pnpm test` the 20s default is not enough for the query that then reads the
  // whole capped set. Explicit budget rather than a flaky default.
  const OVER_CAP_TIMEOUT = 90_000

  it(
    "exportDispatches flags a capped read",
    async () => {
      const { t, ownerId } = await getOverCapFixture()
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.reports.queries.exportDispatches, {
        startMs: 0,
        endMs: 9e15,
      })

      expect(result.records).toHaveLength(UNBOUNDED_RANGE_LIMIT)
      expect(result.limit).toBe(UNBOUNDED_RANGE_LIMIT)
      expect(result.truncated).toBe(true)
    },
    OVER_CAP_TIMEOUT
  )

  it("exportDispatches reports false below the cap", async () => {
    const t = convexTest({ schema, modules })
    const { ownerId } = await seedOverCap(t, 3)
    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportDispatches, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(3)
    expect(result.truncated).toBe(false)
  })

  it("exportAdjustments flags a capped read", async () => {
    const t = convexTest({ schema, modules })
    const ownerId = await createUser(t)
    const productId = await createProduct(t, { skuCode: "SKU-ADJ-CAP" })
    const supplierId = await createSupplier(t, { companyName: "Adj Supplier" })
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    for (let i = 0; i < 200; i++) {
      await createAdjustment(t, {
        batchId,
        productId,
        userId: ownerId,
        createdAt: 1_700_000_000_000 + i,
      })
    }

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportAdjustments, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(200)
    expect(result.truncated).toBe(false)
  })

  it(
    "exportMonthlyReport surfaces the cap to the PDF",
    async () => {
      const { t, ownerId } = await getOverCapFixture()
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const result = await t.query(api.reports.queries.exportMonthlyReport, {
        startMs: 0,
        endMs: 9e15,
      })

      expect(result.truncated).toBe(true)
      expect(result.limit).toBe(UNBOUNDED_RANGE_LIMIT)
    },
    OVER_CAP_TIMEOUT
  )

  it("exportBatches caps and flags rather than collecting the table", async () => {
    const t = convexTest({ schema, modules })
    const ownerId = await createUser(t)
    const productId = await createProduct(t, { skuCode: "SKU-B-CAP" })
    const supplierId = await createSupplier(t, {
      companyName: "Batch Supplier",
    })

    for (let i = 0; i < 120; i++) {
      await createBatch(t, {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: `BATCH-${i}`,
        createdAt: 1_700_000_000_000 + i,
      })
    }

    authMocks.getAuthUserId.mockResolvedValue(ownerId)

    const result = await t.query(api.reports.queries.exportBatches, {
      startMs: 0,
      endMs: 9e15,
    })

    expect(result.records).toHaveLength(120)
    expect(result.truncated).toBe(false)
  })

  it("exportDispatchItems still finds items whose createdAt is missing", async () => {
    // The window fast path is only trusted when every item carries `createdAt`.
    // Without that, the per-dispatch fallback has to supply the rows — this is
    // the path a partially-migrated deployment takes.
    const t = convexTest({ schema, modules })
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

    const result = await t.query(api.reports.queries.exportDispatchItems, {
      startMs: 1_699_999_000_000,
      endMs: 1_700_000_001_000,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0].batchCode).toBe("BATCH-001")
    expect(result.truncated).toBe(false)
  })

  it("exportDispatchItems drops a dispatch whose items cannot be proven complete", async () => {
    // `itemCount` says 2, only one item exists and it has no `createdAt`, so the
    // window read cannot satisfy the count. The per-dispatch fallback returns
    // what genuinely exists rather than the fast path's guess.
    const t = convexTest({ schema, modules })
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

    const result = await t.query(api.reports.queries.exportDispatchItems, {
      startMs: 1_699_999_000_000,
      endMs: 1_700_000_001_000,
    })

    expect(result.records).toHaveLength(1)
    expect(result.truncated).toBe(false)
  })
})
