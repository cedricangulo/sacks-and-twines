"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { sileoRateLimitError } from "@/lib/rate-limit-error"

export type CreateStaffData = {
  name: string
  email: string
  password: string
}

export function useCreateStaff() {
  const createStaff = useMutation(api.users.mutations.create)

  const submit = async (data: CreateStaffData) => {
    await sileo
      .promise(createStaff({ ...data, userAgent: navigator.userAgent }), {
        loading: { title: "Creating staff account..." },
        success: {
          title: "Staff created",
          description: `${data.email} has been added as staff.`,
        },
        error: (err) => {
          if (err instanceof Error && err.message.includes("email already exists")) {
            return {
              title: "Duplicate email",
              description: `"${data.email}" is already in use.`,
            }
          }
          return sileoRateLimitError(err, "Failed to create staff")
        },
      })
      .catch(() => {})
  }

  return { submit }
}
