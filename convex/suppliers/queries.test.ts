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
  "./suppliers/queries.ts": () => import("./queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("supplier queries", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
  })

  async function createSupplier(
    t: ReturnType<typeof convexTest>,
    overrides: { companyName: string } & Partial<{
      contactPerson: string
      contactNumber: string
      address: string
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", {
        companyName: overrides.companyName,
        contactPerson: overrides.contactPerson ?? "Default Contact",
        contactNumber: overrides.contactNumber ?? "09171234567",
        address: overrides.address ?? "Default Address 123 Street City",
      })
    })
  }

  it("rejects unauthenticated list", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(t.query(api.suppliers.queries.list)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("rejects unauthenticated getById", async () => {
    const t = makeTest()
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
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.query(api.suppliers.queries.getById, {
        supplierId: phantomId,
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("lists all suppliers for authenticated users", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    await createSupplier(t, { companyName: "Supplier A" })
    await createSupplier(t, { companyName: "Supplier B" })

    const result = await t.query(api.suppliers.queries.list)

    expect(result).toHaveLength(2)
  })

  it("lists all suppliers including archived", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    await createSupplier(t, { companyName: "Active Co" })
    const archivedId = await createSupplier(t, { companyName: "Archived Co" })
    await t.run(async (ctx) => {
      await ctx.db.patch(archivedId, { archivedAt: Date.now() })
    })

    const result = await t.query(api.suppliers.queries.list)

    expect(result).toHaveLength(2)
  })

  it("returns empty list when no suppliers exist", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    const result = await t.query(api.suppliers.queries.list)

    expect(result).toHaveLength(0)
  })

  it("gets supplier by id for authenticated users", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    const supplierId = await createSupplier(t, { companyName: "Acme Corp" })

    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    const result = await t.query(api.suppliers.queries.getById, {
      supplierId,
    })

    expect(result).toMatchObject({ companyName: "Acme Corp" })
  })

  it("returns null for non-existent supplier by id", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce("user123")
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

    authMocks.getAuthUserId.mockResolvedValueOnce("user123")

    const result = await t.query(api.suppliers.queries.getById, {
      supplierId: phantomId,
    })

    expect(result).toBeNull()
  })
})
