import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, internal } from "../_generated/api"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  createAccount: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./users.ts": () => import("../users"),
  "./users/create.ts": () => import("./create"),
  "./users/deactivate.ts": () => import("./deactivate"),
  "./users/list.ts": () => import("./list"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
    createAccount: authMocks.createAccount,
  }
})

describe("staff management", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
    authMocks.createAccount.mockReset()
  })

  async function createTestUser(
    t: ReturnType<typeof convexTest>,
    user: { email: string; name: string; role: "owner" | "staff"; status: "active" | "deactivated" },
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", user)
    })
  }

  it("lists only staff users", async () => {
    const t = makeTest()

    await createTestUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    await createTestUser(t, {
      email: "staff@test.com",
      name: "Staff User",
      role: "staff",
      status: "active",
    })

    const result = await t.query(api.users.list.list)

    expect(result).toHaveLength(1)
    expect(result[0]?.profile).toMatchObject({
      email: "staff@test.com",
      name: "Staff User",
      role: "staff",
      status: "active",
    })
  })

  it("rejects unauthenticated staff creation", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.users.create.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      }),
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff creation for non-owners", async () => {
    const t = makeTest()
    const staffId = await createTestUser(t, {
      email: "caller@test.com",
      name: "Staff Caller",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(
      t.mutation(api.users.create.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      }),
    ).rejects.toThrowError("Only owners can create staff users")
  })

  it("creates a staff user and audit log for owners", async () => {
    const t = makeTest()
    const ownerId = await createTestUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)
    authMocks.createAccount.mockImplementation(async (ctx, args) => {
      const userId = await (ctx as { db: { insert: (table: "users", value: Record<string, unknown>) => Promise<unknown> } }).db.insert(
        "users",
        {
          email: args.profile.email,
          name: args.profile.name,
          role: args.profile.role,
          status: args.profile.status,
        },
      )
      return { _id: userId, ...args.profile }
    })

    const result = await t.mutation(api.users.create.create, {
      name: "New Staff",
      email: "staff@test.com",
      password: "password123",
    })

    expect(result).toMatchObject({
      email: "staff@test.com",
      name: "New Staff",
      role: "staff",
      status: "active",
    })

    const createdUser = await t.query(async (ctx) => {
      return await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), "staff@test.com"))
        .first()
    })

    expect(createdUser).toMatchObject({
      email: "staff@test.com",
      name: "New Staff",
      role: "staff",
      status: "active",
    })

    const auditLog = await t.query(async (ctx) => {
      return await ctx.db.query("auditLogs").filter((q) => q.eq(q.field("action"), "user_create")).first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "user_create",
      description: "Created staff staff@test.com",
    })
  })

  it("deactivates staff users and writes an audit log", async () => {
    const t = makeTest()
    const ownerId = await createTestUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    const staffId = await createTestUser(t, {
      email: "staff@test.com",
      name: "Staff User",
      role: "staff",
      status: "active",
    })

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.mutation(api.users.deactivate.deactivate, { userId: staffId })
    expect(result).toBe(true)

    const staffUser = await t.query(async (ctx) => {
      return await ctx.db.get(staffId)
    })

    expect(staffUser).toMatchObject({
      email: "staff@test.com",
      role: "staff",
      status: "deactivated",
    })

    const auditLog = await t.query(async (ctx) => {
      return await ctx.db.query("auditLogs").filter((q) => q.eq(q.field("action"), "user_deactivate")).first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "user_deactivate",
      description: "Deactivated user staff@test.com",
    })
  })

  it("allows the owner lookup query to find a user by email", async () => {
    const t = makeTest()
    await createTestUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })

    const owner = await t.query(internal.users.getOwnerByEmail, {
      email: "owner@test.com",
    })

    expect(owner).toMatchObject({
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
  })
})