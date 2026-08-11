import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./dashboard/queries.ts": () => import("./queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()
  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    status: "active" | "archived"
  }>
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      skuCode: overrides?.skuCode ?? "SKU-001",
      name: overrides?.name ?? "Test Product",
      category: overrides?.category ?? "sacks",
      baseUom: overrides?.baseUom ?? "piece",
      conversionFactor: 0,
      currentQuantity: overrides?.currentQuantity ?? 100,
      totalAssetValue: overrides?.totalAssetValue ?? 5000,
      lowStockThreshold: overrides?.lowStockThreshold ?? 10,
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

// ---------------------------------------------------------------------------
// summaryStats
// ---------------------------------------------------------------------------

describe("summaryStats", () => {
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
      t.query(api.dashboard.queries.summaryStats, {})
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff role", async () => {
    const t = makeTest()
    const userId = await createUser(t, { role: "staff" })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    await expect(
      t.query(api.dashboard.queries.summaryStats, {})
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns zeros and empty arrays when no products exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.summaryStats, {})

    expect(result).toMatchObject({
      totalAssetValue: 0,
      activeProductCount: 0,
      categoryCount: 0,
      stockAlerts: [],
    })
  })

  it("returns correct totals for active products", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, {
      name: "Sack A",
      category: "sacks",
      currentQuantity: 50,
      totalAssetValue: 10000,
      lowStockThreshold: 5,
    })
    await createProduct(t, {
      name: "Twine B",
      category: "twines",
      currentQuantity: 200,
      totalAssetValue: 15000,
      lowStockThreshold: 10,
    })
    await createProduct(t, {
      name: "Thread C",
      category: "thread",
      currentQuantity: 30,
      totalAssetValue: 5000,
      lowStockThreshold: 20,
    })

    const result = await t.query(api.dashboard.queries.summaryStats, {})

    expect(result.totalAssetValue).toBe(30000)
    expect(result.activeProductCount).toBe(3)
    expect(result.categoryCount).toBe(3)
    expect(result.stockAlerts).toHaveLength(0)
  })

  it("excludes archived products from all stats", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, {
      name: "Active Product",
      totalAssetValue: 5000,
    })
    await createProduct(t, {
      name: "Archived Product",
      totalAssetValue: 10000,
      status: "archived",
    })

    const result = await t.query(api.dashboard.queries.summaryStats, {})

    expect(result.activeProductCount).toBe(1)
    expect(result.totalAssetValue).toBe(5000)
  })

  it("returns stock alerts for products at or below threshold", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productA = await createProduct(t, {
      name: "Low Stock Product",
      currentQuantity: 3,
      lowStockThreshold: 10,
    })
    const productB = await createProduct(t, {
      name: "Exact Threshold Product",
      currentQuantity: 5,
      lowStockThreshold: 5,
    })
    await createProduct(t, {
      name: "Well Stocked Product",
      currentQuantity: 100,
      lowStockThreshold: 10,
    })

    const result = await t.query(api.dashboard.queries.summaryStats, {})

    expect(result.stockAlerts).toHaveLength(2)
    expect(result.stockAlerts[0]).toMatchObject({
      productId: productA,
      productName: "Low Stock Product",
      currentQuantity: 3,
      lowStockThreshold: 10,
    })
    expect(result.stockAlerts[1]).toMatchObject({
      productId: productB,
      productName: "Exact Threshold Product",
      currentQuantity: 5,
      lowStockThreshold: 5,
    })
  })

  it("returns empty stockAlerts when all products are above threshold", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, {
      currentQuantity: 20,
      lowStockThreshold: 0,
    })

    const result = await t.query(api.dashboard.queries.summaryStats, {})

    expect(result.stockAlerts).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// dailyDispatchVolume
// ---------------------------------------------------------------------------

