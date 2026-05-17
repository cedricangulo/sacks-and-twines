"use client"

import { useQuery } from "convex-helpers/react/cache"
import { Loader2Icon, LockIcon } from "lucide-react"
import type { ReactNode } from "react"
import { SubmitEvent, useEffect, useState } from "react"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useBatchDetail } from "../../hooks/use-batch-detail"
import { useUpdateBatch } from "../../hooks/use-update-batch"
import {
  type BatchUpdateFieldErrors,
  validateBatchUpdate,
} from "../../validation"
import SupplierCombobox from "../supplier-combobox"

export default function EditBatchDialog({
  batchId,
  children,
  open: openProp,
  onOpenChange,
}: {
  batchId: Id<"batches">
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const detail = useBatchDetail(batchId)
  const suppliers = useQuery(api.suppliers.queries.list, {})
  const update = useUpdateBatch()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [errors, setErrors] = useState<BatchUpdateFieldErrors>({})
  const [dirty, setDirty] = useState(false)

  const supplierOptions =
    suppliers
      ?.filter((s: { archivedAt?: number }) => !s.archivedAt)
      .map((s: { _id: unknown; companyName: string }) => ({
        id: String(s._id),
        name: s.companyName,
      })) ?? []

  const initial = detail
    ? {
        supplierId: detail.supplierId ?? "",
        quantityReceived: detail.quantityReceived,
        totalProcurementCost: detail.totalProcurementCost,
      }
    : null

  const [formValues, setFormValues] = useState(initial)

  // Sync form values when dialog opens or detail loads
  // (useEffect needed because onOpenChange doesn't fire on prop-driven open)
  useEffect(() => {
    if (open && detail) {
      setFormValues(initial)
      setDirty(false)
      setErrors({})
    }
  }, [open, detail])

  const canEditQuantities = detail?.canEditQuantities ?? true

  const handleChange = (
    field: keyof NonNullable<typeof initial>,
    value: string | number | undefined
  ) => {
    setFormValues((prev) => {
      if (!prev || !initial) return prev
      const next = { ...prev, [field]: value }
      setDirty(
        next.supplierId !== initial.supplierId ||
          next.quantityReceived !== initial.quantityReceived ||
          next.totalProcurementCost !== initial.totalProcurementCost
      )
      return next
    })
    clearFieldError(field)
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    if (!formValues) return

    const result = validateBatchUpdate(formValues)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    await update.submit(batchId, detail!.productId, result.data)
  }

  const clearFieldError = (field: keyof BatchUpdateFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit batch</DialogTitle>
          <DialogDescription>
            {detail?.batchCode ?? "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {!detail || !formValues ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2Icon size={20} className="mr-2 animate-spin" />
            Loading batch details...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {!canEditQuantities ? (
              <div className="flex items-start gap-2 px-4 py-3 text-sm border rounded-2xl border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
                <LockIcon size={16} className="mt-0.5 shrink-0" />
                <p>
                  Quantity fields are locked because this batch already has
                  dispatch or adjustment history.
                </p>
              </div>
            ) : null}

            <FieldGroup>
              <Field data-invalid={!!errors.supplierId}>
                <FieldLabel>Supplier</FieldLabel>
                <FieldContent>
                  <SupplierCombobox
                    suppliers={supplierOptions}
                    value={formValues.supplierId}
                    onChange={(v) => handleChange("supplierId", v)}
                    disabled={false}
                  />
                </FieldContent>
                {errors.supplierId ? (
                  <FieldError>{errors.supplierId}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.quantityReceived}>
                <FieldLabel htmlFor="edit-quantityReceived">
                  Quantity Received
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-quantityReceived"
                    name="quantityReceived"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formValues.quantityReceived}
                    disabled={!canEditQuantities}
                    aria-invalid={!!errors.quantityReceived}
                    onInput={(e) =>
                      handleChange(
                        "quantityReceived",
                        Number(e.currentTarget.value)
                      )
                    }
                  />
                </FieldContent>
                {errors.quantityReceived ? (
                  <FieldError>{errors.quantityReceived}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.totalProcurementCost}>
                <FieldLabel htmlFor="edit-totalProcurementCost">
                  Total Procurement Cost
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-totalProcurementCost"
                    name="totalProcurementCost"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formValues.totalProcurementCost}
                    disabled={!canEditQuantities}
                    aria-invalid={!!errors.totalProcurementCost}
                    onInput={(e) =>
                      handleChange(
                        "totalProcurementCost",
                        Number(e.currentTarget.value)
                      )
                    }
                  />
                </FieldContent>
                {errors.totalProcurementCost ? (
                  <FieldError>{errors.totalProcurementCost}</FieldError>
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
              <Button type="submit" disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
