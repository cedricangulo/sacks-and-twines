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

describe("batch queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function createUser(
    t: ReturnType<typeof convexTest>,
    user: {
      email: string
      name?: string
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
        conversionFactor: 0,
        currentQuantity: 100,
        totalAssetValue: 50000,
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

  async function createBatch(
    t: ReturnType<typeof convexTest>,
    overrides: {
      productId: unknown
      supplierId: unknown
      userId: unknown
    } & Partial<{
      batchCode: string
      status: "active" | "depleted" | "voided"
      quantityReceived: number
      quantityRemaining: number
      createdAt: number
      productName: string
      productSku: string
      supplierName: string
      receivedBy: string
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("batches", {
        batchCode:
          overrides.batchCode ??
          `BAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        productId: overrides.productId,
        supplierId: overrides.supplierId,
        userId: overrides.userId,
        totalProcurementCost: 25000,
        unitCost: 500,
        quantityReceived: overrides.quantityReceived ?? 50,
        quantityRemaining: overrides.quantityRemaining ?? 50,
        status: overrides.status ?? "active",
        ...(overrides.createdAt !== undefined
          ? { createdAt: overrides.createdAt }
          : {}),
        ...(overrides.productName !== undefined
          ? { productName: overrides.productName }
          : {}),
        ...(overrides.productSku !== undefined
          ? { productSku: overrides.productSku }
          : {}),
        ...(overrides.supplierName !== undefined
          ? { supplierName: overrides.supplierName }
          : {}),
        ...(overrides.receivedBy !== undefined
          ? { receivedBy: overrides.receivedBy }
          : {}),
      })
    })
  }

  it("rejects unauthenticated listByProduct", async () => {
    const t = makeTest()

    const phantomProductId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "PHANTOM",
        name: "Phantom",
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

    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.batches.queries.listByProduct, {
        productId: phantomProductId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("lists batches by product", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Test Product"),
      createSupplier(t, "Test Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-001",
    })
    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-002",
    })

    const result = await t.query(api.batches.queries.listByProduct, {
      productId,
    })

    expect(result).toHaveLength(2)
    expect(
      result.map((b: { batchCode: string }) => b.batchCode).sort()
    ).toEqual(["BAT-001", "BAT-002"])
  })

  it("returns empty list for product with no batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const productId = await createProduct(t, "Lonely Product")

    const result = await t.query(api.batches.queries.listByProduct, {
      productId,
    })

    expect(result).toHaveLength(0)
  })

  it("gets batch detail with computed fields", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Detail Product"),
      createSupplier(t, "Detail Supplier"),
    ])

    const batchId = await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-DETAIL",
      quantityReceived: 100,
      quantityRemaining: 100,
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.batches.queries.getById, { batchId })

    expect(result).toMatchObject({
      batchCode: "BAT-DETAIL",
      productName: "Detail Product",
      supplierName: "Detail Supplier",
      dispatchCount: 0,
      activeAdjustmentCount: 0,
      canEditQuantities: true,
    })
  })

  it("returns null for non-existent batch", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Phantom Product"),
      createSupplier(t, "Phantom Supplier"),
    ])

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("batches", {
        batchCode: "TEMP",
        productId,
        supplierId,
        userId: ownerId,
        totalProcurementCost: 0,
        unitCost: 0,
        quantityReceived: 0,
        quantityRemaining: 0,
        status: "active",
      })
      await ctx.db.delete(id)
      return id
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.batches.queries.getById, {
      batchId: phantomId,
    })

    expect(result).toBeNull()
  })

  // ── listForDispatch ────────────────────────────────────────

  it("listForDispatch rejects unauthenticated", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("products", {
        skuCode: "PHANTOM",
        name: "Phantom",
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
      t.query(api.batches.queries.listForDispatch, {
        productId: phantomId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("listForDispatch returns active batches in FIFO order", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "FIFO Product"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-OLD",
      quantityReceived: 50,
      quantityRemaining: 30,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-NEW",
      quantityReceived: 100,
      quantityRemaining: 80,
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(2)
    expect(result[0].batchCode).toBe("BAT-OLD")
    expect(result[1].batchCode).toBe("BAT-NEW")
  })

  it("listForDispatch excludes depleted batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Depleted Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-ACTIVE",
      quantityRemaining: 50,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-DEPLETED",
      quantityRemaining: 0,
      status: "depleted",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listForDispatch excludes voided batches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Voided Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-ACTIVE",
      quantityRemaining: 50,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-VOIDED",
      quantityRemaining: 100,
      status: "voided",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-ACTIVE")
  })

  it("listForDispatch excludes batches with quantityRemaining = 0", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Empty Filter"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-WITH-STOCK",
      quantityRemaining: 30,
    })

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-EMPTY",
      quantityRemaining: 0,
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(1)
    expect(result[0].batchCode).toBe("BAT-WITH-STOCK")
  })

  it("listForDispatch returns empty array when no valid batches exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const [productId, supplierId] = await Promise.all([
      createProduct(t, "Empty Product"),
      createSupplier(t, "Supplier"),
    ])

    await createBatch(t, {
      productId,
      supplierId,
      userId: ownerId,
      batchCode: "BAT-VOIDED",
      quantityRemaining: 100,
      status: "voided",
    })

    const result = await t.query(api.batches.queries.listForDispatch, {
      productId,
    })

    expect(result).toHaveLength(0)
  })

  // ── listHistory ──────────────────────────────────────────

  describe("listHistory", () => {
    const NOW = 1_700_000_000_000
    const DAY = 86_400_000
    const RANGE = { startMs: NOW - 30 * DAY, endMs: NOW + DAY }

    async function seedHistory() {
      const t = makeTest()
      const [ownerId, staffId] = await Promise.all([
        createUser(t, {
          email: "owner@test.com",
          name: "Owner",
          role: "owner",
          status: "active",
        }),
        createUser(t, {
          email: "staff@test.com",
          name: "Staff",
          role: "staff",
          status: "active",
        }),
      ])
      const [productId, supplierA, supplierB] = await Promise.all([
        createProduct(t, "Sack A"),
        createSupplier(t, "Supplier A"),
        createSupplier(t, "Supplier B"),
      ])

      // Inside the range, newest last so desc order is verifiable.
      const olderId = await createBatch(t, {
        productId,
        supplierId: supplierA,
        userId: ownerId,
        createdAt: NOW - 3 * DAY,
        productName: "Sack A",
        productSku: "SKU-A",
        supplierName: "Supplier A",
        receivedBy: "Owner",
      })
      const middleId = await createBatch(t, {
        productId,
        supplierId: supplierB,
        userId: staffId,
        createdAt: NOW - 2 * DAY,
        status: "depleted",
        productName: "Sack A",
        productSku: "SKU-A",
        supplierName: "Supplier B",
        receivedBy: "Staff",
      })
      const newerId = await createBatch(t, {
        productId,
        supplierId: supplierA,
        userId: ownerId,
        createdAt: NOW - 1 * DAY,
        productName: "Sack A",
        productSku: "SKU-A",
        supplierName: "Supplier A",
        receivedBy: "Owner",
      })

      // Outside the range on both sides.
      await createBatch(t, {
        productId,
        supplierId: supplierA,
        userId: ownerId,
        createdAt: NOW - 40 * DAY,
        productName: "Sack A",
        productSku: "SKU-A",
        supplierName: "Supplier A",
        receivedBy: "Owner",
      })
      await createBatch(t, {
        productId,
        supplierId: supplierA,
        userId: ownerId,
        createdAt: NOW + 5 * DAY,
        productName: "Sack A",
        productSku: "SKU-A",
        supplierName: "Supplier A",
        receivedBy: "Owner",
      })

      return {
        t,
        ownerId,
        staffId,
        olderId,
        middleId,
        newerId,
        supplierA,
        supplierB,
      }
    }

    const page = { numItems: 50, cursor: null }

    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.batches.queries.listHistory, {
          paginationOpts: page,
          ...RANGE,
        })
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects staff — stock-in is owner-only", async () => {
      const { t, staffId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await expect(
        t.query(api.batches.queries.listHistory, {
          paginationOpts: page,
          ...RANGE,
        })
      ).rejects.toThrowError("Only owners can view receiving history")
    })

    it("rejects deactivated owners", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "deactivated",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await expect(
        t.query(api.batches.queries.listHistory, {
          paginationOpts: page,
          ...RANGE,
        })
      ).rejects.toThrowError("Only owners can view receiving history")
    })

    it("returns only rows inside the date range, newest first", async () => {
      const { t, ownerId, olderId, middleId, newerId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        ...RANGE,
      })

      expect(result.page.map((b) => b._id)).toEqual([
        newerId,
        middleId,
        olderId,
      ])
    })

    it("paginates with cursors", async () => {
      const { t, ownerId } = await seedHistory()
      // Not `mockResolvedValueOnce` — this issues two queries, and the `Once`
      // variant would return `undefined` on the second call.
      authMocks.getAuthUserId.mockResolvedValue(ownerId)

      const first = await t.query(api.batches.queries.listHistory, {
        paginationOpts: { numItems: 2, cursor: null },
        ...RANGE,
      })

      expect(first.page).toHaveLength(2)
      expect(first.isDone).toBe(false)

      const second = await t.query(api.batches.queries.listHistory, {
        paginationOpts: { numItems: 2, cursor: first.continueCursor },
        ...RANGE,
      })

      expect(second.page).toHaveLength(1)
      expect(second.isDone).toBe(true)
      // No overlap between pages.
      const firstIds = new Set(first.page.map((b) => b._id))
      expect(second.page.every((b) => !firstIds.has(b._id))).toBe(true)
    })

    it("filters by supplier via by_supplier_createdAt", async () => {
      const { t, ownerId, supplierB, middleId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        ...RANGE,
        supplierId: supplierB,
      })

      // Only the middle batch was received from supplier B.
      expect(result.page.map((b) => b._id)).toEqual([middleId])
      expect(result.page[0].supplierName).toBe("Supplier B")
    })

    it("filters by status", async () => {
      const { t, ownerId, middleId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        ...RANGE,
        status: "depleted",
      })

      expect(result.page.map((b) => b._id)).toEqual([middleId])
    })

    it("uses denormalized fields when present", async () => {
      const { t, ownerId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        ...RANGE,
      })

      expect(result.page[0].productName).toBe("Sack A")
      expect(result.page[0].productSku).toBe("SKU-A")
      expect(result.page[0].supplierName).toBe("Supplier A")
      expect(result.page[0].receivedBy).toBe("Owner")
    })

    it("falls back to live documents when denormalized fields are absent", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Receiving Owner",
        role: "owner",
        status: "active",
      })
      const [productId, supplierId] = await Promise.all([
        createProduct(t, "Legacy Sack"),
        createSupplier(t, "Legacy Supplier"),
      ])

      // A row with no denormalized fields — as it exists before
      // `backfillBatchDenorm` runs.
      await createBatch(t, {
        productId,
        supplierId,
        userId: ownerId,
        createdAt: NOW,
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        startMs: NOW - DAY,
        endMs: NOW + DAY,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].productName).toBe("Legacy Sack")
      expect(result.page[0].supplierName).toBe("Legacy Supplier")
      expect(result.page[0].receivedBy).toBe("Receiving Owner")
    })

    it("returns an empty page when nothing is in range", async () => {
      const { t, ownerId } = await seedHistory()
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        startMs: NOW + 100 * DAY,
        endMs: NOW + 200 * DAY,
      })

      expect(result.page).toHaveLength(0)
      expect(result.isDone).toBe(true)
    })

    // Regression: `status` and `receivedBy` used to be applied *after*
    // pagination, so a page could come back empty while the matching rows sat
    // past the cursor. With no pagination controls rendered on an empty page,
    // those rows were unreachable — clearing filters was the only way out.
    describe("filters are applied before pagination", () => {
      async function seedManyActive() {
        const { t, ownerId, staffId, supplierA, middleId } = await seedHistory()
        const productId = await createProduct(t, "Bulk Sack")

        // 10 active batches received by the owner, all newer than the depleted
        // row `seedHistory` created.
        for (let i = 0; i < 10; i++) {
          await createBatch(t, {
            productId,
            supplierId: supplierA,
            userId: ownerId,
            createdAt: NOW - (i + 1) * 60_000,
            status: "active",
            productName: "Bulk Sack",
            productSku: "SKU-BULK",
            supplierName: "Supplier A",
            receivedBy: "Owner",
          })
        }

        return { t, ownerId, staffId, middleId }
      }

      it("status filter reaches rows past the first page", async () => {
        const { t, ownerId, middleId } = await seedManyActive()
        authMocks.getAuthUserId.mockResolvedValue(ownerId)

        // Page 1 of the *unfiltered* newest rows is all `active`; the only
        // `depleted` row is older than all ten.
        const firstPage = await t.query(api.batches.queries.listHistory, {
          paginationOpts: { numItems: 5, cursor: null },
          ...RANGE,
        })
        expect(firstPage.page).toHaveLength(5)
        expect(firstPage.page.every((b) => b.status === "active")).toBe(true)

        const filtered = await t.query(api.batches.queries.listHistory, {
          paginationOpts: { numItems: 5, cursor: null },
          ...RANGE,
          status: "depleted",
        })

        expect(filtered.page.map((b) => b._id)).toEqual([middleId])
        // The metadata describes the filtered set, so the client can tell the
        // difference between "no matches" and "no matches on this page".
        expect(filtered.isDone).toBe(true)
      })

      it("reports the filtered set as done rather than hiding later pages", async () => {
        // The residual path — supplier plus status — cannot use a compound index,
        // so the status filter runs on the returned page. The client's job is to
        // keep pagination mounted; this pins the metadata it renders from.
        const { t, ownerId, supplierB } = await seedHistory()
        authMocks.getAuthUserId.mockResolvedValue(ownerId)

        const residual = await t.query(api.batches.queries.listHistory, {
          paginationOpts: { numItems: 5, cursor: null },
          ...RANGE,
          supplierId: supplierB,
          status: "active",
        })

        // Supplier B only has the one `depleted` batch, so an `active` filter
        // leaves nothing — and says so, rather than looking like more pages.
        expect(residual.page).toHaveLength(0)
        expect(residual.isDone).toBe(true)
      })
    })

    it('treats a nameless receiver as "Unknown" rather than un-backfilled', async () => {
      // `users.name` is optional. A row written with the `"Unknown"` sentinel no
      // longer trips the fallback read on every page it appears on.
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      const namelessId = await createUser(t, {
        email: "nameless@test.com",
        role: "staff",
        status: "active",
      })
      const [productId, supplierId] = await Promise.all([
        createProduct(t, "Sack"),
        createSupplier(t, "Supplier"),
      ])

      await createBatch(t, {
        productId,
        supplierId,
        userId: namelessId,
        createdAt: NOW,
        productName: "Sack",
        productSku: "SKU",
        supplierName: "Supplier",
        receivedBy: "Unknown",
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.batches.queries.listHistory, {
        paginationOpts: page,
        startMs: NOW - DAY,
        endMs: NOW + DAY,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].receivedBy).toBe("Unknown")
    })
  })
})
