import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
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
