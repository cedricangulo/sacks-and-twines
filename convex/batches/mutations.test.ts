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
  "./batches/queries.ts": () => import("./queries"),
  "./batches/mutations.ts": () => import("./mutations"),
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

describe("batch mutations", () => {
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

  async function createProduct(t: ReturnType<typeof convexTest>, name: string) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        name,
        category: "sacks",
        baseUom: "piece",
        weightPerUnit: 0,
        currentQuantity: 0,
        totalAssetValue: 0,
        lowStockThreshold: 10,
        status: "active",
      })
    })
  }

  async function createSupplier(
    t: ReturnType<typeof convexTest>,
    name: string
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", {
        companyName: name,
        contactPerson: "Contact",
        contactNumber: "09171234567",
        address: "Address 123 Street City",
      })
    })
  }

  async function insertDispatchItem(
    t: ReturnType<typeof convexTest>,
    overrides: {
      batchId: unknown
      productId: unknown
      dispatchQuantity: number
      userId: unknown
    }
  ) {
    return await t.run(async (ctx) => {
      const dispatchId = await ctx.db.insert("dispatches", {
        userId: overrides.userId,
        status: "completed",
      })
      return await ctx.db.insert("dispatchItems", {
        dispatchId,
        batchId: overrides.batchId,
        productId: overrides.productId,
        dispatchUom: "piece",
        dispatchQuantity: overrides.dispatchQuantity,
        quantityDeducted: overrides.dispatchQuantity,
        unitCost: 500,
      })
    })
  }

  // ── Stock In (existing mode) ─────────────────────────────

  async function createPhantomProductId(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "PHANTOM-SKU",
        name: "Phantom",
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
  }

  async function createPhantomSupplierId(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const id = await ctx.db.insert("suppliers", {
        companyName: "Phantom Supplier",
        contactPerson: "Phantom",
        contactNumber: "09171234567",
        address: "Phantom Address 123 Street City",
      })
      await ctx.db.delete(id)
      return id
    })
  }

  it("rejects unauthenticated stockIn", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)
    const [productId, supplierId] = await Promise.all([
      createPhantomProductId(t),
      createPhantomSupplierId(t),
    ])

    await expect(
      t.mutation(api.batches.mutations.stockIn, {
        mode: "existing",
        productId,
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects stockIn for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)
    const [productId, supplierId] = await Promise.all([
      createPhantomProductId(t),
      createPhantomSupplierId(t),
    ])

    await expect(
      t.mutation(api.batches.mutations.stockIn, {
        mode: "existing",
        productId,
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
      })
    ).rejects.toThrowError("Only owners can stock in")
  })

  it("stockIn to existing product creates batch and increments derived fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Existing Product"),
      createSupplier(t, "Supplier Co"),
    ])

    const result = await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    expect(result.batchCode).toMatch(/^BAT-\d{8}-\d{4}$/)

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.currentQuantity).toBe(100)
    expect(product?.totalAssetValue).toBe(50000)

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    expect(batches).toHaveLength(1)
    expect(batches[0]).toMatchObject({
      quantityReceived: 100,
      quantityRemaining: 100,
      totalProcurementCost: 50000,
      unitCost: 500,
    })
  })

  it("stockIn to existing product accumulates derived fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Accumulating Product"),
      createSupplier(t, "Supplier Co"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 50,
      totalProcurementCost: 25000,
    })

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 30,
      totalProcurementCost: 18000,
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.currentQuantity).toBe(80)
    expect(product?.totalAssetValue).toBe(43000)
  })

  it("rejects stockIn to archived product", async () => {
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
          skuCode: "SKU-ARCHIVED",
          name: "Archived Product",
          category: "sacks",
          baseUom: "piece",
          weightPerUnit: 0,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: 0,
          status: "archived",
        })
      }),
      createSupplier(t, "Supplier"),
    ])

    await expect(
      t.mutation(api.batches.mutations.stockIn, {
        mode: "existing",
        productId,
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
      })
    ).rejects.toThrowError("Cannot stock into an archived product")
  })

  // ── Stock In (new mode) ─────────────────────────────────

  it("stockIn in new mode creates product and batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const supplierId = await createSupplier(t, "New Product Supplier")

    const result = await t.mutation(api.batches.mutations.stockIn, {
      mode: "new",
      name: "Brand New Product",
      category: "twines",
      baseUom: "roll",
      weightPerUnit: 20,
      supplierId,
      quantityReceived: 200,
      totalProcurementCost: 80000,
      lowStockThreshold: 10,
    })

    expect(result.batchCode).toMatch(/^BAT-\d{8}-\d{4}$/)
    expect(result.productId).toBeTruthy()

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(result.productId)
    })
    expect(product).toMatchObject({
      name: "Brand New Product",
      category: "twines",
      baseUom: "roll",
      currentQuantity: 200,
      totalAssetValue: 80000,
    })
  })

  it("rejects stockIn new mode with duplicate name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await createProduct(t, "Existing Name")
    const supplierId = await createSupplier(t, "Supplier")

    await expect(
      t.mutation(api.batches.mutations.stockIn, {
        mode: "new",
        name: "Existing Name",
        category: "sacks",
        baseUom: "piece",
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
      })
    ).rejects.toThrowError("A product with this name already exists")
  })

  // ── Update Batch ─────────────────────────────────────────

  it("rejects unauthenticated batch update", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)
    const [productId, supplierId] = await Promise.all([
      createPhantomProductId(t),
      createPhantomSupplierId(t),
    ])
    const phantomUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        email: "phantom@test.com",
        name: "Phantom",
        role: "owner",
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })
    const batchId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("batches", {
        batchCode: "PHANTOM-BATCH",
        productId,
        supplierId,
        userId: phantomUserId,
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
      t.mutation(api.batches.mutations.update, {
        batchId,
        productId,
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("updates batch and adjusts product derived fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Updatable Product"),
      createSupplier(t, "Supplier"),
    ])

    const { productId: _, batchCode } = await t.mutation(
      api.batches.mutations.stockIn,
      {
        mode: "existing",
        productId,
        supplierId,
        quantityReceived: 100,
        totalProcurementCost: 50000,
      }
    )

    const [batches, newSupplierId] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", productId))
          .collect()
      }),
      createSupplier(t, "New Supplier"),
    ])
    const batchId = batches[0]._id

    await t.mutation(api.batches.mutations.update, {
      batchId,
      productId,
      supplierId: newSupplierId,
      quantityReceived: 120,
      totalProcurementCost: 60000,
      category: "sacks",
      baseUom: "piece",
    })

    const updatedBatch = await t.run(async (ctx) => {
      return await ctx.db.get(batchId)
    })
    expect(updatedBatch?.quantityReceived).toBe(120)
    expect(updatedBatch?.totalProcurementCost).toBe(60000)
    expect(updatedBatch?.unitCost).toBe(500)
    expect(updatedBatch?.supplierId.toString()).toBe(newSupplierId.toString())

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.currentQuantity).toBe(120)
    expect(product?.totalAssetValue).toBe(60000)
  })

  it("rejects batch update when quantities are locked by dispatch history", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Locked Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await insertDispatchItem(t, {
      batchId,
      productId,
      dispatchQuantity: 10,
      userId: ownerId,
    })

    const newSupplierId = await createSupplier(t, "Supplier B")

    await t.mutation(api.batches.mutations.update, {
      batchId,
      productId,
      supplierId: newSupplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
      category: "sacks",
      baseUom: "piece",
    })

    const updatedBatch = await t.run(async (ctx) => {
      return await ctx.db.get(batchId)
    })
    expect(updatedBatch?.supplierId.toString()).toBe(newSupplierId.toString())

    await expect(
      t.mutation(api.batches.mutations.update, {
        batchId,
        productId,
        supplierId: newSupplierId,
        quantityReceived: 200,
        totalProcurementCost: 50000,
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Cannot change quantity or cost")
  })

  it("rejects update for voided batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Voided Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await t.mutation(api.batches.mutations.voidBatch, { batchId })

    await expect(
      t.mutation(api.batches.mutations.update, {
        batchId,
        productId,
        supplierId,
        quantityReceived: 100,
        totalProcurementCost: 50000,
        category: "sacks",
        baseUom: "piece",
      })
    ).rejects.toThrowError("Cannot update a voided batch")
  })

  // ── Void Batch ───────────────────────────────────────────

  it("voids batch and decrements product derived fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Voidable Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await t.mutation(api.batches.mutations.voidBatch, {
      batchId,
      reason: "Damaged goods",
    })

    const voided = await t.run(async (ctx) => {
      return await ctx.db.get(batchId)
    })
    expect(voided?.status).toBe("voided")

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    expect(product?.currentQuantity).toBe(0)
    expect(product?.totalAssetValue).toBe(0)
  })

  it("rejects voiding a batch with dispatches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Dispatched Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await insertDispatchItem(t, {
      batchId,
      productId,
      dispatchQuantity: 5,
      userId: ownerId,
    })

    await expect(
      t.mutation(api.batches.mutations.voidBatch, { batchId })
    ).rejects.toThrowError(
      "Cannot void a batch that has been used in dispatches"
    )
  })

  it("rejects voiding a non-active batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Already Voided Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await t.mutation(api.batches.mutations.voidBatch, { batchId })

    await expect(
      t.mutation(api.batches.mutations.voidBatch, { batchId })
    ).rejects.toThrowError("Only active batches can be voided")
  })

  it("voids associated stock adjustments when voiding a batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Adjustment Product"),
      createSupplier(t, "Supplier"),
    ])

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
    })

    const batches = await t.run(async (ctx) => {
      return await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
    })
    const batchId = batches[0]._id

    await t.run(async (ctx) => {
      await ctx.db.insert("stockAdjustments", {
        batchId,
        productId,
        userId: ownerId,
        quantityAdjusted: -5,
        reason: "damaged",
        status: "applied",
      })
    })

    const voidResult = await t.mutation(api.batches.mutations.voidBatch, {
      batchId,
    })
    expect(voidResult.voidedAdjustments).toBe(1)

    const adjustments = await t.run(async (ctx) => {
      return await ctx.db
        .query("stockAdjustments")
        .filter((q) => q.eq(q.field("batchId"), batchId))
        .collect()
    })
    expect(adjustments[0].status).toBe("voided")
  })

  // ── Image Upload ──────────────────────────────────────────

  it("generateUploadUrl returns a URL string", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const url = await t.mutation(api.batches.mutations.generateUploadUrl, {})

    expect(typeof url).toBe("string")
    expect(url).toContain("http")
  })

  it("rejects generateUploadUrl for non-owner role", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => staffId)

    await expect(
      t.mutation(api.batches.mutations.generateUploadUrl, {})
    ).rejects.toThrowError("Only owners can upload files")
  })

  it("sets imagePath on new product when stockIn includes imageStorageId", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const supplierId = await createSupplier(t, "Supplier")

    const storageId = "test-storage-id-12345"

    const result = await t.mutation(api.batches.mutations.stockIn, {
      mode: "new",
      name: "Product With Image",
      category: "sacks",
      baseUom: "piece",
      supplierId,
      quantityReceived: 100,
      totalProcurementCost: 50000,
      imageStorageId: storageId,
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(result.productId)
    })

    expect(product?.imagePath).toBe(storageId)
  })

  it("patches imagePath on existing product when stockIn includes imageStorageId", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Existing Product"),
      createSupplier(t, "Supplier"),
    ])

    const storageId = "test-storage-id-67890"

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 50,
      totalProcurementCost: 25000,
      imageStorageId: storageId,
    })

    const product = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect(product?.imagePath).toBe(storageId)
  })

  it("leaves imagePath untouched when stockIn has no imageStorageId", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "No Image Product"),
      createSupplier(t, "Supplier"),
    ])

    const existingProduct = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })
    const originalImagePath = (existingProduct as Record<string, unknown>)
      .imagePath

    await t.mutation(api.batches.mutations.stockIn, {
      mode: "existing",
      productId,
      supplierId,
      quantityReceived: 30,
      totalProcurementCost: 15000,
    })

    const updatedProduct = await t.run(async (ctx) => {
      return await ctx.db.get(productId)
    })

    expect((updatedProduct as Record<string, unknown>).imagePath).toBe(
      originalImagePath
    )
  })

  it("rejects stockIn for deactivated owner", async () => {
    const t = makeTest()
    const [ownerId, productId, supplierId] = await Promise.all([
      createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "deactivated",
      }),
      createProduct(t, "Test Product"),
      createSupplier(t, "Test Supplier"),
    ])
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.batches.mutations.stockIn, {
        mode: "existing",
        productId,
        supplierId,
        quantityReceived: 50,
        totalProcurementCost: 25000,
      })
    ).rejects.toThrowError("Only owners can stock in")
  })
})
