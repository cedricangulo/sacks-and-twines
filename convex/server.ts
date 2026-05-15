import { zCustomMutation } from "convex-helpers/server/zod4"
import { mutation } from "./_generated/server"

export const zMutation = zCustomMutation(mutation, {
  args: {},
  input: async (ctx, args) => ({ ctx, args }),
})
