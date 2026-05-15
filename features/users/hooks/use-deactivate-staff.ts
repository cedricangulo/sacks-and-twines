"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useDeactivateStaff() {
  const deactivateUser = useMutation(api.users.mutations.deactivate)

  const submit = async (userId: Id<"users">, displayName: string) => {
    await sileo
      .promise(deactivateUser({ userId }), {
        loading: { title: "Deactivating user..." },
        success: {
          title: "Staff deactivated",
          description: `${displayName} has been deactivated.`,
        },
        error: (err: unknown) => ({
          title: "Failed to deactivate staff",
          description:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        }),
      })
      .catch(() => {})
  }

  return { submit }
}
