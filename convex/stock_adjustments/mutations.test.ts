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
  "./products/queries.ts": () => import("../products/queries"),
  "./stock_adjustments/mutations.ts": () => import("./mutations"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("stock adjustment mutations", () => {
  function makeTest() {
    const t = convexTest({ schema, modules })
    registerRateLimiter(t as never)
    return t
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function createOwner(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
    })
  }

  async function seedData(t: ReturnType<typeof convexTest>, ownerId: string) {
    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-TEST",
          name: "Test Product",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 0,
          currentQuantity: 100,
          totalAssetValue: 50000,
          lowStockThreshold: 10,
          status: "active",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Test Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    const batchId = await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-TEST",
        totalProcurementCost: 50000,
        unitCost: 500,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    return { productId, supplierId, batchId }
  }

  it("rejects unauthenticated request", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const ownerId = await createOwner(t)
    const { batchId, productId } = await seedData(t, ownerId)

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects non-owners", async () => {
    const t = makeTest()
    const staffId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    const ownerId = await createOwner(t)
    const { batchId, productId } = await seedData(t, ownerId)

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Only owners can adjust stock")
  })

  it("rejects non-existent batch", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const { productId, supplierId } = await seedData(t, ownerId)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "TEMP",
        totalProcurementCost: 0,
        unitCost: 0,
        quantityReceived: 0,
        quantityRemaining: 0,
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId: phantomId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Batch not found")
  })

  it("rejects non-active batch", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-DEP",
          name: "Depleted",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 0,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: 0,
          status: "active",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    const batchId = await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-DEP",
        totalProcurementCost: 0,
        unitCost: 0,
        quantityReceived: 0,
        quantityRemaining: 0,
        status: "depleted",
      })
    })

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Cannot adjust stock on a non-active batch")
  })

  it("rejects archived product", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-ARCH",
          name: "Archived",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 0,
          currentQuantity: 50,
          totalAssetValue: 25000,
          lowStockThreshold: 5,
          status: "archived",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Supplier",
          contactPerson: "Contact",
          contactNumber: "09171234567",
          address: "Address",
        })
      }),
    ])

    const batchId = await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-ARCH",
        totalProcurementCost: 25000,
        unitCost: 500,
        quantityReceived: 50,
        quantityRemaining: 50,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Cannot adjust stock on an archived product")
  })

  it("adds stock via adjustment and updates batch quantity", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.mutation(api.stock_adjustments.mutations.create, {
      batchId,
      productId,
      direction: "add",
      quantity: 25,
      reason: "recount",
    })

    const [product, batch] = await t.run(async (ctx) => {
      return [await ctx.db.get(productId), await ctx.db.get(batchId)]
    })

    expect(product?.currentQuantity).toBe(125)
    expect(product?.totalAssetValue).toBe(50000 + 25 * 500)
    expect(batch?.quantityRemaining).toBe(125)
    expect(batch?.status).toBe("active")
  })

  it("deducts stock via adjustment and updates batch quantity", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.mutation(api.stock_adjustments.mutations.create, {
      batchId,
      productId,
      direction: "deduct",
      quantity: 30,
      reason: "damaged",
    })

    const [product, batch] = await t.run(async (ctx) => {
      return [await ctx.db.get(productId), await ctx.db.get(batchId)]
    })

    expect(product?.currentQuantity).toBe(70)
    expect(product?.totalAssetValue).toBe(50000 - 30 * 500)
    expect(batch?.quantityRemaining).toBe(70)
    expect(batch?.status).toBe("active")
  })

  it("marks batch as depleted when deduction reaches zero", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.mutation(api.stock_adjustments.mutations.create, {
      batchId,
      productId,
      direction: "deduct",
      quantity: 100,
      reason: "lost",
    })

    const [product, batch] = await t.run(async (ctx) => {
      return [await ctx.db.get(productId), await ctx.db.get(batchId)]
    })

    expect(product?.currentQuantity).toBe(0)
    expect(product?.totalAssetValue).toBe(0)
    expect(batch?.quantityRemaining).toBe(0)
    expect(batch?.status).toBe("depleted")
  })

  it("clamps deduction to zero and marks batch depleted on over-deduct", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.mutation(api.stock_adjustments.mutations.create, {
      batchId,
      productId,
      direction: "deduct",
      quantity: 999,
      reason: "lost",
    })

    const [product, batch] = await t.run(async (ctx) => {
      return [await ctx.db.get(productId), await ctx.db.get(batchId)]
    })

    expect(product?.currentQuantity).toBe(0)
    expect(product?.totalAssetValue).toBe(0)
    expect(batch?.quantityRemaining).toBe(0)
    expect(batch?.status).toBe("depleted")
  })

  it("creates an audit log entry on adjustment", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.mutation(api.stock_adjustments.mutations.create, {
      batchId,
      productId,
      direction: "add",
      quantity: 15,
      reason: "system_reversal",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "stock_adjustment"))
        .collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("stock_adjustment")
    const description = JSON.parse(logs[0].description)
    expect(description).toMatchObject({
      summary: "Stock added to Test Product (system_reversal)",
      details: {
        productName: "Test Product",
        quantityAdjusted: 15,
        reason: "system_reversal",
        direction: "add",
      },
      changes: {
        qty_remaining: { old: 100, new: 115 },
      },
    })
  })

  it("rejects stock adjustment for deactivated owner", async () => {
    const t = makeTest()
    const ownerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "deactivated",
      })
    })
    const { batchId, productId } = await seedData(t, ownerId)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.stock_adjustments.mutations.create, {
        batchId,
        productId,
        direction: "add",
        quantity: 10,
        reason: "recount",
      })
    ).rejects.toThrowError("Only owners can adjust stock")
  })
})
