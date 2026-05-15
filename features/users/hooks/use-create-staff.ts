"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"

export type CreateStaffData = {
  name: string
  email: string
  password: string
}

export function useCreateStaff() {
  const createStaff = useMutation(api.users.mutations.create)

  const submit = async (data: CreateStaffData) => {
    await sileo
      .promise(createStaff(data), {
        loading: { title: "Creating staff account..." },
        success: {
          title: "Staff created",
          description: `${data.email} has been added as staff.`,
        },
        error: (err: unknown) => ({
          title: "Failed to create staff",
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
