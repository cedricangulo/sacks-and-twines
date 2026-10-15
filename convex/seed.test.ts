import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { DENSE_DAYS, SEED_DATE_END } from "./lib/constants"
import schema from "./schema"

const SLOW = { timeout: 60_000 }

const modules = {
  "./_generated/api.ts": () => import("./_generated/api"),
  "./_generated/server.ts": () => import("./_generated/server"),
  "./lib/constants.ts": () => import("./lib/constants"),
  "./lib/orNumber.ts": () => import("./lib/orNumber"),
  "./seed.ts": () => import("./seed"),
}

function makeTest() {
  return convexTest({ schema, modules })
}

type TestInstance = ReturnType<typeof makeTest>

async function createUsers(t: TestInstance) {
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
    const deactivatedStaffId = await ctx.db.insert("users", {
      email: "deactivated@test.com",
      name: "Deactivated Staff",
      role: "staff",
      status: "deactivated",
    })
    return { ownerId, staffId, deactivatedStaffId }
  })
}

/**
 * For every product, asserts that the denormalized `batchCount` equals the
 * real number of batches for that product. Uses `?? 0` so a product with zero
 * batches (no patch applied) is functionally 0, matching the fallback path in
 * `getEditDetail`. Counts all batch statuses, because `batchCount` means
 * "total batches ever", not "active batches".
 */
async function assertBatchCountsMatch(t: TestInstance) {
  await t.run(async (ctx) => {
    const products = await ctx.db.query("products").collect()
    expect(products.length).toBeGreaterThan(0)

    for (const product of products) {
      const batches = await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect()

      const expected = batches.length
      const got = product.batchCount ?? 0
      expect(got, `batchCount for ${product.name}`).toBe(expected)

      if (expected > 0) {
        expect(got).toBeGreaterThanOrEqual(1)
      }
    }
  })
}

describe("seed writeBase", () => {
  it("sets products.batchCount to the actual batch count", SLOW, async () => {
    const t = makeTest()
    const { ownerId, staffId } = await createUsers(t)

    await t.mutation(internal.seed.writeBase, {
      ownerId,
      staffId,
    })

    await assertBatchCountsMatch(t)
  })
})

describe("seed writeTest", () => {
  it(
    "sets products.batchCount counting depleted and voided batches",
    SLOW,
    async () => {
      const t = makeTest()
      const { ownerId, staffId, deactivatedStaffId } = await createUsers(t)

      await t.mutation(internal.seed.writeTest, {
        ownerId,
        staffId,
        deactivatedStaffId,
      })

      await assertBatchCountsMatch(t)
    }
  )

  it(
    "counts the depleted and voided fixture batches for their products",
    SLOW,
    async () => {
      const t = makeTest()
      const { ownerId, staffId, deactivatedStaffId } = await createUsers(t)

      await t.mutation(internal.seed.writeTest, {
        ownerId,
        staffId,
        deactivatedStaffId,
      })

      await t.run(async (ctx) => {
        const fixtures = await ctx.db.query("batches").collect()
        const productIdByCode = new Map<string, Id<"products">>()
        for (const batch of fixtures) {
          if (batch.status === "depleted" || batch.status === "voided") {
            productIdByCode.set(batch.batchCode, batch.productId)
          }
        }

        const products = await ctx.db.query("products").collect()
        const productById = new Map(products.map((p) => [p._id, p]))

        for (const [batchCode, productId] of productIdByCode) {
          const product = productById.get(productId)
          expect(product, `product for ${batchCode}`).toBeDefined()
          if (!product) continue

          const allBatches = await ctx.db
            .query("batches")
            .withIndex("by_product", (q) => q.eq("productId", productId))
            .collect()

          expect(product.batchCount ?? 0, `${batchCode} product count`).toBe(
            allBatches.length
          )
          expect(product.batchCount ?? 0).toBeGreaterThanOrEqual(3)
        }
      })
    }
  )
})

