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
    user: {
      email: string
      name: string
      role: "owner" | "staff"
      status: "active" | "deactivated"
    }
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

  async function createSupplier(
    t: ReturnType<typeof convexTest>,
    name: string
  ) {
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
        batchCode:
          overrides.batchCode ??
          `BAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
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

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Test Product"),
      createSupplier(t, "Test Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-001",
    })
    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-002",
    })

    const result = await t.query(api.batches.queries.listByProduct, {
      productId,
    })

    expect(result).toHaveLength(2)
    expect(
      result.map((b: { batchCode: string }) => b.batchCode).sort()
    ).toEqual(["BAT-001", "BAT-002"])
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

    const result = await t.query(api.batches.queries.listByProduct, {
      productId,
    })

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

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Counted Product"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, { productId, supplierId, userId: ownerId })
    await createBatch(t, { productId, supplierId, userId: ownerId })
    await createBatch(t, { productId, supplierId, userId: ownerId })

    const count = await t.query(api.batches.queries.getCountByProduct, {
      productId,
    })

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

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Detail Product"),
      createSupplier(t, "Detail Supplier"),
    ])

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

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Phantom Product"),
      createSupplier(t, "Phantom Supplier"),
    ])

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

    const result = await t.query(api.batches.queries.getById, {
      batchId: phantomId,
    })

    expect(result).toBeNull()
  })

  // ── listForDispatch ────────────────────────────────────────

  it("listForDispatch rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const phantomId = await t.run(async (ctx) => {
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

    await expect(
      t.query(api.batches.queries.listForDispatch, {
        productId: phantomId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("listForDispatch returns active batches in FIFO order", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "FIFO Product"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-OLD",
      quantityReceived: 50,
      quantityRemaining: 30,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-NEW",
      quantityReceived: 100,
      quantityRemaining: 80,
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(2)
    expect(result[0].batchCode).toBe("BAT-OLD")
    expect(result[1].batchCode).toBe("BAT-NEW")
  })

  it("listForDispatch excludes depleted batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Depleted Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-ACTIVE",
      quantityRemaining: 50,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-DEPLETED",
      quantityRemaining: 0,
      status: "depleted",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listForDispatch excludes voided batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Voided Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-ACTIVE",
      quantityRemaining: 50,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-VOIDED",
      quantityRemaining: 100,
      status: "voided",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listForDispatch excludes batches with quantityRemaining = 0", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Empty Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-WITH-STOCK",
      quantityRemaining: 30,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-EMPTY",
      quantityRemaining: 0,
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-WITH-STOCK")
  })

  it("listForDispatch returns empty array when no valid batches exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Empty Product"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-VOIDED",
      quantityRemaining: 100,
      status: "voided",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(0)
  })
})
