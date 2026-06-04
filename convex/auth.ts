import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials"
import { convexAuth, retrieveAccount } from "@convex-dev/auth/server"
import { Scrypt } from "lucia"
import type { Id } from "./_generated/dataModel"
import { ERROR_MESSAGES, verifyCredentials } from "./auth/verify"
import { rateLimiter } from "./rate_limiter"

/**
 * Password-based auth provider with Scrypt hashing and rate-limited
 * credential verification.
 */
const passwordProvider = ConvexCredentials({
  id: "password",
  crypto: {
    hashSecret: async (secret) => await new Scrypt().hash(secret),
    verifySecret: async (secret, hash) =>
      await new Scrypt().verify(hash, secret),
  },
  authorize: async (credentials, ctx) => {
    const flow = credentials.flow as string | undefined
    const rawEmail = (credentials.email as string) ?? ""
    const email = rawEmail.trim().toLowerCase()
    const password = (credentials.password as string) ?? ""

    verifyCredentials({ flow: flow ?? "", email, password })

    let authUserId: Id<"users"> | null = null
    try {
      const result = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
      })
      authUserId = result.user._id
    } catch {
      // wrong password — falls through to failure
    }

    if (authUserId) {
      await rateLimiter.reset(ctx, "signInFailed", {
        key: email,
      })
      return { userId: authUserId }
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
  },
})

/**
 * Convex auth instance configured with a single password provider.
 * Exports `auth`, `signIn`, `signOut`, `store`, and `isAuthenticated` helpers.
 * JWT custom claims include the user role for middleware-based access control.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
  jwt: {
    customClaims: async (ctx, { userId }) => {
      const user = await ctx.db.get(userId)
      return { role: user?.role ?? null }
    },
  },
})
