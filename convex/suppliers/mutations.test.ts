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
  "./users/queries.ts": () => import("../users/queries"),
  "./users/mutations.ts": () => import("../users/mutations"),
  "./suppliers/queries.ts": () => import("./queries"),
  "./suppliers/mutations.ts": () => import("./mutations"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("supplier mutations", () => {
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

  function supplierData(
    overrides: { companyName: string } & Partial<{
      contactPerson: string
      contactNumber: string
      address: string
    }>
  ) {
    return {
      contactPerson: "Default Contact",
      contactNumber: "09171234567",
      address: "Default Address 123 Street City",
      ...overrides,
    }
  }

  async function createSupplier(
    t: ReturnType<typeof convexTest>,
    data: ReturnType<typeof supplierData>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", data)
    })
  }

  // ── Create ────────────────────────────────────────────────

  it("rejects unauthenticated creation", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.suppliers.mutations.create, {
        companyName: "Test Supplier",
        contactPerson: "John",
        contactNumber: "09171234567",
        address: "Some Address 123 Street City",
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
      t.mutation(api.suppliers.mutations.create, {
        companyName: "Test Supplier",
        contactPerson: "John",
        contactNumber: "09171234567",
        address: "Some Address 123 Street City",
      })
    ).rejects.toThrowError("Only owners can create suppliers")
  })

  it("rejects creation with short company name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.create, {
        companyName: "A",
        contactPerson: "John Doe",
        contactNumber: "09171234567",
        address: "Some Address 123 Street City",
      })
    ).rejects.toThrow()
  })

  it("rejects creation with invalid contact number", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.create, {
        companyName: "Test Supplier",
        contactPerson: "John Doe",
        contactNumber: "12345",
        address: "Some Address 123 Street City",
      })
    ).rejects.toThrow()
  })

  it("rejects creation with short address", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.create, {
        companyName: "Test Supplier",
        contactPerson: "John Doe",
        contactNumber: "09171234567",
        address: "Short",
      })
    ).rejects.toThrow()
  })

  it("creates a supplier and writes an audit log", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.mutation(api.suppliers.mutations.create, {
      companyName: "Acme Corp",
      contactPerson: "John Doe",
      contactNumber: "09171234567",
      address: "123 Street City",
    })

    expect(result).toBeDefined()

    const created = await t.query(async (ctx) => {
      return await ctx.db.get(result)
    })

    expect(created).toMatchObject({
      companyName: "Acme Corp",
      contactPerson: "John Doe",
      contactNumber: "09171234567",
      address: "123 Street City",
    })

    const auditLog = await t.query(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "supplier_create"))
        .first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "supplier_create",
      description: "Created supplier Acme Corp",
    })
  })

  it("rejects duplicate company names", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    await createSupplier(t, supplierData({ companyName: "Acme Corp" }))
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.create, {
        companyName: "Acme Corp",
        contactPerson: "John",
        contactNumber: "09171234567",
        address: "Some Address 123 Street City",
      })
    ).rejects.toThrowError("A supplier with this company name already exists")
  })

  // ── Update ────────────────────────────────────────────────

  it("updates a supplier and writes an audit log", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const supplierId = await createSupplier(
      t,
      supplierData({
        companyName: "Old Name",
        contactPerson: "Old Contact",
        contactNumber: "09171234567",
        address: "Old Address Street City",
      })
    )
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.mutation(api.suppliers.mutations.update, {
      supplierId,
      companyName: "New Name",
      contactPerson: "New Contact",
      contactNumber: "09179876543",
      address: "New Address Street City",
    })

    expect(result).toBe(true)

    const updated = await t.query(async (ctx) => {
      return await ctx.db.get(supplierId)
    })

    expect(updated).toMatchObject({
      companyName: "New Name",
      contactPerson: "New Contact",
      contactNumber: "09179876543",
      address: "New Address Street City",
    })

    const auditLog = await t.query(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "supplier_update"))
        .first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "supplier_update",
      description: "Updated supplier Old Name → New Name",
    })
  })

  it("rejects updating to duplicate company name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const supplierA = await createSupplier(
      t,
      supplierData({ companyName: "Supplier A" })
    )
    await createSupplier(t, supplierData({ companyName: "Supplier B" }))
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.update, {
        supplierId: supplierA,
        ...supplierData({ companyName: "Supplier B" }),
      })
    ).rejects.toThrowError("A supplier with this company name already exists")
  })

  it("rejects unauthenticated update", async () => {
    const t = makeTest()
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )

    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.suppliers.mutations.update, {
        supplierId,
        ...supplierData({ companyName: "Updated Corp" }),
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects non-owner update", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )

    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(
      t.mutation(api.suppliers.mutations.update, {
        supplierId,
        ...supplierData({ companyName: "Updated Corp" }),
      })
    ).rejects.toThrowError("Only owners can update suppliers")
  })

  it("rejects updating non-existent supplier", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("suppliers", {
        companyName: "Temp",
        contactPerson: "",
        contactNumber: "",
        address: "",
      })
      await ctx.db.delete(id)
      return id
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.update, {
        supplierId: phantomId,
        ...supplierData({ companyName: "Ghost Corp" }),
      })
    ).rejects.toThrowError("Supplier not found")
  })

  // ── Archive ───────────────────────────────────────────────

  it("archives a supplier with no batch transactions", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.mutation(api.suppliers.mutations.archive, {
      supplierId,
    })

    expect(result).toBe(true)

    const archived = await t.query(async (ctx) => {
      return await ctx.db.get(supplierId)
    })

    expect(archived?.archivedAt).toBeDefined()
    expect(typeof archived?.archivedAt).toBe("number")

    const auditLog = await t.query(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "supplier_archive"))
        .first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "supplier_archive",
      description: "Archived supplier Acme Corp",
    })
  })

  it("rejects archiving a supplier with batch transactions", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("products", {
        skuCode: "SKU001",
        name: "Test Product",
        category: "sacks",
        baseUom: "piece",
        currentQuantity: 100,
        totalAssetValue: 1000,
        lowStockThreshold: 10,
        status: "active",
      })
    })
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )
    await t.run(async (ctx) => {
      await ctx.db.insert("batches", {
        productId,
        supplierId,
        userId: ownerId,
        batchCode: "BATCH001",
        totalProcurementCost: 500,
        unitCost: 5,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "active",
      })
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.archive, {
        supplierId,
      })
    ).rejects.toThrowError(
      "Cannot archive supplier with existing batch transactions"
    )
  })

  it("rejects archiving an already archived supplier", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )
    await t.run(async (ctx) => {
      await ctx.db.patch(supplierId, { archivedAt: Date.now() })
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.archive, {
        supplierId,
      })
    ).rejects.toThrowError("Supplier is already archived")
  })

  it("rejects unauthenticated archive", async () => {
    const t = makeTest()
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )

    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.suppliers.mutations.archive, {
        supplierId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects non-owner archive", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    const supplierId = await createSupplier(
      t,
      supplierData({ companyName: "Acme Corp" })
    )

    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(
      t.mutation(api.suppliers.mutations.archive, {
        supplierId,
      })
    ).rejects.toThrowError("Only owners can archive suppliers")
  })

  it("rejects archiving non-existent supplier", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const phantomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("suppliers", {
        companyName: "Temp",
        contactPerson: "",
        contactNumber: "",
        address: "",
      })
      await ctx.db.delete(id)
      return id
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.suppliers.mutations.archive, {
        supplierId: phantomId,
      })
    ).rejects.toThrowError("Supplier not found")
  })
})