describe("seed writeBase demo fixtures", () => {
  it(
    "seeds an archived supplier with zero batches plus voided and drain-role batches",
    SLOW,
    async () => {
      const t = makeTest()
      const { ownerId, staffId } = await createUsers(t)

      await t.mutation(internal.seed.writeBase, {
        ownerId,
        staffId,
      })

      await t.run(async (ctx) => {
        const suppliers = await ctx.db.query("suppliers").collect()
        expect(suppliers).toHaveLength(4)

        const archived = suppliers.filter((s) => s.archivedAt !== undefined)
        expect(archived).toHaveLength(1)
        for (const s of archived) {
          const batches = await ctx.db
            .query("batches")
            .withIndex("by_supplier", (q) => q.eq("supplierId", s._id))
            .collect()
          // Production archive blocks suppliers with batch records.
          expect(batches).toHaveLength(0)
        }

        const products = await ctx.db.query("products").collect()
        expect(products).toHaveLength(11)
        // Nothing archived yet — archiving happens in writeEdgeCases.
        expect(products.filter((p) => p.status === "archived")).toHaveLength(0)

        const batches = await ctx.db.query("batches").collect()
        const voided = batches.filter((b) => b.status === "voided")
        expect(voided).toHaveLength(1)
        // Voided fixture keeps its full stock and was never consumed.
        expect(voided[0].quantityRemaining).toBe(voided[0].quantityReceived)
        const voidedItems = await ctx.db
          .query("dispatchItems")
          .withIndex("by_batch", (q) => q.eq("batchId", voided[0]._id))
          .collect()
        expect(voidedItems).toHaveLength(0)

        const productById = new Map(products.map((p) => [p._id, p]))
        for (const name of ["Red bag", "Sand bag"]) {
          const product = products.find((p) => p.name === name)
          expect(product, name).toBeDefined()
          if (!product) continue
          const mine = batches.filter((b) => b.productId === product._id)
          expect(mine.length).toBeGreaterThanOrEqual(6)
          for (const b of mine) {
            // Drain-role batches are tiny so ~2k dispatches consume them.
            expect(b.quantityReceived).toBeLessThanOrEqual(200)
          }
          expect(productById.get(product._id)?.status).toBe("active")
        }
      })
    }
  )
})

