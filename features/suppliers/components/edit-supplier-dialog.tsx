"use client"

import { ReactNode, SubmitEvent, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useUpdateSupplier } from "../hooks/use-update-supplier"
import {
  type Supplier,
  type SupplierFieldErrors,
  validateSupplier,
} from "../validation"

export default function EditSupplierDialog({
  supplier,
  children,
}: {
  supplier: Supplier
  children: ReactNode
}) {
  const update = useUpdateSupplier()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<SupplierFieldErrors>({})

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const result = validateSupplier({
      companyName: formData.get("companyName"),
      contactPerson: formData.get("contactPerson"),
      contactNumber: formData.get("contactNumber"),
      address: formData.get("address"),
    })

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    await update.submit(supplier._id, result.data)
  }

  const clearFieldError = (field: keyof SupplierFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit supplier</DialogTitle>
          <DialogDescription>Update supplier information.</DialogDescription>
        </DialogHeader>

        <form
          key={String(open)}
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Field data-invalid={!!errors.companyName}>
              <FieldLabel htmlFor="edit-companyName">Company Name</FieldLabel>
              <FieldContent>
                <Input
                  id="edit-companyName"
                  name="companyName"
                  placeholder="Company name"
                  defaultValue={supplier.companyName}
                  aria-invalid={!!errors.companyName}
                  onInput={() => clearFieldError("companyName")}
                />
              </FieldContent>
              {errors.companyName ? (
                <FieldError>{errors.companyName}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.contactPerson}>
              <FieldLabel htmlFor="edit-contactPerson">
                Contact Person
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-contactPerson"
                  name="contactPerson"
                  placeholder="Full name"
                  defaultValue={supplier.contactPerson ?? ""}
                  aria-invalid={!!errors.contactPerson}
                  onInput={() => clearFieldError("contactPerson")}
                />
              </FieldContent>
              {errors.contactPerson ? (
                <FieldError>{errors.contactPerson}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.contactNumber}>
              <FieldLabel htmlFor="edit-contactNumber">
                Contact Number
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-contactNumber"
                  name="contactNumber"
                  placeholder="Phone number"
                  defaultValue={supplier.contactNumber ?? ""}
                  aria-invalid={!!errors.contactNumber}
                  onInput={() => clearFieldError("contactNumber")}
                />
              </FieldContent>
              {errors.contactNumber ? (
                <FieldError>{errors.contactNumber}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="edit-address">Address</FieldLabel>
              <FieldContent>
                <Textarea
                  id="edit-address"
                  name="address"
                  rows={3}
                  placeholder="Street address"
                  defaultValue={supplier.address ?? ""}
                  aria-invalid={!!errors.address}
                  onInput={() => clearFieldError("address")}
                />
              </FieldContent>
              {errors.address ? (
                <FieldError>{errors.address}</FieldError>
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
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
