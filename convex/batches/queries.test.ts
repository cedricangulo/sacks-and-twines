import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./batches/queries.ts": () => import("./queries"),
  "./users/queries.ts": () => import("../users/queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("batch queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function createUser(
    t: ReturnType<typeof convexTest>,
    user: { email: string; name: string; role: "owner" | "staff"; status: "active" | "deactivated" }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", user)
    })
  }

  async function createProduct(t: ReturnType<typeof convexTest>, name: string) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        name,
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 100,
        totalAssetValue: 50000,
        lowStockThreshold: 10,
        status: "active",
      })
    })
  }

  async function createSupplier(t: ReturnType<typeof convexTest>, name: string) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", {
        companyName: name,
        contactPerson: "Contact",
        contactNumber: "09171234567",
        address: "Address 123 Street City",
      })
    })
  }

  async function createBatch(
    t: ReturnType<typeof convexTest>,
    overrides: {
      productId: unknown
      supplierId: unknown
      userId: unknown
    } & Partial<{
      batchCode: string
      status: "active" | "depleted" | "voided"
      quantityReceived: number
      quantityRemaining: number
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        batchCode: overrides.batchCode ?? `BAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        productId: overrides.productId,
        supplierId: overrides.supplierId,
        userId: overrides.userId,
        totalProcurementCost: 25000,
        unitCost: 500,
        quantityReceived: overrides.quantityReceived ?? 50,
        quantityRemaining: overrides.quantityRemaining ?? 50,
        status: overrides.status ?? "active",
      })
    })
  }

  it("rejects unauthenticated listByProduct", async () => {
    const t = makeTest()

    const phantomProductId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "PHANTOM",
        name: "Phantom",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.batches.queries.listByProduct, {
        productId: phantomProductId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("lists batches by product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Test Product")
    const supplierId = await createSupplier(t, "Test Supplier")

    await createBatch(t, { productId, supplierId, userId: ownerId, batchCode: "BAT-001" })
    await createBatch(t, { productId, supplierId, userId: ownerId, batchCode: "BAT-002" })

    const result = await t.query(api.batches.queries.listByProduct, { productId })

    expect(result).toHaveLength(2)
    expect(result.map((b: { batchCode: string }) => b.batchCode).sort()).toEqual(["BAT-001", "BAT-002"])
  })

  it("returns empty list for product with no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Lonely Product")

    const result = await t.query(api.batches.queries.listByProduct, { productId })

    expect(result).toHaveLength(0)
  })

  it("returns batch count by product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Counted Product")
    const supplierId = await createSupplier(t, "Supplier")

    await createBatch(t, { productId, supplierId, userId: ownerId })
    await createBatch(t, { productId, supplierId, userId: ownerId })
    await createBatch(t, { productId, supplierId, userId: ownerId })

    const count = await t.query(api.batches.queries.getCountByProduct, { productId })

    expect(count).toBe(3)
  })

  it("gets batch detail with computed fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Detail Product")
    const supplierId = await createSupplier(t, "Detail Supplier")

    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-DETAIL",
      quantityReceived: 100,
      quantityRemaining: 100,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.batches.queries.getById, { batchId })

    expect(result).toMatchObject({
      batchCode: "BAT-DETAIL",
      productName: "Detail Product",
      supplierName: "Detail Supplier",
      dispatchCount: 0,
      activeAdjustmentCount: 0,
      canEditQuantities: true,
    })
  })

  it("returns null for non-existent batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Phantom Product")
    const supplierId = await createSupplier(t, "Phantom Supplier")

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("batches", {
        batchCode: "TEMP",
        productId,
        supplierId,
        userId: ownerId,
        totalProcurementCost: 0,
        unitCost: 0,
        quantityReceived: 0,
        quantityRemaining: 0,
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.batches.queries.getById, { batchId: phantomId })

    expect(result).toBeNull()
  })
})
