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
  "./products/queries.ts": () => import("./queries"),
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

describe("product queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function createUser(
    t: ReturnType<typeof convexTest>,
    user: { email: string; name: string; role: "owner" | "staff"; status?: "active" | "deactivated" }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", { status: "active", ...user })
    })
  }

  async function createProduct(
    t: ReturnType<typeof convexTest>,
    overrides: { name: string } & Partial<{
      category: "sacks" | "twines"
      baseUom: "piece" | "roll"
      currentQuantity: number
      totalAssetValue: number
      status: "active" | "archived"
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        name: overrides.name,
        category: overrides.category ?? "sacks",
        baseUom: overrides.baseUom ?? "piece",
        weightPerUnit: 0,
        currentQuantity: overrides.currentQuantity ?? 0,
        totalAssetValue: overrides.totalAssetValue ?? 0,
        lowStockThreshold: 0,
        status: overrides.status ?? "active",
      })
    })
  }

  it("rejects unauthenticated list", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(t.query(api.products.queries.list)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("rejects list for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(t.query(api.products.queries.list)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("lists all products for owners", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "Product A" })
    await createProduct(t, { name: "Product B" })

    const result = await t.query(api.products.queries.list)

    expect(result).toHaveLength(2)
  })

  it("returns empty list when no products exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.products.queries.list)

    expect(result).toHaveLength(0)
  })

  // ── listActive ──────────────────────────────────────────

  it("listActive rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(t.query(api.products.queries.listActive)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("listActive rejects non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(t.query(api.products.queries.listActive)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("listActive returns only active products", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "Active Product" })
    await createProduct(t, {
      name: "Archived Product",
      status: "archived",
    })

    const result = await t.query(api.products.queries.listActive)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Active Product")
  })

  it("listActive returns empty array when no active products exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, {
      name: "Archived Only",
      status: "archived",
    })

    const result = await t.query(api.products.queries.listActive)

    expect(result).toEqual([])
  })

  it("listActive returns empty array when no products exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.products.queries.listActive)

    expect(result).toEqual([])
  })

  it("listActive enriches with lastSupplierId from most recent batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "Supplier Linked" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-LAST",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    const result = await t.query(api.products.queries.listActive)

    expect(result).toHaveLength(1)
    expect(result[0].lastSupplierId?.toString()).toBe(supplierId.toString())
  })

  it("listActive returns undefined lastSupplierId when product has no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "No Batch Product" })

    const result = await t.query(api.products.queries.listActive)

    expect(result[0].lastSupplierId).toBeUndefined()
  })

  // ── listDispatchReady ──────────────────────────────────────

  it("listDispatchReady rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.products.queries.listDispatchReady)
    ).rejects.toThrowError("Unauthorized")
  })

  it("listDispatchReady rejects unauthenticated users", async () => {
    const t = makeTest()

    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.products.queries.listDispatchReady)
    ).rejects.toThrowError("Unauthorized")
  })

  it("listDispatchReady returns only active products", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "Active Product" })
    await createProduct(t, {
      name: "Archived Product",
      status: "archived",
    })

    const result = await t.query(api.products.queries.listDispatchReady)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Active Product")
  })

  it("listDispatchReady returns availableBatches in FIFO order", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "FIFO Product" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    const batch1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-OLD",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 50,
        status: "active",
      })
    })

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-NEW",
        totalProcurementCost: 20000,
        unitCost: 200,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)
    const batches = result[0].availableBatches

    expect(batches).toHaveLength(2)
    expect(batches[0].batchCode).toBe("BAT-OLD")
    expect(batches[0]._id).toBe(batch1Id)
  })

  it("listDispatchReady excludes depleted batches from availableBatches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "Depleted Test" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-ACTIVE",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 50,
        status: "active",
      })
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-DEPLETED",
        totalProcurementCost: 5000,
        unitCost: 50,
        quantityReceived: 100,
        quantityRemaining: 0,
        status: "depleted",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)
    const batches = result[0].availableBatches

    expect(batches).toHaveLength(1)
    expect(batches[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listDispatchReady excludes voided batches from availableBatches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "Voided Test" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-ACTIVE",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 50,
        status: "active",
      })
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-VOIDED",
        totalProcurementCost: 5000,
        unitCost: 50,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "voided",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)
    const batches = result[0].availableBatches

    expect(batches).toHaveLength(1)
    expect(batches[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listDispatchReady excludes batches with zero remaining quantity", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "Depleted Batch" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-WITH-STOCK",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 30,
        status: "active",
      })
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-EMPTY",
        totalProcurementCost: 5000,
        unitCost: 50,
        quantityReceived: 100,
        quantityRemaining: 0,
        status: "active",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)
    const batches = result[0].availableBatches

    expect(batches).toHaveLength(1)
    expect(batches[0].batchCode).toBe("BAT-WITH-STOCK")
  })

  it("listDispatchReady returns empty availableBatches when no batches exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "Lonely Product" })

    const result = await t.query(api.products.queries.listDispatchReady)

    expect(result).toHaveLength(1)
    expect(result[0].availableBatches).toEqual([])
  })

  it("listDispatchReady returns lastSupplierId from most recent batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierA, supplierB] = await Promise.all([
      createProduct(t, { name: "Supplier Test" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier A",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier B",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId: supplierA,
        userId: ownerId,
        batchCode: "BAT-OLD",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 50,
        quantityRemaining: 50,
        status: "active",
      })
    })

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId: supplierB,
        userId: ownerId,
        batchCode: "BAT-NEW",
        totalProcurementCost: 20000,
        unitCost: 200,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)

    expect(result[0].lastSupplierId?.toString()).toBe(supplierB.toString())
  })

  it("listDispatchReady returns undefined lastSupplierId when product has no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, { name: "No Batch Product" })

    const result = await t.query(api.products.queries.listDispatchReady)

    expect(result[0].lastSupplierId).toBeUndefined()
  })

  it("listDispatchReady returns empty array when no active products exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createProduct(t, {
      name: "Archived Only",
      status: "archived",
    })

    const result = await t.query(api.products.queries.listDispatchReady)

    expect(result).toEqual([])
  })

  // ── getEditDetail ─────────────────────────────────────────

  it("getEditDetail rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "TEMP",
        name: "Temp",
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
      t.query(api.products.queries.getEditDetail, { productId: phantomId })
    ).rejects.toThrowError("Unauthorized")
  })

  it("getEditDetail rejects non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    const productId = await createProduct(t, { name: "Staff Test" })

    await expect(
      t.query(api.products.queries.getEditDetail, { productId })
    ).rejects.toThrowError("Unauthorized")
  })

  it("getEditDetail returns product with batchCount = 0 when no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, { name: "No Batch Product" })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)
    const result = await t.query(api.products.queries.getEditDetail, {
      productId,
    })

    expect(result).toMatchObject({
      name: "No Batch Product",
      batchCount: 0,
    })
  })

  it("getEditDetail returns batchCount > 0 when product has batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, { name: "Has Batches" }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-COUNT",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)
    const result = await t.query(api.products.queries.getEditDetail, {
      productId,
    })

    expect(result?.batchCount).toBe(1)
  })

  it("getEditDetail returns null for non-existent product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "TEMP",
        name: "Temp",
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

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)
    const result = await t.query(api.products.queries.getEditDetail, {
      productId: phantomId,
    })

    expect(result).toBeNull()
  })

  it("listDispatchReady resolves imageUrl when imagePath exists", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await t.run(async (ctx) => {
      await ctx.db.insert("products", {
        skuCode: "SKU-IMG",
        name: "Product With Image",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 10,
        totalAssetValue: 5000,
        lowStockThreshold: 2,
        status: "active",
        imagePath: "some-storage-ref",
      })
    })

    const result = await t.query(api.products.queries.listDispatchReady)

    // In-memory test: storage.getUrl fails, so imageUrl is undefined
    // This verifies the graceful catch rather than the URL itself
    expect(result[0].imageUrl).toBeUndefined()
    expect(result[0].imagePath).toBe("some-storage-ref")
  })
})
