import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"

const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./auth/logAttempt.ts": () => import("./logAttempt"),
  "./users/queries.ts": () => import("../users/queries"),
}

describe("logAttempt", () => {
  function makeTest() {
    return convexTest({ schema, modules })
  }

  async function seedUser(
    t: ReturnType<typeof convexTest>,
    overrides?: Partial<{
      email: string
      name: string
      role: "owner" | "staff"
      status: "active" | "deactivated"
    }>
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: overrides?.email ?? "user@test.com",
        name: overrides?.name ?? "Test User",
        role: overrides?.role ?? "owner",
        status: overrides?.status ?? "active",
      })
    })
  }

  // ── Happy Path ─────────────────────────────────────────────

  it("logs auth_sign_in for existing user with all fields", async () => {
    const t = makeTest()
    const userId = await seedUser(t, { email: "owner@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "owner@test.com",
      resourceType: "user",
      userAgent: "Mozilla/5.0 Test Browser",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      userId,
      action: "auth_sign_in",
      resourceType: "user",
      resourceId: userId,
      userAgent: "Mozilla/5.0 Test Browser",
    })

    const desc = JSON.parse(logs[0].description)
    expect(desc).toMatchObject({
      summary: "User owner@test.com signed in",
      details: { email: "owner@test.com" },
    })
  })

  it("logs auth_sign_in_failed for existing user", async () => {
    const t = makeTest()
    const userId = await seedUser(t, { email: "failed@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "failed@test.com",
      resourceType: "user",
      userAgent: "test-agent",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      userId,
      action: "auth_sign_in_failed",
      resourceType: "user",
      resourceId: userId,
    })

    const desc = JSON.parse(logs[0].description)
    expect(desc).toMatchObject({
      summary: "Failed sign-in for failed@test.com",
      details: { email: "failed@test.com" },
    })
  })

  // ── Unknown Email ──────────────────────────────────────────

  it("logs with undefined userId for non-existent email", async () => {
    const t = makeTest()
    await seedUser(t, { email: "real@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "unknown@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeUndefined()
    expect(logs[0].resourceId).toBeUndefined()
  })

  it("logs with undefined userId for completely empty database", async () => {
    const t = makeTest()

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "nobody@test.com",
      resourceType: "user",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeUndefined()
  })

  // ── Optional Args Combinations ─────────────────────────────

  it("logs without optional resourceType and userAgent", async () => {
    const t = makeTest()
    await seedUser(t)

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "user@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].resourceType).toBeUndefined()
    expect(logs[0].userAgent).toBeUndefined()
  })

  it("logs with only resourceType", async () => {
    const t = makeTest()
    await seedUser(t)

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "user@test.com",
      resourceType: "user",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].resourceType).toBe("user")
    expect(logs[0].userAgent).toBeUndefined()
  })

  it("logs with only userAgent", async () => {
    const t = makeTest()
    await seedUser(t)

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "user@test.com",
      userAgent: "curl/8.0",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].resourceType).toBeUndefined()
    expect(logs[0].userAgent).toBe("curl/8.0")
  })

  // ── Multiple Logs ──────────────────────────────────────────

  it("logs multiple attempts for the same email", async () => {
    const t = makeTest()
    const userId = await seedUser(t, { email: "target@test.com" })

    for (let i = 0; i < 3; i++) {
      await t.mutation(api.auth.logAttempt.logAttempt, {
        action: "auth_sign_in_failed",
        email: "target@test.com",
      })
    }

    const logs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "auth_sign_in_failed"))
        .collect()
    })

    expect(logs).toHaveLength(3)
    for (const log of logs) {
      expect(log.userId).toBe(userId)
      expect(log.resourceId).toBe(userId)
    }
  })

  it("logs different outcomes for the same email", async () => {
    const t = makeTest()
    const userId = await seedUser(t, { email: "mixed@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "mixed@test.com",
    })
    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "mixed@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(2)
    expect(logs[0].action).toBe("auth_sign_in_failed")
    expect(logs[1].action).toBe("auth_sign_in")
    expect(logs[0].userId).toBe(userId)
    expect(logs[1].userId).toBe(userId)
  })

  // ── Edge Cases ─────────────────────────────────────────────

  it("handles email with special characters", async () => {
    const t = makeTest()
    const email = "test+tag@example.com"
    await seedUser(t, { email })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email,
      userAgent: "special-chars-test",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeDefined()
    const desc = JSON.parse(logs[0].description)
    expect(desc.details.email).toBe(email)
  })

  it("handles empty string email gracefully", async () => {
    const t = makeTest()

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeUndefined()
  })

  it("handles very long email gracefully", async () => {
    const t = makeTest()
    const email = "a".repeat(64) + "@" + "b".repeat(200) + ".com"
    await seedUser(t, { email })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email,
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeDefined()
  })

  it("handles unicode email characters", async () => {
    const t = makeTest()
    const email = "üser@test.com"
    await seedUser(t, { email })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email,
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].userId).toBeDefined()
  })

  // ── Action Values ──────────────────────────────────────────

  it("accepts any string as action", async () => {
    const t = makeTest()

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "custom_action_123",
      email: "any@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("custom_action_123")
  })

  it("accepts uppercase action strings", async () => {
    const t = makeTest()

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "AUTH_SIGN_IN",
      email: "any@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("AUTH_SIGN_IN")
  })

  // ── Description Structure ──────────────────────────────────

  it("stores description as JSON for sign-in", async () => {
    const t = makeTest()
    await seedUser(t, { email: "json@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in",
      email: "json@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    const desc = JSON.parse(logs[0].description)
    expect(desc).toHaveProperty("summary")
    expect(desc).toHaveProperty("details")
    expect(desc.details).toHaveProperty("email", "json@test.com")
    expect(desc.summary).toContain("signed in")
  })

  it("stores description as JSON for failed sign-in", async () => {
    const t = makeTest()
    await seedUser(t, { email: "jsonfail@test.com" })

    await t.mutation(api.auth.logAttempt.logAttempt, {
      action: "auth_sign_in_failed",
      email: "jsonfail@test.com",
    })

    const logs = await t.run(async (ctx) => {
      return await ctx.db.query("auditLogs").collect()
    })

    const desc = JSON.parse(logs[0].description)
    expect(desc).toHaveProperty("summary")
    expect(desc).toHaveProperty("details")
    expect(desc.details).toHaveProperty("email", "jsonfail@test.com")
    expect(desc.summary).toContain("Failed sign-in")
  })
})
