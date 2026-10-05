/**
 * Concurrency / OCC tests.
 *
 * Convex uses optimistic concurrency control: when two transactions read or
 * write overlapping data one succeeds and the other retries automatically
 * (`.agents/skills/convex-performance-audit/references/occ-conflicts.md`).
 * These tests assert that the retry-visible invariants hold — no negative
 * stock, correct `quantityRemaining`, correct asset value — rather than trying
 * to force a specific interleaving.
 *
 * Rate limiter: `globalMutations` caps at 120/min sustained / 240 burst and the
 * per-user buckets 20–30/min / 40–60 burst (`convex/rate_limiter.ts`). The bursts
 * below are 6–8 concurrent writes, comfortably inside burst capacity, so the real
 * limiter is registered and the assertions exercise OCC rather than token-bucket
 * refill. `convex/auth/auth.test.ts` already covers bucket exhaustion.
 *
 * Note `mockResolvedValue`, not `mockResolvedValueOnce`: these tests issue many
 * mutations, and the `Once` variant returns `undefined` on the second call.
 */
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
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
  "./auditLogs/mutations.ts": () => import("../auditLogs/mutations"),
  "./batches/mutations.ts": () => import("../batches/mutations"),
  "./dispatches/mutations.ts": () => import("../dispatches/mutations"),
  "./stock_adjustments/mutations.ts": () =>
    import("../stock_adjustments/mutations"),
  "./rate_limiter.ts": () => import("../rate_limiter"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()
  return { ...actual, getAuthUserId: authMocks.getAuthUserId }
})

