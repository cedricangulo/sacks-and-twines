import { convexTest } from "convex-test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api, internal } from "../_generated/api"
import schema from "../schema"

const authMocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
}))

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./users/queries.ts": () => import("./queries"),
}

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>()

  return {
    ...actual,
    getAuthUserId: authMocks.getAuthUserId,
  }
})

describe("user queries", () => {
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

  it("rejects unauthenticated list", async () => {
    const t = makeTest()
    authMocks.getAuthUserId.mockResolvedValueOnce(null)

    await expect(t.query(api.users.queries.list)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("rejects list for non-owners", async () => {
    const t = makeTest()
    const staffId = await createUser(t, {
      email: "staff@test.com",
      name: "Staff",
      role: "staff",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(staffId)

    await expect(t.query(api.users.queries.list)).rejects.toThrowError(
      "Unauthorized"
    )
  })

  it("lists only staff users for owners", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createUser(t, {
      email: "staff@test.com",
      name: "Staff User",
      role: "staff",
      status: "active",
    })

    const result = await t.query(api.users.queries.list)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      email: "staff@test.com",
      name: "Staff User",
      role: "staff",
      status: "active",
    })
  })

  it("excludes owners from list", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    await createUser(t, {
      email: "staff1@test.com",
      name: "Staff One",
      role: "staff",
      status: "active",
    })
    await createUser(t, {
      email: "staff2@test.com",
      name: "Staff Two",
      role: "staff",
      status: "active",
    })

    const result = await t.query(api.users.queries.list)

    expect(result).toHaveLength(2)
    expect(result.every((u) => u.role === "staff")).toBe(true)
  })

  it("returns empty list when no staff users exist", async () => {
    const t = makeTest()
    const ownerId = await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })
    authMocks.getAuthUserId.mockResolvedValueOnce(ownerId)

    const result = await t.query(api.users.queries.list)

    expect(result).toHaveLength(0)
  })

  it("allows the owner lookup query to find a user by email", async () => {
    const t = makeTest()
    await createUser(t, {
      email: "owner@test.com",
      name: "Owner",
      role: "owner",
      status: "active",
    })

    const owner = await t.query(internal.users.queries.getOwnerByEmail, {
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
