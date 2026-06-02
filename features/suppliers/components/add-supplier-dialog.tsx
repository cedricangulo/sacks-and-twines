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
import { Textarea } from "@/components/ui/textarea"
import { useAddSupplierForm } from "../hooks/use-add-supplier-form"

// Dialog form for creating a new supplier with company name, contact, and address fields.
export default function AddSupplierDialog() {
  const { open, setOpen, formValues, handleChange, errors, handleSubmit } =
    useAddSupplierForm()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Supplier</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
          <DialogDescription>
            Register a new supplier in the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field data-invalid={!!errors.companyName}>
              <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
              <FieldContent>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="e.g. Acme Corp"
                  value={formValues.companyName}
                  aria-invalid={!!errors.companyName}
                  onInput={(e) =>
                    handleChange("companyName", e.currentTarget.value)
                  }
                />
              </FieldContent>
              {errors.companyName ? (
                <FieldError>{errors.companyName}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.contactPerson}>
              <FieldLabel htmlFor="contactPerson">Contact Person</FieldLabel>
              <FieldContent>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  placeholder="e.g. Juan Dela Cruz"
                  value={formValues.contactPerson}
                  aria-invalid={!!errors.contactPerson}
                  onInput={(e) =>
                    handleChange("contactPerson", e.currentTarget.value)
                  }
                />
              </FieldContent>
              {errors.contactPerson ? (
                <FieldError>{errors.contactPerson}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.contactNumber}>
              <FieldLabel htmlFor="contactNumber">Contact Number</FieldLabel>
              <FieldContent>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  placeholder="e.g. 0917-123-4567"
                  value={formValues.contactNumber}
                  aria-invalid={!!errors.contactNumber}
                  onInput={(e) =>
                    handleChange("contactNumber", e.currentTarget.value)
                  }
                />
              </FieldContent>
              {errors.contactNumber ? (
                <FieldError>{errors.contactNumber}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <FieldContent>
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  placeholder="e.g. 123 Rizal St., Brgy. San Jose"
                  value={formValues.address}
                  aria-invalid={!!errors.address}
                  onInput={(e) =>
                    handleChange("address", e.currentTarget.value)
                  }
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
            <Button type="submit">Create supplier</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
