"use client"

import { SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react"
import type { ReactElement, ReactNode } from "react"
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { formatCurrency, formatNumber } from "@/lib/formatters"
import { useVoidBatchDialog } from "../../hooks/use-void-batch-dialog"

// Dialog with batch details preview and reason input for voiding a batch.
export default function VoidBatchDialog({
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
    reason,
    setReason,
    handleVoid,
  } = useVoidBatchDialog({ batchId, open, onOpenChange })

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger render={() => children as ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Void batch</DialogTitle>
          <DialogDescription>
            {detail ? (
              <>
                This will void batch <strong>{detail.batchCode}</strong> for{" "}
                <strong>{detail.productName ?? "this product"}</strong>.
              </>
            ) : (
              "Loading batch details..."
            )}
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <SpinnerGapIcon
              weight="fill"
              size={20}
              className="mr-2 animate-spin"
            />
            Loading&hellip;
          </div>
        ) : (
          <div className="space-y-6">
            {/* Batch details card */}
            <div className="rounded-2xl border p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">
                Batch details
              </h3>
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">Batch code</dt>
                  <dd className="font-mono text-sm font-medium text-foreground">
                    {detail.batchCode}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">Product</dt>
                  <dd className="max-w-[60%] text-right text-sm font-medium text-foreground">
                    {detail.productName ?? "-"}
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Quantity remaining
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {formatNumber(detail.quantityRemaining)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">
                    Procurement cost
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formatCurrency(detail.totalProcurementCost)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Warning card */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <WarningIcon
                  weight="fill"
                  size={18}
                  className="shrink-0 text-destructive"
                />
                <h3 className="text-sm font-medium text-foreground">
                  This action will affect:
                </h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-foreground">
                    Product quantity will decrease by{" "}
                    <span className="font-medium">
                      {formatNumber(detail.quantityRemaining)}
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-foreground">
                    Product asset value will decrease by{" "}
                    <span className="font-medium">
                      {formatCurrency(detail.totalProcurementCost)}
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-foreground">
                    {detail.activeAdjustmentCount > 0
                      ? `${detail.activeAdjustmentCount} pending stock adjustment(s) will be voided automatically`
                      : "Pending stock adjustments will be voided automatically"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Reason */}
            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="void-reason">
                    Reason for voiding
                  </FieldLabel>
                  <span className="text-xs text-muted-foreground">
                    Optional
                  </span>
                </div>
                <FieldContent>
                  <Textarea
                    id="void-reason"
                    rows={3}
                    placeholder="e.g., Damaged goods, wrong delivery"
                    value={reason}
                    onChange={(e) => setReason(e.currentTarget.value)}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleVoid}
            disabled={!detail}
          >
            Void batch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
