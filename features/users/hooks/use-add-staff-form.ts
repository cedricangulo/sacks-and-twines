"use client"

import { SubmitEvent, useState } from "react"
import {
  type StaffFieldErrors,
  type StaffFormData,
  StaffSchema,
} from "../validation"
import { useCreateStaff } from "./use-create-staff"

/** Manages the add-staff dialog form state: fields, validation, and submission. */
export function useAddStaffForm() {
  const create = useCreateStaff()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<StaffFieldErrors>({})

  const initialValue: StaffFormData = {
    name: "",
    email: "",
    password: "",
  }

  const [formValues, setFormValues] = useState(initialValue)

  const handleChange = (field: keyof StaffFormData, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    clearFieldError(field)
  }

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
    setFormValues(initialValue)
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
