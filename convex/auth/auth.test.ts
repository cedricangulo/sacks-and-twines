import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { Scrypt } from "lucia"
import { beforeAll, describe, expect, it } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"
import { ERROR_MESSAGES, verifyCredentials } from "./verify"

const TEST_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCkMdkcjNNTa0Xm
RfCNV4TizX1hwuC0OivDBIYh4fQ6k1uNHUtMTxcV/Jmp1CzlnRvvmgZJhOBEu1VF
/YoJwRF0i06aIkBoLLR/JLYNYUER2GsS0HY2w/aWGEStUDm+JdrjDA5zkxz/wRwF
i1MdnUfwxc3t3gJqSt0XsFtf8tMF5lt127tGlY1CdJsIl9iKmnMN5ZekVBhKqfTc
g2yNx8RicvZ7qUF3FyV9zKJBQeazqg6e6rFkSTTeRM6NS3sPsOqrVOmimSDcmriZ
h98J8Xh7WSqJ54TXmxE/Q1hKYZJm391WNniEe7lGU0zbkMvltsQu+pZUnfOnaDG+
P2vr2eMvAgMBAAECggEADSMpPPM47AwW5qrNPsc0Nwq8BSNuOTK3p6iSrDQDsjVy
IM3+5VclVg6vo3qk26ZWGDYEWhjgnNSO/m+f03yizzwKM6OZRac2Cz+TtWmvps7g
b6aa9BzP0QiWDiFEzXsCksy3J0uBCXxDqAnoF47VtQ+5P1arw3duozjqxrg2EYWm
OtFwAkT0FSs8xgE3ymUtGJoL/4h6Nm7VLOsWj9Mo55xKOooj2hwgqtVjF4B4nw64
mX3LvS4rpBMF4Txbl5rSd1TfOC0QHtTDplfl5pF60YOdqvVWJOXlDzXpnAdAKnCy
NojEhkBN2skvhi3XOuaJVTcsRVL7ocDKimnoQB07YQKBgQDkzoMBqh/iRT515u37
Nj8UIqPPPcaLtz89Akkxou+41eF0qVbm1ChRMdKwU32Idt9IWDZe+xf8PzRW46w3
JFMiXbIj+/eauez0xWoSBBzEGUZiNIs8Pd6KWwj8VO6Z3BH+nwdxR3UJ9hk+S7z2
C+R0rNU6tee014qJVz5D7wAQfwKBgQC3tYEsYwxYIl1iLaADRBGUHKgZI15aEST9
F64TIfW9ye03ec7Py08IjZ8Tr4aOEoNI+bHWSxctBciOf4K+/5tTYt9lmg3Pb9qT
Q02uoitHDq65PG3apQdGDWbLgDy4sx7hcDL/BPB7gpdzxAxEvEvc6/si/wG1S/Ka
l6QFw2XVUQKBgQC4fuDaPcDZ5jXYQi6RSwuQA+KMoGZxkIBYhHhaouSj6SqTtFxT
Yq1j00XtUlU97YRbxG2LJvMPPjPJAGqESDEU2/Jh27GrPNKaCHlgL5q2cR703yOK
nuTMMV3MgfunavHDm54XtKPmNV/jgJTM3YgIoLiLT9SXWNnnpsaZZqVppwKBgQC2
OaxM3F+VWVlKlzl/o9jQE/EHJpdkPldzmza4kdpDDfd6LSDh7KmUMW9Xxqhxa5nB
HLa0fD4cEf2UpJWcQs7f01cIYN1MJIcrxvpavVCyprTY2EGcPlFNwuNx/9271SpP
s81SPKMT0UHMuu70i9ew6IBwgYY/QXwAr2UrtlzgUQKBgFliTIDf2IkkvVx4WY9I
3DPkT/61Wmc4YyypYual/M7gMZRrn1sNq8pWVLOfzs32FlIWK4VcItFA22S2ZyeT
fCbB4M0WAVI1dMWRp3nEMADi+9H4h8w284lqZLQ8rY70hn9u7wrbtXpIrKMVopHo
dqPjqugVberP3kfqBBWUpFBg
-----END PRIVATE KEY-----`

beforeAll(() => {
  process.env.JWT_PRIVATE_KEY = TEST_RSA_PRIVATE_KEY
  process.env.CONVEX_SITE_URL = "http://localhost:5173"
  process.env.SITE_URL = "http://localhost:5173"
})

// ── Unit tests: verifyCredentials (pure, no Convex) ───────────

describe("verifyCredentials", () => {
  it("passes with valid signIn flow and credentials", () => {
    expect(() =>
      verifyCredentials({
        flow: "signIn",
        email: "a@b.com",
        password: "secret",
      })
    ).not.toThrow()
  })

  it("rejects unsupported flow (signUp)", () => {
    expect(() =>
      verifyCredentials({
        flow: "signUp",
        email: "a@b.com",
        password: "secret",
      })
    ).toThrow("Unsupported auth flow: signUp")
  })

  it("rejects unsupported flow (empty)", () => {
    expect(() =>
      verifyCredentials({ flow: "", email: "a@b.com", password: "secret" })
    ).toThrow("Unsupported auth flow: ")
  })

  it("rejects empty email", () => {
    expect(() =>
      verifyCredentials({ flow: "signIn", email: "", password: "secret" })
    ).toThrow(ERROR_MESSAGES.REQUIRED)
  })

  it("rejects empty password", () => {
    expect(() =>
      verifyCredentials({ flow: "signIn", email: "a@b.com", password: "" })
    ).toThrow(ERROR_MESSAGES.REQUIRED)
  })

  it("rejects both empty", () => {
    expect(() =>
      verifyCredentials({ flow: "signIn", email: "", password: "" })
    ).toThrow(ERROR_MESSAGES.REQUIRED)
  })

  it("passes whitespace email (trimming is caller's responsibility)", () => {
    expect(() =>
      verifyCredentials({ flow: "signIn", email: "  ", password: "secret" })
    ).not.toThrow()
  })

  it("rejects missing email as empty string", () => {
    expect(() =>
      verifyCredentials({ flow: "signIn", email: "", password: "secret" })
    ).toThrow(ERROR_MESSAGES.REQUIRED)
  })
})

// ── ERROR_MESSAGES constants ───────────────────────────────────

describe("ERROR_MESSAGES", () => {
  it("defines all expected error message constants", () => {
    expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe("Invalid email or password")
    expect(ERROR_MESSAGES.RATE_LIMITED).toBe(
      "Too many sign-in attempts. Please try again later."
    )
    expect(ERROR_MESSAGES.REQUIRED).toBe("Email and password are required")
  })
})

// ── Integration tests: full signIn action ──────────────────────

describe("signIn action", () => {
  const SLOW = { timeout: 60_000 }
  const modules = {
    "./_generated/api.ts": () => import("../_generated/api"),
    "./_generated/server.ts": () => import("../_generated/server"),
    "./auth.ts": () => import("../auth"),
    "./auth/verify.ts": () => import("./verify"),
    "./rate_limiter.ts": () => import("../rate_limiter"),
    "./users/queries.ts": () => import("../users/queries"),
  }

  function makeTest() {
    const t = convexTest({ schema, modules })
    registerRateLimiter(t as never)
    return t
  }

  async function seedUserWithPassword(
    t: ReturnType<typeof convexTest>,
    email: string,
    password: string
  ) {
    const scrypt = new Scrypt()
    const hashedSecret = await scrypt.hash(password)
    return await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email,
        name: "Test User",
        role: "owner",
        status: "active",
      })
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: email,
        secret: hashedSecret,
      })
      return userId
    })
  }

  // Scenario 3: Correct credentials → success
  it("succeeds with correct email and password", SLOW, async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "correct@test.com", "my-password")

    const result = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        flow: "signIn",
        email: "correct@test.com",
        password: "my-password",
      },
    })

    expect(result).toHaveProperty("tokens")
    expect(result.tokens).not.toBeNull()
  })

  // Scenario 4: Wrong password, known email (≤10 attempts) → throw
  it("throws invalid credentials for wrong password", SLOW, async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "wrongpass@test.com", "correct-password")

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signIn",
          email: "wrongpass@test.com",
          password: "wrong-password",
        },
      })
    ).rejects.toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS)
  })

  // Scenario 6: Non-existent email (≤10 attempts) → throw
  it("throws invalid credentials for non-existent email", SLOW, async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "exists@test.com", "pw")

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signIn",
          email: "nobody@test.com",
          password: "anything",
        },
      })
    ).rejects.toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS)
  })

  // Missing email → throws required error
  it("throws required error when email is empty", async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "any@test.com", "pw")

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: { flow: "signIn", email: "", password: "anything" },
      })
    ).rejects.toThrow(ERROR_MESSAGES.REQUIRED)
  })

  // Missing password → throws required error
  it("throws required error when password is empty", async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "any@test.com", "pw")

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: { flow: "signIn", email: "any@test.com", password: "" },
      })
    ).rejects.toThrow(ERROR_MESSAGES.REQUIRED)
  })

  // Unsupported flow
  it("throws unsupported flow error", async () => {
    const t = makeTest()
    await seedUserWithPassword(t, "any@test.com", "pw")

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: { flow: "signUp", email: "any@test.com", password: "pw" },
      })
    ).rejects.toThrow("Unsupported auth flow: signUp")
  })

  // Scenario 5+7: Rate limiting — 11 failed attempts should be blocked
  it(
    "rate limits after 10 failed attempts per email",
    SLOW,
    async () => {
      const t = makeTest()
      await seedUserWithPassword(t, "ratelimit@test.com", "correct-pw")

      const attempt = (password: string) =>
        t.action(api.auth.signIn, {
          provider: "password",
          params: { flow: "signIn", email: "ratelimit@test.com", password },
        })

      for (let i = 0; i < 10; i++) {
        await expect(attempt("wrong-" + i)).rejects.toThrow(
          ERROR_MESSAGES.INVALID_CREDENTIALS
        )
      }

      await expect(attempt("wrong-11")).rejects.toThrow(
        ERROR_MESSAGES.RATE_LIMITED
      )
    })

  // Scenario 9: Different email has independent rate limit bucket
  it(
    "different emails have separate rate limit buckets",
    SLOW,
    async () => {
      const t = makeTest()
      await seedUserWithPassword(t, "bucket1@test.com", "pw1")
      await seedUserWithPassword(t, "bucket2@test.com", "pw2")

      for (let i = 0; i < 10; i++) {
        await expect(
          t.action(api.auth.signIn, {
            provider: "password",
            params: {
              flow: "signIn",
              email: "bucket1@test.com",
              password: "wrong",
            },
          })
        ).rejects.toThrow()
      }

      await expect(
        t.action(api.auth.signIn, {
          provider: "password",
          params: {
            flow: "signIn",
            email: "bucket1@test.com",
            password: "wrong",
          },
        })
      ).rejects.toThrow(ERROR_MESSAGES.RATE_LIMITED)

      await expect(
        t.action(api.auth.signIn, {
          provider: "password",
          params: {
            flow: "signIn",
            email: "bucket2@test.com",
            password: "pw2",
          },
        })
      ).resolves.toHaveProperty("tokens")
    })

  // Scenario 8: Successful sign-in resets rate limit counter
  it(
    "resets rate limit on successful sign-in",
    SLOW,
    async () => {
      const t = makeTest()
      await seedUserWithPassword(t, "reset@test.com", "correct-pw")

      const attempt = (password: string) =>
        t.action(api.auth.signIn, {
          provider: "password",
          params: { flow: "signIn", email: "reset@test.com", password },
        })

      for (let i = 0; i < 5; i++) {
        await expect(attempt("wrong-" + i)).rejects.toThrow()
      }

      const result = await attempt("correct-pw")
      expect(result.tokens).not.toBeNull()

      for (let i = 0; i < 10; i++) {
        await expect(attempt("wrong-" + (10 + i))).rejects.toThrow(
          ERROR_MESSAGES.INVALID_CREDENTIALS
        )
      }

      await expect(attempt("wrong-final")).rejects.toThrow(
        ERROR_MESSAGES.RATE_LIMITED
      )
    })
})