describe("seed writeEdgeCases", () => {
  it(
    "archives one product and restocks the low-stock product below threshold",
    SLOW,
    async () => {
      const t = makeTest()
      const { ownerId } = await createUsers(t)

      const { archivedId, redId, sandId } = await t.run(async (ctx) => {
        const supplierId = await ctx.db.insert("suppliers", {
          companyName: "Test Supplier",
          contactPerson: "Test",
          contactNumber: "0900-000-0000",
          address: "Test",
        })
        const archivedId = await ctx.db.insert("products", {
          skuCode: "SKU-TEST-0001",
          name: "Assorted Sack",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 50,
          currentQuantity: 500,
          totalAssetValue: 25000,
          lowStockThreshold: 100,
          status: "active",
          batchCount: 1,
        })
        const redId = await ctx.db.insert("products", {
          skuCode: "SKU-TEST-0002",
          name: "Red bag",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 50,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: 100,
          status: "active",
          batchCount: 1,
        })
        const sandId = await ctx.db.insert("products", {
          skuCode: "SKU-TEST-0003",
          name: "Sand bag",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 50,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: 100,
          status: "active",
          batchCount: 1,
        })
        const redBatch = await ctx.db.insert("batches", {
          productId: redId,
          supplierId,
          userId: ownerId,
          batchCode: "BAT-TEST-0001",
          totalProcurementCost: 5000,
          unitCost: 50,
          quantityReceived: 100,
          quantityRemaining: 0,
          status: "depleted",
          createdAt: Date.now(),
        })
        const sandBatch = await ctx.db.insert("batches", {
          productId: sandId,
          supplierId,
          userId: ownerId,
          batchCode: "BAT-TEST-0002",
          totalProcurementCost: 5000,
          unitCost: 50,
          quantityReceived: 100,
          quantityRemaining: 0,
          status: "depleted",
          createdAt: Date.now(),
        })
        return {
          archivedId,
          redId,
          sandId,
          supplierId,
          redBatch,
          sandBatch,
        }
      })

      const plan = await t.run(async (ctx) => {
        const redBatches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", redId))
          .collect()
        const sandBatches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", sandId))
          .collect()
        return {
          products: [
            { id: archivedId, name: "Assorted Sack", baseUom: "piece" },
            { id: redId, name: "Red bag", baseUom: "piece" },
            { id: sandId, name: "Sand bag", baseUom: "piece" },
          ],
          batches: [...redBatches, ...sandBatches].map((b) => ({
            id: b._id,
            productId: b.productId,
            unitCost: b.unitCost,
            baseUom: "piece",
            batchCode: b.batchCode,
            createdDate: b.createdAt ?? Date.now(),
            quantityRemaining: b.quantityRemaining,
            status: b.status,
          })),
        }
      })

      await t.mutation(internal.seed.writeEdgeCases, {
        plan,
        ownerId,
      } as never)

      await t.run(async (ctx) => {
        const archived = await ctx.db.get(archivedId)
        expect(archived?.status).toBe("archived")
        const archiveLogs = await ctx.db
          .query("auditLogs")
          .withIndex("by_action", (q) => q.eq("action", "product_archive"))
          .collect()
        expect(archiveLogs.length).toBeGreaterThanOrEqual(1)

        // Restock lands just under the threshold: 100 - 10 = 90.
        const sand = await ctx.db.get(sandId)
        expect(sand?.currentQuantity).toBe(90)
        expect(sand?.status).toBe("active")
        const sandBatches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", sandId))
          .collect()
        const restock = sandBatches.filter((b) => b.status === "active")
        expect(restock).toHaveLength(1)
        expect(restock[0].quantityRemaining).toBe(90)

        // Already-drained product is untouched — no fallback adjustment.
        const redAdjustments = await ctx.db.query("stockAdjustments").collect()
        expect(
          redAdjustments.filter((a) => a.productId === redId)
        ).toHaveLength(0)
      })
    }
  )
})

describe("seed dense window", () => {
  it(
    "caps dispatch dates at the static end date and never touches the voided batch",
    SLOW,
    async () => {
      const t = makeTest()
      const { ownerId, staffId } = await createUsers(t)

      const base = await t.mutation(internal.seed.writeBase, {
        ownerId,
        staffId,
      })
      const voidedBatch = base.batches.find((b) => b.status === "voided")
      expect(voidedBatch).toBeDefined()

      await t.mutation(internal.seed.writeDispatchChunk, {
        plan: { products: base.products, batches: base.batches },
        userIds: [ownerId, staffId],
        userNameMap: { [ownerId]: "Owner", [staffId]: "Staff" },
        // Last dense day: must land on today's PHT calendar day.
        startDayIndex: DENSE_DAYS - 1,
        dayCount: 1,
      })

      await t.run(async (ctx) => {
        const offset = 8 * 60 * 60 * 1000
        const phtDay = (ms: number): string => {
          const d = new Date(ms + offset)
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
        }
        // Static seed end-date: last dense day must land on its PHT day.
        const endDay = phtDay(
          new Date(`${SEED_DATE_END}T00:00:00+08:00`).getTime()
        )

        const dispatches = await ctx.db.query("dispatches").collect()
        expect(dispatches.length).toBeGreaterThan(0)
        for (const d of dispatches) {
          // Completed shape: every stored dispatch counts, no voided state.
          expect(d.itemCount).toBeGreaterThan(0)
          expect(phtDay(d.createdAt ?? 0)).toBe(endDay)
        }

        if (voidedBatch) {
          const items = await ctx.db
            .query("dispatchItems")
            .withIndex("by_batch", (q) => q.eq("batchId", voidedBatch.id))
            .collect()
          expect(items).toHaveLength(0)
        }
      })
    }
  )
})
