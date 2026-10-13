import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials"
import {
  convexAuth,
  retrieveAccount,
  signInViaProvider,
} from "@convex-dev/auth/server"
import type { GenericId } from "convex/values"
import { Scrypt } from "lucia"
import { ERROR_MESSAGES, verifyCredentials } from "./auth/verify"
import { ResendOTP } from "./ResendOTP"
import { rateLimiter } from "./rate_limiter"

const passwordProvider = ConvexCredentials({
  id: "password",
  crypto: {
    hashSecret: async (secret) => await new Scrypt().hash(secret),
    verifySecret: async (secret, hash) =>
      await new Scrypt().verify(hash, secret),
  },
  extraProviders: [ResendOTP],
  authorize: async (credentials, ctx) => {
    const flow = credentials.flow as string | undefined
    const rawEmail = (credentials.email as string) ?? ""
    const email = rawEmail.trim().toLowerCase()

    verifyCredentials({
      flow: flow ?? "",
      email,
      password: (credentials.password as string) ?? "",
      code: (credentials.code as string) ?? "",
    })

    // ── Step 1: email + password ────────────────────────────────
    if (flow === "signIn") {
      const password = (credentials.password as string) ?? ""
      let accountId: GenericId<"authAccounts"> | null = null
      let userStatus: string | undefined = undefined

      try {
        const result = await retrieveAccount(ctx, {
          provider: "password",
          account: { id: email, secret: password },
        })
        accountId = result.account._id
        userStatus = result.user.status as string | undefined
      } catch {
        // wrong password — falls through to failure
      }

      if (accountId !== null) {
        if (userStatus === "deactivated") {
          throw new Error(ERROR_MESSAGES.ACCOUNT_DEACTIVATED)
        }

        await rateLimiter.reset(ctx, "signInFailed", { key: email })

        await signInViaProvider(ctx, ResendOTP, {
          accountId,
          params: credentials,
        })
        return null
      }

      // Failed attempt — consume a rate-limit token
      try {
        await rateLimiter.limit(ctx, "signInFailed", {
          key: email,
          throws: true,
        })
      } catch {
        throw new Error(ERROR_MESSAGES.RATE_LIMITED)
      }

      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS)
    }

    // ── Passwordless OTP resend ───────────────────────────────
    // Issues a fresh code to the account's own inbox. Returns null (code
    // sent, no session) — never authenticates. There is no server-side
    // proof that step 1 (password) just passed; in practice the OTP screen
    // is only reachable after it, step 1 is itself rate-limited, and this
    // endpoint only sends mail without creating a session. Unknown and
    // deactivated emails get the same null response so attackers cannot
    // enumerate accounts. Server rate limits are the real abuse gate:
    // removing the client's disabled button must not bypass them.
    if (flow === "resendOtp") {
      try {
        await rateLimiter.limit(ctx, "resendOtp", {
          key: email,
          throws: true,
        })
      } catch {
        throw new Error(ERROR_MESSAGES.RESEND_LIMITED)
      }

      // Metadata read is best-effort and isolated: a missing request IP
      // must not swallow the IP bucket's own throw below.
      let ip: string | undefined = undefined
      try {
        const withMeta = ctx as unknown as {
          meta?: { getRequestMetadata?: () => Promise<unknown> }
        }
        const meta = (await withMeta.meta?.getRequestMetadata?.()) as
          | { ip?: string | null; forwardedFor?: string | null }
          | undefined
        ip = meta?.ip ?? meta?.forwardedFor ?? undefined
      } catch {
        // IP metadata unavailable in some runtimes — email bucket still guards.
      }

      if (ip) {
        try {
          await rateLimiter.limit(ctx, "resendOtpIp", {
            key: ip,
            throws: true,
          })
        } catch {
          throw new Error(ERROR_MESSAGES.RESEND_LIMITED)
        }
      }

      let accountId: GenericId<"authAccounts"> | null = null
      let userStatus: string | undefined = undefined

      try {
        const result = await retrieveAccount(ctx, {
          provider: "password",
          account: { id: email },
        })
        accountId = result.account._id
        userStatus = result.user.status as string | undefined
      } catch {
        // Unknown email — fall through to the silent no-op below.
      }

      // Unknown and deactivated emails share one silent response: no code
      // is sent and null is returned, so neither can be distinguished by
      // probing this endpoint.
      if (accountId === null || userStatus === "deactivated") {
        return null
      }

      await signInViaProvider(ctx, ResendOTP, {
        accountId,
        params: credentials,
      })
      return null
    }

    // ── Step 2: email + code verification ───────────────────────
    // Consume rate-limit token per attempt; reset on success
    try {
      await rateLimiter.limit(ctx, "signInFailed", {
        key: email,
        throws: true,
      })
    } catch {
      throw new Error(ERROR_MESSAGES.RATE_LIMITED)
    }

    let accountId: GenericId<"authAccounts"> | null = null

    try {
      const result = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email },
      })
      accountId = result.account._id
    } catch {
      throw new Error(ERROR_MESSAGES.INVALID_CODE)
    }

    const verification = await signInViaProvider(ctx, ResendOTP, {
      accountId,
      params: credentials,
    }).catch((err: unknown) => {
      if (err instanceof Error && err.message.includes("verify code")) {
        throw new Error(ERROR_MESSAGES.INVALID_CODE)
      }
      throw err
    })

    if (verification === null) {
      throw new Error(ERROR_MESSAGES.INVALID_CODE)
    }

    await rateLimiter.reset(ctx, "signInFailed", { key: email })

    return {
      userId: verification.userId,
      sessionId: verification.sessionId,
    }
  },
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
  jwt: {
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId)
      return { role: user?.role ?? null }
    },
  },
})
