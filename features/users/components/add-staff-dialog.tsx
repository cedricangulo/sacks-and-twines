"use client"

import { SubmitEvent, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCreateStaff } from "../hooks/use-create-staff"

const StaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type StaffErrors = Partial<Record<keyof z.infer<typeof StaffSchema>, string>>

export default function AddStaffDialog() {
  const create = useCreateStaff()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<StaffErrors>({})

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    }

    const parsed = StaffSchema.safeParse(payload)
    if (!parsed.success) {
      const fieldErrors: StaffErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof StaffErrors
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setOpen(false)
    await create.submit(parsed.data)
  }

  const clearFieldError = (field: keyof StaffErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Staff</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff user</DialogTitle>
          <DialogDescription>
            Create a new staff account with email and password.
          </DialogDescription>
        </DialogHeader>

        <form
          key={String(open)}
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full name"
                  aria-invalid={!!errors.name}
                  onInput={() => clearFieldError("name")}
                />
              </FieldContent>
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  placeholder="Email address"
                  type="email"
                  aria-invalid={!!errors.email}
                  onInput={() => clearFieldError("email")}
                />
              </FieldContent>
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <FieldContent>
                <Input
                  id="password"
                  name="password"
                  placeholder="Min. 8 characters"
                  type="password"
                  aria-invalid={!!errors.password}
                  onInput={() => clearFieldError("password")}
                />
              </FieldContent>
              {errors.password ? (
                <FieldError>{errors.password}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create staff</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