describe("dailyDispatchVolume", () => {
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
      t.query(api.dashboard.queries.dailyDispatchVolume, {
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
      t.query(api.dashboard.queries.dailyDispatchVolume, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns empty array when no dispatches in range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.dailyDispatchVolume, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toEqual([])
  })

  it("returns daily dispatch volume with correct aggregation", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Dispatcher" })
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const day1 = Date.UTC(2026, 6, 10, 9, 0, 0) // July 10, 9 AM UTC
    const day2 = Date.UTC(2026, 6, 15, 14, 0, 0) // July 15, 2 PM UTC

    const d1 = await createDispatch(t, {
      userId: ownerId,
      createdAt: day1,
    })
    const d2 = await createDispatch(t, {
      userId: ownerId,
      createdAt: day2,
    })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 10,
    })
    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 5,
    })
    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 20,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.dailyDispatchVolume, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ day: 10, value: 15, dispatchCount: 1 })
    expect(result).toContainEqual({ day: 15, value: 20, dispatchCount: 1 })
  })

  it("counts dispatches per day alongside unit volume", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, { name: "Dispatcher" })
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const day = Date.UTC(2026, 6, 12, 9, 0, 0) // July 12, 9 AM UTC

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: day })
    const d2 = await createDispatch(t, {
      userId: ownerId,
      createdAt: day + 3600_000, // 1 hour later, same day
    })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 10,
    })
    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 25,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.dailyDispatchVolume, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ day: 12, value: 35, dispatchCount: 2 })
  })

  it("excludes dispatches outside range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const inRange = Date.UTC(2026, 6, 10, 0, 0, 0)
    const outOfRange = Date.UTC(2026, 5, 1, 0, 0, 0) // June 1 UTC

    const d1 = await createDispatch(t, {
      userId: ownerId,
      createdAt: inRange,
    })
    const _d2 = await createDispatch(t, {
      userId: ownerId,
      createdAt: outOfRange,
    })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 10,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.dailyDispatchVolume, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ day: 10, value: 10 })
  })

  it("handles dispatches with zero quantity items", async () => {
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

    const d1 = await createDispatch(t, {
      userId: ownerId,
      createdAt: now,
    })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 0,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.dailyDispatchVolume, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// weeklyVelocity
// ---------------------------------------------------------------------------

describe("weeklyVelocity", () => {
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
      t.query(api.dashboard.queries.weeklyVelocity, {
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
      t.query(api.dashboard.queries.weeklyVelocity, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns empty array when no dispatches in range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toEqual([])
  })

  it("groups dispatches by dayOfWeek and hour", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)

    // Monday 10 AM UTC = dayOfWeek 1, hour 10
    const mon10am = Date.UTC(2026, 6, 6, 10, 0, 0)
    // Wednesday 2 PM UTC = dayOfWeek 3, hour 14
    const wed2pm = Date.UTC(2026, 6, 8, 14, 0, 0)

    await createDispatch(t, {
      userId: ownerId,
      createdAt: mon10am,
    })
    await createDispatch(t, {
      userId: ownerId,
      createdAt: mon10am + 60_000, // same hour, +1 min
    })
    await createDispatch(t, {
      userId: ownerId,
      createdAt: wed2pm,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ dayOfWeek: 1, hour: 10, count: 2 })
    expect(result).toContainEqual({ dayOfWeek: 3, hour: 14, count: 1 })
  })

  it("excludes dispatches outside business hours (8-18)", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)

    // 7 AM UTC = hour 7 (before business)
    const beforeHours = Date.UTC(2026, 6, 6, 7, 0, 0)
    // 7 PM UTC = hour 19 (after business)
    const afterHours = Date.UTC(2026, 6, 6, 19, 0, 0)
    // 9 AM UTC = hour 9 (within business)
    const inHours = Date.UTC(2026, 6, 6, 9, 0, 0)

    await createDispatch(t, { userId: ownerId, createdAt: beforeHours })
    await createDispatch(t, { userId: ownerId, createdAt: afterHours })
    await createDispatch(t, { userId: ownerId, createdAt: inHours })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ dayOfWeek: 1, hour: 9, count: 1 })
  })

  it("includes boundary hours 8 and 18", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)

    const at8am = Date.UTC(2026, 6, 6, 8, 0, 0)
    const at6pm = Date.UTC(2026, 6, 6, 18, 0, 0)

    await createDispatch(t, { userId: ownerId, createdAt: at8am })
    await createDispatch(t, { userId: ownerId, createdAt: at6pm })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: at8am - 86_400_000,
      endMs: at6pm + 86_400_000,
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ dayOfWeek: 1, hour: 8, count: 1 })
    expect(result).toContainEqual({ dayOfWeek: 1, hour: 18, count: 1 })
  })

  it("applies timezoneOffsetMs to shift hour and day", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)

    // Midnight Tuesday UTC = hour 0 (outside business in UTC)
    const tueMidnight = Date.UTC(2026, 6, 7, 0, 0, 0)

    await createDispatch(t, {
      userId: ownerId,
      createdAt: tueMidnight,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    // With UTC offset (0): midnight → hour 0, filtered out
    const utcResult = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })
    expect(utcResult).toHaveLength(0)

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    // With PHT offset (+8h): midnight UTC → 8AM same day → within business
    const phtResult = await t.query(api.dashboard.queries.weeklyVelocity, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 28_800_000,
    })
    expect(phtResult).toHaveLength(1)
    expect(phtResult[0]).toMatchObject({ dayOfWeek: 2, hour: 8, count: 1 })
  })
})

