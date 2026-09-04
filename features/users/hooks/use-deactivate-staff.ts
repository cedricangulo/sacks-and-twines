"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

// Calls the Convex deactivate-user mutation with sileo toast feedback.
export function useDeactivateStaff() {
  const deactivateUser = useMutation(api.users.mutations.deactivate)

  const submit = async (userId: Id<"users">, displayName: string) => {
    play("loading")

    await sileo
      .promise(deactivateUser({ userId, userAgent: navigator.userAgent }), {
        loading: { title: "Deactivating user..." },
        success: {
          title: "Staff deactivated",
          description: `${displayName} has been deactivated.`,
        },
        error: (err) => handleConvexError(err, "Failed to deactivate staff"),
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
