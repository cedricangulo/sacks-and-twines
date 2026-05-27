import { zCustomMutation } from "convex-helpers/server/zod4"
import { mutation } from "./_generated/server"

/**
 * Zod-validated mutation helper. Wraps Convex mutations with
 * schema-based argument validation via `convex-helpers`.
 */
export const zMutation = zCustomMutation(mutation, {
  args: {},
  input: async (ctx, args) => ({ ctx, args }),
})
