"use client"

import { LockIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import type { ReactElement, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DialogBackdrop } from "@/components/ui/dialog-backdrop"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { Id } from "@/convex/_generated/dataModel"
import SupplierCombobox from "@/features/suppliers/components/supplier-combobox"
import { useEditBatchForm } from "../../hooks/use-edit-batch-form"

// Dialog form for editing a batch's supplier, quantity received, and procurement cost.
export default function EditBatchDialog({
  batchId,
  children,
  open,
  onOpenChange,
}: {
  batchId: Id<"batches">
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const {
    detail,
    open: dialogOpen,
    setOpen,
    formValues,
    supplierOptions,
    errors,
    dirty,
    canEditQuantities,
    handleChange,
    handleSubmit,
  } = useEditBatchForm({ batchId, open, onOpenChange })

  return (
    <Dialog modal={false} open={dialogOpen} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger render={() => children as ReactElement} />
      ) : null}

      {dialogOpen ? <DialogBackdrop /> : null}

      {/* Header and footer are pinned; only the field body scrolls, so Save
          stays reachable without scrolling. `scrollable` is deliberately not
          used, because it would scroll the whole popup, taking the action with it. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>Edit batch</DialogTitle>
          {/* Name the batch here. The header used to carry a bare batch code,
              leaving the product to be inferred from the row behind the
              overlay. */}
          <DialogDescription>
            {detail?.productName ?? "Loading"} · {detail?.batchCode}
          </DialogDescription>
        </DialogHeader>

        <div aria-hidden className="h-px shrink-0 bg-border" />

        {!detail || !formValues ? (
          <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground">
            <SpinnerGapIcon
              weight="fill"
              size={20}
              className="mr-2 animate-spin"
            />
            Loading batch details…
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <FieldGroup className="min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
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

              {/* Quantity and cost are a financial pair, so the divider groups
                  them apart from the supplier relationship above. */}
              <Separator />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field data-invalid={!!errors.quantityReceived}>
                  <FieldLabel htmlFor="edit-quantityReceived">
                    Quantity Received
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="edit-quantityReceived"
                      name="quantityReceived"
                      type="number"
                      step="1"
                      min="0.01"
                      className="tabular-nums"
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
                    {/* Currency adornment: `Input` is a thin Base UI wrapper
                        with no addon slot, so the symbol is an absolutely
                        positioned sibling and `peer` lets it dim with the
                        input when the field is locked. */}
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground peer-disabled:opacity-50">
                        ₱
                      </span>
                      <Input
                        id="edit-totalProcurementCost"
                        name="totalProcurementCost"
                        type="number"
                        step="1"
                        min="0.01"
                        className="peer ps-8 tabular-nums"
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
                    </div>
                  </FieldContent>
                  {errors.totalProcurementCost ? (
                    <FieldError>{errors.totalProcurementCost}</FieldError>
                  ) : null}
                </Field>
              </div>

              {/* Sits directly beneath the pair it constrains (proximity), and
                  uses theme tokens instead of hand-mixed amber shades. */}
              {!canEditQuantities ? (
                <div className="flex items-start gap-2 type-body-small text-muted-foreground">
                  <LockIcon
                    weight="fill"
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  <p>
                    Quantity and cost are locked because this batch already has
                    dispatch or adjustment history.
                  </p>
                </div>
              ) : null}
            </FieldGroup>

            <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
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
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
