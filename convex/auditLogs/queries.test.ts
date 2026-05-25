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
  "./auditLogs/queries.ts": () => import("./queries"),
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

describe("audit log queries", () => {
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
      name: string
      role: "owner" | "staff"
      status: "active" | "deactivated"
    }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", user)
    })
  }

  async function createAuditLog(
    t: ReturnType<typeof convexTest>,
    fields: {
      action: string
      description: string
      userId?: unknown
      userAgent?: string
      resourceType?: string
      resourceId?: string
    }
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("auditLogs", {
        action: fields.action,
        description: fields.description,
        ...(fields.userId ? { userId: fields.userId } : {}),
        ...(fields.userAgent ? { userAgent: fields.userAgent } : {}),
        ...(fields.resourceType ? { resourceType: fields.resourceType } : {}),
        ...(fields.resourceId ? { resourceId: fields.resourceId } : {}),
      })
    })
  }

  const defaultPagination = { numItems: 50, cursor: null }

  // ── list ───────────────────────────────────────────────────

  describe("list", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.auditLogs.queries.list, {
          paginationOpts: defaultPagination,
        })
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects non-owners", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await expect(
        t.query(api.auditLogs.queries.list, {
          paginationOpts: defaultPagination,
        })
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns paginated audit logs for owners", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product A",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stocked in batch B",
      })

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(2)
      expect(result.page[0].userName).toBe("Owner")
    })

    it("returns empty page when no logs exist", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(0)
    })

    it("filters by action", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stock in",
      })

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
        action: "product_create",
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].action).toBe("product_create")
    })

    it("filters by userId", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Owner action",
      })
      await createAuditLog(t, {
        userId: staffId,
        action: "product_create",
        description: "Staff action",
      })

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
        userId: staffId,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].description).toBe("Staff action")
    })

    it("filters by action and userId together", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Create",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "product_update",
        description: "Update",
      })

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
        action: "product_create",
        userId: ownerId,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].description).toBe("Create")
    })

    it("handles logs without a userId", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        action: "auth_sign_in_failed",
        description: "Failed login attempt",
      })

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].userName).toBeNull()
    })

    it("filters by dateFrom", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const ids = await t.run(async (ctx) => {
        const firstId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Old action",
          userId: ownerId,
        })
        const firstDoc = await ctx.db.get(firstId)
        const secondId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "New action",
          userId: ownerId,
        })
        const secondDoc = await ctx.db.get(secondId)
        return {
          firstTime: firstDoc!._creationTime,
          secondTime: secondDoc!._creationTime,
        }
      })

      // Include only logs created at or after secondTime
      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
        dateFrom: ids.secondTime,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].description).toBe("New action")
    })

    it("filters by dateTo", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const ids = await t.run(async (ctx) => {
        const firstId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Keep this",
          userId: ownerId,
        })
        const firstDoc = await ctx.db.get(firstId)
        await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Exclude this",
          userId: ownerId,
        })
        return { firstTime: firstDoc!._creationTime }
      })

      // Include only logs created at or before firstTime
      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
        dateTo: ids.firstTime,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].description).toBe("Keep this")
    })

    it("sets userName to null when user is deleted", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })

      const phantomUserId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("users", {
          email: "ghost@test.com",
          name: "Ghost",
          role: "staff",
          status: "active",
        })
        await ctx.db.delete(id)
        return id
      })

      await createAuditLog(t, {
        userId: phantomUserId,
        action: "product_create",
        description: "Ghost action",
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.list, {
        paginationOpts: defaultPagination,
      })

      expect(result.page[0].userName).toBeNull()
    })
  })

  // ── list (search) ──────────────────────────────────────────

  it("filters by search matching action", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created a new product",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "stock_in",
      description: "Stocked inventory",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "product",
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].action).toBe("product_create")
  })

  it("filters by search matching description", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created a new product",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "stock_in",
      description: "Stocked inventory",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "inventory",
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].description).toBe("Stocked inventory")
  })

  it("filters by search with multiple matches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created product A",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "product_update",
      description: "Updated product B",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "stock_in",
      description: "Stocked inventory",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "product",
    })

    expect(result.page).toHaveLength(2)
    expect(result.page.map((l) => l.action).sort()).toEqual([
      "product_create",
      "product_update",
    ])
  })

  it("search is case-insensitive", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "Product_Create",
      description: "Created with mixed case",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "product",
    })

    expect(result.page).toHaveLength(1)
  })

  it("returns empty page when search has no matches", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created product",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "nonexistent",
    })

    expect(result.page).toHaveLength(0)
  })

  it("combines search with action filter", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created a bag",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created a rope",
    })
    await createAuditLog(t, {
      userId: ownerId,
      action: "stock_in",
      description: "Stocked a bag",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      action: "product_create",
      search: "rope",
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].description).toBe("Created a rope")
  })

  it("combines search with dateFrom filter", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const ids = await t.run(async (ctx) => {
      const firstId = await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "Old product",
        userId: ownerId,
      })
      const first = await ctx.db.get(firstId)
      const secondId = await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "New product",
        userId: ownerId,
      })
      const second = await ctx.db.get(secondId)
      return {
        firstTime: first!._creationTime,
        secondTime: second!._creationTime,
      }
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "product",
      dateFrom: ids.secondTime,
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].description).toBe("New product")
  })

  it("combines search with dateTo filter", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const ids = await t.run(async (ctx) => {
      const firstId = await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "Old product",
        userId: ownerId,
      })
      const first = await ctx.db.get(firstId)
      await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "New product",
        userId: ownerId,
      })
      return { firstTime: first!._creationTime }
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      search: "product",
      dateTo: ids.firstTime,
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].description).toBe("Old product")
  })

  it("combines dateFrom and dateTo together", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const ids = await t.run(async (ctx) => {
      const firstId = await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "Old product",
        userId: ownerId,
      })
      const first = await ctx.db.get(firstId)
      const secondId = await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "Middle product",
        userId: ownerId,
      })
      const second = await ctx.db.get(secondId)
      await ctx.db.insert("auditLogs", {
        action: "product_create",
        description: "New product",
        userId: ownerId,
      })
      return {
        firstTime: first!._creationTime,
        secondTime: second!._creationTime,
      }
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      dateFrom: ids.firstTime,
      dateTo: ids.secondTime,
    })

    expect(result.page).toHaveLength(2)
    expect(result.page.map((log) => log.description)).toEqual([
      "Middle product",
      "Old product",
    ])
  })

  it("returns empty page when filters match nothing", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createAuditLog(t, {
      userId: ownerId,
      action: "product_create",
      description: "Created product",
    })

    const result = await t.query(api.auditLogs.queries.list, {
      paginationOpts: defaultPagination,
      action: "stock_in",
      dateFrom: Date.now(),
    })

    expect(result.page).toHaveLength(0)
  })

  // ── getById ────────────────────────────────────────────────

  describe("getById", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      const phantomId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("auditLogs", {
          action: "temp",
          description: "temp",
        })
        await ctx.db.delete(id)
        return id
      })

      await expect(
        t.query(api.auditLogs.queries.getById, { logId: phantomId })
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects non-owners", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      const phantomId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("auditLogs", {
          action: "temp",
          description: "temp",
        })
        await ctx.db.delete(id)
        return id
      })

      await expect(
        t.query(api.auditLogs.queries.getById, { logId: phantomId })
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns userEmail and userRole for getById", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const logId = await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product X",
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.getById, { logId })

      expect(result).toMatchObject({
        action: "product_create",
        description: "Created product X",
        userName: "Owner",
        userEmail: "owner@test.com",
        userRole: "owner",
      })
    })

    it("returns resourceType and resourceId when present", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const logId = await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product",
        resourceType: "products",
        resourceId: "prod_123",
      })

      const result = await t.query(api.auditLogs.queries.getById, { logId })

      expect(result).toMatchObject({
        resourceType: "products",
        resourceId: "prod_123",
      })
    })

    it("returns a single audit log entry", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const logId = await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product X",
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.getById, { logId })

      expect(result).toMatchObject({
        action: "product_create",
        description: "Created product X",
        userName: "Owner",
      })
    })

    it("returns null for non-existent log", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })

      const phantomId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("auditLogs", {
          action: "temp",
          description: "temp",
        })
        await ctx.db.delete(id)
        return id
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.getById, {
        logId: phantomId,
      })

      expect(result).toBeNull()
    })

    it("sets userName to null when userId is not set", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })

      const logId = await createAuditLog(t, {
        action: "auth_sign_in_failed",
        description: "Failed login",
      })

      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.getById, { logId })

      expect(result?.userName).toBeNull()
    })
  })

  // ── listByUser ─────────────────────────────────────────────

  describe("listByUser", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.auditLogs.queries.listByUser, {
          paginationOpts: defaultPagination,
        })
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects deactivated users", async () => {
      const t = makeTest()
      const deactivatedId = await createUser(t, {
        email: "inactive@test.com",
        name: "Inactive",
        role: "staff",
        status: "deactivated",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(deactivatedId)

      await expect(
        t.query(api.auditLogs.queries.listByUser, {
          paginationOpts: defaultPagination,
        })
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns only the caller's audit logs", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Owner action",
      })
      await createAuditLog(t, {
        userId: staffId,
        action: "product_create",
        description: "Staff action",
      })

      const result = await t.query(api.auditLogs.queries.listByUser, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].description).toBe("Staff action")
      expect(result.page[0].userName).toBe("Staff")
    })

    it("returns empty page when user has no logs", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      const result = await t.query(api.auditLogs.queries.listByUser, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(0)
    })

    it("works for staff users", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await createAuditLog(t, {
        userId: staffId,
        action: "product_create",
        description: "Staff created product",
      })

      const result = await t.query(api.auditLogs.queries.listByUser, {
        paginationOpts: defaultPagination,
      })

      expect(result.page).toHaveLength(1)
    })
  })

  // ── listActions ────────────────────────────────────────────

  describe("listActions", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.auditLogs.queries.listActions, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects non-owners", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await expect(
        t.query(api.auditLogs.queries.listActions, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns distinct sorted action names", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stock in",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Create",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Create another",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "auth_login",
        description: "Login",
      })

      const result = await t.query(api.auditLogs.queries.listActions, {})

      expect(result).toEqual(["auth_login", "product_create", "stock_in"])
    })

    it("returns empty array when no audit logs exist", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.listActions, {})

      expect(result).toEqual([])
    })

    it("returns distinct sorted actions ignoring order of inserts", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "z_action",
        description: "Z",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "a_action",
        description: "A",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "m_action",
        description: "M",
      })

      const result = await t.query(api.auditLogs.queries.listActions, {})

      expect(result).toEqual(["a_action", "m_action", "z_action"])
    })
  })

  // ── exportCsv ──────────────────────────────────────────────

  describe("exportCsv", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.auditLogs.queries.exportCsv, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects non-owners", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await expect(
        t.query(api.auditLogs.queries.exportCsv, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns CSV string with BOM for owners", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product A",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {})

      expect(result.startsWith("\uFEFF")).toBe(true)
      expect(result).toContain("product_create")
      expect(result).toContain("Owner")
      expect(result).toContain("owner@test.com")
    })

    it("includes header row", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.exportCsv, {})

      const lines = result.split("\n")
      expect(lines[0]).toContain("Action")
      expect(lines[0]).toContain("Description")
    })

    it("includes resourceType and resourceId columns", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "With resource",
        resourceType: "products",
        resourceId: "abc123",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {})

      expect(result).toContain("products")
      expect(result).toContain("abc123")
    })

    it("filters by action in CSV export", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stock in",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Create product",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {
        action: "stock_in",
      })

      expect(result).toContain("stock_in")
      expect(result).not.toContain("product_create")
    })

    it("returns header only when no logs match", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const result = await t.query(api.auditLogs.queries.exportCsv, {})

      const lines = result.trim().split("\n")
      expect(lines).toHaveLength(1)
    })

    it("filters CSV export by search matching action", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stocked inventory",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {
        search: "stock",
      })

      expect(result).not.toContain("product_create")
      expect(result).toContain("stock_in")
    })

    it("filters CSV export by search matching description", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created a rope product",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stocked bags",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {
        search: "rope",
      })

      expect(result).toContain("Created a rope product")
      expect(result).not.toContain("Stocked bags")
    })

    it("filters CSV export by dateFrom and dateTo", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const ids = await t.run(async (ctx) => {
        const firstId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Old product",
          userId: ownerId,
        })
        const first = await ctx.db.get(firstId)
        const secondId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Middle product",
          userId: ownerId,
        })
        const second = await ctx.db.get(secondId)
        await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "New product",
          userId: ownerId,
        })
        return {
          firstTime: first!._creationTime,
          secondTime: second!._creationTime,
        }
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {
        dateFrom: ids.firstTime,
        dateTo: ids.secondTime,
      })

      expect(result).toContain("Middle product")
      expect(result).toContain("Old product")
      expect(result).not.toContain("New product")
    })

    it("returns header only when CSV search has no matches", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product",
      })

      const result = await t.query(api.auditLogs.queries.exportCsv, {
        search: "nonexistent",
      })

      const lines = result.trim().split("\n")
      expect(lines).toHaveLength(1)
    })
  })

  // ── exportData ──────────────────────────────────────────────

  describe("exportData", () => {
    it("rejects unauthenticated", async () => {
      const t = makeTest()
      authMocks.getAuthUserId.mockResolvedValueOnce(null)

      await expect(
        t.query(api.auditLogs.queries.exportData, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("rejects non-owners", async () => {
      const t = makeTest()
      const staffId = await createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

      await expect(
        t.query(api.auditLogs.queries.exportData, {})
      ).rejects.toThrowError("Unauthorized")
    })

    it("returns enriched log array for owners", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product A",
      })

      const result = await t.query(api.auditLogs.queries.exportData, {})

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty("action", "product_create")
      expect(result[0]).toHaveProperty("userName", "Owner")
      expect(result[0]).toHaveProperty("userEmail", "owner@test.com")
      expect(result[0]).toHaveProperty("userRole", "owner")
      expect(result[0]).toHaveProperty("description", "Created product A")
    })

    it("filters by action", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stock in",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Create product",
      })

      const result = await t.query(api.auditLogs.queries.exportData, {
        action: "stock_in",
      })

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe("stock_in")
    })

    it("filters by search", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created a rope product",
      })
      await createAuditLog(t, {
        userId: ownerId,
        action: "stock_in",
        description: "Stocked bags",
      })

      const result = await t.query(api.auditLogs.queries.exportData, {
        search: "rope",
      })

      expect(result).toHaveLength(1)
      expect(result[0].description).toContain("rope")
    })

    it("filters by date range", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      const ids = await t.run(async (ctx) => {
        const firstId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Old product",
          userId: ownerId,
        })
        const first = await ctx.db.get(firstId)
        const secondId = await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "Middle product",
          userId: ownerId,
        })
        const second = await ctx.db.get(secondId)
        await ctx.db.insert("auditLogs", {
          action: "product_create",
          description: "New product",
          userId: ownerId,
        })
        return {
          firstTime: first!._creationTime,
          secondTime: second!._creationTime,
        }
      })

      const result = await t.query(api.auditLogs.queries.exportData, {
        dateFrom: ids.firstTime,
        dateTo: ids.secondTime,
      })

      expect(result).toHaveLength(2)
      expect(result.some((l) => l.description === "Old product")).toBe(true)
      expect(result.some((l) => l.description === "Middle product")).toBe(true)
      expect(result.some((l) => l.description === "New product")).toBe(false)
    })

    it("returns empty array when no logs match", async () => {
      const t = makeTest()
      const ownerId = await createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      })
      authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

      await createAuditLog(t, {
        userId: ownerId,
        action: "product_create",
        description: "Created product",
      })

      const result = await t.query(api.auditLogs.queries.exportData, {
        search: "nonexistent",
      })

      expect(result).toHaveLength(0)
    })
  })
})
