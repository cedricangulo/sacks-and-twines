import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  createAccount: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./auditLogs/mutations.ts": () => import("../auditLogs/mutations"),
  "./users/queries.ts": () => import("./queries"),
  "./users/mutations.ts": () => import("./mutations"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
    createAccount: authMocks.createAccount,
  }
})

describe("user mutations", () => {
  function makeTest() {
    const t = convexTest({ schema, modules })
    registerRateLimiter(t as never)
    return t
  }

  beforeEach(() => {
    authMocks.getAuthUserId.mockReset()
    authMocks.createAccount.mockReset()
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

  it("rejects unauthenticated staff creation", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      })
    ).rejects.toThrowError("Unauthorized")
  })

  it("rejects staff creation for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "caller@test.com",
      name: "Staff Caller",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      })
    ).rejects.toThrowError("Only owners can perform this action")
  })

  it("rejects creation with invalid email", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "not-an-email",
        password: "password123",
      })
    ).rejects.toThrow()
  })

  it("rejects creation with short name", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "",
        email: "staff@test.com",
        password: "password123",
      })
    ).rejects.toThrow()
  })

  it("creates a staff user and audit log for owners", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)
    authMocks.createAccount.mockImplementation(async (ctx, args) => {
      const userId = await (
        ctx as {
          db: {
            insert: (
              table: "users",
              value: Record<string, unknown>
            ) => Promise<unknown>
          }
        }
      ).db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        role: args.profile.role,
        status: args.profile.status,
      })
      return {
        user: { _id: userId, ...args.profile },
        account: {},
      }
    })

    const result = await t.mutation(api.users.mutations.create, {
      name: "New Staff",
      email: "staff@test.com",
      password: "password123",
    })

    expect(result).toMatchObject({
      _id: expect.any(String),
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
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "user_create"))
        .first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "user_create",
      description: "Created staff staff@test.com",
    })
  })

  it("rejects creating user with duplicate email", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    await createUser(t, {
      email: "staff@test.com",
      name: "Existing Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      })
    ).rejects.toThrowError("A user with this email already exists")
  })

  it("rejects creating user with short password", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "1234567",
      })
    ).rejects.toThrowError("Password must be at least 8 characters")
  })

  it("blocks createUser after exhausting per-user rate limit", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockImplementation(async () => ownerId)
    authMocks.createAccount.mockImplementation(async (ctx, args) => {
      const userId = await (
        ctx as {
          db: { insert: (table: string, value: unknown) => Promise<string> }
        }
      ).db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        role: args.profile.role,
        status: args.profile.status,
      })
      return {
        user: { _id: userId, ...args.profile },
        account: {},
      }
    })

    for (let i = 0; i < 10; i++) {
      await t.mutation(api.users.mutations.create, {
        name: `Staff ${i}`,
        email: `staff${i}@test.com`,
        password: "Password1!",
      })
    }

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "Blocked Staff",
        email: "blocked@test.com",
        password: "Password1!",
      })
    ).rejects.toMatchObject({ data: { kind: "RateLimited" } })
  })

  // ── Deactivate ────────────────────────────────────────────

  it("deactivates staff users and writes an audit log", async () => {
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
        name: "Staff User",
        role: "staff",
        status: "active",
      }),
    ])

    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.mutation(api.users.mutations.deactivate, {
      userId: staffId,
    })
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
      return await ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("action"), "user_deactivate"))
        .first()
    })

    expect(auditLog).toMatchObject({
      userId: ownerId,
      action: "user_deactivate",
      description: "Deactivated user staff@test.com",
    })
  })

  it("rejects deactivating non-existent user", async () => {
    const t = makeTest()
    const [ownerId, phantomId] = await Promise.all([
      createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      }),
      t.run(async (ctx) => {
        const id = await ctx.db.insert("users", {
          email: "phantom@test.com",
          role: "staff",
          status: "active",
        })
        await ctx.db.delete(id)
        return id
      }),
    ])
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.users.mutations.deactivate, {
        userId: phantomId,
      })
    ).rejects.toThrowError("User not found")
  })

  it("rejects deactivating owner user", async () => {
    const t = makeTest()
    const [ownerId, otherOwnerId] = await Promise.all([
      createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "active",
      }),
      createUser(t, {
        email: "owner2@test.com",
        name: "Other Owner",
        role: "owner",
        status: "active",
      }),
    ])
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.users.mutations.deactivate, {
        userId: otherOwnerId,
      })
    ).rejects.toThrowError("Can only deactivate staff users")
  })

  it("rejects self-deactivation", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.users.mutations.deactivate, {
        userId: ownerId,
      })
    ).rejects.toThrowError("You cannot deactivate yourself")
  })

  it("rejects user creation for deactivated owner", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "deactivated",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.users.mutations.create, {
        name: "New Staff",
        email: "staff@test.com",
        password: "password123",
      })
    ).rejects.toThrowError("Only owners can perform this action")
  })

  it("rejects deactivation for deactivated owner", async () => {
    const t = makeTest()
    const [ownerId, staffId] = await Promise.all([
      createUser(t, {
        email: "owner@test.com",
        name: "Owner",
        role: "owner",
        status: "deactivated",
      }),
      createUser(t, {
        email: "staff@test.com",
        name: "Staff",
        role: "staff",
        status: "active",
      }),
    ])
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await expect(
      t.mutation(api.users.mutations.deactivate, {
        userId: staffId,
      })
    ).rejects.toThrowError("Only owners can perform this action")
  })

  it("rejects deactivation for non-owner staff caller", async () => {
    const t = makeTest()
    const [staffCallerId, staffTargetId] = await Promise.all([
      createUser(t, {
        email: "staff@test.com",
        name: "Staff Caller",
        role: "staff",
        status: "active",
      }),
      createUser(t, {
        email: "other@test.com",
        name: "Other Staff",
        role: "staff",
        status: "active",
      }),
    ])
    authMocks.getAuthUserId.mockResolvedValueOnce(staffCallerId)

    await expect(
      t.mutation(api.users.mutations.deactivate, {
        userId: staffTargetId,
      })
    ).rejects.toThrowError("Only owners can perform this action")
  })
})
