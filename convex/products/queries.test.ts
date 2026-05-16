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
    user: { email: string; name: string; role: "owner" | "staff" }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", user)
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

  it("rejects unauthenticated getById", async () => {
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
      t.query(api.products.queries.getById, { productId: phantomId })
    ).rejects.toThrowError("Unauthorized")
  })

  it("gets product by id for owners", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, { name: "Rice Sack" })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.products.queries.getById, { productId })

    expect(result).toMatchObject({ name: "Rice Sack" })
  })

  it("returns null for non-existent product", async () => {
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

    const result = await t.query(api.products.queries.getById, {
      productId: phantomId,
    })

    expect(result).toBeNull()
  })
})
