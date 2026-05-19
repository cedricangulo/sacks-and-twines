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
  "./dispatches/queries.ts": () => import("./queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("dispatch queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  // ── Helpers ─────────────────────────────────────────────

  async function seedData(t: ReturnType<typeof convexTest>) {
    const [userA, userB] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "alice@test.com",
          name: "Alice",
          role: "owner",
          status: "active",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "bob@test.com",
          name: "Bob",
          role: "staff",
          status: "active",
        })
      }),
    ])

    const dispatchIds = await Promise.all(
      Array.from({ length: 5 }, (_, i) => {
        const userId = i % 2 === 0 ? userA : userB
        return t.run(async (ctx) => {
          return await ctx.db.insert("dispatches", {
            userId,
            customerReference: i === 0 ? "Walk-in" : undefined,
            status: i === 4 ? "voided" : "completed",
            createdAt: Date.now(),
          })
        })
      })
    )

    return { userA, userB, dispatchIds }
  }

  // ── list ────────────────────────────────────────────────

  it("rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.dispatches.queries.list, {
        startMs: 0,
        endMs: 9999999999999,
      })
    ).rejects.toThrow("Unauthorized")
  })

  it("returns dispatches within the given time window", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    // Wide range should return all 5
    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: Date.now() + 86_400_000,
    })

    expect(result).toHaveLength(5)
  })

  it("excludes dispatches outside the time window", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    // Range entirely before any document could exist
    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 1,
    })

    expect(result).toHaveLength(0)
  })

  it("returns dispatches in desc creation order", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 9999999999999,
    })

    expect(result).toHaveLength(5)

    const timestamps = result.map((d) => d._creationTime)
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1])
    }
  })

  it("joins user name", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 9999999999999,
    })

    expect(result[0].userName).toBe("Alice")
  })

  it("filters by createdByUserId", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 9999999999999,
      createdByUserId: userA,
    })

    // Only userA's dispatches (indices 0, 2, 4)
    expect(result).toHaveLength(3)
    for (const dispatch of result) {
      expect(dispatch.userId).toBe(userA)
    }
  })

  it("returns empty when filtering by user with no dispatches", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    const fakeUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "carol@test.com",
        name: "Carol",
        role: "staff",
        status: "active",
      })
    })

    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 9999999999999,
      createdByUserId: fakeUserId,
    })

    expect(result).toHaveLength(0)
  })

  // ── getItemsByDispatch ──────────────────────────────────

  it("getItemsByDispatch returns items with joined data", async () => {
    const t = makeTest()
    const { userA } = await seedData(t)
    authMocks.getAuthUserId.mockResolvedValueOnce(userA)

    const result = await t.query(api.dispatches.queries.list, {
      startMs: 0,
      endMs: 9999999999999,
    })
    const dispatchId = result[0]._id

    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-TEST-001",
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
          contactPerson: "John",
          contactNumber: "09170000000",
          address: "Test Address",
        })
      }),
    ])

    const batchId = await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: userA,
        batchCode: "BATCH-001",
        totalProcurementCost: 5000,
        unitCost: 500,
        quantityReceived: 10,
        quantityRemaining: 5,
        status: "active",
      })
    })

    const itemId = await t.run(async (ctx) => {
      return await ctx.db.insert("dispatchItems", {
        dispatchId,
        batchId,
        productId,
        dispatchUom: "piece",
        dispatchQuantity: 5,
        quantityDeducted: 5,
        unitCost: 500,
      })
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(userA)
    const items = await t.query(api.dispatches.queries.getItemsByDispatch, {
      dispatchId,
    })

    expect(items).toHaveLength(1)
    expect(items[0]._id).toBe(itemId)
    expect(items[0].productName).toBe("Test Product")
    expect(items[0].productSku).toBe("SKU-TEST-001")
    expect(items[0].batchCode).toBe("BATCH-001")
    expect(items[0].lineTotal).toBe(2500)
  })
})
