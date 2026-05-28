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
  "./stock_adjustments/queries.ts": () => import("./queries"),
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

describe("stock adjustment queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
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
          weightPerUnit: 0,
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

    await expect(
      t.query(api.stock_adjustments.queries.listByDateRange, {
        startMs: 0,
        endMs: Date.now(),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("returns adjustments within date range", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.run(async (ctx) => {
      await ctx.db.insert("stockAdjustments", {
        batchId,
        productId,
        userId: ownerId,
        quantityAdjusted: 10,
        reason: "recount",
        status: "applied",
      })
    })

    const results = await t.query(
      api.stock_adjustments.queries.listByDateRange,
      {
        startMs: 0,
        endMs: Date.now() + 1000,
      }
    )

    expect(results).toHaveLength(1)
    expect(results[0].productName).toBe("Test Product")
    expect(results[0].batchCode).toBe("BAT-TEST")
    expect(results[0].userName).toBe("Owner")
    expect(results[0].quantityAdjusted).toBe(10)
  })

  it("excludes adjustments outside date range", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.run(async (ctx) => {
      await ctx.db.insert("stockAdjustments", {
        batchId,
        productId,
        userId: ownerId,
        quantityAdjusted: 10,
        reason: "recount",
        status: "applied",
      })
    })

    const results = await t.query(
      api.stock_adjustments.queries.listByDateRange,
      {
        startMs: Date.now() + 10000,
        endMs: Date.now() + 20000,
      }
    )

    expect(results).toHaveLength(0)
  })

  it("filters by createdByUserId", async () => {
    const t = makeTest()
    const [ownerId, staffId] = await Promise.all([
      createOwner(t),
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "staff@test.com",
          name: "Staff",
          role: "staff",
          status: "active",
        })
      }),
    ])
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const { batchId, productId } = await seedData(t, ownerId)

    await t.run(async (ctx) => {
      await Promise.all([
        ctx.db.insert("stockAdjustments", {
          batchId,
          productId,
          userId: ownerId,
          quantityAdjusted: 10,
          reason: "recount",
          status: "applied",
        }),
        ctx.db.insert("stockAdjustments", {
          batchId,
          productId,
          userId: staffId,
          quantityAdjusted: 5,
          reason: "damaged",
          status: "applied",
        }),
      ])
    })

    const results = await t.query(
      api.stock_adjustments.queries.listByDateRange,
      {
        startMs: 0,
        endMs: Date.now() + 1000,
        createdByUserId: ownerId,
      }
    )

    expect(results).toHaveLength(1)
    expect(results[0].userName).toBe("Owner")
  })

  it("returns empty array for no adjustments", async () => {
    const t = makeTest()
    const ownerId = await createOwner(t)
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const results = await t.query(
      api.stock_adjustments.queries.listByDateRange,
      {
        startMs: 0,
        endMs: Date.now(),
      }
    )

    expect(results).toHaveLength(0)
  })
})
