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
    ).rejects.toThrowError("Only owners can perform this action")
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
      conversionFactor: 20,
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
      conversionFactor: 20,
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
        conversionFactor: 0,
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
        conversionFactor: 0,
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
    ).rejects.toThrowError("Only owners can perform this action")
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
        conversionFactor: 0,
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
      conversionFactor: 20,
      lowStockThreshold: 5,
    })

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(updated).toMatchObject({
      name: "Updated Product",
      category: "twines",
      baseUom: "roll",
      conversionFactor: 20,
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
        conversionFactor: 0,
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
        conversionFactor: 0,
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

  it("rejects category change when product has existing batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-LOCK",
          name: "Locked Product",
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

    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BAT-LOCK",
        totalProcurementCost: 10000,
        unitCost: 100,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.update, {
        productId,
        name: "Locked Product",
        category: "twines",
        baseUom: "piece",
      })
    ).rejects.toThrowError(
      "Category cannot be changed because this product already has stock records"
    )
  })

  it("rejects baseUom change when product has existing batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("products", {
          skuCode: "SKU-LOCK2",
          name: "Locked Product 2",
          category: "sacks",
          baseUom: "piece",
          conversionFactor: 0,
          currentQuantity: 50,
          totalAssetValue: 25000,
          lowStockThreshold: 5,
          status: "active",
        })
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("suppliers", {
          companyName: "Test Supplier 2",
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
        batchCode: "BAT-LOCK2",
        totalProcurementCost: 5000,
        unitCost: 100,
        quantityReceived: 50,
        quantityRemaining: 50,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.update, {
        productId,
        name: "Locked Product 2",
        category: "sacks",
        baseUom: "roll",
      })
    ).rejects.toThrowError(
      "Base unit cannot be changed because this product already has stock records"
    )
  })

  it("allows category and baseUom change when product has no batches", async () => {
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
        skuCode: "SKU-FREE",
        name: "Free Product",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await t.mutation(api.products.mutations.update, {
      productId,
      name: "Changed Product",
      category: "twines",
      baseUom: "roll",
      conversionFactor: 20,
      lowStockThreshold: 5,
    })

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(updated).toMatchObject({
      name: "Changed Product",
      category: "twines",
      baseUom: "roll",
      conversionFactor: 20,
      lowStockThreshold: 5,
    })
  })

  // ── Edge cases ────────────────────────────────────────────

  it("create sets default conversionFactor = 50 for sacks", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.mutation(api.products.mutations.create, {
      name: "Sack Product",
      category: "sacks",
      baseUom: "piece",
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.conversionFactor).toBe(50)
  })

  it("create does not set default conversionFactor for twines", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.mutation(api.products.mutations.create, {
      name: "Twine Product",
      category: "twines",
      baseUom: "meter",
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.conversionFactor).toBeUndefined()
  })

  it("create sets default lowStockThreshold = 0", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.mutation(api.products.mutations.create, {
      name: "Default Threshold",
      category: "sacks",
      baseUom: "piece",
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.lowStockThreshold).toBe(0)
  })

  it("create generates a unique SKU matching the expected pattern", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const productId = await t.mutation(api.products.mutations.create, {
      name: "SKU Pattern Check",
      category: "sacks",
      baseUom: "piece",
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.skuCode).toMatch(/^SKU-\d{8}-\d{4}$/)
    expect(product?.currentQuantity).toBe(0)
    expect(product?.totalAssetValue).toBe(0)
    expect(product?.status).toBe("active")
  })

  it("update rejects update for non-existent product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "TEMP",
        name: "Temp",
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

    await expect(
      t.mutation(api.products.mutations.update, {
        productId: phantomId,
        name: "Ghost",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Product not found")
  })

  it("create creates an audit log entry", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await t.mutation(api.products.mutations.create, {
      name: "Audited Product",
      category: "sacks",
      baseUom: "piece",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "product_create"))
        .collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("product_create")
    expect(logs[0].description).toContain("Audited Product")
  })

  // ── Archive ────────────────────────────────────────────────

  it("rejects unauthenticated archive", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU-ARCH",
        name: "Archive Test",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.archive, { productId })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects archive for non-owners", async () => {
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
        skuCode: "SKU-ARCH2",
        name: "Staff Archive",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.archive, { productId })
    ).rejects.toThrowError("Only owners can perform this action")
  })

  it("archives an active product", async () => {
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
        skuCode: "SKU-ARCH3",
        name: "To Archive",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 50,
        totalAssetValue: 25000,
        lowStockThreshold: 5,
        status: "active",
      })
    })

    await t.mutation(api.products.mutations.archive, { productId })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(product?.status).toBe("archived")
    expect(product?.currentQuantity).toBe(50)
    expect(product?.totalAssetValue).toBe(25000)
  })

  it("rejects archive when product is already archived", async () => {
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
        skuCode: "SKU-ARCH4",
        name: "Double Archive",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "archived",
      })
    })

    await expect(
      t.mutation(api.products.mutations.archive, { productId })
    ).rejects.toThrowError("Product is already archived")
  })

  it("rejects archive for non-existent product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "TEMP",
        name: "Temp",
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

    await expect(
      t.mutation(api.products.mutations.archive, { productId: phantomId })
    ).rejects.toThrowError("Product not found")
  })

  it("archive creates an audit log entry", async () => {
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
        skuCode: "SKU-AUDIT-ARCH",
        name: "Audit Archive",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await t.mutation(api.products.mutations.archive, { productId })

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "product_archive"))
        .collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("product_archive")
    expect(logs[0].description).toContain("Audit Archive")
  })

  // ── Unarchive ──────────────────────────────────────────────

  it("rejects unauthenticated unarchive", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU-UARCH",
        name: "Unarchive Test",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "archived",
      })
    })

    await expect(
      t.mutation(api.products.mutations.unarchive, { productId })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects unarchive for non-owners", async () => {
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
        skuCode: "SKU-UARCH2",
        name: "Staff Unarchive",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "archived",
      })
    })

    await expect(
      t.mutation(api.products.mutations.unarchive, { productId })
    ).rejects.toThrowError("Only owners can perform this action")
  })

  it("unarchives an archived product", async () => {
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
        skuCode: "SKU-UARCH3",
        name: "To Restore",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 30,
        totalAssetValue: 15000,
        lowStockThreshold: 5,
        status: "archived",
      })
    })

    await t.mutation(api.products.mutations.unarchive, { productId })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(product?.status).toBe("active")
    expect(product?.currentQuantity).toBe(30)
    expect(product?.totalAssetValue).toBe(15000)
  })

  it("rejects unarchive when product is already active", async () => {
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
        skuCode: "SKU-UARCH4",
        name: "Already Active",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await expect(
      t.mutation(api.products.mutations.unarchive, { productId })
    ).rejects.toThrowError("Product is not archived")
  })

  it("rejects unarchive for non-existent product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "TEMP",
        name: "Temp",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "archived",
      })
      await ctx.db.delete(id)
      return id
    })

    await expect(
      t.mutation(api.products.mutations.unarchive, { productId: phantomId })
    ).rejects.toThrowError("Product not found")
  })

  it("unarchive creates an audit log entry", async () => {
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
        skuCode: "SKU-AUDIT-UARCH",
        name: "Audit Restore",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "archived",
      })
    })

    await t.mutation(api.products.mutations.unarchive, { productId })

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "product_unarchive"))
        .collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("product_unarchive")
    expect(logs[0].description).toContain("Audit Restore")
  })

  it("update creates an audit log entry", async () => {
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
        skuCode: "SKU-AUDIT",
        name: "Before Update",
        category: "sacks",
        baseUom: "piece",
        conversionFactor: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 0,
        status: "active",
      })
    })

    await t.mutation(api.products.mutations.update, {
      productId,
      name: "After Update",
      category: "sacks",
      baseUom: "piece",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "product_update"))
        .collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("product_update")
    expect(logs[0].description).toContain("After Update")
  })

  it("rejects product creation for deactivated owner", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "deactivated",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.products.mutations.create, {
        name: "Test Product",
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Only owners can perform this action")
  })
})
