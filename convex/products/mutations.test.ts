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
  "./products/queries.ts": () => import("./queries"),
  "./products/mutations.ts": () => import("./mutations"),
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

describe("product mutations", () => {
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

  // ── Create ────────────────────────────────────────────────

  it("rejects unauthenticated creation", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.products.mutations.create, {
        name: "Test Product",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects creation for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(
      t.mutation(api.products.mutations.create, {
        name: "Test Product",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Only owners can create products")
  })

  it("rejects creation with duplicate name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await t.mutation(api.products.mutations.create, {
      name: "Duplicate Product",
      category: "sacks",
      baseUom: "piece",
    })

    await expect(
      t.mutation(api.products.mutations.create, {
        name: "Duplicate Product",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("A product with this name already exists")
  })

  it("creates a product with auto-generated SKU", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.mutation(api.products.mutations.create, {
      name: "New Product",
      category: "twines",
      baseUom: "roll",
      weightPerUnit: 20,
      lowStockThreshold: 5,
    })

    expect(productId).toBeTruthy()

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(product).toMatchObject({
      name: "New Product",
      category: "twines",
      baseUom: "roll",
      weightPerUnit: 20,
      currentQuantity: 0,
      totalAssetValue: 0,
      lowStockThreshold: 5,
      status: "active",
    })
    expect(product?.skuCode).toMatch(/^SKU-\d{8}-\d{4}$/)
  })

  // ── Update ────────────────────────────────────────────────

  it("rejects unauthenticated update", async () => {
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
      t.mutation(api.products.mutations.update, {
        productId: phantomId,
        name: "Updated",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects update for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)
    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU-001",
        name: "Old Name",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.update, {
        productId,
        name: "New Name",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Only owners can update products")
  })

  it("updates product name and category", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU-001",
        name: "Old Product",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 100,
        totalAssetValue: 50000,
        lowStockThreshold: 10,
        status: "active",
      })
    })

    await t.mutation(api.products.mutations.update, {
      productId,
      name: "Updated Product",
      category: "twines",
      baseUom: "roll",
      weightPerUnit: 20,
      lowStockThreshold: 5,
    })

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(updated).toMatchObject({
      name: "Updated Product",
      category: "twines",
      baseUom: "roll",
      weightPerUnit: 20,
      currentQuantity: 100,
      totalAssetValue: 50000,
      lowStockThreshold: 5,
    })
  })

  it("rejects update with duplicate name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await t.run(async (ctx) => {
      await ctx.db.insert("products", {
        skuCode: "SKU-001",
        name: "Product A",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })
    const productBId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU-002",
        name: "Product B",
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.update, {
        productId: productBId,
        name: "Product A",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("A product with this name already exists")
  })
})
