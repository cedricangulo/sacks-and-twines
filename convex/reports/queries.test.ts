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
    category: "sacks" | "twines"
    baseUom: "piece" | "roll"
    currentQuantity: number
    totalAssetValue: number
    lowStockThreshold: number
    weightPerUnit: number
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
      weightPerUnit: overrides?.weightPerUnit ?? 1,
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
    dispatchUom?: "piece" | "kilo" | "roll"
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

describe("calendarSummary", () => {
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
      t.query(api.reports.queries.calendarSummary, {
        startMs: 0,
        endMs: Date.now() + 86_400_000,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns empty arrays when no data in range", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const result = await t.query(api.reports.queries.calendarSummary, {
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

    const result = await t.query(api.reports.queries.calendarSummary, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result.dispatchTimestamps).toHaveLength(1)
    expect(result.dispatchTimestamps[0]).toBeGreaterThan(0)
    expect(result.adjustmentTimestamps).toHaveLength(1)
    expect(result.adjustmentTimestamps[0]).toBeGreaterThan(0)
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
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

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      companyName: "Supplier A",
      contactPerson: "Jane",
      contactNumber: "555-0100",
      address: "456 Oak St",
      batchCount: 0,
    })
    expect(result[2]).toMatchObject({
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      date: expect.any(Number),
      status: "completed",
      customerRef: "REF-001",
      dispatchedBy: "Dispatcher",
      itemCount: 2,
      totalValue: 500, // 10*25 + 5*50
    })
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

    expect(result).toHaveLength(0)
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
      dispatchUom: "kilo",
      dispatchQuantity: 20,
      quantityDeducted: 20,
      unitCost: 15,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.reports.queries.exportDispatchItems, {
      startMs: now - 86_400_000,
      endMs: now + 86_400_000,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      date: expect.any(Number),
      status: "completed",
      customerRef: "REF-002",
      dispatchedBy: "Dispatcher",
      product: "Product X",
      batchCode: "BATCH-123",
      dispatchUom: "kilo",
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

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
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
