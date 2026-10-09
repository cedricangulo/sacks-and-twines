"use client"

import { SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react"
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
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
      {/* Header and footer are pinned; only the body scrolls, so the void action
          stays reachable without scrolling. `scrollable` is deliberately not
          used, because it would scroll the whole popup, pushing the action
          below the fold.

          `Dialog` rather than `AlertDialog`: the optional reason makes this a
          form, so Esc / outside-click dismissal is expected behaviour and
          nothing is committed until the user presses the action. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>Void batch</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>

        <div aria-hidden className="h-px shrink-0 bg-border" />

        {!detail ? (
          <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground">
            <SpinnerGapIcon
              weight="fill"
              size={20}
              className="mr-2 animate-spin"
            />
            Loading…
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
            {/* Identity and consequences in one card: the dialog exists to
                confirm the impact, so the impact leads and the identifying
                details ride on the same line. */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <WarningIcon
                  weight="fill"
                  size={18}
                  className="mt-0.5 shrink-0 text-destructive"
                />
                <p className="type-body-small font-medium text-foreground">
                  {detail.productName ?? "This product"}
                  <span className="font-mono font-normal text-muted-foreground">
                    {" · "}
                    {detail.batchCode}
                  </span>
                </p>
              </div>
              <ul className="mt-3 space-y-1.5 ps-6 type-body-small">
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-foreground">
                    Stock{" "}
                    <span className="font-medium">
                      ↓{formatNumber(detail.quantityRemaining)}
                    </span>
                    {" · value "}
                    <span className="font-medium">
                      ↓{formatCurrency(detail.totalProcurementCost)}
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span className="text-foreground">
                    {detail.activeAdjustmentCount > 0
                      ? `${detail.activeAdjustmentCount} pending adjustment(s) voided`
                      : "Pending adjustments voided"}
                  </span>
                </li>
              </ul>
            </div>

            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="void-reason">
                    Reason for voiding
                  </FieldLabel>
                  <span className="type-caption text-muted-foreground">
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

        <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
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
            {detail ? `Void ${detail.batchCode}` : "Void batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
