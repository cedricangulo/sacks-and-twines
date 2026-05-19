"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"

export function useDeactivateStaff() {
  const deactivateUser = useMutation(api.users.mutations.deactivate)

  const submit = async (userId: Id<"users">, displayName: string) => {
    await sileo
      .promise(deactivateUser({ userId, userAgent: navigator.userAgent }), {
        loading: { title: "Deactivating user..." },
        success: {
          title: "Staff deactivated",
          description: `${displayName} has been deactivated.`,
        },
        error: (err) => handleConvexError(err, "Failed to deactivate staff"),
      })
      .catch(() => {})
  }

  return { submit }
}
