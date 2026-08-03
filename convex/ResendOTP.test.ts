import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ActionCtx } from "./_generated/server"

const sent: Array<{ to: string[]; from: string; subject: string }> = []

vi.mock("resend", () => {
  return {
    Resend: class {
      constructor(_apiKey?: string) {}
      emails = {
        send: async (payload: {
          to: string[]
          from: string
          subject: string
        }) => {
          sent.push(payload)
          return { data: { id: "test" }, error: null }
        },
      }
    },
  }
})

const { ResendOTP } = await import("./ResendOTP")

type User = {
  email: string
  role: "owner" | "staff"
  status: "active" | "deactivated"
}

function makeCtx(users: User[], owner: User | null): ActionCtx {
  return {
    runQuery: vi.fn(async (_query: unknown, args: unknown) => {
      const { email } = (args ?? {}) as { email?: string }
      if (typeof email === "string") {
        return users.find((u) => u.email === email) ?? null
      }
      return owner
    }),
  } as unknown as ActionCtx
}

async function sendOtp(
  ctx: ActionCtx | undefined,
  opts?: { identifier?: string; token?: string }
) {
  await (
    ResendOTP.sendVerificationRequest as unknown as (
      params: {
        identifier: string
        provider: { apiKey?: string }
        token: string
      },
      ctx?: ActionCtx
    ) => Promise<void>
  )(
    {
      identifier: opts?.identifier ?? "user@test.com",
      provider: { apiKey: "test-key" },
      token: opts?.token ?? "12345678",
    },
    ctx
  )
}

describe("ResendOTP.sendVerificationRequest routing", () => {
  beforeEach(() => {
    sent.length = 0
  })

  it("sends the code to the sign-in email when no ctx is available", async () => {
    await sendOtp(undefined, { identifier: "owner@test.com" })

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toEqual(["owner@test.com"])
  })

  it("sends the code to the owner's own email for owner sign-ins", async () => {
    const owner: User = {
      email: "owner@test.com",
      role: "owner",
      status: "active",
    }
    const ctx = makeCtx([owner], owner)

    await sendOtp(ctx, { identifier: "owner@test.com" })

    expect(sent[0].to).toEqual(["owner@test.com"])
  })

  it("routes staff OTPs to the owner's email", async () => {
    const owner: User = {
      email: "owner@test.com",
      role: "owner",
      status: "active",
    }
    const staff: User = {
      email: "staff@test.com",
      role: "staff",
      status: "active",
    }
    const ctx = makeCtx([owner, staff], owner)

    await sendOtp(ctx, { identifier: "staff@test.com" })

    expect(sent[0].to).toEqual(["owner@test.com"])
  })

  it("falls back to the staff email when no owner exists", async () => {
    const staff: User = {
      email: "staff@test.com",
      role: "staff",
      status: "active",
    }
    const ctx = makeCtx([staff], null)

    await sendOtp(ctx, { identifier: "staff@test.com" })

    expect(sent[0].to).toEqual(["staff@test.com"])
  })

  it("falls back to the sign-in email when the user is not found", async () => {
    const ctx = makeCtx([], null)

    await sendOtp(ctx, { identifier: "unknown@test.com" })

    expect(sent[0].to).toEqual(["unknown@test.com"])
  })

  it("does not call the owner lookup for owner sign-ins", async () => {
    const owner: User = {
      email: "owner@test.com",
      role: "owner",
      status: "active",
    }
    const ctx = makeCtx([owner], owner)
    const runQuery = ctx.runQuery as unknown as ReturnType<typeof vi.fn>

    await sendOtp(ctx, { identifier: "owner@test.com" })

    const ownerLookupCalls = runQuery.mock.calls.filter(
      ([, args]) => Object.keys((args ?? {}) as object).length === 0
    )
    expect(ownerLookupCalls).toHaveLength(0)
  })
})
