import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
          // You could logic here to check if they should be a staff or owner
          role: "staff", // Default everyone to staff
        }
      },
    }),
  ],
})
