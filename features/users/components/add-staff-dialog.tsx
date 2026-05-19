"use client"

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
import { useAddStaffForm } from "../hooks/use-add-staff-form"

export default function AddStaffDialog() {
  const { open, setOpen, formValues, handleChange, errors, handleSubmit } =
    useAddStaffForm()

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
                  value={formValues.name}
                  onInput={(e) => handleChange("name", e.currentTarget.value)}
                  aria-invalid={!!errors.name}
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
                  value={formValues.email}
                  onInput={(e) => handleChange("email", e.currentTarget.value)}
                  aria-invalid={!!errors.email}
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
                  value={formValues.password}
                  onInput={(e) =>
                    handleChange("password", e.currentTarget.value)
                  }
                  aria-invalid={!!errors.password}
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
