"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { ReceivingBatch } from "../../validation"

interface ReceivingBatchDetailsDialogProps {
  /**
   * The row to display. Deliberately **not** derived from `open` and not cleared
   * when the dialog closes — the caller keeps the last batch around until a new
   * one is picked.
   *
   * `DialogContent` is a `grid`, so nulling this out on close would unmount the
   * cards immediately: the box would collapse to nothing and then play
   * `data-closed:zoom-out-95` on an empty frame. Keeping the content mounted
   * lets the exit animation run against real content.
   */
  batch: ReceivingBatch | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function statusVariant(
  status: ReceivingBatch["status"]
): "success" | "secondary" | "destructive" {
  if (status === "active") return "success"
  if (status === "depleted") return "secondary"
  return "destructive"
}

function statusLabel(status: ReceivingBatch["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// A labelled row inside a details card.
function DetailRow({
  label,
  children,
  mono,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="type-body-small text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-w-[60%] truncate text-right type-body-small font-medium text-foreground",
          mono && "font-mono"
        )}
      >
        {children}
      </dd>
    </div>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border p-4">
      <h3 className="mb-3 type-body-small font-medium text-foreground">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

/**
 * Progressive disclosure for the receiving history table (`ux-progressive-disclosure`).
 *
 * The table shows the six columns you scan a stock-in log by — batch code,
 * product, quantity received, total cost, status and date. Everything else
 * (SKU, supplier, quantity remaining, unit cost, receiver) lives here instead,
 * which is what keeps the table at ~864px and inside the viewport.
 *
 * Every field is read straight off the row: `ReceivingBatch` extends
 * `Doc<"batches">`, so this needs no query, no loading spinner, and no
 * additional database I/O — the row was already delivered by the page query.
 */
export default function ReceivingBatchDetailsDialog({
  batch,
  open,
  onOpenChange,
}: ReceivingBatchDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Batch details</DialogTitle>
          <DialogDescription>
            {batch ? (
              <>
                <span className="font-mono">{batch.batchCode}</span> —{" "}
                {batch.productName}
              </>
            ) : (
              "Stock-in details for this batch."
            )}
          </DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="space-y-4">
            <DetailCard title="Stock-in">
              <DetailRow label="SKU" mono>
                {batch.productSku}
              </DetailRow>
              <DetailRow label="Quantity received">
                {formatNumber(batch.quantityReceived)}
              </DetailRow>
              <DetailRow label="Quantity remaining">
                {formatNumber(batch.quantityRemaining)}
              </DetailRow>
              <DetailRow label="Status">
                <Badge variant={statusVariant(batch.status)}>
                  {statusLabel(batch.status)}
                </Badge>
              </DetailRow>
            </DetailCard>

            <DetailCard title="Procurement">
              <DetailRow label="Unit cost">
                {formatCurrency(batch.unitCost)}
              </DetailRow>
              <DetailRow label="Total cost">
                {formatCurrency(batch.totalProcurementCost)}
              </DetailRow>
            </DetailCard>

            <DetailCard title="Record">
              <DetailRow label="Supplier">{batch.supplierName}</DetailRow>
              <DetailRow label="Received by">{batch.receivedBy}</DetailRow>
              <DetailRow label="Received at">
                {formatDateTime(batch.createdAt)}
              </DetailRow>
            </DetailCard>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