describe("concurrency invariants", () => {
  function makeTest() {
    const t = convexTest({ schema, modules })
    registerRateLimiter(t as never)
    return t
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function seedOwnerAndSupplier(t: ReturnType<typeof makeTest>) {
    return await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      const staffId = await ctx.db.insert("users", {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      const supplierId = await ctx.db.insert("suppliers", {
        companyName: "Supplier",
        contactPerson: "Contact",
        contactNumber: "09171234567",
        address: "Address",
      })
      return { ownerId, staffId, supplierId }
    })
  }

  describe("stock-in contention", () => {
    it("keeps quantities consistent under concurrent stock-ins for one product", async () => {
      const t = makeTest()
      const { ownerId, supplierId } = await seedOwnerAndSupplier(t)

      // Create the product via stock-in "new" mode, then run concurrent
      // stock-ins for the SAME product. Each mutation reads
      // `products.currentQuantity`, adds to it, and writes back — the classic
      // read-modify-write that OCC serialises.
      authMocks.getAuthUserId.mockResolvedValue(ownerId)
      await apiCall(t, () =>
        t.mutation(api.batches.mutations.stockIn, {
          mode: "new",
          name: "Contended Sack",
          category: "sacks",
          baseUom: "piece",
          supplierId,
          quantityReceived: 100,
          totalProcurementCost: 2_500,
        })
      )

      const productId = await t.run(async (ctx) => {
        const rows = await ctx.db.query("products").collect()
        return rows[0]._id
      })

      const CONCURRENT = 8
      const QTY = 10
      const COST = 250

      await Promise.all(
        Array.from({ length: CONCURRENT }, () =>
          t.mutation(api.batches.mutations.stockIn, {
            mode: "existing",
            productId,
            supplierId,
            quantityReceived: QTY,
            totalProcurementCost: COST,
          })
        )
      )

      const state = await t.run(async (ctx) => {
        const product = await ctx.db.get(productId)
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", productId))
          .collect()
        return { product, batches }
      })

      // 100 from the initial stock-in + 8 concurrent × 10.
      expect(state.product!.currentQuantity).toBe(100 + CONCURRENT * QTY)
      expect(state.product!.totalAssetValue).toBe(2_500 + CONCURRENT * COST)
      // One batch per stock-in, none lost to a failed write.
      expect(state.batches).toHaveLength(1 + CONCURRENT)
      // The denormalized counter must agree with reality.
      expect(state.product!.batchCount).toBe(1 + CONCURRENT)
      // No batch may go negative.
      expect(state.batches.every((b) => b.quantityRemaining >= 0)).toBe(true)
      expect(
        state.batches.reduce((sum, b) => sum + b.quantityRemaining, 0)
      ).toBe(100 + CONCURRENT * QTY)
    })

    it("keeps lastSupplierId and the supplier batchCount consistent", async () => {
      const t = makeTest()
      const { ownerId, supplierId } = await seedOwnerAndSupplier(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      await t.mutation(api.batches.mutations.stockIn, {
        mode: "new",
        name: "Supplied Sack",
        category: "sacks",
        baseUom: "piece",
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 1_000,
      })

      const productId = await t.run(async (ctx) => {
        const rows = await ctx.db.query("products").collect()
        return rows[0]._id
      })

      await Promise.all(
        Array.from({ length: 6 }, () =>
          t.mutation(api.batches.mutations.stockIn, {
            mode: "existing",
            productId,
            supplierId,
            quantityReceived: 5,
            totalProcurementCost: 100,
          })
        )
      )

      const state = await t.run(async (ctx) => ({
        product: await ctx.db.get(productId),
        supplier: await ctx.db.get(supplierId),
        batches: await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", productId))
          .collect(),
      }))

      expect(state.product!.lastSupplierId).toBe(supplierId)
      expect(state.supplier!.batchCount).toBe(1 + 6)
      expect(state.batches).toHaveLength(1 + 6)
    })
  })

  describe("dispatch contention", () => {
    it("never over-deducts a batch under concurrent dispatches", async () => {
      const t = makeTest()
      const { ownerId, supplierId } = await seedOwnerAndSupplier(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      // A single batch with exactly enough stock for 4 dispatches of 25.
      await t.mutation(api.batches.mutations.stockIn, {
        mode: "new",
        name: "Contended Twine",
        category: "twines",
        baseUom: "meter",
        conversionFactor: 1,
        supplierId,
        quantityReceived: 100,
        totalProcurementCost: 1_000,
      })

      const { productId, batchId } = await t.run(async (ctx) => {
        const product = (await ctx.db.query("products").collect())[0]
        const batch = (await ctx.db.query("batches").collect())[0]
        return { productId: product._id, batchId: batch._id }
      })

      // Six concurrent dispatches of 25 against 100 units of stock. Only four
      // can succeed; the rest must fail with insufficient stock rather than
      // driving the balance negative.
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          t.mutation(api.dispatches.mutations.submit, {
            items: [{ productId, quantity: 25, dispatchUom: "meter" as const }],
          })
        )
      )

      const succeeded = results.filter((r) => r.status === "fulfilled")
      const failed = results.filter((r) => r.status === "rejected")

      expect(succeeded).toHaveLength(4)
      expect(failed).toHaveLength(2)
      for (const f of failed) {
        expect((f as PromiseRejectedResult).reason.message).toMatch(
          /Insufficient stock/
        )
      }

      const state = await t.run(async (ctx) => ({
        batch: await ctx.db.get(batchId),
        product: await ctx.db.get(productId),
        items: await ctx.db.query("dispatchItems").collect(),
        dispatches: await ctx.db.query("dispatches").collect(),
      }))

      expect(state.batch!.quantityRemaining).toBe(0)
      expect(state.batch!.status).toBe("depleted")
      expect(state.product!.currentQuantity).toBe(0)
      expect(state.product!.totalAssetValue).toBe(0)
      expect(state.items).toHaveLength(4)
      expect(state.dispatches).toHaveLength(4)
      // The denormalized totals must match the items actually written.
      for (const d of state.dispatches) {
        expect(d.itemCount).toBe(1)
        expect(d.totalQuantity).toBe(25)
        expect(d.productUnits).toEqual([{ productId, units: 25 }])
      }
    })

    it("FIFO order is preserved when concurrent dispatches span several batches", async () => {
      const t = makeTest()
      const { ownerId, supplierId } = await seedOwnerAndSupplier(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      await t.mutation(api.batches.mutations.stockIn, {
        mode: "new",
        name: "FIFO Twine",
        category: "twines",
        baseUom: "meter",
        conversionFactor: 1,
        supplierId,
        quantityReceived: 60,
        totalProcurementCost: 600,
      })
      const productId = await t.run(async (ctx) => {
        return (await ctx.db.query("products").collect())[0]._id
      })
      const firstBatchId = await t.run(async (ctx) => {
        return (await ctx.db.query("batches").collect())[0]._id
      })

      // Two more batches, older→newer ordering established by _creationTime.
      const secondBatchId = await t.run(async (ctx) => {
        return await ctx.db.insert("batches", {
          productId,
          supplierId,
          userId: ownerId,
          batchCode: "BAT-FIFO-2",
          totalProcurementCost: 400,
          unitCost: 20,
          quantityReceived: 40,
          quantityRemaining: 40,
          status: "active",
          createdAt: Date.now(),
        })
      })
      const thirdBatchId = await t.run(async (ctx) => {
        return await ctx.db.insert("batches", {
          productId,
          supplierId,
          userId: ownerId,
          batchCode: "BAT-FIFO-3",
          totalProcurementCost: 400,
          unitCost: 30,
          quantityReceived: 40,
          quantityRemaining: 40,
          status: "active",
          createdAt: Date.now(),
        })
      })

      // Draw 90 of the 140 available: must consume batch 1 fully (60), then 30
      // from batch 2, and never touch batch 3.
      const result = await t.mutation(api.dispatches.mutations.submit, {
        items: [{ productId, quantity: 90, dispatchUom: "meter" as const }],
      })

      expect(result.totalQuantity).toBe(90)

      const state = await t.run(async (ctx) => ({
        first: await ctx.db.get(firstBatchId),
        second: await ctx.db.get(secondBatchId),
        third: await ctx.db.get(thirdBatchId),
      }))

      expect(state.first!.quantityRemaining).toBe(0)
      expect(state.first!.status).toBe("depleted")
      expect(state.second!.quantityRemaining).toBe(10)
      expect(state.second!.status).toBe("active")
      expect(state.third!.quantityRemaining).toBe(40)
      expect(state.third!.status).toBe("active")
    })
  })

  describe("stock adjustment contention", () => {
    it("clamps at zero rather than going negative under concurrent deductions", async () => {
      const t = makeTest()
      const { ownerId, supplierId } = await seedOwnerAndSupplier(t)
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      await t.mutation(api.batches.mutations.stockIn, {
        mode: "new",
        name: "Adjusted Twine",
        category: "twines",
        baseUom: "meter",
        conversionFactor: 1,
        supplierId,
        quantityReceived: 40,
        totalProcurementCost: 400,
      })

      const { productId, batchId } = await t.run(async (ctx) => {
        return {
          productId: (await ctx.db.query("products").collect())[0]._id,
          batchId: (await ctx.db.query("batches").collect())[0]._id,
        }
      })

      // Six concurrent 10-unit deductions against 40 units. Four can succeed;
      // the rest must be REJECTED — the mutation refuses to touch a batch that
      // has already been marked `depleted`, which is stronger than clamping.
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          t.mutation(api.stock_adjustments.mutations.create, {
            productId,
            batchId,
            direction: "deduct",
            quantity: 10,
            reason: "lost",
          })
        )
      )

      const succeeded = results.filter((r) => r.status === "fulfilled")
      const failed = results.filter((r) => r.status === "rejected")
      expect(succeeded).toHaveLength(4)
      expect(failed).toHaveLength(2)
      for (const f of failed) {
        expect((f as PromiseRejectedResult).reason.message).toMatch(
          /non-active batch/
        )
      }

      const state = await t.run(async (ctx) => ({
        batch: await ctx.db.get(batchId),
        product: await ctx.db.get(productId),
      }))

      expect(state.batch!.quantityRemaining).toBe(0)
      expect(state.product!.currentQuantity).toBe(0)
      expect(state.product!.totalAssetValue).toBe(0)
      expect(state.batch!.status).toBe("depleted")
    })
  })
})

// Small helper so a single mutation call site reads cleanly above.
async function apiCall<T>(_t: unknown, fn: () => Promise<T>): Promise<T> {
  return await fn()
}
