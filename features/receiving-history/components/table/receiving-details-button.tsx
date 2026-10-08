"use client"

import { InfoIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import type { ReceivingBatch } from "../../validation"

interface ReceivingDetailsButtonProps {
  batch: ReceivingBatch
  onViewDetails: (batch: ReceivingBatch) => void
}

/**
 * Per-row trigger for the batch details dialog.
 *
 * Opens the dialog in one click. It used to be a popover holding a single
 * "View details" item, which cost two clicks to surface content the row already
 * had — the one-item menu was removed rather than kept as a second path to the
 * same dialog.
 *
 * The dialog itself is lifted into the table container rather than mounted here
 * per row — at 30 rows per page that would be 30 dialog instances for one
 * visible dialog.
 */
export default function ReceivingDetailsButton({
  batch,
  onViewDetails,
}: ReceivingDetailsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`View details for batch ${batch.batchCode}`}
      onClick={() => onViewDetails(batch)}
    >
      <InfoIcon weight="fill" />
    </Button>
  )
}
