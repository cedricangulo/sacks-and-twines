import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials"
import { convexAuth, retrieveAccount } from "@convex-dev/auth/server"
import { Scrypt } from "lucia"
import type { Id } from "./_generated/dataModel"
import { ERROR_MESSAGES, verifyCredentials } from "./auth/verify"
import { rateLimiter } from "./rate_limiter"

const passwordProvider = ConvexCredentials({
  id: "password",
  crypto: {
    hashSecret: async (secret) => await new Scrypt().hash(secret),
    verifySecret: async (secret, hash) =>
      await new Scrypt().verify(hash, secret),
  },
  authorize: async (credentials, ctx) => {
    const flow = credentials.flow as string | undefined
    const email = (credentials.email as string) ?? ""
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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
})
