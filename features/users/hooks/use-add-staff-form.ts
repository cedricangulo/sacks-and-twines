"use client"

import { SubmitEvent, useState } from "react"
import {
  type StaffFieldErrors,
  type StaffFormData,
  StaffSchema,
} from "../validation"
import { useCreateStaff } from "./use-create-staff"

/**
 * Empty form — hoisted to module scope (stable reference, no per-render allocation).
 * See `react-doctor/prefer-module-scope-static-value`.
 */
const INITIAL_VALUE: StaffFormData = {
  name: "",
  email: "",
  password: "",
}

/** Dialog state for creating a staff user. Mirrors `useAddSupplierForm` but uses `StaffSchema`. */
export function useAddStaffForm() {
  const create = useCreateStaff()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<StaffFieldErrors>({})

  const [formValues, setFormValues] = useState(INITIAL_VALUE)

  /** Update a field and clear its validation error. */
  const handleChange = (field: keyof StaffFormData, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    clearFieldError(field)
  }

  /** Validate via `StaffSchema.safeParse`, surface `StaffFieldErrors`, reset to `INITIAL_VALUE` on success. */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const result = StaffSchema.safeParse(formValues)

    if (!result.success) {
      const fieldErrors: StaffFieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof StaffFieldErrors
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setOpen(false)
    setFormValues(INITIAL_VALUE)
    await create.submit(result.data)
  }

  const clearFieldError = (field: keyof StaffFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return {
    open,
    setOpen,
    formValues,
    handleChange,
    errors,
    handleSubmit,
  }
}