// ---------------------------------------------------------------------------
// weeklyDemand
// ---------------------------------------------------------------------------

describe("weeklyDemand", () => {
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
      t.query(api.dashboard.queries.weeklyDemand, {
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
      t.query(api.dashboard.queries.weeklyDemand, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns empty array when no dispatches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toEqual([])
  })

  it("returns daily demand for dispatches in range", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const july10 = Date.UTC(2026, 6, 10, 9, 0, 0)
    const july20 = Date.UTC(2026, 6, 20, 11, 0, 0)

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: july10 })
    const d2 = await createDispatch(t, { userId: ownerId, createdAt: july20 })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 30,
    })
    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 45,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(2)
    expect(result).toContainEqual({
      date: "2026-07-10",
      value: 30,
    })
    expect(result).toContainEqual({
      date: "2026-07-20",
      value: 45,
    })
  })

  it("aggregates multiple dispatch items on the same day", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const july15 = Date.UTC(2026, 6, 15, 10, 0, 0)

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: july15 })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 20,
    })
    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 15,
    })

    // Second dispatch on the same day
    const d2 = await createDispatch(t, {
      userId: ownerId,
      createdAt: july15 + 3600_000, // 1 hour later
    })

    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 10,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ date: "2026-07-15", value: 45 })
  })

  it("includes data from 4 weeks before startMs", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    // June 5 (4+ weeks before July 1)
    const june5 = Date.UTC(2026, 5, 5, 10, 0, 0)
    // July 5 (within the month)
    const july5 = Date.UTC(2026, 6, 5, 10, 0, 0)

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: june5 })
    const d2 = await createDispatch(t, { userId: ownerId, createdAt: july5 })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 50,
    })
    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 25,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    // Four weeks before July 1 = ~June 3. June 5 falls within range.
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ date: "2026-06-05", value: 50 })
    expect(result).toContainEqual({ date: "2026-07-05", value: 25 })
  })

  it("returns results sorted by date ascending", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const july20 = Date.UTC(2026, 6, 20, 10, 0, 0)
    const july10 = Date.UTC(2026, 6, 10, 10, 0, 0)
    const july15 = Date.UTC(2026, 6, 15, 10, 0, 0)

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: july20 })
    const d2 = await createDispatch(t, { userId: ownerId, createdAt: july10 })
    const d3 = await createDispatch(t, { userId: ownerId, createdAt: july15 })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 20,
    })
    await createDispatchItem(t, {
      dispatchId: d2,
      batchId,
      productId,
      quantityDeducted: 10,
    })
    await createDispatchItem(t, {
      dispatchId: d3,
      batchId,
      productId,
      quantityDeducted: 15,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toHaveLength(3)
    expect(result[0].date).toBe("2026-07-10")
    expect(result[1].date).toBe("2026-07-15")
    expect(result[2].date).toBe("2026-07-20")
  })

  it("excludes dispatches with zero quantity items", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    const july10 = Date.UTC(2026, 6, 10, 9, 0, 0)

    const d1 = await createDispatch(t, { userId: ownerId, createdAt: july10 })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 0,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })

    expect(result).toEqual([])
  })

  it("applies timezoneOffsetMs to shift dates", async () => {
    const t = makeTest()
    const ownerId = await createUser(t)
    const productId = await createProduct(t)
    const supplierId = await createSupplier(t)
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
    })

    // 11PM UTC July 10 — with PHT offset (+8h) → July 11
    const july10_23utc = Date.UTC(2026, 6, 10, 23, 0, 0)

    const d1 = await createDispatch(t, {
      userId: ownerId,
      createdAt: july10_23utc,
    })

    await createDispatchItem(t, {
      dispatchId: d1,
      batchId,
      productId,
      quantityDeducted: 50,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    // With UTC offset (0): 11PM → July 10
    const utcResult = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 0,
    })
    expect(utcResult).toHaveLength(1)
    expect(utcResult[0]).toMatchObject({ date: "2026-07-10", value: 50 })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    // With PHT offset (+8h): 11PM UTC → 7AM July 11
    const phtResult = await t.query(api.dashboard.queries.weeklyDemand, {
      startMs: Date.UTC(2026, 6, 1),
      endMs: Date.UTC(2026, 6, 31, 23, 59, 59, 999),
      timezoneOffsetMs: 28_800_000,
    })
    expect(phtResult).toHaveLength(1)
    expect(phtResult[0]).toMatchObject({ date: "2026-07-11", value: 50 })
  })
})
