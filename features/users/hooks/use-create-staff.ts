"use client"

import { useMutation } from "convex/react"
import { play } from "cuelume"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { handleConvexError } from "@/lib/error-handler"

// Data required to create a staff user account.
export type CreateStaffData = {
  name: string
  email: string
  password: string
}

// Calls the Convex create-staff mutation with sileo toast feedback.
export function useCreateStaff() {
  const createStaff = useMutation(api.users.mutations.create)

  const submit = async (data: CreateStaffData) => {
    play("loading")

    await sileo
      .promise(createStaff({ ...data, userAgent: navigator.userAgent }), {
        loading: { title: "Creating staff account..." },
        success: {
          title: "Staff created",
          description: `${data.email} has been added as staff.`,
        },
        error: (err) => handleConvexError(err, "Failed to create staff"),
      })
      .then(() => play("success"))
      .catch(() => play("error"))
      .catch(() => {})
  }

  return { submit }
}
