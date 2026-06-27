import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
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
  "./auditLogs/mutations.ts": () => import("../auditLogs/mutations"),
  "./dispatches/mutations.ts": () => import("./mutations"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("dispatch mutations", () => {
  function makeTest() {
    const t = convexTest({ schema, modules })
    registerRateLimiter(t as never)
    return t
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
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
        email: overrides?.email ?? "user@test.com",
        name: overrides?.name ?? "Test User",
        role: overrides?.role ?? "owner",
        status: overrides?.status ?? "active",
      })
    })
  }

  async function createProduct(
    t: ReturnType<typeof convexTest>,
    overrides?: Partial<{
      name: string
      category: "sacks" | "twines" | "thread"
      baseUom: "piece" | "roll" | "cut"
      conversionFactor: number
      currentQuantity: number
      totalAssetValue: number
      status: "active" | "archived"
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        name: overrides?.name ?? "Test Product",
        category: overrides?.category ?? "sacks",
        baseUom: overrides?.baseUom ?? "piece",
        conversionFactor: overrides?.conversionFactor ?? 0,
        currentQuantity: overrides?.currentQuantity ?? 0,
        totalAssetValue: overrides?.totalAssetValue ?? 0,
        lowStockThreshold: 10,
        status: overrides?.status ?? "active",
      })
    })
  }

  async function createSupplier(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", {
        companyName: "Test Supplier",
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
      quantityReceived: number
      quantityRemaining: number
      unitCost: number
    }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId: overrides.productId,
        supplierId: overrides.supplierId,
        userId: overrides.userId,
        batchCode: `BAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        totalProcurementCost: overrides.quantityReceived * overrides.unitCost,
        unitCost: overrides.unitCost,
        quantityReceived: overrides.quantityReceived,
        quantityRemaining: overrides.quantityRemaining,
        status: "active",
      })
    })
  }

  async function createPhantomProductId(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "PHANTOM-SKU",
        name: "Phantom",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })
  }

  // ── Tests ────────────────────────────────────────────────

  it("rejects unauthenticated submit", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [
          {
            productId: await createPhantomProductId(t),
            quantity: 1,
            dispatchUom: "piece",
          },
        ],
      })
    ).rejects.toThrow("Unauthorized")
  })

  it("rejects submit with empty items", async () => {
    const t = makeTest()

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [],
      })
    ).rejects.toThrow()
  })

  it("rejects submit for non-existent product", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [
          {
            productId: await createPhantomProductId(t),
            quantity: 5,
            dispatchUom: "piece",
          },
        ],
      })
    ).rejects.toThrow("not found")
  })

  it("rejects submit for archived product", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const productId = await createProduct(t, {
      name: "Archived Product",
      status: "archived",
    })

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [{ productId, quantity: 5, dispatchUom: "piece" }],
      })
    ).rejects.toThrow("archived")
  })

  it("submits a single-item dispatch successfully", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, {
        currentQuantity: 100,
        totalAssetValue: 50000,
      }),
      createSupplier(t),
    ])
    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId,
      quantityReceived: 100,
      quantityRemaining: 100,
      unitCost: 500,
    })

    const result = await t.mutation(api.dispatches.mutations.submit, {
      customerReference: "Walk-in Customer",
      items: [{ productId, quantity: 10, dispatchUom: "piece" }],
    })

    expect(result.dispatchId).toBeDefined()
    expect(result.itemCount).toBe(1)

    // Verify dispatch record
    await t.run(async (ctx) => {
      const dispatch = await ctx.db.get(result.dispatchId)
      expect(dispatch).not.toBeNull()
      expect(dispatch!.customerReference).toBe("Walk-in Customer")
      expect(dispatch!.status).toBe("completed")
    })

    // Verify dispatch item
    await t.run(async (ctx) => {
      const items = await ctx.db
        .query("dispatchItems")
        .filter((q) => q.eq(q.field("dispatchId"), result.dispatchId))
        .collect()
      expect(items).toHaveLength(1)
      expect(items[0].dispatchQuantity).toBe(10)
      expect(items[0].quantityDeducted).toBe(10)
      expect(items[0].dispatchUom).toBe("piece")
      expect(items[0].unitCost).toBe(500)
    })

    // Verify batch deduction
    await t.run(async (ctx) => {
      const batch = await ctx.db.get(batchId)
      expect(batch!.quantityRemaining).toBe(90)
      expect(batch!.status).toBe("active")
    })

    // Verify product deduction
    await t.run(async (ctx) => {
      const product = await ctx.db.get(productId)
      expect(product!.currentQuantity).toBe(90)
      expect(product!.totalAssetValue).toBe(50000 - 10 * 500)
    })

    // Verify audit log
    await t.run(async (ctx) => {
      const logs = await ctx.db.query("auditLogs").collect()
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe("dispatch_submit")
      const description = JSON.parse(logs[0].description)
      expect(description).toMatchObject({
        summary: expect.stringContaining("Walk-in Customer"),
        details: {
          customerReference: "Walk-in Customer",
          totalItems: 1,
          totalBatches: 1,
        },
        changes: expect.objectContaining({}),
      })
    })
  })

  it("submits dispatch without customer reference", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, {
        currentQuantity: 50,
        totalAssetValue: 25000,
      }),
      createSupplier(t),
    ])
    await createBatch(t, {
      productId,
      supplierId,
      userId,
      quantityReceived: 50,
      quantityRemaining: 50,
      unitCost: 500,
    })

    const result = await t.mutation(api.dispatches.mutations.submit, {
      items: [{ productId, quantity: 5, dispatchUom: "piece" }],
    })

    await t.run(async (ctx) => {
      const dispatch = await ctx.db.get(result.dispatchId)
      expect(dispatch!.customerReference).toBeUndefined()
    })
  })

  it("submits multi-item dispatch", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productA, productB] = await Promise.all([
      createProduct(t, {
        name: "Product A",
        currentQuantity: 100,
        totalAssetValue: 100000,
      }),
      createProduct(t, {
        name: "Product B",
        currentQuantity: 50,
        totalAssetValue: 25000,
      }),
    ])
    const supplierId = await createSupplier(t)
    await createBatch(t, {
      productId: productA,
      supplierId,
      userId,
      quantityReceived: 100,
      quantityRemaining: 100,
      unitCost: 1000,
    })
    await createBatch(t, {
      productId: productB,
      supplierId,
      userId,
      quantityReceived: 50,
      quantityRemaining: 50,
      unitCost: 500,
    })

    const result = await t.mutation(api.dispatches.mutations.submit, {
      customerReference: "Bulk Order",
      items: [
        { productId: productA, quantity: 20, dispatchUom: "piece" },
        { productId: productB, quantity: 10, dispatchUom: "piece" },
      ],
    })

    expect(result.itemCount).toBe(2)

    await t.run(async (ctx) => {
      const items = await ctx.db
        .query("dispatchItems")
        .filter((q) => q.eq(q.field("dispatchId"), result.dispatchId))
        .collect()
      expect(items).toHaveLength(2)

      const productAitems = items.filter((i) => i.productId === productA)
      expect(productAitems[0].dispatchQuantity).toBe(20)
      expect(productAitems[0].quantityDeducted).toBe(20)

      const productBitems = items.filter((i) => i.productId === productB)
      expect(productBitems[0].dispatchQuantity).toBe(10)
      expect(productBitems[0].quantityDeducted).toBe(10)
    })
  })

  it("deducts from multiple batches FIFO and depletes exhausted batch", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, {
        currentQuantity: 50,
        totalAssetValue: 40000,
      }),
      createSupplier(t),
    ])

    // First batch (older): 10 units at 500 cost
    const [batch1, batch2] = await Promise.all([
      createBatch(t, {
        productId,
        supplierId,
        userId,
        quantityReceived: 10,
        quantityRemaining: 10,
        unitCost: 500,
      }),
      createBatch(t, {
        productId,
        supplierId,
        userId,
        quantityReceived: 40,
        quantityRemaining: 40,
        unitCost: 1000,
      }),
    ])

    // Dispatch 25 units — should take all 10 from batch1, then 15 from batch2
    const result = await t.mutation(api.dispatches.mutations.submit, {
      items: [{ productId, quantity: 25, dispatchUom: "piece" }],
    })

    await t.run(async (ctx) => {
      const items = await ctx.db
        .query("dispatchItems")
        .filter((q) => q.eq(q.field("dispatchId"), result.dispatchId))
        .order("asc")
        .collect()

      expect(items).toHaveLength(2)

      // First dispatch item: took 10 from batch1
      expect(items[0].batchId).toBe(batch1)
      expect(items[0].quantityDeducted).toBe(10)
      expect(items[0].unitCost).toBe(500)

      // Second dispatch item: took 15 from batch2
      expect(items[1].batchId).toBe(batch2)
      expect(items[1].quantityDeducted).toBe(15)
      expect(items[1].unitCost).toBe(1000)

      // Check batch1 is depleted
      const b1 = await ctx.db.get(batch1)
      expect(b1!.quantityRemaining).toBe(0)
      expect(b1!.status).toBe("depleted")

      // Check batch2 reduced
      const b2 = await ctx.db.get(batch2)
      expect(b2!.quantityRemaining).toBe(25)
      expect(b2!.status).toBe("active")
    })
  })

  it("throws when sack quantity has decimal", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, {
        name: "Cement",
        category: "sacks",
        currentQuantity: 50,
        totalAssetValue: 25000,
      }),
      createSupplier(t),
    ])
    await createBatch(t, {
      productId,
      supplierId,
      userId,
      quantityReceived: 50,
      quantityRemaining: 50,
      unitCost: 500,
    })

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [{ productId, quantity: 1.5, dispatchUom: "piece" }],
      })
    ).rejects.toThrow("whole units")
  })

  it("throws when insufficient stock", async () => {
    const t = makeTest()
    const userId = await createUser(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, {
        currentQuantity: 10,
        totalAssetValue: 5000,
      }),
      createSupplier(t),
    ])
    await createBatch(t, {
      productId,
      supplierId,
      userId,
      quantityReceived: 5,
      quantityRemaining: 5,
      unitCost: 500,
    })

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [{ productId, quantity: 10, dispatchUom: "piece" }],
      })
    ).rejects.toThrow("Insufficient stock")
  })

  it("rejects submit for deactivated user", async () => {
    const t = makeTest()
    const [userId, supplierId, productId] = await Promise.all([
      createUser(t, {
        email: "user@test.com",
        name: "User",
        role: "staff",
        status: "deactivated",
      }),
      createSupplier(t),
      createProduct(t),
    ])
    const ownerId = await createUser(t)
    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      quantityReceived: 5,
      quantityRemaining: 5,
      unitCost: 500,
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(userId)

    await expect(
      t.mutation(api.dispatches.mutations.submit, {
        items: [{ productId, quantity: 1, dispatchUom: "piece" }],
      })
    ).rejects.toThrowError("Account deactivated")
  })
})
