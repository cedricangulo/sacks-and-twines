"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

// Calls the Convex activate-user mutation with sileo toast feedback.
export function useActivateStaff() {
  const activateUser = useMutation(api.users.mutations.activate)

  const submit = async (userId: Id<"users">, displayName: string) => {
    await sileo
      .promise(activateUser({ userId, userAgent: navigator.userAgent }), {
        loading: { title: "Activating user..." },
        success: {
          title: "Staff activated",
          description: `${displayName} has been activated.`,
        },
        error: (err) => handleConvexError(err, "Failed to activate staff"),
      })
      .catch(() => {})
  }

  return { submit }
}
